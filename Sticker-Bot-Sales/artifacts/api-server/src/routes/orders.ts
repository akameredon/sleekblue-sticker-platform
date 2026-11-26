import { Router, type IRouter } from "express";
import { and, desc, eq, like } from "drizzle-orm";
import {
  CreateOrderBody,
  GetOrderByIdParams,
  GetOrderByIdResponse,
  ListRecentOrdersResponse,
  LookupOrderBody,
} from "@workspace/api-zod";
import { db, schema } from "../lib/db";
import { getShopSettingsRow } from "../lib/shop";
import { buildWhatsappMessage, buildWhatsappUrl } from "../lib/whatsapp";
import { calculateQuote } from "../lib/pricing";

const router: IRouter = Router();

function generateReference(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `SL-${ts}${rand}`;
}

function serializeOrder(o: typeof schema.orders.$inferSelect) {
  return {
    id: o.id,
    reference: o.reference,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail ?? undefined,
    deliveryAddress: o.deliveryAddress ?? undefined,
    deliveryMethod: o.deliveryMethod ?? undefined,
    notes: o.notes ?? undefined,
    items: o.items.map((it) => ({
      productSlug: it.productSlug,
      productName: it.productName,
      sizeLabel: it.sizeLabel,
      finishLabel: it.finishLabel,
      quantity: it.quantity,
      widthMm: it.widthMm,
      heightMm: it.heightMm,
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
      notes: it.notes,
    })),
    subtotal: Number(o.subtotal),
    deliveryFee: Number(o.deliveryFee),
    total: Number(o.total),
    currency: o.currency,
    currencySymbol: o.currencySymbol,
    status: o.status,
    artworkUrls: o.artworkUrls ?? [],
    createdAt: o.createdAt,
  };
}

function buildPublicArtworkUrl(req: { protocol: string; get: (h: string) => string | undefined }, objectPath: string) {
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "";
  const proto = req.get("x-forwarded-proto") ?? req.protocol ?? "https";
  const path = objectPath.startsWith("/") ? objectPath : `/${objectPath}`;
  return `${proto}://${host}/api/storage${path}`;
}

// Order lists contain customer names, phone numbers and delivery details.
// They must only be exposed through an authenticated customer/admin endpoint.
// Until that endpoint is wired to verified ownership, do not expose recent orders publicly.
router.get("/orders", (_req, res) => {
  res.status(401).json({ error: "Authentication required" });
});

router.post("/orders", async (req, res) => {
  const body = CreateOrderBody.parse(req.body);
  const settings = await getShopSettingsRow();

  // Never trust prices supplied by the browser. Recalculate every line from
  // the server-side product catalogue before persisting an order.
  const items: Array<{
    productSlug: string;
    productName: string;
    sizeLabel: string;
    finishLabel: string;
    quantity: number;
    widthMm?: number;
    heightMm?: number;
    unitPrice: number;
    lineTotal: number;
    notes?: string;
  }> = [];

  for (const item of body.items) {
    const [product] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, item.productSlug))
      .limit(1);

    if (!product) {
      res.status(400).json({ error: `Unknown product: ${item.productSlug}` });
      return;
    }

    const quote = calculateQuote({
      productSlug: item.productSlug,
      sizeLabel: item.sizeLabel,
      finishLabel: item.finishLabel,
      quantity: item.quantity,
      widthMm: item.widthMm,
      heightMm: item.heightMm,
    }, product, settings.leadTimeDays);

    items.push({
      productSlug: product.slug,
      productName: product.name,
      sizeLabel: item.sizeLabel,
      finishLabel: item.finishLabel,
      quantity: item.quantity,
      widthMm: quote.widthMm,
      heightMm: quote.heightMm,
      unitPrice: quote.unitPrice,
      lineTotal: quote.total,
      notes: item.notes,
    });
  }

  const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  const reference = generateReference();
  const artworkPaths = body.artworkUrls ?? [];
  const artworkPublicUrls = artworkPaths.map((p) => buildPublicArtworkUrl(req, p));
  const [row] = await db
    .insert(schema.orders)
    .values({
      reference,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      deliveryAddress: body.deliveryAddress,
      deliveryMethod: body.deliveryMethod ?? "Pickup",
      notes: body.notes,
      items,
      subtotal: subtotal.toString(),
      deliveryFee: deliveryFee.toString(),
      total: total.toString(),
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      status: "pending_whatsapp",
      artworkUrls: artworkPublicUrls,
    })
    .returning();

  const order = serializeOrder(row!);
  const whatsappMessage = buildWhatsappMessage(row!, settings.businessName);
  const whatsappUrl = buildWhatsappUrl(settings.whatsappNumber, whatsappMessage);

  await db
    .update(schema.orders)
    .set({ whatsappMessage })
    .where(eq(schema.orders.id, row!.id));

  res.status(201).json({ ...order, whatsappUrl, whatsappMessage });
});

router.post("/orders/lookup", async (req, res) => {
  const body = LookupOrderBody.parse(req.body);
  const refNorm = body.reference.trim().toUpperCase();
  const phoneDigits = body.phone.replace(/\D/g, "");
  if (!refNorm || phoneDigits.length < 4) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const [row] = await db
    .select()
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.reference, refNorm),
        like(schema.orders.customerPhone, `%${phoneDigits.slice(-4)}%`),
      ),
    )
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const settings = await getShopSettingsRow();
  const whatsappMessage =
    row.whatsappMessage ?? buildWhatsappMessage(row, settings.businessName);
  const whatsappUrl = buildWhatsappUrl(settings.whatsappNumber, whatsappMessage);
  res.json({ ...serializeOrder(row), whatsappUrl, whatsappMessage });
});

// Sequential database IDs are not authorization. Do not return order PII
// through this route until a signed-in owner/admin check is implemented.
router.get("/orders/:id", (_req, res) => {
  res.status(401).json({ error: "Authentication required" });
});

export default router;
