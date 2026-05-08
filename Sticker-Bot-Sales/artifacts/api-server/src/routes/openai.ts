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
import { calculateQuote, DEFAULT_SIZES, DEFAULT_FINISHES, DEFAULT_QUANTITY_TIERS } from "../lib/pricing";

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
- When a customer asks for a price or quote, ALWAYS call the calculate_quote tool with the relevant parameters instead of guessing. This gives them a real, live price.
- Quote prices in ${settings.currency} (${settings.currencySymbol}). Be specific. Use the quantity tiers below.
- Encourage volume orders when it saves them money — explain the savings.
- Mention lead time of about ${settings.leadTimeDays} business days.
- When the customer is ready to order, tell them to "tap the cart and we'll continue on WhatsApp at ${settings.whatsappDisplay}". Do NOT make up a different number.
- Keep responses short, warm, and concrete. No markdown headings. Plain conversational text with line breaks where helpful.
- If asked about something outside stickers (e.g. unrelated products, politics), politely steer back.
- Never invent products that are not in the catalog. If asked for something we don't carry, say so and suggest the closest match.
- When you call calculate_quote, summarize the result clearly: state the unit price, total, and any savings.

CATEGORIES:
${catLines}

PRODUCTS (use these exact slugs):
${prodLines}

DELIVERY: ${settings.deliveryNote ?? "Pickup in Lagos. Doorstep delivery quoted on WhatsApp."}
HOURS: ${settings.hours}
INSTAGRAM: ${settings.instagram ?? "n/a"}`;
}

const TOOLS: Parameters<typeof openai.chat.completions.create>[0]["tools"] = [
  {
    type: "function",
    function: {
      name: "calculate_quote",
      description:
        "Calculate a live price quote for a sticker order. Always call this when the customer asks for a price, quote, or cost estimate. Returns unit price, total, savings note, and lead time.",
      parameters: {
        type: "object",
        required: ["productSlug", "sizeLabel", "finishLabel", "quantity"],
        properties: {
          productSlug: {
            type: "string",
            description: "Exact product slug from the catalog (e.g. 'die-cut-stickers', 'holographic-stickers')",
          },
          sizeLabel: {
            type: "string",
            enum: ["Small", "Medium", "Large", "Custom"],
            description: "Size tier. Use 'Custom' if the customer specifies exact dimensions.",
          },
          finishLabel: {
            type: "string",
            enum: ["Matte", "Gloss", "Holographic"],
            description: "Surface finish",
          },
          quantity: {
            type: "number",
            description: "Number of stickers",
          },
          widthMm: {
            type: "number",
            description: "Custom width in mm — only needed when sizeLabel is 'Custom'",
          },
          heightMm: {
            type: "number",
            description: "Custom height in mm — only needed when sizeLabel is 'Custom'",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_products",
      description:
        "List all available sticker products in the catalog. Call this when a customer asks what products or sticker types are available.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_info",
      description:
        "Get detailed information about a specific product by slug, including all sizes, finishes, and pricing tiers.",
      parameters: {
        type: "object",
        required: ["productSlug"],
        properties: {
          productSlug: {
            type: "string",
            description: "The product slug (e.g. 'die-cut-stickers')",
          },
        },
      },
    },
  },
];

async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  settings: Awaited<ReturnType<typeof getShopSettingsRow>>,
): Promise<string> {
  if (name === "list_products") {
    const products = await db.select().from(schema.products).orderBy(asc(schema.products.sortOrder));
    return JSON.stringify(
      products.map((p) => ({
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        basePrice: p.basePrice,
        sizes: p.sizes.map((s) => s.label),
        finishes: p.finishes.map((f) => f.label),
      })),
    );
  }

  if (name === "get_product_info") {
    const slug = String(args.productSlug ?? "");
    const [product] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, slug))
      .limit(1);
    if (!product) return JSON.stringify({ error: "Product not found" });
    return JSON.stringify({
      slug: product.slug,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      sizes: product.sizes,
      finishes: product.finishes,
      quantityTiers: product.quantityTiers,
      material: product.material,
    });
  }

  if (name === "calculate_quote") {
    const productSlug = String(args.productSlug ?? "");
    let product = null;
    if (productSlug) {
      const [row] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.slug, productSlug))
        .limit(1);
      product = row ?? null;
    }

    const input = {
      productSlug,
      sizeLabel: String(args.sizeLabel ?? "Medium"),
      finishLabel: String(args.finishLabel ?? "Matte"),
      quantity: Number(args.quantity ?? 50),
      widthMm: args.widthMm != null ? Number(args.widthMm) : undefined,
      heightMm: args.heightMm != null ? Number(args.heightMm) : undefined,
    };

    const quote = calculateQuote(input, product, settings.leadTimeDays);
    return JSON.stringify({
      productSlug: quote.productSlug,
      productName: quote.productName,
      sizeLabel: quote.sizeLabel,
      finishLabel: quote.finishLabel,
      quantity: quote.quantity,
      unitPrice: quote.unitPrice,
      subtotal: quote.subtotal,
      total: quote.total,
      currency: quote.currency,
      currencySymbol: quote.currencySymbol,
      leadTimeDays: quote.leadTimeDays,
      savingsNote: quote.savingsNote ?? null,
      breakdown: quote.breakdown,
    });
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
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
  const settings = await getShopSettingsRow();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (payload: object) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  type ChatMessage = Parameters<typeof openai.chat.completions.create>[0]["messages"][number];

  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  let fullText = "";

  try {
    let continueLoop = true;

    while (continueLoop) {
      const stream = await openai.chat.completions.create({
        model: MODEL,
        stream: true,
        messages: chatMessages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.7,
      });

      let accDelta = "";
      const toolCallAccumulator: Record<number, { id: string; name: string; argsStr: string }> = {};
      let finishReason: string | null = null;

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;
        finishReason = choice.finish_reason ?? finishReason;

        const delta = choice.delta;

        if (delta?.content) {
          accDelta += delta.content;
          fullText += delta.content;
          send({ delta: delta.content });
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!toolCallAccumulator[idx]) {
              toolCallAccumulator[idx] = {
                id: tc.id ?? "",
                name: tc.function?.name ?? "",
                argsStr: "",
              };
            }
            if (tc.id) toolCallAccumulator[idx]!.id = tc.id;
            if (tc.function?.name) toolCallAccumulator[idx]!.name = tc.function.name;
            if (tc.function?.arguments) toolCallAccumulator[idx]!.argsStr += tc.function.arguments;
          }
        }
      }

      const toolCalls = Object.values(toolCallAccumulator);

      if (finishReason === "tool_calls" && toolCalls.length > 0) {
        const assistantToolMessage: ChatMessage = {
          role: "assistant",
          content: accDelta || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.argsStr },
          })),
        };
        chatMessages.push(assistantToolMessage);

        for (const tc of toolCalls) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.argsStr); } catch { /* ignore */ }

          send({ tool_call: { name: tc.name, args } });

          const toolResult = await handleToolCall(tc.name, args, settings);

          const toolResultMessage: ChatMessage = {
            role: "tool",
            tool_call_id: tc.id,
            content: toolResult,
          };
          chatMessages.push(toolResultMessage);
        }
      } else {
        continueLoop = false;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    send({ error: message });
    res.write("data: [DONE]\n\n");
    res.end();
    return;
  }

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
