export {
  type FSMState,
  type FSMEvent,
  type Session,
  getNextState,
  canTransition,
  createSession,
  applyTransition,
} from './stateMachine.js';

export {
  getOrCreateSession,
  saveSession,
  deleteSession,
  getAllSessions,
} from './sessionStore.js';

export {
  getNextQuestion,
  isDiagnosisComplete,
  recordAnswer,
  type DiagnosticQuestion,
} from './questionEngine.js';

export {
  buildDecisionLockMessage,
  isConfirmation,
  isAdjustmentRequest,
} from './decisionLock.js';
