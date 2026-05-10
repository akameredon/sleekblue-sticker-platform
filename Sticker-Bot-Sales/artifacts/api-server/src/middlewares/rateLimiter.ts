/**
 * Per-phone-number rate limiter for WhatsApp webhook messages.
 * Max 30 messages per minute per phone number.
 * Uses a sliding window counter.
 */

interface RateWindow {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

const counters = new Map<string, RateWindow>();

/**
 * Returns true if the phone number is within rate limits.
 * Returns false if they should be throttled.
 */
export function checkRateLimit(phoneNumber: string): boolean {
  const now = Date.now();
  const entry = counters.get(phoneNumber);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    counters.set(phoneNumber, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Returns remaining requests in the current window for a phone number.
 */
export function getRemainingRequests(phoneNumber: string): number {
  const entry = counters.get(phoneNumber);
  if (!entry || Date.now() - entry.windowStart > WINDOW_MS) return MAX_REQUESTS;
  return Math.max(0, MAX_REQUESTS - entry.count);
}

/**
 * Cleans up expired windows (call periodically to prevent memory leaks).
 */
export function purgeExpiredWindows(): void {
  const now = Date.now();
  for (const [key, entry] of counters.entries()) {
    if (now - entry.windowStart > WINDOW_MS) {
      counters.delete(key);
    }
  }
}

setInterval(purgeExpiredWindows, WINDOW_MS);
