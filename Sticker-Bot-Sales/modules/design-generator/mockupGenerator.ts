import OpenAI from 'openai';
import { buildDesignPrompt, type DesignPromptInput } from './promptBuilder.js';

export interface MockupResult {
  imageUrl: string;
  prompt: string;
  revisedPrompt?: string;
}

/**
 * Generates a sticker mockup image using DALL-E 3.
 * Returns the image URL (hosted by OpenAI CDN or uploaded to storage).
 *
 * Timeout: 30 seconds (DALL-E can be slow — acceptable for "Design Instantly" mode).
 */
export async function generateMockup(
  input: DesignPromptInput,
  openai: OpenAI
): Promise<MockupResult> {
  const prompt = buildDesignPrompt(input);

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    style: 'vivid',
    response_format: 'url',
  });

  const result = response.data[0];
  if (!result?.url) {
    throw new Error('DALL-E returned no image URL');
  }

  return {
    imageUrl: result.url,
    prompt,
    revisedPrompt: result.revised_prompt,
  };
}
