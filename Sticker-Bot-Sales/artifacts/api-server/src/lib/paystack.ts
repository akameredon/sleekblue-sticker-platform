/**
 * paystack.ts — Paystack REST API adapter.
 *
 * Docs: https://paystack.com/docs/api
 * Env: PAYSTACK_SECRET_KEY (sk_live_... or sk_test_...)
 *
 * All amounts are in KOBO (multiply NGN × 100).
 */
import { createHmac } from "crypto";

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ?? "";
const BASE_URL = "https://api.paystack.co";

/** Generic Paystack API caller with error wrapping */
async function paystackFetch<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  if (!SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!json.status) throw new Error(`Paystack error: ${json.message}`);
  return json.data;
}

export type InitializeResponse = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

/**
 * Initialize a Paystack transaction.
 * Returns authorization_url (redirect) and access_code (inline popup).
 * @param amountNGN - Amount in Naira (converted to kobo internally)
 * @param email - Customer email (required by Paystack)
 * @param reference - Unique order reference e.g. SL-XXXXX
 * @param metadata - Arbitrary metadata stored with transaction
 */
export async function initializePayment(
  amountNGN: number,
  email: string,
  reference: string,
  metadata: Record<string, unknown> = {},
): Promise<InitializeResponse> {
  return paystackFetch<InitializeResponse>("POST", "/transaction/initialize", {
    amount: Math.round(amountNGN * 100), // kobo
    email,
    reference,
    currency: "NGN",
    metadata,
    channels: ["card", "bank", "ussd", "mobile_money"],
  });
}

export type VerifyResponse = {
  status: string;      // "success" | "failed" | "abandoned"
  reference: string;
  amount: number;      // kobo
  paid_at: string;
  customer: { email: string; phone: string | null };
};

/**
 * Verify a transaction by reference.
 * Always call this on webhook receipt to confirm payment server-side.
 */
export async function verifyPayment(reference: string): Promise<VerifyResponse> {
  return paystackFetch<VerifyResponse>("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
}

/**
 * Validate Paystack webhook signature.
 * X-Paystack-Signature header = HMAC-SHA512 of raw body using secret key.
 */
export function validateWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
  if (!SECRET_KEY || !signature) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
  const expected = createHmac("sha512", SECRET_KEY).update(body).digest("hex");
  return expected === signature;
}
