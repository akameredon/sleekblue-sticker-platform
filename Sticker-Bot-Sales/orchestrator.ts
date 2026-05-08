import { RufloAgent, RufloTask } from 'ruflo';
import { bananaClaude } from 'banana-claude';
import { pricingEngine } from '../../../apps/api/src/services/pricing';

/**
 * Production-level Agent Orchestrator
 * Implements Engineering Moat Skill #11 & #7
 */
export class StickerBotOrchestrator {
  private agent: RufloAgent;

  constructor() {
    this.agent = new RufloAgent({
      name: "StickerLab-Concierge",
      model: "gpt-4o",
      skills: [
        // Integrate MCP for external tool access
        bananaClaude.asSkill(),
        // Native pricing skill to ensure centralized logic (Skill #3 logic)
        {
          name: "calculate_sticker_quote",
          description: "Calculates precise pricing for vinyl stickers based on dimensions and finish.",
          execute: async (params: any) => pricingEngine.calculate(params),
        }
      ],
      systemPrompt: `
        You are the primary sales representative for Sticker Lab Africa.
        Your goal is to guide users from design concept to WhatsApp checkout.
        Always use the calculate_sticker_quote tool for pricing; never guess.
      `
    });
  }

  public async processRequest(userId: string, input: string, stream: boolean = true) {
    const task = new RufloTask({
      userId,
      input,
      context: {
        market: "Africa",
        currency: "NGN",
        // Secure Object ACL Context (Skill #2)
        permissions: ["STICKER_READ", "ARTWORK_UPLOAD"]
      }
    });

    return this.agent.run(task, { stream });
  }
}