import OpenAI from 'openai';
import { INTENT_SYSTEM_PROMPT } from './prompts.js';

export type Intent = 'BUSINESS_BRANDING' | 'PACKAGING' | 'PERSONAL_USE' | 'RESELLING';

export interface IntentResult {
  intent: Intent;
  confidence: number;
  reasoning: string;
  rawMessage: string;
}

const SHORTHAND_MAP: Record<string, Intent> = {
  '1': 'BUSINESS_BRANDING',
  'business': 'BUSINESS_BRANDING',
  'branding': 'BUSINESS_BRANDING',
  'business branding': 'BUSINESS_BRANDING',
  '2': 'PACKAGING',
  'packaging': 'PACKAGING',
  'label': 'PACKAGING',
  'labels': 'PACKAGING',
  '3': 'PERSONAL_USE',
  'personal': 'PERSONAL_USE',
  'personal use': 'PERSONAL_USE',
  'personal uses': 'PERSONAL_USE',
  '4': 'RESELLING',
  'reselling': 'RESELLING',
  'resell': 'RESELLING',
  'wholesale': 'RESELLING',
};

/**
 * Attempts fast local classification before hitting OpenAI.
 * Returns null if no shorthand match found.
 */
function tryLocalClassify(message: string): IntentResult | null {
  const normalized = message.trim().toLowerCase();
  const match = SHORTHAND_MAP[normalized];
  if (!match) return null;
  return {
    intent: match,
    confidence: 1.0,
    reasoning: 'Matched shorthand input',
    rawMessage: message,
  };
}

/**
 * Classifies customer intent using GPT-4o.
 * Falls back to BUSINESS_BRANDING with low confidence on error.
 */
export async function classifyIntent(
  message: string,
  openai: OpenAI
): Promise<IntentResult> {
  const local = tryLocalClassify(message);
  if (local) return local;

  const sanitized = message.replace(/[\n\r]/g, ' ').slice(0, 500);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: 150,
      messages: [
        { role: 'system', content: INTENT_SYSTEM_PROMPT },
        { role: 'user', content: sanitized },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw) as { intent: Intent; confidence: number; reasoning: string };

    return {
      intent: parsed.intent,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      rawMessage: message,
    };
  } catch (err) {
    return {
      intent: 'BUSINESS_BRANDING',
      confidence: 0.4,
      reasoning: 'Fallback — classification failed',
      rawMessage: message,
    };
  }
}
