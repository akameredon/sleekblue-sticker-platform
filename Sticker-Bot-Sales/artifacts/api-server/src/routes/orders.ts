import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";
import { requireAuth } from "./auth";
import { ObjectPermission } from "../lib/objectAcl";
import { ObjectStorageService } from "../lib/objectStorage";
import { eq } from "drizzle-orm";
import {
  CreateOrderBody,
  LookupOrderBody,
} from "@workspace/api-zod";
import { db, schema } from "../lib/db";
import { getShopSettingsRow } from "../lib/shop";
import { buildWhatsappMessage, buildWhatsappUrl } from "../lib/whatsapp";
import { calculateLabelStudioUnitPrice, calculateQuote } from "../lib/pricing";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function generateReference(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = randomBytes(4).toString("hex").toUpperCase();
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
    artworkUrls: [], // Never expose private storage paths in customer order responses.
    createdAt: o.createdAt,
  };
}

// Order lists contain customer names, phone numbers and delivery details.
// They must only be exposed through an authenticated customer/admin endpoint.
// Until that endpoint is wired to verified ownership, do not expose recent orders publicly.
router.get("/orders", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: number; isAdmin: boolean } }).user;
  const rows = user.isAdmin
    ? await db.select().from(schema.orders)
    : await db.select().from(schema.orders).where(eq(schema.orders.userId, user.id));
  res.json(rows.map(serializeOrder));
});

router.post("/orders", requireAuth, async (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order details", issues: parsed.error.issues });
    return;
  }
  const body = parsed.data;
  const authenticatedUserId = (req as typeof req & { user: { id: number } }).user.id;
  if (
    body.customerName.trim().length < 2 ||
    body.customerName.length > 100 ||
    body.customerPhone.replace(/\D/g, "").length < 10 ||
    (body.customerEmail !== undefined && body.customerEmail.length > 254) ||
    (body.notes !== undefined && body.notes.length > 4000) ||
    body.items.length > 10
  ) {
    res.status(400).json({ error: "Check your contact details and order information." });
    return;
  }
  if (body.items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100000)) {
    res.status(400).json({ error: "Each order quantity must be a whole number between 1 and 100,000." });
    return;
  }
  if (body.deliveryMethod && body.deliveryMethod.toLowerCase() !== "pickup") {
    res.status(422).json({ error: "Delivery requires a separately confirmed delivery quote. Please select pickup or contact the team." });
    return;
  }
  const settings = await getShopSettingsRow();

  // Attachments are optional, but any supplied artwork must belong to the
  // authenticated customer and have a finalized private ACL.
  const artworkPaths = body.artworkUrls ?? [];
  if (artworkPaths.length > 0) {
    const userId = authenticatedUserId;
    if (typeof userId !== "number") {
      res.status(401).json({ error: "Sign in before attaching artwork files." });
      return;
    }
    for (const objectPath of artworkPaths) {
      const ownerPrefix = `/objects/uploads/${userId}/`;
      if (!objectPath.startsWith(ownerPrefix) || objectPath.includes("..")) {
        res.status(403).json({ error: "An artwork file does not belong to this account." });
        return;
      }
      try {
        const file = await objectStorageService.getObjectEntityFile(objectPath);
        const allowed = await objectStorageService.canAccessObjectEntity({
          userId: String(userId),
          objectFile: file,
          requestedPermission: ObjectPermission.READ,
        });
        if (!allowed) {
          res.status(403).json({ error: "An artwork file is not accessible to this account." });
          return;
        }
      } catch {
        res.status(404).json({ error: "An attached artwork file could not be found." });
        return;
      }
    }
  }

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
    let productName = "Custom product label";
    let productSlug = "custom-label";
    let widthMm: number | undefined;
    let heightMm: number | undefined;
    let unitPrice: number | null = null;
    let lineTotal = 0;

    if (item.productSlug) {
      // Preserve the existing catalogue checkout pricing path.
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
      productName = product.name;
      productSlug = product.slug;
      widthMm = quote.widthMm;
      heightMm = quote.heightMm;
      unitPrice = quote.unitPrice;
      lineTotal = quote.total;
    } else {
      // Custom studio labels use the wholesale-cost batch estimator.
      widthMm = Number(item.widthMm ?? 0);
      heightMm = Number(item.heightMm ?? 0);
      unitPrice = calculateLabelStudioUnitPrice(widthMm, heightMm, item.quantity);
      if (unitPrice == null) {
        res.status(422).json({
          error: "This custom label size or quantity needs a manually confirmed production quote before ordering.",
        });
        return;
      }
      lineTotal = unitPrice * item.quantity;
    }

    items.push({
      productSlug,
      productName,
      sizeLabel: item.sizeLabel,
      finishLabel: item.finishLabel,
      quantity: item.quantity,
      widthMm,
      heightMm,
      unitPrice,
      lineTotal,
      notes: item.notes,
    });
  }

  const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  const reference = generateReference();
  const artworkPublicUrls = artworkPaths;
  const [row] = await db
    .insert(schema.orders)
    .values({
      reference,
      userId: authenticatedUserId ?? undefined,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      deliveryAddress: body.deliveryAddress,
      deliveryMethod: "Pickup",
      notes: body.notes,
      items,
      subtotal: subtotal.toString(),
      deliveryFee: deliveryFee.toString(),
      total: total.toString(),
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      status: "pending_payment",
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

router.post("/orders/lookup", requireAuth, async (req, res) => {
  const parsed = LookupOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const body = parsed.data;
  const refNorm = body.reference.trim().toUpperCase();
  const phoneDigits = body.phone.replace(/\D/g, "");
  if (!refNorm || phoneDigits.length < 10) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const [row] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.reference, refNorm))
    .limit(1);

  const storedPhoneDigits = row?.customerPhone.replace(/\D/g, "") ?? "";
  // Compare the full national number (last 10 digits supports local vs +234 format).
  const user = (req as typeof req & { user: { id: number; isAdmin: boolean } }).user;
  if (!row || (!user.isAdmin && row.userId !== user.id) || storedPhoneDigits.slice(-10) !== phoneDigits.slice(-10)) {
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
router.get("/orders/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(404).json({ error: "Order not found" }); return; }
  const user = (req as typeof req & { user: { id: number; isAdmin: boolean } }).user;
  const [row] = await db.select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
  if (!row || (!user.isAdmin && row.userId !== user.id)) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(serializeOrder(row));
});

export default router;
