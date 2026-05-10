import type { Intent } from '../intent-engine/classifier.js';
import { computePrice, type PricingInput } from './pricingRules.js';
import { formatOfferMessage } from './templates.js';

export interface CustomerAnswers {
  intent: Intent;
  quantity: number;
  hasDesign: boolean;
  budgetRange: string;
  material?: 'vinyl' | 'paper';
  shape?: 'standard' | 'die-cut';
}

export interface Offer {
  productType: string;
  specs: string[];
  priceNaira: number;
  pricePerUnit: number;
  designFee: number;
  deliveryEta: string;
  discountApplied: string | null;
  messageFormatted: string;
}

const PRODUCT_TYPE_MAP: Record<Intent, string> = {
  BUSINESS_BRANDING: 'Vinyl Branding Stickers',
  PACKAGING: 'Custom Label Stickers',
  PERSONAL_USE: 'Custom Stickers',
  RESELLING: 'Bulk Wholesale Stickers',
};

/**
 * Infers material and shape from customer answers and intent.
 * Defaults to best practice per use-case.
 */
function inferMaterialAndShape(answers: CustomerAnswers): {
  material: 'vinyl' | 'paper';
  shape: 'standard' | 'die-cut';
} {
  const material: 'vinyl' | 'paper' =
    answers.material ??
    (answers.intent === 'PERSONAL_USE' ? 'vinyl' : 'vinyl');

  const shape: 'standard' | 'die-cut' =
    answers.shape ??
    (answers.intent === 'BUSINESS_BRANDING' || answers.intent === 'PACKAGING'
      ? 'die-cut'
      : 'standard');

  return { material, shape };
}

/**
 * Builds a complete, formatted offer from customer answers.
 * Price is always computed from pricingRules.ts — never from AI.
 */
export function buildOffer(answers: CustomerAnswers): Offer {
  const { material, shape } = inferMaterialAndShape(answers);
  const productType = PRODUCT_TYPE_MAP[answers.intent];

  const pricingInput: PricingInput = {
    intent: answers.intent,
    quantity: answers.quantity,
    material,
    hasDesign: answers.hasDesign,
    shape,
  };

  const pricing = computePrice(pricingInput);

  const specs = [
    `${answers.quantity.toLocaleString()} pieces`,
    `${material.charAt(0).toUpperCase() + material.slice(1)} — ${shape === 'die-cut' ? 'Die-cut' : 'Standard'}`,
    answers.hasDesign ? 'Design supplied by customer' : 'Design created by StickerBot',
    `Delivery: ${pricing.deliveryEta}`,
  ];

  const messageFormatted = formatOfferMessage({
    productType,
    quantity: answers.quantity,
    material,
    shape,
    hasDesign: answers.hasDesign,
    pricing,
  });

  return {
    productType,
    specs,
    priceNaira: pricing.totalPrice,
    pricePerUnit: pricing.pricePerUnit,
    designFee: pricing.designFee,
    deliveryEta: pricing.deliveryEta,
    discountApplied: pricing.discountApplied,
    messageFormatted,
  };
}
