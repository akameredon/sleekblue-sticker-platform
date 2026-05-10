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
import { buildWhatsappMessage, buildWhatsappUrl } from "../lib/whatsapp";

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

  return `You are an expert AI shopping assistant for ${settings.businessName}, a sticker print shop based in ${settings.location}. Tagline: "${settings.tagline}".

YOUR MISSION: Help customers go from "I have an idea" to a confirmed order — entirely inside this chat.

HOW TO BEHAVE:
1. When a customer describes what they want (e.g. "stickers for my food business"), IMMEDIATELY call recommend_products to show them matching products visually.
2. When they want to see what their sticker could look like, call generate_mockup to show them a preview image.
3. When they ask for a price or quote, ALWAYS call calculate_quote with the relevant parameters.
4. When a customer says they want to order, are ready, or says "let's do it" / "yes" / "I'll take it", call start_checkout to initiate the in-chat checkout flow.
5. Never tell the customer to "go to WhatsApp" or "visit the website" — everything happens right here.
6. Keep responses short, warm, and action-oriented. No long essays.
7. Quote prices in ${settings.currency} (${settings.currencySymbol}).
8. Lead time is ${settings.leadTimeDays} business days.
9. Never invent products not in the catalog.

TOOLS AVAILABLE:
- recommend_products: Show visual product cards that match customer's needs
- generate_mockup: Create a sticker design preview based on their description
- calculate_quote: Get live pricing for any product/size/finish/quantity
- start_checkout: Launch the in-chat checkout form when customer is ready to buy

CATEGORIES:
${catLines}

PRODUCTS (use these exact slugs when calling tools):
${prodLines}

DELIVERY: ${settings.deliveryNote ?? "Pickup in Lagos. Doorstep delivery quoted on WhatsApp."}
HOURS: ${settings.hours}`;
}

const TOOLS: Parameters<typeof openai.chat.completions.create>[0]["tools"] = [
  {
    type: "function",
    function: {
      name: "recommend_products",
      description:
        "Search and display product recommendation cards based on what the customer described. Call this whenever a customer mentions a use case, business type, occasion, or describes what they want to print. Always call this before suggesting specific products.",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: {
            type: "string",
            description: "The customer's use case or description (e.g. 'food brand packaging', 'birthday party stickers', 'logo stickers for my clothing brand')",
          },
          maxResults: {
            type: "number",
            description: "Max products to show (default 3)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_mockup",
      description:
        "Generate a visual sticker design preview/mockup image based on the customer's description. Call this when the customer asks 'what would it look like', 'can I see a preview', 'I don't have a design', or wants a try-on. Returns an image they can see instantly.",
      parameters: {
        type: "object",
        required: ["description"],
        properties: {
          description: {
            type: "string",
            description: "What the sticker should look like — include style, colors, text, theme",
          },
          brandName: {
            type: "string",
            description: "Brand or business name to include in the design (if any)",
          },
          style: {
            type: "string",
            enum: ["modern", "playful", "minimal", "bold", "elegant", "retro"],
            description: "Visual style of the sticker",
          },
          finish: {
            type: "string",
            description: "Finish type e.g. holographic, matte, gloss (affects prompt styling)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_quote",
      description:
        "Calculate a live price quote for a sticker order. Always call this when the customer asks for a price, quote, or cost estimate.",
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
            description: "Size tier.",
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
          widthMm: { type: "number" },
          heightMm: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_products",
      description:
        "List all available sticker products in the catalog.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_info",
      description:
        "Get detailed information about a specific product by slug.",
      parameters: {
        type: "object",
        required: ["productSlug"],
        properties: {
          productSlug: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "start_checkout",
      description:
        "Launch the in-chat checkout form when a customer is ready to place an order. Call this when they confirm they want to buy, say 'yes', 'let's do it', 'order now', 'I'll take it', or similar. This shows a checkout form directly inside the conversation.",
      parameters: {
        type: "object",
        required: ["productSlug", "productName", "sizeLabel", "finishLabel", "quantity", "unitPrice"],
        properties: {
          productSlug: { type: "string" },
          productName: { type: "string" },
          sizeLabel: { type: "string" },
          finishLabel: { type: "string" },
          quantity: { type: "number" },
          unitPrice: { type: "number", description: "Price per unit in Naira" },
          notes: { type: "string", description: "Any special instructions" },
        },
      },
    },
  },
];

function generateReference(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `SL-${ts}${rand}`;
}

function buildPublicArtworkUrl(
  req: { protocol: string; get: (h: string) => string | undefined },
  objectPath: string,
) {
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "";
  const proto = req.get("x-forwarded-proto") ?? req.protocol ?? "https";
  const path = objectPath.startsWith("/") ? objectPath : `/${objectPath}`;
  return `${proto}://${host}/api/storage${path}`;
}

async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  settings: Awaited<ReturnType<typeof getShopSettingsRow>>,
  sendUi: (payload: object) => void,
): Promise<string> {
  if (name === "recommend_products") {
    const query = String(args.query ?? "").toLowerCase();
    const maxResults = Number(args.maxResults ?? 3);

    const allProducts = await db
      .select()
      .from(schema.products)
      .orderBy(asc(schema.products.sortOrder));

    const scored = allProducts.map((p) => {
      const text = `${p.name} ${p.tagline} ${p.description} ${p.tags?.join(" ")} ${p.categorySlug}`.toLowerCase();
      const queryWords = query.split(/\s+/).filter(Boolean);
      const score = queryWords.filter((w) => text.includes(w)).length;
      return { p, score };
    });

    scored.sort((a, b) => b.score - a.score || (b.p.isFeatured ? 1 : 0) - (a.p.isFeatured ? 1 : 0));
    const top = scored.slice(0, maxResults).map(({ p }) => ({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      basePrice: Number(p.basePrice),
      currency: p.currency,
      imageUrl: p.imageUrl,
      rating: Number(p.rating),
      reviewCount: p.reviewCount,
      sizes: p.sizes.map((s: { label: string }) => s.label),
      finishes: p.finishes.map((f: { label: string }) => f.label),
      isBestseller: p.isBestseller,
    }));

    sendUi({ type: "products", data: top });
    return JSON.stringify({ shown: top.map((p) => p.slug), count: top.length });
  }

  if (name === "generate_mockup") {
    const description = String(args.description ?? "custom sticker");
    const brandName = args.brandName ? String(args.brandName) : null;
    const style = String(args.style ?? "modern");
    const finish = String(args.finish ?? "");

    const finishNote = finish ? `, ${finish} finish look` : "";
    const brandNote = brandName ? ` for "${brandName}"` : "";
    const prompt = `A professional sticker design mockup${brandNote}: ${description}. Style: ${style}. Die-cut shape, clean edges, on white background, high detail, print-ready, flat lay product photo${finishNote}. No text unless specified in description.`;

    try {
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
      });

      const b64 = response.data[0]?.b64_json;
      if (!b64) throw new Error("No image returned");

      const imageDataUrl = `data:image/png;base64,${b64}`;
      sendUi({ type: "mockup", url: imageDataUrl, description });
      return JSON.stringify({ success: true, description });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Image generation failed";
      return JSON.stringify({ success: false, error: msg });
    }
  }

  if (name === "list_products") {
    const products = await db.select().from(schema.products).orderBy(asc(schema.products.sortOrder));
    return JSON.stringify(
      products.map((p) => ({
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        basePrice: p.basePrice,
        sizes: p.sizes.map((s: { label: string }) => s.label),
        finishes: p.finishes.map((f: { label: string }) => f.label),
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

  if (name === "start_checkout") {
    const productSlug = String(args.productSlug ?? "");
    const productName = String(args.productName ?? "Sticker Order");
    const sizeLabel = String(args.sizeLabel ?? "Medium");
    const finishLabel = String(args.finishLabel ?? "Matte");
    const quantity = Number(args.quantity ?? 0);
    const unitPrice = Number(args.unitPrice ?? 0);
    const notes = args.notes ? String(args.notes) : undefined;
    const lineTotal = unitPrice * quantity;

    sendUi({
      type: "checkout",
      items: [{ productSlug, productName, sizeLabel, finishLabel, quantity, unitPrice, lineTotal, notes }],
      total: lineTotal,
      currency: "NGN",
      currencySymbol: "₦",
    });

    return JSON.stringify({ checkoutStarted: true, total: lineTotal });
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

  const sendUi = (uiPayload: object) => {
    send({ ui: uiPayload });
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
              toolCallAccumulator[idx] = { id: tc.id ?? "", name: tc.function?.name ?? "", argsStr: "" };
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

          const toolResult = await handleToolCall(tc.name, args, settings, sendUi);

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

router.post("/openai/checkout", async (req, res) => {
  try {
    const settings = await getShopSettingsRow();
    const { customerName, customerPhone, customerEmail, items, notes } = req.body as {
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      notes?: string;
      items: Array<{
        productSlug: string;
        productName: string;
        sizeLabel: string;
        finishLabel: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        notes?: string;
      }>;
    };

    if (!customerName || !customerPhone || !items?.length) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
    const reference = generateReference();

    const [row] = await db
      .insert(schema.orders)
      .values({
        reference,
        customerName,
        customerPhone,
        customerEmail,
        deliveryMethod: "Pickup",
        notes,
        items: items.map((it) => ({
          productSlug: it.productSlug,
          productName: it.productName,
          sizeLabel: it.sizeLabel,
          finishLabel: it.finishLabel,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.lineTotal,
          notes: it.notes,
        })),
        subtotal: subtotal.toString(),
        deliveryFee: "0",
        total: subtotal.toString(),
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        status: "pending_whatsapp",
        artworkUrls: [],
      })
      .returning();

    const whatsappMessage = buildWhatsappMessage(row!, settings.businessName);
    const whatsappUrl = buildWhatsappUrl(settings.whatsappNumber, whatsappMessage);

    await db
      .update(schema.orders)
      .set({ whatsappMessage })
      .where(eq(schema.orders.id, row!.id));

    res.status(201).json({
      reference: row!.reference,
      total: subtotal,
      currencySymbol: settings.currencySymbol,
      whatsappUrl,
      orderId: row!.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
