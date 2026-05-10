import type { Offer } from '../offer-builder/offerGenerator.js';

/**
 * Generates a Decision Lock message — a binary micro-decision prompt
 * that forces the customer to commit rather than "let me think about it."
 *
 * Never leaves the conversation open-ended.
 */
export function buildDecisionLockMessage(offer: Offer): string {
  return `Should I *lock this in* for you now, or would you like to adjust the quantity?

Reply:
✅ *Lock it in* — I'll send your payment link immediately
🔢 *Change quantity* — Tell me the new number

(Offer is reserved for 15 mins 🔒)`;
}

/**
 * Returns true if the customer's reply indicates confirmation.
 */
export function isConfirmation(reply: string): boolean {
  const normalized = reply.trim().toLowerCase();
  const confirmPatterns = [
    'lock it in',
    'lock in',
    'yes',
    'confirm',
    'confirmed',
    'go ahead',
    'proceed',
    'ok',
    'okay',
    'sure',
    'deal',
    'yes please',
    'do it',
    '✅',
    '1',
  ];
  return confirmPatterns.some((p) => normalized.includes(p));
}

/**
 * Returns true if the customer wants to adjust (quantity, specs, etc.)
 */
export function isAdjustmentRequest(reply: string): boolean {
  const normalized = reply.trim().toLowerCase();
  const adjustPatterns = [
    'change',
    'adjust',
    'modify',
    'different',
    'instead',
    'quantity',
    'less',
    'more',
    'actually',
    'wait',
    '2',
    'change quantity',
  ];
  return adjustPatterns.some((p) => normalized.includes(p));
}
