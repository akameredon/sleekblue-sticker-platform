/**
 * Chat.tsx — Full-page AI shopping assistant.
 *
 * Strategy: FloatingChat already handles streaming SSE, product cards,
 * mockup images, inline checkout with Paystack, and order confirmation.
 * Rather than duplicating that logic, this page simply sets the document title.
 * FloatingChat.tsx detects the "/chat" route and expands into a full-screen
 * chat interface overlay.
 */
import { useEffect } from "react";
import { useGetShopInfo } from "@workspace/api-client-react";

export function ChatPage() {
  const { data: shop } = useGetShopInfo();

  useEffect(() => {
    document.title = `Chat with Sticky — ${shop?.businessName ?? "Sticker Lab"}`;
  }, [shop?.businessName]);

  return null; // Rendered by FloatingChat natively now
}
