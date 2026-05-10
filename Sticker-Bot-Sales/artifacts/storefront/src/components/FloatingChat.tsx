import { useEffect, useRef, useState } from "react";
import { useGetShopInfo } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/paths";
import { getStoredConversationId, setStoredConversationId } from "@/lib/conversation";
import {
  MessageCircle, X, ArrowUp, Loader2, Sparkles, RotateCcw,
  ShoppingBag, Star, Package, CheckCircle2, ExternalLink, ImageIcon,
} from "lucide-react";

type ProductCard = {
  slug: string;
  name: string;
  tagline: string;
  basePrice: number;
  currency: string;
  imageUrl: string | null;
  rating: number;
  reviewCount: number;
  sizes: string[];
  finishes: string[];
  isBestseller: boolean;
};

type CheckoutItem = {
  productSlug: string;
  productName: string;
  sizeLabel: string;
  finishLabel: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
};

type UiPayload =
  | { type: "products"; data: ProductCard[] }
  | { type: "mockup"; url: string; description: string }
  | { type: "checkout"; items: CheckoutItem[]; total: number; currency: string; currencySymbol: string }
  | { type: "order_confirmed"; reference: string; total: number; currencySymbol: string; whatsappUrl: string };

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
  "What's the best deal for 500pcs?",
];

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-2.5 w-2.5 ${s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

function ProductCards({ products, onSelect }: { products: ProductCard[]; onSelect: (p: ProductCard) => void }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {products.map((p) => (
        <button
          key={p.slug}
          type="button"
          onClick={() => onSelect(p)}
          className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5 text-left hover-elevate transition-all group"
        >
          <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-muted-foreground">
                <Package className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold truncate">{p.name}</span>
              {p.isBestseller && (
                <span className="flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                  BEST
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{p.tagline}</p>
            <div className="mt-1 flex items-center gap-2">
              <StarRating rating={p.rating} />
              <span className="text-[10px] text-muted-foreground">({p.reviewCount})</span>
              <span className="ml-auto text-xs font-bold text-primary">from ₦{p.basePrice.toLocaleString("en-NG")}</span>
            </div>
          </div>
          <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUp className="h-3.5 w-3.5 rotate-90" />
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
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full"
      >
        <img
          src={url}
          alt={description}
          className={`w-full object-cover transition-all ${expanded ? "max-h-96" : "max-h-36"}`}
        />
      </button>
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ImageIcon className="h-3 w-3" />
          <span>AI Mockup — tap to expand</span>
        </div>
      </div>
    </div>
  );
}

function CheckoutForm({
  items,
  total,
  currencySymbol,
  onConfirmed,
}: {
  items: CheckoutItem[];
  total: number;
  currencySymbol: string;
  onConfirmed: (ref: string, total: number, sym: string, waUrl: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim() || !phone.trim()) { setError("Please fill in both fields"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/openai/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: name.trim(), customerPhone: phone.trim(), items }),
      });
      if (!res.ok) throw new Error("Order failed");
      const data = await res.json();
      onConfirmed(data.reference, data.total, data.currencySymbol ?? currencySymbol, data.whatsappUrl);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 w-full space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <ShoppingBag className="h-3.5 w-3.5 text-primary" />
        <span>Complete Your Order</span>
      </div>

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

      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number (e.g. 08012345678)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="text-[10px] text-destructive">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60 hover-elevate flex items-center justify-center gap-1.5"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {submitting ? "Placing order…" : "Confirm Order"}
        </button>
      </div>
    </div>
  );
}

function OrderConfirmed({ reference, total, currencySymbol, whatsappUrl }: {
  reference: string;
  total: number;
  currencySymbol: string;
  whatsappUrl: string;
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
      <div className="text-[11px] text-green-700">
        Total: <strong>{currencySymbol}{total.toLocaleString("en-NG")}</strong>
      </div>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-green-600 py-2 text-[11px] font-semibold text-white hover-elevate"
      >
        <ExternalLink className="h-3 w-3" />
        Continue on WhatsApp
      </a>
    </div>
  );
}

function UiBlock({
  payload,
  onProductSelect,
  onOrderConfirmed,
}: {
  payload: UiPayload;
  onProductSelect: (p: ProductCard) => void;
  onOrderConfirmed: (ref: string, total: number, sym: string, waUrl: string) => void;
}) {
  if (payload.type === "products") {
    return <ProductCards products={payload.data} onSelect={onProductSelect} />;
  }
  if (payload.type === "mockup") {
    return <MockupCard url={payload.url} description={payload.description} />;
  }
  if (payload.type === "checkout") {
    return (
      <CheckoutForm
        items={payload.items}
        total={payload.total}
        currencySymbol={payload.currencySymbol}
        onConfirmed={onOrderConfirmed}
      />
    );
  }
  if (payload.type === "order_confirmed") {
    return (
      <OrderConfirmed
        reference={payload.reference}
        total={payload.total}
        currencySymbol={payload.currencySymbol}
        whatsappUrl={payload.whatsappUrl}
      />
    );
  }
  return null;
}

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

  const appendUiToLast = (uiPayload: UiPayload) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") {
        next[next.length - 1] = {
          ...last,
          ui: [...(last.ui ?? []), uiPayload],
        };
      }
      return next;
    });
  };

  const replaceCheckoutWithConfirmed = (ref: string, total: number, sym: string, waUrl: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.role !== "assistant" || !msg.ui) return msg;
        return {
          ...msg,
          ui: msg.ui.map((u) =>
            u.type === "checkout"
              ? { type: "order_confirmed" as const, reference: ref, total, currencySymbol: sym, whatsappUrl: waUrl }
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

              if (json.ui) {
                appendUiToLast(json.ui as UiPayload);
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

  const handleProductSelect = (p: ProductCard) => {
    send(`Tell me more about ${p.name} — sizes, finishes, and pricing for 100 pieces`);
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
          className="fixed bottom-[84px] right-4 z-50 flex flex-col rounded-2xl border border-card-border bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-2"
          style={{ width: "min(420px, calc(100vw - 2rem))", maxHeight: "min(640px, calc(100vh - 120px))" }}
          data-testid="floating-chat"
        >
          {/* Header */}
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

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-[10px]">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm leading-relaxed">
                    Hey! I'm Sticky — your AI shopping assistant. Describe what you need and I'll find the perfect sticker, show you a mockup, and get you checked out right here. 🎨
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
                  {m.role === "assistant" && (
                    <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-primary text-primary-foreground mt-0.5">
                      <Sparkles className="h-3 w-3" />
                    </div>
                  )}
                  <div className={`flex flex-col gap-2 ${m.role === "user" ? "items-end max-w-[85%]" : "items-start w-full"}`}>
                    {m.content && (
                      <div
                        className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-tl-sm"
                        }`}
                      >
                        {m.content}
                        {m.streaming && (
                          <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle" />
                        )}
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
                        <UiBlock
                          payload={payload}
                          onProductSelect={handleProductSelect}
                          onOrderConfirmed={replaceCheckoutWithConfirmed}
                        />
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

          {/* Input */}
          <form
            className="border-t border-border p-2 flex gap-2 flex-shrink-0"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Describe what you need…"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="input-float-chat"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover-elevate"
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
        aria-label="Open AI Shopping Assistant"
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
    </>
  );
}
