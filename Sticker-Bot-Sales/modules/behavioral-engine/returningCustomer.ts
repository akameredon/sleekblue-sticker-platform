/**
 * Returning Customer Personalization Engine
 *
 * Detects returning customers by phone number and generates
 * a personalized re-engagement opening message.
 */

export interface PastOrder {
  orderId: number;
  productType: string;
  quantity: number;
  priceNaira: number;
  createdAt: string;
}

/**
 * In-memory past orders store.
 * In production, query the `orders` PostgreSQL table.
 */
const pastOrdersStore = new Map<string, PastOrder[]>();

/**
 * Records a completed order for a phone number.
 */
export function recordOrder(phoneNumber: string, order: PastOrder): void {
  const existing = pastOrdersStore.get(phoneNumber) ?? [];
  pastOrdersStore.set(phoneNumber, [...existing, order]);
}

/**
 * Returns the most recent order for a phone number, or null if new customer.
 */
export function getLastOrder(phoneNumber: string): PastOrder | null {
  const orders = pastOrdersStore.get(phoneNumber);
  if (!orders || orders.length === 0) return null;
  return orders[orders.length - 1];
}

/**
 * Returns true if this customer has ordered before.
 */
export function isReturningCustomer(phoneNumber: string): boolean {
  return (pastOrdersStore.get(phoneNumber)?.length ?? 0) > 0;
}

/**
 * Generates a personalized re-engagement message for returning customers.
 * References their last order to create an instant upsell opportunity.
 */
export function buildReturningCustomerMessage(lastOrder: PastOrder): string {
  const upgradeQty = Math.round(lastOrder.quantity * 1.5 / 100) * 100;
  const discountHint = lastOrder.quantity < 500 ? ' at a discount' : ' with priority delivery';

  return `Welcome back! 🙌

Last time you ordered *${lastOrder.quantity.toLocaleString()} ${lastOrder.productType}* — want to:

1️⃣ *Repeat* the same order (fast-track)
2️⃣ *Upgrade* to ${upgradeQty.toLocaleString()} pieces${discountHint}
3️⃣ *Something new* — start fresh

Which works for you?`;
}

/**
 * Generates the standard entry hook for new customers.
 */
export function buildNewCustomerEntryHook(): string {
  return `Quick one — are you trying to print stickers for:

1️⃣ Business branding
2️⃣ Packaging
3️⃣ Personal use
4️⃣ Reselling

Just reply with the number or type it out 👇`;
}
