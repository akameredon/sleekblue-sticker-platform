import type { Intent } from '../intent-engine/classifier.js';

export interface PricingInput {
  intent: Intent;
  quantity: number;
  material: 'vinyl' | 'paper';
  hasDesign: boolean;
  shape: 'standard' | 'die-cut';
}

export interface PricingResult {
  pricePerUnit: number;
  totalPrice: number;
  designFee: number;
  deliveryEta: string;
  discountApplied: string | null;
}

const BASE_RATES: Record<string, number> = {
  'vinyl-standard': 120,
  'vinyl-die-cut': 180,
  'paper-standard': 60,
  'paper-die-cut': 90,
};

const QUANTITY_TIERS = [
  { min: 5000, discount: 0.30, label: '30% bulk discount' },
  { min: 2000, discount: 0.20, label: '20% bulk discount' },
  { min: 1000, discount: 0.15, label: '15% bulk discount' },
  { min: 500, discount: 0.10, label: '10% discount' },
  { min: 200, discount: 0.05, label: '5% discount' },
  { min: 0, discount: 0, label: null },
];

const DESIGN_FEE = 5000;
const DELIVERY_ETA_MAP: Record<string, string> = {
  fast: '24–48 hours',
  standard: '3–5 business days',
  bulk: '5–7 business days',
};

/**
 * Computes the total price for a sticker order based on business rules.
 * Never derives price from AI output — always from these deterministic rules.
 */
export function computePrice(input: PricingInput): PricingResult {
  const rateKey = `${input.material}-${input.shape}`;
  const baseRate = BASE_RATES[rateKey] ?? BASE_RATES['vinyl-standard'];

  const tier = QUANTITY_TIERS.find((t) => input.quantity >= t.min)!;
  const pricePerUnit = baseRate * (1 - tier.discount);
  const productTotal = pricePerUnit * input.quantity;
  const designFee = input.hasDesign ? 0 : DESIGN_FEE;
  const totalPrice = productTotal + designFee;

  const deliveryEta =
    input.quantity >= 2000
      ? DELIVERY_ETA_MAP.bulk
      : input.quantity >= 500
      ? DELIVERY_ETA_MAP.standard
      : DELIVERY_ETA_MAP.fast;

  return {
    pricePerUnit: Math.round(pricePerUnit),
    totalPrice: Math.round(totalPrice),
    designFee,
    deliveryEta,
    discountApplied: tier.label,
  };
}

/**
 * Returns true if the computed price falls within the customer's stated budget string.
 */
export function isWithinBudget(totalPrice: number, budgetLabel: string): boolean {
  const lower = budgetLabel.toLowerCase();
  if (lower.includes('under ₦10k') || lower.includes('under 10k')) return totalPrice <= 10000;
  if (lower.includes('under ₦15k') || lower.includes('under 15k')) return totalPrice <= 15000;
  if (lower.includes('under ₦30k') || lower.includes('under 30k')) return totalPrice <= 30000;
  if (lower.includes('under ₦50k') || lower.includes('under 50k')) return totalPrice <= 50000;
  if (lower.includes('under ₦80k') || lower.includes('under 80k')) return totalPrice <= 80000;
  if (lower.includes('under ₦100k') || lower.includes('under 100k')) return totalPrice <= 100000;
  return true;
}
