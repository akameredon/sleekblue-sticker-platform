import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { cart, useCartCount, useCartSubtotal } from "@/lib/cart";
import { apiUrl } from "@/lib/paths";
import { Mic, MicOff, X, Volume2 } from "lucide-react";

// Web Speech API — accessed via window to avoid missing type declarations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any;

type VoiceState = "idle" | "listening" | "processing" | "speaking";

type VoiceAction = {
  type: string;
  path?: string;
  productSlug?: string;
  productName?: string;
  sizeLabel?: string;
  finishLabel?: string;
  quantity?: number;
  query?: string;
};

type CommandResult = {
  intent?: string;
  speech?: string;
  action?: VoiceAction;
  quote?: { unitPrice: number; total: number; savingsNote?: string };
};

const UNIT_PRICES: Record<string, number> = {
  "die-cut-stickers": 196,
  "circle-stickers": 196,
  "kiss-cut-stickers": 210,
  "holographic-stickers": 238,
  "bumper-stickers": 220,
  "transparent-stickers": 205,
  "sticker-sheets": 180,
  "clear-labels": 175,
};

function getSpeechRec(): (new () => AnyRec) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceAssistant() {
  const [, navigate] = useLocation();
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [show, setShow] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const cartCount = useCartCount();
  const cartSubtotal = useCartSubtotal();
  const recognitionRef = useRef<AnyRec>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const SpeechRec = getSpeechRec();
    if (!SpeechRec) {
      setSupported(false);
      return;
    }
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-NG";
    rec.maxAlternatives = 3;
    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch { /* ignore */ } };
  }, []);

  const showToast = useCallback((msg: string, duration = 3500) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const synth = (window as any).speechSynthesis;
      if (!synth) { resolve(); return; }
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-NG";
      utter.rate = 1.05;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      const voices: SpeechSynthesisVoice[] = synth.getVoices();
      const preferred = voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
        ?? voices.find((v) => v.lang.startsWith("en"))
        ?? voices[0];
      if (preferred) utter.voice = preferred;
      setVoiceState("speaking");
      utter.onend = () => { setVoiceState("idle"); resolve(); };
      utter.onerror = () => { setVoiceState("idle"); resolve(); };
      synth.speak(utter);
    });
  }, []);

  const executeAction = useCallback(
    async (result: CommandResult) => {
      const action = result.action;
      if (!action) return;
      switch (action.type) {
        case "navigate":
          if (action.path) navigate(action.path);
          break;
        case "add_to_cart": {
          const slug = action.productSlug ?? "die-cut-stickers";
          const unitPrice = UNIT_PRICES[slug] ?? 196;
          cart.add({
            productSlug: slug,
            productName: action.productName ?? "Sticker",
            sizeLabel: action.sizeLabel ?? "Medium",
            finishLabel: action.finishLabel ?? "Matte",
            quantity: action.quantity ?? 100,
            unitPrice,
          });
          showToast(`Added ${action.quantity ?? 100} × ${action.productName ?? "stickers"} to cart`);
          break;
        }
        case "clear_cart":
          cart.clear();
          showToast("Cart cleared");
          break;
        case "upload_design":
          navigate("/quick-order");
          break;
        case "checkout":
          navigate("/cart");
          break;
      }
    },
    [navigate, showToast],
  );

  const processCommand = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setVoiceState("processing");
      setTranscript(text);
      try {
        const res = await fetch(apiUrl("/voice/command"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            context: { currentPage: window.location.pathname, cartCount, cartTotal: cartSubtotal },
          }),
        });
        const result: CommandResult = await res.json();
        setLastResponse(result.speech ?? "");
        await executeAction(result);
        if (result.speech) await speak(result.speech);
      } catch {
        const msg = "Something went wrong. Please try again.";
        setLastResponse(msg);
        await speak(msg);
      }
    },
    [cartCount, cartSubtotal, executeAction, speak],
  );

  const startListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || permissionDenied) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const synth = (window as any).speechSynthesis;
    synth?.cancel();
    setTranscript("");
    setLastResponse("");
    setVoiceState("listening");

    let finalTranscript = "";

    rec.onresult = (e: AnyRec) => {
      const results: AnyRec[] = Array.from(e.results);
      const interim = results.map((r: AnyRec) => r[0]?.transcript ?? "").join(" ");
      setTranscript(interim);
      for (const r of results) {
        if (r.isFinal) finalTranscript += r[0]?.transcript ?? "";
      }
    };

    rec.onerror = (e: AnyRec) => {
      if (e.error === "not-allowed") {
        setPermissionDenied(true);
        showToast("Microphone access denied. Allow mic permissions in your browser.");
      }
      setVoiceState("idle");
    };

    rec.onend = () => {
      setVoiceState("idle");
      if (finalTranscript.trim()) processCommand(finalTranscript.trim());
    };

    try { rec.start(); } catch { setVoiceState("idle"); }
  }, [permissionDenied, processCommand, showToast]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setVoiceState("idle");
  }, []);

  const handleMicClick = useCallback(() => {
    if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "idle") {
      if (!show) setShow(true);
      startListening();
    } else if (voiceState === "speaking") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).speechSynthesis?.cancel();
      setVoiceState("idle");
    }
  }, [voiceState, show, startListening, stopListening]);

  if (!supported) return null;

  return (
    <>
      {toast ? (
        <div className="fixed bottom-[88px] right-4 z-50 max-w-xs rounded-2xl border border-card-border bg-card px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      ) : null}

      {show ? (
        <div
          className="fixed bottom-[88px] right-4 z-50 w-80 rounded-2xl border border-card-border bg-card p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2"
          data-testid="voice-panel"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`grid h-8 w-8 place-items-center rounded-full ${voiceState === "listening" ? "bg-destructive text-destructive-foreground animate-pulse" : voiceState === "speaking" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
                {voiceState === "speaking" ? <Volume2 className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </div>
              <span className="text-sm font-semibold">
                {voiceState === "idle" ? "Voice Assistant" : voiceState === "listening" ? "Listening…" : voiceState === "processing" ? "Thinking…" : "Speaking…"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setShow(false); stopListening(); (window as any).speechSynthesis?.cancel(); }} // eslint-disable-line @typescript-eslint/no-explicit-any
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover-elevate"
              aria-label="Close voice panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 min-h-[44px] rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm">
            {voiceState === "listening" && !transcript ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <SoundWave />
                Say anything — add to cart, get a quote, navigate…
              </span>
            ) : transcript ? (
              <span className="italic text-foreground">"{transcript}"</span>
            ) : lastResponse ? (
              <span className="text-muted-foreground">{lastResponse}</span>
            ) : (
              <span className="text-muted-foreground">Say a command or tap the mic below</span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {[
              { label: "Shop stickers", cmd: "take me to the shop" },
              { label: "Get a quote", cmd: "how much for 100 die cut stickers" },
              { label: "I have a design", cmd: "I have a design ready" },
              { label: "My cart", cmd: "what's in my cart" },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => processCommand(s.cmd)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-left text-[11px] hover-elevate"
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleMicClick}
            disabled={voiceState === "processing"}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold hover-elevate disabled:opacity-50 ${
              voiceState === "listening"
                ? "bg-destructive text-destructive-foreground"
                : voiceState === "speaking"
                ? "bg-accent text-accent-foreground"
                : "bg-primary text-primary-foreground"
            }`}
            data-testid="button-mic-main"
          >
            {voiceState === "listening" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {voiceState === "idle"
              ? "Tap to speak"
              : voiceState === "listening"
              ? "Tap to stop"
              : voiceState === "processing"
              ? "Processing…"
              : "Tap to stop"}
          </button>

          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Try: "Add 100 holographic stickers, medium, to cart"
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setShow((v) => !v);
          if (!show) startListening();
        }}
        aria-label="Voice assistant"
        data-testid="button-voice-fab"
        className={`fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg hover-elevate transition-all ${
          voiceState === "listening"
            ? "bg-destructive text-destructive-foreground ring-4 ring-destructive/30 animate-pulse"
            : voiceState === "speaking"
            ? "bg-accent text-accent-foreground ring-4 ring-accent/30"
            : voiceState === "processing"
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        <Mic className="h-6 w-6" />
      </button>
    </>
  );
}

function SoundWave() {
  return (
    <span className="inline-flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4, 3].map((h, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full bg-primary animate-pulse"
          style={{ height: `${h * 4}px`, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </span>
  );
}
