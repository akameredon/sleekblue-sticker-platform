import type { Intent } from '../intent-engine/classifier.js';
import type { Session } from './stateMachine.js';

export interface DiagnosticQuestion {
  key: string;
  text: string;
  skipIf?: (answers: Record<string, unknown>) => boolean;
}

/**
 * Ordered question bank per intent.
 * Max 5 questions. Each can be skipped based on prior answers.
 */
const QUESTION_BANK: Record<Intent, DiagnosticQuestion[]> = {
  BUSINESS_BRANDING: [
    {
      key: 'quantity',
      text: '📦 How many pieces do you need?',
    },
    {
      key: 'hasDesign',
      text: '🎨 Do you already have a design ready? (Yes / No)',
    },
    {
      key: 'material',
      text: '💧 Do you want waterproof vinyl or paper stickers?',
      skipIf: (a) => Number(a.quantity) < 50,
    },
    {
      key: 'budget',
      text: '💰 What\'s your budget range? (e.g., Under ₦50k / ₦50k–₦100k / Above ₦100k)',
    },
    {
      key: 'deadline',
      text: '⏰ Do you have a deadline for delivery?',
      skipIf: (a) => !a.budget,
    },
  ],
  PACKAGING: [
    {
      key: 'quantity',
      text: '📦 How many labels/stickers do you need?',
    },
    {
      key: 'hasDesign',
      text: '🎨 Do you have a design file ready? (Yes / No)',
    },
    {
      key: 'shape',
      text: '✂️ What shape do you want? (Round / Square / Custom die-cut)',
    },
    {
      key: 'budget',
      text: '💰 What\'s your budget? (e.g., Under ₦30k / ₦30k–₦80k / Above ₦80k)',
    },
    {
      key: 'deadline',
      text: '⏰ When do you need them by?',
    },
  ],
  PERSONAL_USE: [
    {
      key: 'quantity',
      text: '📦 How many stickers do you need?',
    },
    {
      key: 'hasDesign',
      text: '🎨 Do you have a design in mind or need us to create one? (Have one / Create for me)',
    },
    {
      key: 'size',
      text: '📐 What size roughly? (Small 5cm / Medium 10cm / Large 20cm)',
      skipIf: (a) => Number(a.quantity) > 500,
    },
    {
      key: 'budget',
      text: '💰 What\'s your budget? (Under ₦10k / ₦10k–₦30k / Above ₦30k)',
    },
  ],
  RESELLING: [
    {
      key: 'quantity',
      text: '📦 What quantity are you thinking? (We do bulk from 1,000pcs)',
    },
    {
      key: 'hasDesign',
      text: '🎨 Will you supply the designs or need them created?',
    },
    {
      key: 'frequency',
      text: '🔁 Is this a one-time order or are you looking for a recurring supply deal?',
    },
    {
      key: 'budget',
      text: '💰 What\'s your target price per unit or total budget?',
    },
    {
      key: 'timeline',
      text: '⏰ When do you need the first batch?',
    },
  ],
};

/**
 * Returns the next unanswered, non-skipped question for the session.
 * Returns null when all questions are answered (ready for offer generation).
 */
export function getNextQuestion(session: Session): DiagnosticQuestion | null {
  const intent = session.intent as Intent;
  if (!intent || !QUESTION_BANK[intent]) return null;

  const questions = QUESTION_BANK[intent];
  for (const question of questions) {
    if (session.answers[question.key] !== undefined) continue;
    if (question.skipIf?.(session.answers)) continue;
    return question;
  }
  return null;
}

/**
 * Returns true if all required questions have been answered or skipped.
 */
export function isDiagnosisComplete(session: Session): boolean {
  return getNextQuestion(session) === null;
}

/**
 * Records an answer for the current question key.
 */
export function recordAnswer(
  session: Session,
  questionKey: string,
  answer: string
): Session {
  return {
    ...session,
    answers: {
      ...session.answers,
      [questionKey]: answer,
    },
    questionIndex: session.questionIndex + 1,
    updatedAt: new Date().toISOString(),
  };
}
