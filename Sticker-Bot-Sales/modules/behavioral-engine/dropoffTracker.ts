import type { FSMState } from '../conversation-flow/stateMachine.js';

export type EventType = 'STATE_ENTERED' | 'STATE_EXITED' | 'CONVERTED' | 'ABANDONED' | 'OFFER_SENT' | 'PROOF_SENT' | 'PAYMENT_LINK_SENT';

export interface AnalyticsEvent {
  sessionId: string;
  phoneNumberHash: string;
  eventType: EventType;
  stateFrom?: FSMState;
  stateTo?: FSMState;
  intent?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * In-memory event log. In production, flush to `analytics_events` DB table.
 */
const eventLog: AnalyticsEvent[] = [];

/**
 * Hashes a phone number for anonymized analytics storage.
 * Simple hash — in production use crypto.createHash('sha256').
 */
function hashPhone(phone: string): string {
  let hash = 0;
  for (let i = 0; i < phone.length; i++) {
    hash = (hash << 5) - hash + phone.charCodeAt(i);
    hash |= 0;
  }
  return `ph_${Math.abs(hash).toString(16)}`;
}

/**
 * Records a behavioral analytics event.
 * Phone numbers are hashed before storage — no PII in the log.
 */
export function trackEvent(
  sessionId: string,
  phoneNumber: string,
  eventType: EventType,
  opts: {
    stateFrom?: FSMState;
    stateTo?: FSMState;
    intent?: string;
    metadata?: Record<string, unknown>;
  } = {}
): void {
  const event: AnalyticsEvent = {
    sessionId,
    phoneNumberHash: hashPhone(phoneNumber),
    eventType,
    stateFrom: opts.stateFrom,
    stateTo: opts.stateTo,
    intent: opts.intent,
    metadata: opts.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
  eventLog.push(event);
}

/**
 * Returns drop-off percentages per FSM state.
 * A "drop-off" is an ABANDONED event at that state.
 */
export function getDropoffStats(): Record<FSMState, { abandoned: number; total: number; rate: string }> {
  const states: FSMState[] = ['ENTRY', 'DIAGNOSIS', 'OFFER', 'PROOF', 'DECISION', 'PAYMENT', 'FULFILLED'];
  const result = {} as Record<FSMState, { abandoned: number; total: number; rate: string }>;

  for (const state of states) {
    const total = eventLog.filter((e) => e.stateFrom === state).length;
    const abandoned = eventLog.filter((e) => e.stateFrom === state && e.eventType === 'ABANDONED').length;
    result[state] = {
      abandoned,
      total,
      rate: total > 0 ? `${((abandoned / total) * 100).toFixed(1)}%` : 'N/A',
    };
  }
  return result;
}

/**
 * Returns overall conversion rate (CONVERTED / total sessions started).
 */
export function getConversionRate(): string {
  const total = eventLog.filter((e) => e.eventType === 'STATE_ENTERED' && e.stateTo === 'ENTRY').length;
  const converted = eventLog.filter((e) => e.eventType === 'CONVERTED').length;
  if (total === 0) return 'N/A';
  return `${((converted / total) * 100).toFixed(1)}%`;
}

/**
 * Returns all raw events (admin only — do not expose to customers).
 */
export function getAllEvents(): AnalyticsEvent[] {
  return [...eventLog];
}
