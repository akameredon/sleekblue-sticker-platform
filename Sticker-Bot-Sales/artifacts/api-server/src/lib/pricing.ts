import type { QuantityTier, SizeOption, FinishOption, Product } from "@workspace/db/schema";

export type QuoteInput = {
  productSlug?: string;
  sizeLabel: string;
  finishLabel: string;
  quantity: number;
  widthMm?: number;
  heightMm?: number;
};

export type QuoteBreakdownLine = { label: string; amount: number };

export type QuoteResult = {
  productSlug?: string;
  productName?: string;
  sizeLabel: string;
  finishLabel: string;
  quantity: number;
  widthMm?: number;
  heightMm?: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  currency: string;
  currencySymbol: string;
  breakdown: QuoteBreakdownLine[];
  leadTimeDays: number;
  savingsNote?: string;
};

const DEFAULT_QUANTITY_TIERS: QuantityTier[] = [
  { minQty: 1, unitPrice: 250, label: "Starter (1-49)" },
  { minQty: 50, unitPrice: 180, label: "Maker pack (50-99)" },
  { minQty: 100, unitPrice: 140, label: "Brand pack (100-249)" },
  { minQty: 250, unitPrice: 110, label: "Bulk (250-499)" },
  { minQty: 500, unitPrice: 85, label: "Wholesale (500+)" },
];

const DEFAULT_SIZES: SizeOption[] = [
  { label: "Small", widthMm: 50, heightMm: 50, priceModifier: 1.0 },
  { label: "Medium", widthMm: 75, heightMm: 75, priceModifier: 1.4 },
  { label: "Large", widthMm: 100, heightMm: 100, priceModifier: 1.9 },
  { label: "Custom", widthMm: 0, heightMm: 0, priceModifier: 1.0 },
];

const DEFAULT_FINISHES: FinishOption[] = [
  { label: "Matte", description: "Soft, premium feel", priceModifier: 1.0 },
  { label: "Gloss", description: "Vibrant and reflective", priceModifier: 1.05 },
  { label: "Holographic", description: "Rainbow shimmer", priceModifier: 1.35 },
];

function pickTier(tiers: QuantityTier[], quantity: number): QuantityTier {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let chosen = sorted[0];
  for (const t of sorted) if (quantity >= t.minQty) chosen = t;
  return chosen!;
}

export function calculateQuote(
  input: QuoteInput,
  product: Product | null,
  leadTimeDays: number,
): QuoteResult {
  const sizes = product?.sizes?.length ? product.sizes : DEFAULT_SIZES;
  const finishes = product?.finishes?.length ? product.finishes : DEFAULT_FINISHES;
  const tiers = product?.quantityTiers?.length
    ? product.quantityTiers
    : DEFAULT_QUANTITY_TIERS;

  const size =
    sizes.find((s) => s.label.toLowerCase() === input.sizeLabel.toLowerCase()) ??
    sizes[0]!;
  const finish =
    finishes.find((f) => f.label.toLowerCase() === input.finishLabel.toLowerCase()) ??
    finishes[0]!;
  const tier = pickTier(tiers, input.quantity);

  const widthMm =
    input.sizeLabel.toLowerCase() === "custom" ? input.widthMm ?? 100 : size.widthMm;
  const heightMm =
    input.sizeLabel.toLowerCase() === "custom" ? input.heightMm ?? 100 : size.heightMm;

  // Custom-size scaling: area in cm² vs reference 50cm² (small)
  let sizeModifier = size.priceModifier;
  if (input.sizeLabel.toLowerCase() === "custom") {
    const areaCm2 = (widthMm * heightMm) / 100;
    const refCm2 = 25; // 50x50mm reference
    sizeModifier = Math.max(1.0, areaCm2 / refCm2);
  }

  const baseUnit = tier.unitPrice;
  const sizedUnit = baseUnit * sizeModifier;
  const finishedUnit = sizedUnit * finish.priceModifier;
  const unitPrice = Math.round(finishedUnit);

  const baseSubtotal = baseUnit * input.quantity;
  const subtotal = unitPrice * input.quantity;

  // Compare against the smallest tier (full price) to compute "savings"
  const fullTier = [...tiers].sort((a, b) => a.minQty - b.minQty)[0]!;
  const fullPriceSubtotal = Math.round(
    fullTier.unitPrice * sizeModifier * finish.priceModifier,
  ) * input.quantity;
  const discount = Math.max(0, fullPriceSubtotal - subtotal);

  const deliveryFee = 0; // pickup default; quoted on chat
  const total = subtotal + deliveryFee;

  const breakdown: QuoteBreakdownLine[] = [
    { label: `${tier.label} unit price`, amount: baseUnit },
    { label: `Size: ${input.sizeLabel} (${widthMm}x${heightMm}mm)`, amount: Math.round(sizedUnit - baseUnit) },
    { label: `Finish: ${finish.label}`, amount: Math.round(finishedUnit - sizedUnit) },
    { label: `Unit price`, amount: unitPrice },
    { label: `Quantity x${input.quantity}`, amount: subtotal },
  ];

  let savingsNote: string | undefined;
  if (discount > 0) {
    const pct = Math.round((discount / fullPriceSubtotal) * 100);
    savingsNote = `You save ₦${discount.toLocaleString("en-NG")} (${pct}%) at this volume.`;
  } else if (input.quantity < 50) {
    const next = tiers.find((t) => t.minQty > input.quantity);
    if (next) {
      savingsNote = `Add ${next.minQty - input.quantity} more to unlock the ${next.label} price (₦${next.unitPrice}/unit).`;
    }
  }

  return {
    productSlug: product?.slug,
    productName: product?.name,
    sizeLabel: input.sizeLabel,
    finishLabel: input.finishLabel,
    quantity: input.quantity,
    widthMm,
    heightMm,
    unitPrice,
    subtotal,
    discount,
    deliveryFee,
    total,
    currency: "NGN",
    currencySymbol: "₦",
    breakdown,
    leadTimeDays,
    savingsNote,
  };
}

export { DEFAULT_QUANTITY_TIERS, DEFAULT_SIZES, DEFAULT_FINISHES };


/**
 * Sleekblue Label Studio estimator based on the wholesale cost sheet supplied
 * by the business. Supports only the listed quantity tiers. Non-standard
 * materials, finishes, shapes and quantities require a manually confirmed quote.
 */
const LABEL_STUDIO_COST_ANCHORS: Record<100 | 500 | 1000, Array<{ areaIn2: number; cost: number }>> = {
  100: [
    { areaIn2: 2.25, cost: 3000 }, { areaIn2: 4, cost: 3000 },
    { areaIn2: 6.25, cost: 4500 }, { areaIn2: 9, cost: 5000 },
    { areaIn2: 12, cost: 6500 }, { areaIn2: 16, cost: 9000 },
  ],
  500: [
    { areaIn2: 2.25, cost: 12500 }, { areaIn2: 4, cost: 12500 },
    { areaIn2: 6.25, cost: 20000 }, { areaIn2: 9, cost: 22500 },
    { areaIn2: 12, cost: 30000 }, { areaIn2: 16, cost: 42500 },
  ],
  1000: [
    { areaIn2: 2.25, cost: 20000 }, { areaIn2: 4, cost: 20000 },
    { areaIn2: 6.25, cost: 35000 }, { areaIn2: 9, cost: 40000 },
    { areaIn2: 12, cost: 55000 }, { areaIn2: 16, cost: 80000 },
  ],
};

export function calculateLabelStudioUnitPrice(
  widthMm: number,
  heightMm: number,
  quantity: number,
): number | null {
  if (![100, 500, 1000].includes(quantity)) return null;
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) ||
      widthMm < 20 || heightMm < 20 || widthMm > 300 || heightMm > 300) return null;

  const anchors = LABEL_STUDIO_COST_ANCHORS[quantity as 100 | 500 | 1000];
  const areaIn2 = (widthMm / 25.4) * (heightMm / 25.4);
  let left = anchors[0]!;
  let right = anchors[1]!;

  if (areaIn2 > anchors[0]!.areaIn2) {
    for (let i = 1; i < anchors.length; i++) {
      if (areaIn2 <= anchors[i]!.areaIn2) {
        left = anchors[i - 1]!;
        right = anchors[i]!;
        break;
      }
      left = anchors[anchors.length - 2]!;
      right = anchors[anchors.length - 1]!;
    }
  }

  const ratio = (areaIn2 - left.areaIn2) / (right.areaIn2 - left.areaIn2);
  const productionCost = Math.max(0, Math.ceil(left.cost + ratio * (right.cost - left.cost)));
  // 30% gross-margin target; rounded upward to the next ₦100.
  return Math.ceil((productionCost / 0.7) / 100) * 100;
}
