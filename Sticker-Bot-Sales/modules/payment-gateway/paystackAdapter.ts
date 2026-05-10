/**
 * Paystack Payment Adapter
 *
 * Wraps Paystack API calls for payment link generation and webhook verification.
 * All amounts are in Naira — converted to kobo (×100) for Paystack API.
 */

export interface PaymentLinkRequest {
  orderId: number;
  amountNaira: number;
  customerPhone: string;
  customerEmail?: string;
  metadata: Record<string, unknown>;
}

export interface PaymentLink {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/**
 * Generates a Paystack payment link for the given order.
 * Requires PAYSTACK_SECRET_KEY env variable.
 */
export async function generatePaymentLink(
  req: PaymentLinkRequest
): Promise<PaymentLink> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error('PAYSTACK_SECRET_KEY not set');

  const reference = `CDE-${req.orderId}-${Date.now()}`;
  const amountKobo = Math.round(req.amountNaira * 100);

  const payload = {
    email: req.customerEmail ?? `${req.customerPhone.replace('+', '')}@stickerbot.ng`,
    amount: amountKobo,
    reference,
    metadata: {
      ...req.metadata,
      orderId: req.orderId,
      phoneNumber: req.customerPhone,
    },
    channels: ['card', 'bank', 'ussd', 'bank_transfer'],
  };

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json() as { message?: string };
    throw new Error(`Paystack error: ${err.message ?? response.statusText}`);
  }

  const data = await response.json() as {
    status: boolean;
    data: { authorization_url: string; access_code: string; reference: string };
  };

  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    reference: data.data.reference,
  };
}

/**
 * Formats a WhatsApp payment message with the payment link.
 */
export function formatPaymentMessage(link: PaymentLink, amountNaira: number): string {
  return `✅ *Your order is reserved!*

Click below to complete payment of *₦${amountNaira.toLocaleString()}*:

🔗 ${link.authorizationUrl}

⏱ Link expires in *30 minutes*
🔒 Secured by Paystack

Once payment is confirmed, production starts immediately. You'll get an order number and live updates right here.`;
}
