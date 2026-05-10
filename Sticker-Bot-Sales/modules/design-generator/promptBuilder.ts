import type { Intent } from '../intent-engine/classifier.js';

export interface DesignPromptInput {
  intent: Intent;
  businessName?: string;
  colors?: string;
  style?: string;
  additionalNotes?: string;
}

/**
 * Builds a DALL-E image generation prompt for a sticker mockup.
 * Optimized for clear, print-ready sticker preview images.
 */
export function buildDesignPrompt(input: DesignPromptInput): string {
  const baseStyle = 'flat vector design, clean lines, professional print quality, white background, sticker mockup style';

  const intentContext: Record<Intent, string> = {
    BUSINESS_BRANDING: 'corporate logo sticker, modern minimalist brand identity, business professional',
    PACKAGING: 'product label sticker, clean typography, premium packaging aesthetic',
    PERSONAL_USE: 'fun colorful custom sticker, vibrant, creative, eye-catching',
    RESELLING: 'versatile wholesale sticker design, mass-market appeal, bold graphics',
  };

  const businessLine = input.businessName
    ? `, featuring the text "${input.businessName}"`
    : '';
  const colorLine = input.colors ? `, color palette: ${input.colors}` : ', colorful but professional';
  const styleLine = input.style ? `, style: ${input.style}` : '';
  const notesLine = input.additionalNotes ? `, ${input.additionalNotes}` : '';

  return `${intentContext[input.intent]}${businessLine}${colorLine}${styleLine}${notesLine}. ${baseStyle}. Die-cut shape with slight shadow effect. No text unless specified.`;
}

/**
 * Returns the WhatsApp message to send alongside the mockup image.
 */
export function formatMockupMessage(imageUrl: string): string {
  return `🎨 *Here's a quick mockup based on what you described:*

${imageUrl}

This is just a starting point — we can tweak:
• Colors
• Text / logo
• Shape & size
• Style

Reply:
✅ *Use this* — let's go!
✏️ *Tweak it* — tell me what to change
❌ *Start over* — describe your vision`;
}
