import { schema } from "../lib/db";

type Product = typeof schema.products.$inferSelect;

export interface QuoteRequest {
  product: Product;
  quantity: number;
  widthInches: number;
  heightInches: number;
  finishSlug: string;
}

export interface QuoteResult {
  unitPrice: number;
  subtotal: number;
  total: number;
  savingsFromNextTier?: number;
  explanation: string;
}

export function calculateQuote(req: QuoteRequest): QuoteResult {
  const { product, quantity, widthInches, heightInches, finishSlug } = req;

  // 1. Find the applicable quantity tier
  const sortedTiers = [...product.quantityTiers].sort((a, b) => b.minQuantity - a.minQuantity);
  const applicableTier = sortedTiers.find((t) => quantity >= t.minQuantity) || sortedTiers[sortedTiers.length - 1];
  
  let baseUnitPrice = Number(applicableTier.unitPrice);

  // 2. Apply Size Multiplier (Normalized to 3x3 standard)
  const standardArea = 9; // 3" x 3"
  const requestedArea = widthInches * heightInches;
  const sizeMultiplier = requestedArea / standardArea;

  // 3. Apply Finish Modifier
  const finish = product.finishes.find((f) => f.slug === finishSlug);
  const finishModifier = finish ? Number(finish.priceModifier || 1) : 1;

  // 4. Final Calculation
  const unitPrice = Math.ceil(baseUnitPrice * sizeMultiplier * finishModifier);
  const total = unitPrice * quantity;

  // 5. Check for upsell (next tier)
  const nextTier = [...product.quantityTiers]
    .sort((a, b) => a.minQuantity - b.minQuantity)
    .find((t) => t.minQuantity > quantity);

  let explanation = `Calculated based on ${quantity} units at ${widthInches}x${heightInches}in with ${finish?.label || 'standard'} finish.`;
  
  let savingsFromNextTier: number | undefined;
  if (nextTier) {
    const nextTierPrice = Math.ceil(Number(nextTier.unitPrice) * sizeMultiplier * finishModifier);
    const savings = unitPrice - nextTierPrice;
    if (savings > 0) {
      savingsFromNextTier = savings;
      explanation += ` Increasing to ${nextTier.minQuantity} units would drop the unit price by ₦${savings.toLocaleString()}.`;
    }
  }

  return {
    unitPrice,
    subtotal: total,
    total,
    savingsFromNextTier,
    explanation,
  };
}