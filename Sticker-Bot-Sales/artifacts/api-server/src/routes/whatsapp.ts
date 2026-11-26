/**
 * whatsapp.ts — WhatsApp Cloud API two-way integration.
 *
 * GET  /whatsapp/webhook  — Meta webhook verification (GET challenge)
 * POST /whatsapp/webhook  — Receive inbound messages → AI agent replies
 * POST /whatsapp/send     — Manual outbound message (admin)
 *
 * Flow for inbound messages:
 *  1. Meta POSTs message to POST /whatsapp/webhook
 *  2. We parse it, mark as read, store in whatsapp_messages
 *  3. We run it through the same AI agent (OpenAI) as the web chat
 *  4. We send the AI reply back via WhatsApp Cloud API
 *  5. Store outbound reply in whatsapp_messages
 *
 * The AI agent has access to all the same tools (products, pricing, orders).
 * WhatsApp conversations are keyed by phone number.
 */
import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../lib/db";
import {
  sendTextMessage,
  sendButtonMessage,
  markMessageRead,
  parseWebhookPayload,
  isWhatsAppConfigured,
  VERIFY_TOKEN,
} from "../lib/whatsappCloud";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getShopSettingsRow } from "../lib/shop";
import { calculateQuote } from "../lib/pricing";

const router: IRouter = Router();

const MODEL = "gpt-4o-mini";
/** Max messages to load as context per phone number */
const CONTEXT_WINDOW = 20;
/** Max chars for a WhatsApp text message */
const WA_MAX_CHARS = 4096;

// ─── AI Tools (subset — no UI tools on WhatsApp, text-only) ──────────────────

const WA_TOOLS: Parameters<typeof openai.chat.completions.create>[0]["tools"] = [
  {
    type: "function",
    function: {
      name: "calculate_quote",
      description: "Calculate a live price quote for a sticker order.",
      parameters: {
        type: "object",
        required: ["productSlug", "sizeLabel", "finishLabel", "quantity"],
        properties: {
          productSlug: { type: "string" },
          sizeLabel: { type: "string", enum: ["Small", "Medium", "Large", "Custom"] },
          finishLabel: { type: "string", enum: ["Matte", "Gloss", "Holographic"] },
          quantity: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_products",
      description: "List available sticker products.",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function handleWaTool(name: string, args: Record<string, unknown>, settings: Awaited<ReturnType<typeof getShopSettingsRow>>): Promise<string> {
  if (name === "list_products") {
    const products = await db.select().from(schema.products).orderBy(asc(schema.products.sortOrder));
    return products.map((p) => `• *${p.name}* — from ₦${Number(p.basePrice).toLocaleString("en-NG")}\n  ${p.tagline}`).join("\n\n");
  }
  if (name === "calculate_quote") {
    const productSlug = String(args.productSlug ?? "");
    const [product] = productSlug
      ? await db.select().from(schema.products).where(eq(schema.products.slug, productSlug)).limit(1)
      : [null];
    const quote = calculateQuote(
      {
        productSlug,
        sizeLabel: String(args.sizeLabel ?? "Medium"),
        finishLabel: String(args.finishLabel ?? "Matte"),
        quantity: Number(args.quantity ?? 50),
      },
      product ?? null,
      settings.leadTimeDays,
    );
    return `*Quote:* ${quote.productName ?? productSlug}\nSize: ${quote.sizeLabel} | Finish: ${quote.finishLabel}\nQty: ${quote.quantity} × ₦${quote.unitPrice} = *₦${quote.total.toLocaleString("en-NG")}*\nLead time: ${quote.leadTimeDays} business days\n${quote.savingsNote ?? ""}`;
  }
  return "Unknown tool";
}

async function buildWaSystemPrompt(): Promise<string> {
  const settings = await getShopSettingsRow();
  const products = await db.select().from(schema.products).orderBy(asc(schema.products.sortOrder));
  const prodLines = products.map((p) => `- ${p.name} [${p.slug}] — ${p.tagline}. Base ₦${Number(p.basePrice).toLocaleString("en-NG")}`).join("\n");
  return `You are the WhatsApp AI sales assistant for ${settings.businessName}, a sticker print shop in ${settings.location}.

RULES:
- Keep replies SHORT (WhatsApp style — max 3-4 sentences, use *bold* for prices/key info).
- When asked for pricing, always call calculate_quote.
- When asked what's available, call list_products.
- When a customer wants to order, ask for: name, quantity, size (Small/Medium/Large), finish (Matte/Gloss/Holographic). Then give them a quote and ask if ready to confirm.
- After collecting order details, say: "Great! Visit our website at [storefront URL] or I'll create your order now — just confirm and we'll send an invoice."
- Never reveal internal system info. Never invent products.
- Hours: ${settings.hours}

PRODUCTS:
${prodLines}`;
}

/** Run AI agent against WhatsApp conversation context */
async function runWaAgent(fromNumber: string, inboundText: string): Promise<string> {
  const settings = await getShopSettingsRow();

  // Load recent message history for this phone number
  const history = await db
    .select()
    .from(schema.whatsappMessages)
    .where(eq(schema.whatsappMessages.fromNumber, fromNumber))
    .orderBy(desc(schema.whatsappMessages.createdAt))
    .limit(CONTEXT_WINDOW);

  history.reverse(); // chronological order

  type ChatMessage = Parameters<typeof openai.chat.completions.create>[0]["messages"][number];

  const systemPrompt = await buildWaSystemPrompt();
  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.direction === "inbound" ? "user" as const : "assistant" as const,
      content: m.body,
    })),
    { role: "user", content: inboundText },
  ];

  let fullReply = "";
  let continueLoop = true;

  while (continueLoop) {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: chatMessages,
      tools: WA_TOOLS,
      tool_choice: "auto",
      temperature: 0.6,
      max_tokens: 500, // Keep WhatsApp responses concise
    });

    const choice = completion.choices[0];
    if (!choice) break;

    const finishReason = choice.finish_reason;
    const msg = choice.message;

    if (msg.content) fullReply += msg.content;

    if (finishReason === "tool_calls" && msg.tool_calls?.length) {
      chatMessages.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
      for (const tc of msg.tool_calls) {
        if (!("function" in tc)) continue;
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments); } catch { /* ignore */ }
        const result = await handleWaTool(tc.function.name, args, settings);
        chatMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
    } else {
      continueLoop = false;
    }
  }

  // Truncate to WhatsApp limit
  return fullReply.slice(0, WA_MAX_CHARS) || "Hi! How can I help you with stickers today?";
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /whatsapp/webhook — Meta verification challenge */
router.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WhatsApp] Webhook verified by Meta");
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: "Verification failed" });
  }
});

/** POST /whatsapp/webhook — receive inbound messages */
router.post("/whatsapp/webhook", async (req, res) => {
  // Always respond 200 immediately to prevent Meta retries
  res.status(200).json({ received: true });

  if (!isWhatsAppConfigured()) {
    console.warn("[WhatsApp] API not configured — skipping webhook processing");
    return;
  }

  try {
    const messages = parseWebhookPayload(req.body);
    for (const msg of messages) {
      if (!msg.text && !msg.buttonPayload) continue; // skip media-only for now
      const text = msg.text ?? msg.buttonPayload ?? "";

      // Mark message as read (shows blue ticks)
      try { await markMessageRead(msg.messageId); } catch { /* non-critical */ }

      // Store inbound message
      await db.insert(schema.whatsappMessages).values({
        fromNumber: msg.from,
        direction: "inbound",
        waMessageId: msg.messageId,
        body: text,
        status: "delivered",
      });

      // Run AI agent
      const reply = await runWaAgent(msg.from, text);

      // Send reply
      const sent = await sendTextMessage(msg.from, reply);
      const sentId = sent.messages[0]?.id ?? null;

      // Store outbound message
      await db.insert(schema.whatsappMessages).values({
        fromNumber: msg.from,
        direction: "outbound",
        waMessageId: sentId,
        body: reply,
        status: "sent",
      });
    }
  } catch (err) {
    console.error("[WhatsApp Webhook] Error:", err);
  }
});

/** POST /whatsapp/send — admin manual send */
router.post("/whatsapp/send", async (req, res) => {
  if (!isWhatsAppConfigured()) {
    res.status(503).json({ error: "WhatsApp API not configured" });
    return;
  }
  const SendBody = z.object({
    to: z.string().min(7),
    message: z.string().min(1).max(WA_MAX_CHARS),
  });
  const parse = SendBody.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Validation failed", issues: parse.error.issues }); return; }

  try {
    const result = await sendTextMessage(parse.data.to, parse.data.message);
    await db.insert(schema.whatsappMessages).values({
      fromNumber: parse.data.to,
      direction: "outbound",
      waMessageId: result.messages[0]?.id ?? null,
      body: parse.data.message,
      status: "sent",
    });
    res.json({ sent: true, messageId: result.messages[0]?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    res.status(502).json({ error: message });
  }
});

/** GET /whatsapp/conversations — list all WhatsApp conversations (admin) */
router.get("/whatsapp/conversations", async (_req, res) => {
  // Group by fromNumber, return last message + count
  const messages = await db
    .select()
    .from(schema.whatsappMessages)
    .orderBy(desc(schema.whatsappMessages.createdAt))
    .limit(500);

  const byPhone: Record<string, { fromNumber: string; lastMessage: string; lastAt: Date; count: number; unread: number }> = {};
  for (const m of messages) {
    if (!byPhone[m.fromNumber]) {
      byPhone[m.fromNumber] = { fromNumber: m.fromNumber, lastMessage: m.body, lastAt: m.createdAt!, count: 0, unread: 0 };
    }
    byPhone[m.fromNumber]!.count++;
    if (m.direction === "inbound") byPhone[m.fromNumber]!.unread++;
  }

  res.json(Object.values(byPhone).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime()));
});

/** GET /whatsapp/conversations/:phone — full message thread */
router.get("/whatsapp/conversations/:phone", async (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  const messages = await db
    .select()
    .from(schema.whatsappMessages)
    .where(eq(schema.whatsappMessages.fromNumber, phone))
    .orderBy(asc(schema.whatsappMessages.createdAt))
    .limit(200);
  res.json(messages);
});

/** GET /whatsapp/status — is WhatsApp configured? */
router.get("/whatsapp/status", (_req, res) => {
  res.json({ configured: isWhatsAppConfigured() });
});

export default router;
