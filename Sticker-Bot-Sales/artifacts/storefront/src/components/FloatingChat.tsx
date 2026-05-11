/**
 * FloatingChat.tsx — AI Shopping Assistant widget.
 *
 * Features:
 * - Product recommendation cards (inline, tappable)
 * - AI-generated sticker mockup images
 * - Inline checkout with Paystack payment + WhatsApp fallback
 * - Artwork file upload during checkout
 * - Order confirmation shown in-chat
 * - Streaming SSE responses with tool_call status indicators
 */
import { useEffect, useRef, useState } from "react";
import { useGetShopInfo } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { apiUrl } from "@/lib/paths";
import { getStoredConversationId, setStoredConversationId } from "@/lib/conversation";
import { getToken } from "@/lib/auth";
import {
  MessageCircle, X, ArrowUp, Loader2, Sparkles, RotateCcw,
  ShoppingBag, Star, Package, CheckCircle2, ExternalLink,
  ImageIcon, Upload, CreditCard, MessageSquare,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductCard = {
  slug: string; name: string; tagline: string; basePrice: number;
  currency: string; imageUrl: string | null; rating: number;
  reviewCount: number; sizes: string[]; finishes: string[];
  isBestseller: boolean;
};

type CheckoutItem = {
  productSlug: string; productName: string; sizeLabel: string;
  finishLabel: string; quantity: number; unitPrice: number;
  lineTotal: number; notes?: string;
};

type UiPayload =
  | { type: "products"; data: ProductCard[] }
  | { type: "mockup"; url: string; description: string }
  | { type: "checkout"; items: CheckoutItem[]; total: number; currency: string; currencySymbol: string }
  | { type: "order_confirmed"; reference: string; total: number; currencySymbol: string; whatsappUrl: string; orderId: number };

type Msg = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  ui?: UiPayload[];
};

const QUICK_ACTIONS = [
  "I need stickers for my brand 🏷️",
  "Show me holographic options ✨",
  "Generate a mockup for me 🎨",
  "Best deal for 500 pieces?",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-2.5 w-2.5 ${s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </span>
  );
}

function ProductCards({ products, onSelect }: { products: ProductCard[]; onSelect: (p: ProductCard) => void }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {products.map((p) => (
        <button key={p.slug} type="button" onClick={() => onSelect(p)}
          className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5 text-left hover-elevate transition-all group"
        >
          <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-muted-foreground"><Package className="h-5 w-5" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold truncate">{p.name}</span>
              {p.isBestseller && (
                <span className="flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">BEST</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{p.tagline}</p>
            <div className="mt-1 flex items-center gap-2">
              <StarRating rating={p.rating} />
              <span className="text-[10px] text-muted-foreground">({p.reviewCount})</span>
              <span className="ml-auto text-xs font-bold text-primary">from ₦{p.basePrice.toLocaleString("en-NG")}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function MockupCard({ url, description }: { url: string; description: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden w-full">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full">
        <img src={url} alt={description} className={`w-full object-cover transition-all ${expanded ? "max-h-96" : "max-h-40"}`} />
      </button>
      <div className="px-3 py-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <ImageIcon className="h-3 w-3" />
        <span>AI Mockup — tap to {expanded ? "collapse" : "expand"}</span>
      </div>
    </div>
  );
}

function CheckoutForm({
  items, total, currencySymbol, onConfirmed,
}: {
  items: CheckoutItem[]; total: number; currencySymbol: string;
  onConfirmed: (ref: string, total: number, sym: string, waUrl: string, orderId: number) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"form" | "paying">("form");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePaystack = async () => {
    if (!name.trim() || !phone.trim()) { setError("Name and phone are required"); return; }
    if (!email.trim()) { setError("Email is required for payment"); return; }
    setError("");
    setSubmitting(true);
    setPaymentStep("paying");

    try {
      // 1. Create order
      const orderRes = await fetch(apiUrl("/openai/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
        body: JSON.stringify({ customerName: name.trim(), customerPhone: phone.trim(), customerEmail: email.trim(), items }),
      });
      if (!orderRes.ok) throw new Error("Order creation failed");
      const order = await orderRes.json() as { reference: string; total: number; currencySymbol: string; whatsappUrl: string; orderId: number };

      // 2. Initialize Paystack
      const payRes = await fetch(apiUrl("/payments/initialize"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, customerEmail: email.trim() }),
      });
      const payData = await payRes.json() as { accessCode?: string; authorizationUrl?: string; whatsappFallbackUrl: string; error?: string };

      if (!payRes.ok || !payData.accessCode) {
        // Paystack not configured — fall back to WhatsApp
        onConfirmed(order.reference, order.total, order.currencySymbol, payData.whatsappFallbackUrl ?? order.whatsappUrl, order.orderId);
        return;
      }

      // 3. Open Paystack inline popup
      const PaystackPop = (window as unknown as { PaystackPop?: { setup: (cfg: Record<string, unknown>) => { openIframe: () => void } } }).PaystackPop;
      if (!PaystackPop) {
        // Library not loaded — redirect to hosted page
        window.open(payData.authorizationUrl, "_blank");
        onConfirmed(order.reference, order.total, order.currencySymbol, order.whatsappUrl, order.orderId);
        return;
      }

      const handler = PaystackPop.setup({
        key: (window as unknown as { PAYSTACK_PUBLIC_KEY?: string }).PAYSTACK_PUBLIC_KEY ?? "",
        email: email.trim(),
        amount: Math.round(total * 100),
        ref: `PS-${order.reference}`,
        currency: "NGN",
        onSuccess: () => {
          onConfirmed(order.reference, order.total, order.currencySymbol, order.whatsappUrl, order.orderId);
        },
        onCancel: () => {
          setPaymentStep("form");
          setError("Payment cancelled — you can retry or continue on WhatsApp");
          setSubmitting(false);
        },
      });
      handler.openIframe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPaymentStep("form");
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 w-full space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Complete Your Order
      </div>

      {/* Order summary */}
      <div className="rounded-lg bg-background border border-border divide-y divide-border text-[11px]">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between px-2.5 py-2">
            <div>
              <div className="font-medium">{it.productName}</div>
              <div className="text-muted-foreground">{it.sizeLabel} · {it.finishLabel} · ×{it.quantity}</div>
            </div>
            <div className="font-semibold">{currencySymbol}{it.lineTotal.toLocaleString("en-NG")}</div>
          </div>
        ))}
        <div className="flex items-center justify-between px-2.5 py-2 font-bold">
          <span>Total</span>
          <span className="text-primary">{currencySymbol}{total.toLocaleString("en-NG")}</span>
        </div>
      </div>

      {paymentStep === "form" && (
        <div className="space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (08012345678)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (for payment receipt)" type="email"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />

          {/* Artwork upload */}
          <div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[11px] text-muted-foreground hover-elevate"
            >
              <Upload className="h-3 w-3" />
              {artworkFile ? artworkFile.name : "Upload artwork (optional)"}
            </button>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.ai,.eps,.svg" className="hidden"
              onChange={(e) => setArtworkFile(e.target.files?.[0] ?? null)} />
          </div>

          {error && <p className="text-[10px] text-destructive">{error}</p>}

          {/* Payment button */}
          <button type="button" onClick={handlePaystack} disabled={submitting}
            className="w-full rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60 hover-elevate flex items-center justify-center gap-1.5"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
            {submitting ? "Processing…" : `Pay ${currencySymbol}${total.toLocaleString("en-NG")} with Paystack`}
          </button>
          <p className="text-center text-[10px] text-muted-foreground">WhatsApp payment available if card fails</p>
        </div>
      )}

      {paymentStep === "paying" && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Waiting for payment…
        </div>
      )}
    </div>
  );
}

function OrderConfirmed({ reference, total, currencySymbol, whatsappUrl }: {
  reference: string; total: number; currencySymbol: string; whatsappUrl: string;
}) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-3 w-full space-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div>
          <div className="text-xs font-bold text-green-800">Order Confirmed! 🎉</div>
          <div className="text-[10px] text-green-700">Ref: <span className="font-mono font-bold">{reference}</span></div>
        </div>
      </div>
      <div className="text-[11px] text-green-700">Total: <strong>{currencySymbol}{total.toLocaleString("en-NG")}</strong></div>
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-green-600 py-2 text-[11px] font-semibold text-white hover-elevate"
      >
        <MessageSquare className="h-3 w-3" /> Continue on WhatsApp
      </a>
      <Link href={`/track`}>
        <button type="button" className="w-full rounded-lg border border-green-300 py-1.5 text-[11px] font-medium text-green-700 hover-elevate">
          Track order
        </button>
      </Link>
    </div>
  );
}

// Import Link from wouter
import { Link } from "wouter";

function UiBlock({ payload, onProductSelect, onOrderConfirmed }: {
  payload: UiPayload;
  onProductSelect: (p: ProductCard) => void;
  onOrderConfirmed: (ref: string, total: number, sym: string, waUrl: string, orderId: number) => void;
}) {
  if (payload.type === "products") return <ProductCards products={payload.data} onSelect={onProductSelect} />;
  if (payload.type === "mockup") return <MockupCard url={payload.url} description={payload.description} />;
  if (payload.type === "checkout") return (
    <CheckoutForm items={payload.items} total={payload.total} currencySymbol={payload.currencySymbol} onConfirmed={onOrderConfirmed} />
  );
  if (payload.type === "order_confirmed") return (
    <OrderConfirmed reference={payload.reference} total={payload.total} currencySymbol={payload.currencySymbol} whatsappUrl={payload.whatsappUrl} />
  );
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FloatingChat() {
  const { data: shop } = useGetShopInfo();
  const [location] = useLocation();
  const isChatRoute = location === "/chat";
  const [open, setOpen] = useState(false);
  const isOpen = isChatRoute || open;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState<number | null>(getStoredConversationId());
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!open && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") setUnread((n) => n + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  useEffect(() => { if (isOpen) setUnread(0); }, [isOpen]);

  const ensureConv = async (firstMsg: string): Promise<number> => {
    if (convId) return convId;
    const res = await fetch(apiUrl("/openai/conversations"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: firstMsg.slice(0, 60) }),
    });
    const data = await res.json();
    setConvId(data.id);
    setStoredConversationId(data.id);
    return data.id;
  };

  const appendUiToLast = (uiPayload: UiPayload) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") next[next.length - 1] = { ...last, ui: [...(last.ui ?? []), uiPayload] };
      return next;
    });
  };

  const replaceCheckoutWithConfirmed = (ref: string, total: number, sym: string, waUrl: string, orderId: number) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.role !== "assistant" || !msg.ui) return msg;
        return {
          ...msg,
          ui: msg.ui.map((u) =>
            u.type === "checkout"
              ? { type: "order_confirmed" as const, reference: ref, total, currencySymbol: sym, whatsappUrl: waUrl, orderId }
              : u,
          ),
        };
      }),
    );
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content }]);

    try {
      const id = await ensureConv(content);
      const ac = new AbortController();
      abortRef.current = ac;

      const res = await fetch(apiUrl(`/openai/conversations/${id}/messages`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ content }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

      setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          for (const line of part.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              if (typeof json.delta === "string") {
                acc += json.delta;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") next[next.length - 1] = { ...last, content: acc };
                  return next;
                });
              }
              if (json.ui) appendUiToLast(json.ui as UiPayload);
            } catch { /* ignore */ }
          }
        }
      }

      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") next[next.length - 1] = { ...last, streaming: false };
        return next;
      });
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setStoredConversationId(null);
    setConvId(null);
    setMessages([]);
    setInput("");
  };

  return (
    <>
      {isOpen && (
        <div
          className={
            isChatRoute
              ? "fixed inset-0 top-[60px] z-30 flex flex-col bg-background animate-in fade-in"
              : "fixed bottom-[84px] right-4 z-50 flex flex-col rounded-2xl border border-card-border bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-2"
          }
          style={
            isChatRoute
              ? {}
              : { width: "min(440px, calc(100vw - 2rem))", maxHeight: "min(680px, calc(100vh - 120px))" }
          }
          data-testid="floating-chat"
        >
          {/* Header */}
          {!isChatRoute && (
            <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-card" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Sticky AI</div>
                  <div className="text-[10px] text-muted-foreground">{shop?.businessName ?? "Sticker Lab"} · Shopping Assistant</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button type="button" onClick={reset} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover-elevate" aria-label="New chat">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover-elevate" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className={`flex-1 overflow-y-auto p-3 scrollbar-thin ${isChatRoute ? "flex flex-col items-center pt-8 md:pt-12" : ""}`}>
            <div className={isChatRoute ? "w-full max-w-3xl space-y-6" : "space-y-3 w-full"}>
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm leading-relaxed">
                    Hey! I'm Sticky — your AI shopping assistant. Describe what you need and I'll find the perfect sticker, show you a mockup, and get you checked out right here. 🎨
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pl-8">
                  {QUICK_ACTIONS.map((q) => (
                    <button key={q} type="button" onClick={() => send(q)}
                      className="rounded-xl border border-border bg-background px-2.5 py-2 text-left text-[11px] hover-elevate leading-tight"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-primary text-primary-foreground mt-0.5">
                      <Sparkles className="h-3 w-3" />
                    </div>
                  )}
                  <div className={`flex flex-col gap-2 ${m.role === "user" ? "items-end max-w-[85%]" : "items-start w-full"}`}>
                    {(m.content || (!m.ui?.length && !m.streaming)) && m.content && (
                      <div className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      }`}>
                        {m.content}
                        {m.streaming && <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle" />}
                      </div>
                    )}
                    {!m.content && !m.streaming && m.role === "assistant" && !m.ui?.length && (
                      <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                        <span className="inline-flex items-center gap-1">
                          {[0, 120, 240].map((d) => (
                            <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground opacity-60" style={{ animationDelay: `${d}ms` }} />
                          ))}
                        </span>
                      </div>
                    )}
                    {m.ui?.map((payload, j) => (
                      <div key={j} className="w-full">
                        <UiBlock payload={payload} onProductSelect={(p) => send(`Tell me more about ${p.name} — sizes, finishes, and pricing for 100 pieces`)} onOrderConfirmed={replaceCheckoutWithConfirmed} />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
            {sending && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2 justify-start">
                <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="h-3 w-3" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    {[0, 120, 240].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground opacity-60" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Input */}
          <div className={`flex-shrink-0 bg-background w-full ${isChatRoute ? "flex justify-center p-4 md:p-6" : "border-t border-border p-2"}`}>
            <form className={`flex gap-2 ${isChatRoute ? "w-full max-w-3xl" : "w-full"}`}
              onSubmit={(e) => { e.preventDefault(); send(input); }}
            >
              {isChatRoute && messages.length > 0 && (
                <button type="button" onClick={reset} className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover-elevate" aria-label="New chat">
                  <RotateCcw className="h-5 w-5" />
                </button>
              )}
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Describe what you need…"
                className={`flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${isChatRoute ? "h-12 text-base shadow-sm" : ""}`}
                data-testid="input-float-chat"
              />
              <button type="submit" disabled={sending || !input.trim()}
                className={`grid flex-shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover-elevate ${isChatRoute ? "h-12 w-12" : "h-10 w-10"}`}
                data-testid="button-float-send"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>
      )}

      {!isChatRoute && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Open AI Shopping Assistant"
        data-testid="button-float-chat"
        className="fixed bottom-6 right-20 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-card border border-card-border shadow-lg hover-elevate"
      >
        <MessageCircle className="h-6 w-6 text-primary" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
            {unread}
          </span>
        )}
        </button>
      )}
    </>
  );
}
