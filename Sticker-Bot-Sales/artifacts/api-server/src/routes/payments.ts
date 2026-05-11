/**
 * payments.ts — Paystack integration routes.
 *
 * POST /payments/initialize   — create Paystack transaction, return access_code for inline popup
 * POST /payments/webhook      — receive Paystack webhook, verify signature, update order status
 * GET  /payments/:reference   — query payment status for polling
 *
 * Flow:
 *  1. Frontend calls POST /payments/initialize with orderId + customerEmail
 *  2. We call Paystack API → get access_code + authorization_url
 *  3. Frontend opens Paystack inline popup with access_code
 *  4. On success, Paystack POSTs webhook → we verify + update order to "confirmed"
 *  5. Frontend polls GET /payments/:reference to confirm completion
 *  6. If payment fails, frontend shows WhatsApp fallback link
 */
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../lib/db";
import { initializePayment, verifyPayment, validateWebhookSignature } from "../lib/paystack";
import { buildWhatsappMessage, buildWhatsappUrl } from "../lib/whatsapp";
import { getShopSettingsRow } from "../lib/shop";

const router: IRouter = Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const InitializeBody = z.object({
  orderId: z.number().int().positive(),
  customerEmail: z.email("Valid email required for payment"),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/** POST /payments/initialize */
router.post("/payments/initialize", async (req, res) => {
  const parse = InitializeBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }
  const { orderId, customerEmail } = parse.data;

  // Load the order
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  // Prevent double-payment on confirmed orders
  if (order.status === "confirmed" || order.status === "paid") {
    res.status(409).json({ error: "Order is already paid" });
    return;
  }

  const settings = await getShopSettingsRow();

  try {
    // Paystack reference must be unique — use order reference
    const paystackRef = `PS-${order.reference}`;
    const payData = await initializePayment(
      Number(order.total),
      customerEmail,
      paystackRef,
      { orderId, orderRef: order.reference, customerName: order.customerName },
    );

    // Upsert payment record
    await db
      .insert(schema.payments)
      .values({
        orderId: order.id,
        paystackReference: paystackRef,
        accessCode: payData.access_code,
        amountKobo: String(Math.round(Number(order.total) * 100)),
        currency: "NGN",
        status: "pending",
      })
      .onConflictDoUpdate({
        target: schema.payments.paystackReference,
        set: { accessCode: payData.access_code, status: "pending" },
      });

    // WhatsApp fallback URL (if payment fails)
    const waMessage = buildWhatsappMessage(order, settings.businessName);
    const whatsappUrl = buildWhatsappUrl(settings.whatsappNumber, waMessage);

    res.json({
      accessCode: payData.access_code,
      authorizationUrl: payData.authorization_url,
      reference: paystackRef,
      whatsappFallbackUrl: whatsappUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment initialization failed";
    // Always return WhatsApp fallback on Paystack error
    const settings2 = await getShopSettingsRow();
    const waMessage = buildWhatsappMessage(order, settings2.businessName);
    const whatsappUrl = buildWhatsappUrl(settings2.whatsappNumber, waMessage);
    res.status(502).json({ error: message, whatsappFallbackUrl: whatsappUrl });
  }
});

/**
 * POST /payments/webhook
 * Raw body required for signature validation — mounted with express.raw()
 * in app.ts BEFORE express.json() on this specific route.
 */
router.post("/payments/webhook", async (req, res) => {
  // express.raw() gives us a Buffer; express.json() gives an object
  const rawBody: string = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : typeof req.body === "string"
    ? req.body
    : JSON.stringify(req.body);

  const signature = (req.headers["x-paystack-signature"] as string) ?? "";

  // Always respond 200 quickly to avoid Paystack retries
  res.status(200).json({ received: true });

  try {
    if (!validateWebhookSignature(rawBody, signature)) {
      console.error("[Paystack Webhook] Invalid signature — ignoring");
      return;
    }

    const event = JSON.parse(rawBody) as { event: string; data: { reference: string; status: string } };
    if (event.event !== "charge.success") return;

    const reference = event.data.reference;
    // Verify server-side — never trust webhook data alone
    const verified = await verifyPayment(reference);
    if (verified.status !== "success") return;

    // Update payment record
    await db
      .update(schema.payments)
      .set({ status: "success", paidAt: new Date(), webhookPayload: rawBody })
      .where(eq(schema.payments.paystackReference, reference));

    // Update order status to confirmed
    const [payment] = await db
      .select({ orderId: schema.payments.orderId })
      .from(schema.payments)
      .where(eq(schema.payments.paystackReference, reference))
      .limit(1);
    if (payment) {
      await db
        .update(schema.orders)
        .set({ status: "confirmed" })
        .where(eq(schema.orders.id, payment.orderId));
    }
  } catch (err) {
    console.error("[Paystack Webhook] Error:", err);
  }
});

/** GET /payments/:reference — poll payment status */
router.get("/payments/:reference", async (req, res) => {
  const reference = req.params.reference;
  if (!reference) { res.status(400).json({ error: "Reference required" }); return; }

  const [payment] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.paystackReference, reference))
    .limit(1);

  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }

  const [order] = await db
    .select({ status: schema.orders.status, reference: schema.orders.reference })
    .from(schema.orders)
    .where(eq(schema.orders.id, payment.orderId))
    .limit(1);

  res.json({
    reference: payment.paystackReference,
    status: payment.status,
    paidAt: payment.paidAt,
    orderStatus: order?.status ?? "unknown",
  });
});

export default router;
