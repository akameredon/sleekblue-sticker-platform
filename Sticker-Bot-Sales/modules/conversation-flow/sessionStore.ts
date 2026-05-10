import { createSession, type Session } from './stateMachine.js';

/**
 * In-memory session store.
 * In production, swap backing store for PostgreSQL via db.ts.
 * Sessions are keyed by phone number (E.164 format).
 */
const store = new Map<string, Session>();

/**
 * Retrieves an existing session or creates a new one for the phone number.
 */
export function getOrCreateSession(phoneNumber: string): Session {
  if (!store.has(phoneNumber)) {
    store.set(phoneNumber, createSession(phoneNumber));
  }
  return store.get(phoneNumber)!;
}

/**
 * Persists the updated session to the store.
 */
export function saveSession(session: Session): void {
  store.set(session.phoneNumber, {
    ...session,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Removes a session (e.g., after FULFILLED or explicit reset).
 */
export function deleteSession(phoneNumber: string): void {
  store.delete(phoneNumber);
}

/**
 * Returns all active sessions (for admin/debug purposes only).
 */
export function getAllSessions(): Session[] {
  return Array.from(store.values());
}
