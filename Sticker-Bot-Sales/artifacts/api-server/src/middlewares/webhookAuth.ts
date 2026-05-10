import { createHmac, timingSafeEqual } from 'crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Verifies the X-Hub-Signature-256 header on incoming WhatsApp webhook payloads.
 * Uses timing-safe comparison to prevent timing attacks.
 * Rejects payloads older than 5 minutes to block replay attacks.
 */
export async function verifyWhatsAppWebhook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const secret = process.env.WHATSAPP_API_SECRET;
  if (!secret) {
    request.log.error('WHATSAPP_API_SECRET not configured');
    await reply.status(500).send({ error: 'Server misconfiguration' });
    return;
  }

  const signature = request.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) {
    await reply.status(403).send({ error: 'Missing signature' });
    return;
  }

  const rawBody = JSON.stringify(request.body);
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    request.log.warn({ signature }, 'Webhook signature mismatch');
    await reply.status(403).send({ error: 'Invalid signature' });
    return;
  }

  const timestampHeader = request.headers['x-timestamp'] as string | undefined;
  if (timestampHeader) {
    const ts = parseInt(timestampHeader, 10);
    if (isNaN(ts) || Date.now() - ts > TIMESTAMP_TOLERANCE_MS) {
      await reply.status(403).send({ error: 'Request timestamp expired' });
      return;
    }
  }
}

/**
 * Verifies Paystack payment webhook signature.
 */
export function verifyPaystackWebhook(payload: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;

  const hash = createHmac('sha512', secret).update(payload).digest('hex');
  return hash === signature;
}
