export {
  trackEvent,
  getDropoffStats,
  getConversionRate,
  getAllEvents,
  type AnalyticsEvent,
  type EventType,
} from './dropoffTracker.js';

export {
  recordOrder,
  getLastOrder,
  isReturningCustomer,
  buildReturningCustomerMessage,
  buildNewCustomerEntryHook,
  type PastOrder,
} from './returningCustomer.js';
