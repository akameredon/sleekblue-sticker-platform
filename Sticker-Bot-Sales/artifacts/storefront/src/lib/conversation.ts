const KEY = "stickerlab.conversationId";

export function getStoredConversationId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function setStoredConversationId(id: number | null): void {
  if (typeof window === "undefined") return;
  if (id == null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, String(id));
}
