import OpenAI from "openai";

/**
 * Create the OpenAI client only when an AI feature is actually invoked.
 * API startup and non-AI customer flows must not depend on optional AI credentials.
 */
export function createOpenAIClient(): OpenAI {
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI integration is not configured: AI_INTEGRATIONS_OPENAI_API_KEY is missing.");
  }

  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}
