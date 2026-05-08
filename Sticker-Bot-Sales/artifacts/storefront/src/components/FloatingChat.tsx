import { useEffect, useRef, useState } from "react";
import { useGetShopInfo } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/paths";
import { getStoredConversationId, setStoredConversationId } from "@/lib/conversation";
import { MessageCircle, X, ArrowUp, Loader2, Sparkles, RotateCcw } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; streaming?: boolean };

const QUICK_ACTIONS = [
  "What stickers do you make?",
  "How much for 100 die-cuts?",
  "Turnaround time?",
  "Do you do holographic?",
];

export function FloatingChat() {
  const { data: shop } = useGetShopInfo();
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

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
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Try again?" }]);
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
      {open ? (
        <div
          className="fixed bottom-[84px] right-4 z-50 flex w-[340px] flex-col rounded-2xl border border-card-border bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-2"
          style={{ maxHeight: "min(560px, calc(100vh - 120px))" }}
          data-testid="floating-chat"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">Sticky AI</div>
                <div className="text-[11px] text-muted-foreground">{shop?.businessName ?? "Sticker Lab"}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 ? (
                <button type="button" onClick={reset} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover-elevate" aria-label="New chat">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button type="button" onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover-elevate" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin" style={{ minHeight: 200 }}>
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-[10px]">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm">
                    Hi! I'm Sticky. Ask me anything — pricing, finishes, lead times, or a custom quote.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pl-8">
                  {QUICK_ACTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
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
                  {m.role === "assistant" ? (
                    <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-primary text-primary-foreground mt-0.5">
                      <Sparkles className="h-3 w-3" />
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}
                  >
                    {m.content}
                    {m.streaming ? <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle" /> : null}
                    {m.role === "assistant" && !m.content && !m.streaming ? (
                      <span className="inline-flex items-center gap-1">
                        {[0, 120, 240].map((d) => (
                          <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            {sending && messages[messages.length - 1]?.role === "user" ? (
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
            ) : null}
          </div>

          <form
            className="border-t border-border p-2 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask about pricing, finishes…"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="input-float-chat"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover-elevate"
              data-testid="button-float-send"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open chat"
        data-testid="button-float-chat"
        className="fixed bottom-6 right-20 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-card border border-card-border shadow-lg hover-elevate"
      >
        <MessageCircle className="h-6 w-6 text-primary" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
            {unread}
          </span>
        ) : null}
      </button>
    </>
  );
}
