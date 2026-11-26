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
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../lib/db";
import { initializePayment, verifyPayment, validateWebhookSignature } from "../lib/paystack";
import { buildWhatsappMessage, buildWhatsappUrl } from "../lib/whatsapp";
import { getShopSettingsRow } from "../lib/shop";
import { requireAuth } from "./auth";

const router: IRouter = Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const InitializeBody = z.object({
  orderId: z.number().int().positive(),
  customerEmail: z.string().email("Valid email required for payment"),
  customerPhone: z.string().min(7).max(20),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/** POST /payments/initialize */
router.post("/payments/initialize", requireAuth, async (req, res) => {
  const parse = InitializeBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }
  const { orderId, customerEmail, customerPhone } = parse.data;

  // Load the order
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);
  const user = (req as typeof req & { user: { id: number; isAdmin: boolean } }).user;
  if (!order || (!user.isAdmin && order.userId !== user.id)) { res.status(404).json({ error: "Order not found" }); return; }

  // Match the payer to the email supplied with the order where one exists.
  if (order.customerEmail && order.customerEmail.toLowerCase() !== customerEmail.toLowerCase()) {
    res.status(403).json({ error: "The payment email does not match this order." });
    return;
  }
  const suppliedPhone = customerPhone.replace(/\D/g, "");
  const storedPhone = order.customerPhone.replace(/\D/g, "");
  if (suppliedPhone.length < 10 || storedPhone.slice(-10) !== suppliedPhone.slice(-10)) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // Only unpaid orders awaiting payment/confirmation may start a new charge.
  if (!["pending_payment", "pending_whatsapp"].includes(order.status)) {
    res.status(409).json({ error: "This order is not available for payment." });
    return;
  }

  const settings = await getShopSettingsRow();

  try {
    // Paystack reference must be unique — use order reference
    const paystackRef = `PS-${order.reference}-${randomBytes(4).toString("hex").toUpperCase()}`;
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
  const rawBody: string = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : typeof req.body === "string"
    ? req.body
    : JSON.stringify(req.body);
  const signature = typeof req.headers["x-paystack-signature"] === "string"
    ? req.headers["x-paystack-signature"]
    : "";

  if (!validateWebhookSignature(rawBody, signature)) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody) as { event?: string; data?: { reference?: string } };
  } catch {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }
  if (event.event !== "charge.success") {
    res.status(200).json({ received: true });
    return;
  }

  const reference = event.data?.reference;
  if (!reference || reference.length > 100) {
    res.status(400).json({ error: "Invalid payment reference" });
    return;
  }

  try {
    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.paystackReference, reference))
      .limit(1);
    if (!payment) {
      // A valid Paystack event can arrive before a locally committed record
      // is visible; a retry is safer than silently dropping the event.
      res.status(503).json({ error: "Payment record is not available yet" });
      return;
    }
    if (payment.status === "success") {
      res.status(200).json({ received: true });
      return;
    }

    const [order] = await db
      .select({ status: schema.orders.status, total: schema.orders.total, currency: schema.orders.currency })
      .from(schema.orders)
      .where(eq(schema.orders.id, payment.orderId))
      .limit(1);
    if (!order) {
      res.status(503).json({ error: "Linked order is not available yet" });
      return;
    }

    const verified = await verifyPayment(reference);
    const expectedKobo = Math.round(Number(order.total) * 100);
    if (
      verified.status !== "success" ||
      verified.reference !== reference ||
      verified.amount !== Number(payment.amountKobo) ||
      verified.amount !== expectedKobo ||
      verified.currency !== "NGN" ||
      payment.currency !== "NGN" ||
      order.currency !== "NGN"
    ) {
      // A verified but mismatched charge must never confirm an order.
      res.status(200).json({ received: true, ignored: true });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(schema.payments)
        .set({ status: "success", paidAt: verified.paid_at ? new Date(verified.paid_at) : new Date(), webhookPayload: rawBody })
        .where(eq(schema.payments.paystackReference, reference));
      if (["pending_payment", "pending_whatsapp"].includes(order.status)) {
        await tx
          .update(schema.orders)
          .set({ status: "confirmed" })
          .where(eq(schema.orders.id, payment.orderId));
      }
    });

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Paystack Webhook] Processing failed; requesting retry:", error);
    if (!res.headersSent) res.status(500).json({ error: "Webhook processing failed" });
  }
});

/** GET /payments/:reference — poll payment status */
router.get("/payments/:reference", requireAuth, async (req, res) => {
  const rawReference = req.params.reference;
  const reference = Array.isArray(rawReference) ? rawReference[0] ?? "" : rawReference;
  const phone = typeof req.query.phone === "string" ? req.query.phone.replace(/\D/g, "") : "";
  if (!reference || phone.length < 10) { res.status(404).json({ error: "Payment not found" }); return; }

  const [payment] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.paystackReference, reference))
    .limit(1);

  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }

  const [order] = await db
    .select({ status: schema.orders.status, reference: schema.orders.reference, customerPhone: schema.orders.customerPhone, userId: schema.orders.userId })
    .from(schema.orders)
    .where(eq(schema.orders.id, payment.orderId))
    .limit(1);

  const user = (req as typeof req & { user: { id: number; isAdmin: boolean } }).user;
  if (!order || (!user.isAdmin && order.userId !== user.id) || order.customerPhone.replace(/\D/g, "").slice(-10) !== phone.slice(-10)) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  let paymentStatus = payment.status;
  let orderStatus = order.status;
  let paidAt = payment.paidAt;

  // Webhooks are the primary confirmation path. If a webhook is delayed or
  // missed, the verified customer may safely trigger a server-side Paystack
  // verification during status polling.
  if (paymentStatus !== "success") {
    try {
      const verified = await verifyPayment(reference);
      if (
        verified.status === "success" &&
        verified.reference === reference &&
        verified.amount === Number(payment.amountKobo) &&
        verified.amount === Math.round(Number(order.total) * 100) &&
        verified.currency === "NGN" &&
        order.currency === "NGN" &&
        payment.currency === "NGN"
      ) {
        paidAt = new Date(verified.paid_at);
        await db
          .update(schema.payments)
          .set({ status: "success", paidAt })
          .where(eq(schema.payments.paystackReference, reference));
        if (["pending_payment", "pending_whatsapp"].includes(order.status)) {
          await db
            .update(schema.orders)
            .set({ status: "confirmed" })
            .where(eq(schema.orders.id, payment.orderId));
          orderStatus = "confirmed";
        }
        paymentStatus = "success";
      }
    } catch {
      // Leave the payment pending; the customer can retry the status check.
    }
  }

  res.json({
    reference: payment.paystackReference,
    status: paymentStatus,
    paidAt,
    orderStatus,
  });
});

export default router;
