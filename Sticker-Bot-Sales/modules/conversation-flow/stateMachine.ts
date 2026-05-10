import type { Intent } from '../intent-engine/classifier.js';
import type { Offer } from '../offer-builder/offerGenerator.js';

export type FSMState =
  | 'ENTRY'
  | 'DIAGNOSIS'
  | 'OFFER'
  | 'PROOF'
  | 'DECISION'
  | 'PAYMENT'
  | 'FULFILLED';

export interface Session {
  phoneNumber: string;
  state: FSMState;
  intent?: Intent;
  answers: Record<string, unknown>;
  offer?: Offer;
  questionIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type FSMEvent =
  | 'INTENT_DETECTED'
  | 'ANSWER_RECEIVED'
  | 'OFFER_READY'
  | 'PROOF_SENT'
  | 'CUSTOMER_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED';

const VALID_TRANSITIONS: Record<FSMState, Partial<Record<FSMEvent, FSMState>>> = {
  ENTRY: {
    INTENT_DETECTED: 'DIAGNOSIS',
  },
  DIAGNOSIS: {
    OFFER_READY: 'OFFER',
  },
  OFFER: {
    PROOF_SENT: 'PROOF',
  },
  PROOF: {
    CUSTOMER_CONFIRMED: 'DECISION',
  },
  DECISION: {
    CUSTOMER_CONFIRMED: 'PAYMENT',
  },
  PAYMENT: {
    PAYMENT_RECEIVED: 'FULFILLED',
    PAYMENT_FAILED: 'DECISION',
  },
  FULFILLED: {},
};

/**
 * Returns the next state for a given event, or null if transition is invalid.
 */
export function getNextState(current: FSMState, event: FSMEvent): FSMState | null {
  return VALID_TRANSITIONS[current]?.[event] ?? null;
}

/**
 * Returns true if a state transition is valid.
 */
export function canTransition(current: FSMState, event: FSMEvent): boolean {
  return getNextState(current, event) !== null;
}

/**
 * Creates a fresh session object for a new customer.
 */
export function createSession(phoneNumber: string): Session {
  return {
    phoneNumber,
    state: 'ENTRY',
    intent: undefined,
    answers: {},
    offer: undefined,
    questionIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Returns a copy of the session with the new state applied.
 */
export function applyTransition(session: Session, event: FSMEvent): Session {
  const nextState = getNextState(session.state, event);
  if (!nextState) {
    throw new Error(`Invalid transition: ${session.state} → (event: ${event})`);
  }
  return {
    ...session,
    state: nextState,
    updatedAt: new Date().toISOString(),
  };
}
