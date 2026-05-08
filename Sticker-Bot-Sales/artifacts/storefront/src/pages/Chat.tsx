import { useEffect, useRef, useState } from "react";
import { useGetShopInfo, useGetOpenaiConversation, useCreateOpenaiConversation } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Loader2, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import { getStoredConversationId, setStoredConversationId } from "@/lib/conversation";
import { apiUrl } from "@/lib/paths";
import type { OpenaiMessage } from "@workspace/api-client-react";

const SUGGESTIONS = [
  "I need 100 die-cut logo stickers, ~7cm. What will it cost?",
  "What's the difference between matte, glossy, and holographic?",
  "Can you do a kiss-cut sheet of 12 mini illustrations?",
  "What's your turnaround time for an order of 500?",
];

export function ChatPage() {
  const { data: shop } = useGetShopInfo();
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<number | null>(getStoredConversationId());
  const createConv = useCreateOpenaiConversation();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamErr, setStreamErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data: conversation, refetch } = useGetOpenaiConversation(conversationId ?? 0, {
    query: { enabled: !!conversationId } as never,
  });
  const messages: OpenaiMessage[] = conversation?.messages ?? [];

  // Scroll on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, streamingText]);

  const ensureConversation = async (firstMessage: string): Promise<number> => {
    if (conversationId) return conversationId;
    const conv = await createConv.mutateAsync({
      data: { title: firstMessage.slice(0, 60) || "New conversation" },
    });
    setConversationId(conv.id);
    setStoredConversationId(conv.id);
    return conv.id;
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setStreamErr(null);
    setStreamingText("");
    setInput("");
    try {
      const id = await ensureConversation(content);
      await refetch();

      const ac = new AbortController();
      abortRef.current = ac;
      const res = await fetch(apiUrl(`/openai/conversations/${id}/messages`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ content }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Request failed (${res.status})`);
      }
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
                setStreamingText(acc);
              } else if (typeof json.error === "string") {
                throw new Error(json.error);
              }
            } catch {
              /* ignore non-json keepalives */
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setStreamErr(msg);
    } finally {
      setSending(false);
      abortRef.current = null;
      setStreamingText("");
      // Refetch the conversation so the persisted assistant message appears
      await queryClient.invalidateQueries();
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setStoredConversationId(null);
    setConversationId(null);
    setStreamingText("");
    setStreamErr(null);
    setInput("");
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10" style={{ minHeight: "calc(100vh - 64px)" }}>
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Assistant</div>
          <h1 className="mt-0.5 font-serif text-2xl font-semibold md:text-3xl">Talk to Sticky</h1>
          <p className="text-sm text-muted-foreground">
            Ask about pricing, finishes, lead times — or sketch a custom order.
          </p>
        </div>
        {conversationId ? (
          <Button variant="outline" size="sm" onClick={reset} data-testid="button-chat-reset">
            <RotateCcw className="h-4 w-4" />
            New chat
          </Button>
        ) : null}
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-card-border bg-card p-4 scrollbar-thin md:p-6"
        style={{ minHeight: 360 }}
        data-testid="chat-scroll"
      >
        {messages.length === 0 && !streamingText ? (
          <Welcome onPick={(s) => send(s)} />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m) => (
              <Bubble key={m.id} role={m.role} content={m.content} />
            ))}
            {streamingText ? <Bubble role="assistant" content={streamingText} streaming /> : null}
            {sending && !streamingText ? (
              <Bubble role="assistant" content="" loading />
            ) : null}
          </div>
        )}
      </div>

      {streamErr ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {streamErr}
        </div>
      ) : null}

      <form
        className="flex items-end gap-2 rounded-2xl border border-card-border bg-card p-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Tell me what you're trying to make…"
          rows={1}
          className="min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          data-testid="input-chat"
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()} data-testid="button-send">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </Button>
      </form>

      <p className="text-center text-[11px] text-muted-foreground">
        Quotes are estimates — final price confirmed on WhatsApp ({shop?.whatsappDisplay ?? "+234 …"}).
      </p>
    </div>
  );
}

function Welcome({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-accent" />
        Hi, I'm Sticky — your sticker concierge.
      </div>
      <p className="font-serif text-xl">
        Ask me about pricing, finishes, lead times, or a custom shape.
      </p>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-xl border border-border bg-background px-4 py-3 text-left text-sm hover-elevate"
            data-testid={`button-suggest-${s.slice(0, 12).replace(/\W+/g, "-").toLowerCase()}`}
          >
            <MessageCircle className="mb-1.5 inline-block h-3.5 w-3.5 text-muted-foreground" />
            <div>{s}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({
  role,
  content,
  streaming,
  loading,
}: {
  role: string;
  content: string;
  streaming?: boolean;
  loading?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-primary text-primary-foreground sticker-rotate-2">
          <Sparkles className="h-4 w-4" />
        </div>
      ) : null}
      <div
        className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        }`}
        data-testid={`message-${role}`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60" style={{ animationDelay: "120ms" }} />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60" style={{ animationDelay: "240ms" }} />
          </span>
        ) : (
          <>
            {content}
            {streaming ? <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-current align-middle" /> : null}
          </>
        )}
      </div>
      {isUser ? (
        <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground font-semibold text-xs">
          You
        </div>
      ) : null}
    </div>
  );
}
