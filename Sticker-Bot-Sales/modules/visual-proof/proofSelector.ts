import type { Intent } from '../intent-engine/classifier.js';

export interface ProofAsset {
  url: string;
  caption: string;
  intent: Intent[];
  tags: string[];
}

/**
 * Curated proof asset library.
 * In production, these URLs point to Replit Object Storage.
 * Add real job photos here as they accumulate.
 */
const PROOF_LIBRARY: ProofAsset[] = [
  {
    url: 'https://storage.stickerbot.ng/proofs/branding-logo-vinyl-01.jpg',
    caption: '✅ Recent job: 500pcs die-cut vinyl logo stickers for a Lagos food brand',
    intent: ['BUSINESS_BRANDING'],
    tags: ['vinyl', 'die-cut', 'logo', 'brand'],
  },
  {
    url: 'https://storage.stickerbot.ng/proofs/branding-holographic-02.jpg',
    caption: '✅ Recent job: 1,000pcs holographic branding stickers — delivered in 48hrs',
    intent: ['BUSINESS_BRANDING'],
    tags: ['holographic', 'premium', 'brand'],
  },
  {
    url: 'https://storage.stickerbot.ng/proofs/packaging-label-01.jpg',
    caption: '✅ Recent job: 2,000pcs custom product labels for a skincare brand',
    intent: ['PACKAGING'],
    tags: ['label', 'skincare', 'packaging', 'round'],
  },
  {
    url: 'https://storage.stickerbot.ng/proofs/packaging-food-label-02.jpg',
    caption: '✅ Recent job: 3,000pcs food-safe labels — waterproof finish',
    intent: ['PACKAGING'],
    tags: ['food', 'waterproof', 'label'],
  },
  {
    url: 'https://storage.stickerbot.ng/proofs/personal-custom-01.jpg',
    caption: '✅ Recent job: Custom sticker set for a birthday party — 100pcs',
    intent: ['PERSONAL_USE'],
    tags: ['personal', 'event', 'birthday', 'fun'],
  },
  {
    url: 'https://storage.stickerbot.ng/proofs/bulk-wholesale-01.jpg',
    caption: '✅ Recent job: 10,000pcs bulk order — reseller wholesale pack',
    intent: ['RESELLING'],
    tags: ['bulk', 'wholesale', 'resell'],
  },
];

/**
 * Selects 2–3 matching proof assets for a given intent.
 * Prefers exact intent matches; falls back to general proofs.
 */
export function selectProofAssets(intent: Intent, limit = 2): ProofAsset[] {
  const matches = PROOF_LIBRARY.filter((a) => a.intent.includes(intent));
  if (matches.length >= limit) return matches.slice(0, limit);
  return PROOF_LIBRARY.slice(0, limit);
}

/**
 * Formats a WhatsApp proof drop message header.
 */
export function formatProofHeader(intent: Intent): string {
  const contextMap: Record<Intent, string> = {
    BUSINESS_BRANDING: 'Here\'s what we\'ve done for brands like yours 👇',
    PACKAGING: 'Here\'s some of our recent packaging label work 👇',
    PERSONAL_USE: 'Here\'s what similar custom orders looked like 👇',
    RESELLING: 'Here\'s what bulk/wholesale orders look like when they ship 👇',
  };
  return contextMap[intent];
}
