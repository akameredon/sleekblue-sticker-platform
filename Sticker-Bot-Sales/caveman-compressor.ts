/**
 * Caveman: Ultra-compressed mode for token reduction.
 * Strategy: Removes boilerplate, reduces natural language to key technical tokens, 
 * and uses shorthand notation for complex instructions.
 */

export const cavemanCompress = (prompt: string): string => {
  // Basic placeholder implementation: 
  // 1. Remove common filler words
  // 2. Reduce whitespace
  // 3. Convert to keyword-heavy syntax
  return prompt
    .replace(/\b(please|thank you|could you|would you mind|is it possible to)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const isCavemanEnabled = () => process.env.AI_MODE === 'caveman';
