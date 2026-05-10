import type { Offer } from '../offer-builder/offerGenerator.js';

export interface FulfillmentTicket {
  ticketId: string;
  orderId: number;
  phoneNumber: string;
  productType: string;
  quantity: number;
  priceNaira: number;
  hasDesign: boolean;
  designUrl?: string;
  paymentRef: string;
  productionStatus: 'QUEUED' | 'IN_PRODUCTION' | 'QUALITY_CHECK' | 'DISPATCHED' | 'DELIVERED';
  createdAt: string;
  updatedAt: string;
}

/**
 * In-memory ticket store.
 * In production, persist to the `orders` PostgreSQL table.
 */
const ticketStore = new Map<string, FulfillmentTicket>();
let orderCounter = 1000;

/**
 * Creates a production ticket after payment is confirmed.
 * Returns the created ticket.
 */
export function createTicket(
  phoneNumber: string,
  offer: Offer,
  paymentRef: string,
  designUrl?: string
): FulfillmentTicket {
  const orderId = ++orderCounter;
  const ticketId = `TICK-${orderId}`;

  const ticket: FulfillmentTicket = {
    ticketId,
    orderId,
    phoneNumber,
    productType: offer.productType,
    quantity: offer.specs[0] ? parseInt(offer.specs[0].replace(/[^0-9]/g, ''), 10) : 0,
    priceNaira: offer.priceNaira,
    hasDesign: offer.designFee === 0,
    designUrl,
    paymentRef,
    productionStatus: 'QUEUED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  ticketStore.set(ticketId, ticket);
  return ticket;
}

/**
 * Updates the production status of a ticket.
 */
export function updateTicketStatus(
  ticketId: string,
  status: FulfillmentTicket['productionStatus']
): FulfillmentTicket | null {
  const ticket = ticketStore.get(ticketId);
  if (!ticket) return null;
  const updated = { ...ticket, productionStatus: status, updatedAt: new Date().toISOString() };
  ticketStore.set(ticketId, updated);
  return updated;
}

/**
 * Retrieves a ticket by ID.
 */
export function getTicket(ticketId: string): FulfillmentTicket | null {
  return ticketStore.get(ticketId) ?? null;
}

/**
 * Generates the customer-facing order confirmation message.
 */
export function formatConfirmationMessage(ticket: FulfillmentTicket): string {
  return `🎉 *Payment confirmed! Order #${ticket.orderId} is locked in.*

📋 *Your order summary:*
• ${ticket.productType}
• Qty: ${ticket.quantity.toLocaleString()} pieces
• Total: ₦${ticket.priceNaira.toLocaleString()}

⚙️ *Production starts within 2 hours.*

We'll send you updates here as your order moves through:
QUEUED → IN PRODUCTION → QUALITY CHECK → DISPATCHED → DELIVERED

Questions? Just reply to this chat. 🙏`;
}
