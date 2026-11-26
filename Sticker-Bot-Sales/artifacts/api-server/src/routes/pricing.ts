import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { CalculateQuoteBody, CalculateQuoteResponse } from "@workspace/api-zod";
import { db, schema } from "../lib/db";
import { getShopSettingsRow } from "../lib/shop";
import { calculateQuote } from "../lib/pricing";

const router: IRouter = Router();

router.post("/pricing/quote", async (req, res) => {
  const body = CalculateQuoteBody.parse(req.body);
  let product = null;
  if (body.productSlug) {
    const [row] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, body.productSlug))
      .limit(1);
    if (!row) { res.status(404).json({ error: "Product not found" }); return; }
    if (!row.sizes?.length || !row.finishes?.length || !row.quantityTiers?.length) {
      res.status(503).json({ error: "This product is not available for automatic pricing until its approved size, finish and quantity prices are configured." });
      return;
    }
    product = row;
  }
  const settings = await getShopSettingsRow();
  const quote = calculateQuote(body, product, settings.leadTimeDays);
  const data = CalculateQuoteResponse.parse(quote);
  res.json(data);
});

export default router;
