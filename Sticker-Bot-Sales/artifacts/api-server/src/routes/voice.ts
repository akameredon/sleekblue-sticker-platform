import { Router, type IRouter } from "express";
import { z } from "zod";
import { createOpenAIClient } from "@workspace/integrations-openai-ai-server";
import { db, schema } from "../lib/db";
import { asc, eq } from "drizzle-orm";
import { getShopSettingsRow } from "../lib/shop";
import { calculateQuote } from "../lib/pricing";

const router: IRouter = Router();

const VoiceCommandBody = z.object({
  text: z.string().min(1).max(1000),
  context: z.object({
    currentPage: z.string().optional(),
    cartCount: z.number().optional(),
    cartTotal: z.number().optional(),
  }).optional(),
});

const VOICE_SYSTEM_PROMPT = `You are Sticky, the voice AI assistant for Sticker Lab — a premium vinyl sticker print shop in Lagos, Nigeria. 
You help customers shop by voice. Parse the customer's spoken command and return a JSON action.

Products: die-cut-stickers, circle-stickers, kiss-cut-stickers, holographic-stickers, bumper-stickers, transparent-stickers, sticker-sheets, clear-labels
Sizes: Small (50x50mm), Medium (75x75mm), Large (100x100mm), Custom
Finishes: Matte, Gloss, Holographic
Quantities: usually 50, 100, 250, 500

Return ONLY valid JSON matching this exact schema:
{
  "intent": "navigate|add_to_cart|remove_from_cart|clear_cart|read_cart|calculate_quote|search|track_order|chat|upload_design|checkout|greeting|unknown",
  "speech": "what to say back to the customer (friendly, short, 1-2 sentences)",
  "action": {
    "type": "navigate|add_to_cart|clear_cart|read_cart|calculate_quote|open_whatsapp|upload_design|checkout|none",
    "path": "/route (for navigate)",
    "productSlug": "slug (for add_to_cart/calculate_quote)",
    "productName": "human name (for add_to_cart)",
    "sizeLabel": "Small|Medium|Large|Custom",
    "finishLabel": "Matte|Gloss|Holographic",
    "quantity": 100,
    "query": "search query (for search)"
  }
}

Examples:
- "show me holographic stickers" → intent:navigate, path:"/p/holographic-stickers"
- "add 100 die cut stickers medium matte to cart" → intent:add_to_cart, productSlug:die-cut-stickers, qty:100, size:Medium, finish:Matte
- "how much for 500 circle stickers large gloss" → intent:calculate_quote
- "what's in my cart" → intent:read_cart
- "clear my cart" → intent:clear_cart  
- "go to checkout" → intent:navigate, path:"/cart"
- "take me to the shop" → intent:navigate, path:"/shop"
- "track my order" → intent:navigate, path:"/track"
- "I have a design ready" → intent:upload_design, path:"/quick-order"
- "chat with AI" → intent:navigate, path:"/chat"
- "hello" or "hey sticky" → intent:greeting
- Anything unclear → intent:unknown, ask for clarification`;

router.post("/voice/command", async (req, res) => {
  const parse = VoiceCommandBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const { text, context } = parse.data;

  let quote: { unitPrice: number; total: number; savingsNote?: string } | null = null;

  try {
    const openai = createOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: VOICE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Customer said: "${text}"${context?.currentPage ? `. They are on: ${context.currentPage}` : ""}${context?.cartCount ? `. Cart has ${context.cartCount} item(s), total ₦${context.cartTotal?.toLocaleString("en-NG")}.` : ""}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { intent: "unknown", speech: "Sorry, I didn't catch that. Could you try again?", action: { type: "none" } };
    }

    if (parsed.intent === "calculate_quote" && parsed.action && typeof parsed.action === "object") {
      const a = parsed.action as Record<string, unknown>;
      const settings = await getShopSettingsRow();
      let product = null;
      const slug = String(a.productSlug ?? "");
      if (slug) {
        const [row] = await db.select().from(schema.products).where(eq(schema.products.slug, slug)).limit(1);
        product = row ?? null;
      }
      const q = calculateQuote(
        {
          productSlug: slug,
          sizeLabel: String(a.sizeLabel ?? "Medium"),
          finishLabel: String(a.finishLabel ?? "Matte"),
          quantity: Number(a.quantity ?? 100),
        },
        product,
        settings.leadTimeDays,
      );
      quote = { unitPrice: q.unitPrice, total: q.total, savingsNote: q.savingsNote };
      const speechWithPrice = `${parsed.speech} That'll be ₦${q.total.toLocaleString("en-NG")} for ${q.quantity} stickers at ₦${q.unitPrice} each.${q.savingsNote ? " " + q.savingsNote : ""}`;
      parsed = { ...parsed, speech: speechWithPrice, quote: q };
    }

    res.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice command failed";
    res.status(500).json({ error: message, speech: "Something went wrong. Please try again." });
  }
});

export default router;
