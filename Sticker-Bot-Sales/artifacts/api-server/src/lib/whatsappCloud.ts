/**
 * whatsappCloud.ts — Meta WhatsApp Cloud API adapter.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 * Env:
 *   WHATSAPP_PHONE_NUMBER_ID — from Meta Business Dashboard
 *   WHATSAPP_ACCESS_TOKEN    — System user permanent token
 *   WHATSAPP_VERIFY_TOKEN    — any string you choose for webhook verification
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const API_VERSION = "v19.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

/** Generic Meta Graph API caller */
async function metaFetch<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error("WhatsApp Cloud API is not configured (missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN)");
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Send a text message to a WhatsApp number.
 * to: E.164 format without '+' e.g. "2348012345678"
 */
export async function sendTextMessage(to: string, text: string): Promise<{ messages: [{ id: string }] }> {
  return metaFetch("POST", `/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text, preview_url: false },
  });
}

/**
 * Send an interactive button message (up to 3 buttons).
 */
export async function sendButtonMessage(
  to: string,
  body: string,
  buttons: { id: string; title: string }[],
): Promise<{ messages: [{ id: string }] }> {
  return metaFetch("POST", `/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

/**
 * Mark a message as read (shows blue ticks to customer).
 */
export async function markMessageRead(messageId: string): Promise<void> {
  await metaFetch("POST", `/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}

/**
 * Parse an inbound webhook payload from Meta.
 * Returns array of {from, messageId, type, text, mediaId}.
 */
export type InboundMessage = {
  from: string;
  messageId: string;
  type: "text" | "image" | "document" | "interactive" | "other";
  text?: string;
  mediaId?: string;
  buttonPayload?: string;
};

export function parseWebhookPayload(body: unknown): InboundMessage[] {
  const results: InboundMessage[] = [];
  try {
    const b = body as Record<string, unknown>;
    const entry = (b.entry as unknown[]) ?? [];
    for (const e of entry) {
      const changes = ((e as Record<string, unknown>).changes as unknown[]) ?? [];
      for (const ch of changes) {
        const val = (ch as Record<string, unknown>).value as Record<string, unknown>;
        const messages = (val?.messages as unknown[]) ?? [];
        for (const msg of messages) {
          const m = msg as Record<string, unknown>;
          const type = String(m.type ?? "other") as InboundMessage["type"];
          const from = String(m.from ?? "");
          const messageId = String(m.id ?? "");
          let text: string | undefined;
          let mediaId: string | undefined;
          let buttonPayload: string | undefined;

          if (type === "text") {
            text = String((m.text as Record<string, unknown>)?.body ?? "");
          } else if (type === "image" || type === "document") {
            mediaId = String((m[type] as Record<string, unknown>)?.id ?? "");
          } else if (type === "interactive") {
            const inter = m.interactive as Record<string, unknown>;
            const reply = (inter?.button_reply ?? inter?.list_reply) as Record<string, unknown> | undefined;
            buttonPayload = String(reply?.id ?? "");
            text = String(reply?.title ?? "");
          }

          results.push({ from, messageId, type, text, mediaId, buttonPayload });
        }
      }
    }
  } catch { /* malformed payload — skip */ }
  return results;
}

/** Check if WhatsApp is configured */
export function isWhatsAppConfigured(): boolean {
  return Boolean(PHONE_NUMBER_ID && ACCESS_TOKEN);
}

export const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "stickerlabverify";
