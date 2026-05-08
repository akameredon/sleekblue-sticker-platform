import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import {
  CreateOpenaiConversationBody,
  DeleteOpenaiConversationParams,
  GetOpenaiConversationParams,
  GetOpenaiConversationResponse,
  ListOpenaiConversationsResponse,
  ListOpenaiMessagesParams,
  ListOpenaiMessagesResponse,
  SendOpenaiMessageBody,
  SendOpenaiMessageParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, schema } from "../lib/db";
import { getShopSettingsRow } from "../lib/shop";

const router: IRouter = Router();

const MODEL = "gpt-4o-mini";

async function buildSystemPrompt(): Promise<string> {
  const settings = await getShopSettingsRow();
  const products = await db
    .select()
    .from(schema.products)
    .orderBy(asc(schema.products.sortOrder));
  const categories = await db
    .select()
    .from(schema.categories)
    .orderBy(asc(schema.categories.sortOrder));

  const catLines = categories
    .map((c) => `- ${c.name} (${c.slug}): ${c.description}`)
    .join("\n");

  const prodLines = products
    .map((p) => {
      const tiers = p.quantityTiers
        .map((t) => `${t.label} ₦${t.unitPrice}/u`)
        .join("; ");
      const sizes = p.sizes.map((s) => s.label).join(", ");
      const finishes = p.finishes.map((f) => f.label).join(", ");
      return `- ${p.name} [${p.slug}] — ${p.tagline}. Base ₦${Number(p.basePrice).toLocaleString("en-NG")}. Sizes: ${sizes}. Finishes: ${finishes}. Tiers: ${tiers}.`;
    })
    .join("\n");

  return `You are the friendly, expert sales assistant for ${settings.businessName} — a vinyl die-cut sticker print shop based in ${settings.location}. Tagline: "${settings.tagline}".

Your job:
- Help customers pick the right sticker product, size, finish, and quantity.
- Quote prices in ${settings.currency} (${settings.currencySymbol}). Be specific. Use the quantity tiers below.
- Encourage volume orders when it saves them money — explain the savings.
- Mention lead time of about ${settings.leadTimeDays} business days.
- When the customer is ready to order, tell them to "tap the cart and we'll continue on WhatsApp at ${settings.whatsappDisplay}". Do NOT make up a different number.
- Keep responses short, warm, and concrete. No emojis. No markdown headings. Plain conversational text with line breaks where helpful.
- If asked about something outside stickers (e.g. unrelated products, politics), politely steer back.
- Never invent products that are not in the catalog. If asked for something we don't carry, say so and suggest the closest match.

CATEGORIES:
${catLines}

PRODUCTS (use these exact names and prices):
${prodLines}

DELIVERY: ${settings.deliveryNote ?? "Pickup in Lagos. Doorstep delivery quoted on WhatsApp."}
HOURS: ${settings.hours}
INSTAGRAM: ${settings.instagram ?? "n/a"}`;
}

router.get("/openai/conversations", async (_req, res) => {
  const rows = await db
    .select()
    .from(schema.conversations)
    .orderBy(desc(schema.conversations.createdAt));
  const data = ListOpenaiConversationsResponse.parse(rows);
  res.json(data);
});

router.post("/openai/conversations", async (req, res) => {
  const body = CreateOpenaiConversationBody.parse(req.body);
  const [row] = await db
    .insert(schema.conversations)
    .values({ title: body.title })
    .returning();
  res.status(201).json(row);
});

router.get("/openai/conversations/:id", async (req, res) => {
  const { id } = GetOpenaiConversationParams.parse(req.params);
  const [conv] = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, id))
    .limit(1);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const messages = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, id))
    .orderBy(asc(schema.messages.createdAt));
  const data = GetOpenaiConversationResponse.parse({ ...conv, messages });
  res.json(data);
});

router.delete("/openai/conversations/:id", async (req, res) => {
  const { id } = DeleteOpenaiConversationParams.parse(req.params);
  const result = await db
    .delete(schema.conversations)
    .where(eq(schema.conversations.id, id))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.status(204).end();
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
  const { id } = ListOpenaiMessagesParams.parse(req.params);
  const messages = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, id))
    .orderBy(asc(schema.messages.createdAt));
  const data = ListOpenaiMessagesResponse.parse(messages);
  res.json(data);
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  const { id } = SendOpenaiMessageParams.parse(req.params);
  const body = SendOpenaiMessageBody.parse(req.body);

  const [conv] = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, id))
    .limit(1);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Persist user message first
  await db.insert(schema.messages).values({
    conversationId: id,
    role: "user",
    content: body.content,
  });

  const history = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, id))
    .orderBy(asc(schema.messages.createdAt));

  const systemPrompt = await buildSystemPrompt();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (payload: object) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  let fullText = "";
  try {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullText += delta;
        send({ delta });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    send({ error: message });
    res.write("data: [DONE]\n\n");
    res.end();
    return;
  }

  // Persist the assistant message
  if (fullText.trim().length > 0) {
    await db.insert(schema.messages).values({
      conversationId: id,
      role: "assistant",
      content: fullText,
    });
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
