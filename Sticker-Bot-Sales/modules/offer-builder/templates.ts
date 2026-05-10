import type { PricingResult } from './pricingRules.js';

export interface OfferTemplateInput {
  productType: string;
  quantity: number;
  material: string;
  shape: string;
  hasDesign: boolean;
  pricing: PricingResult;
  customerName?: string;
}

/**
 * Formats a WhatsApp-ready offer message from structured offer data.
 * All prices come from pricingRules.ts — never from AI.
 */
export function formatOfferMessage(input: OfferTemplateInput): string {
  const { productType, quantity, material, shape, hasDesign, pricing, customerName } = input;

  const greeting = customerName ? `${customerName}, ` : '';
  const designLine = hasDesign
    ? '✅ You supply the design'
    : `✅ We create your design (+₦${pricing.designFee.toLocaleString()})`;

  const discountLine = pricing.discountApplied
    ? `🎯 *${pricing.discountApplied} applied*`
    : '';

  return `${greeting}based on what you need — here's your best option:

━━━━━━━━━━━━━━━━━━━━
✔ *${productType}*
✔ ${material.charAt(0).toUpperCase() + material.slice(1)} — ${shape === 'die-cut' ? 'Die-cut shape' : 'Standard shape'}
✔ *${quantity.toLocaleString()} pieces*
${designLine}
━━━━━━━━━━━━━━━━━━━━
💰 *Total: ₦${pricing.totalPrice.toLocaleString()}*
   (₦${pricing.pricePerUnit}/pc)
${discountLine}
🚚 *Delivery in ${pricing.deliveryEta}*
━━━━━━━━━━━━━━━━━━━━

This is a locked-in price valid for *15 minutes* ⏱`;
}
