# BACKLOG.md — Conversational Deal Engine

> Managed by the 80,000-developer swarm. Tasks are atomic, testable, and assigned to specialist agents.
> Status: 🔴 TODO | 🟡 IN PROGRESS | 🟢 DONE | ⛔ BLOCKED

---

## 🏗️ PHASE 1 — Foundation & Core Engine

### TASK-001 · Intent Classifier (LeadDev)
- **Status**: 🔴 TODO
- **Agent**: LeadDev
- **Module**: `modules/intent-engine/`
- **Description**: Build an OpenAI-powered classifier that maps the user's first message to one of 4 intents: `BUSINESS_BRANDING`, `PACKAGING`, `PERSONAL_USE`, `RESELLING`.
- **Acceptance**: Given any opening WhatsApp message, returns intent + confidence score in < 500ms.
- **Files**: `modules/intent-engine/classifier.ts`, `modules/intent-engine/prompts.ts`

---

### TASK-002 · Conversation State Machine (LeadDev)
- **Status**: 🔴 TODO
- **Agent**: LeadDev
- **Module**: `modules/conversation-flow/`
- **Description**: Implement a finite state machine (FSM) that tracks each customer's position in the sales flow: `ENTRY → DIAGNOSIS → OFFER → PROOF → DECISION → PAYMENT → FULFILLED`.
- **Acceptance**: State persists per customer phone number. Transitions are logged. Handles re-entry gracefully.
- **Files**: `modules/conversation-flow/stateMachine.ts`, `modules/conversation-flow/sessionStore.ts`

---

### TASK-003 · Stacked Question Engine (LeadDev)
- **Status**: 🔴 TODO
- **Agent**: LeadDev
- **Module**: `modules/conversation-flow/`
- **Description**: Generate adaptive, stacked diagnostic questions based on current intent. Max 5 questions. Skip irrelevant ones based on prior answers.
- **Acceptance**: Business flow skips personal-use questions. No question is repeated. Completes in ≤ 5 exchanges.
- **Files**: `modules/conversation-flow/questionEngine.ts`

---

### TASK-004 · Real-Time Offer Builder (LeadDev + Architect)
- **Status**: 🔴 TODO
- **Agent**: LeadDev
- **Module**: `modules/offer-builder/`
- **Description**: Given customer answers (quantity, use-case, budget, design status), generate a formatted offer message using GPT-4o. Include product type, specs, price, and delivery ETA.
- **Acceptance**: Offer generated in < 3 seconds. Price is accurate against pricing rules. Output is formatted for WhatsApp.
- **Files**: `modules/offer-builder/offerGenerator.ts`, `modules/offer-builder/pricingRules.ts`, `modules/offer-builder/templates.ts`

---

### TASK-005 · WhatsApp Webhook Handler (DevOps + LeadDev)
- **Status**: 🔴 TODO
- **Agent**: DevOps
- **Module**: `artifacts/api-server/src/routes/`
- **Description**: Set up POST `/webhook/whatsapp` to receive incoming messages from Meta/Twilio. Verify signature. Parse message body and route to conversation FSM.
- **Acceptance**: Webhook verified, messages routed correctly. 200 response under 1 second.
- **Files**: `artifacts/api-server/src/routes/whatsapp.ts`

---

### TASK-006 · Decision Lock Prompt (LeadDev)
- **Status**: 🔴 TODO
- **Agent**: LeadDev
- **Module**: `modules/conversation-flow/`
- **Description**: After offer is shown, inject a "Decision Lock" message: a micro-decision prompt that forces a binary choice instead of open-ended response.
- **Acceptance**: Customer is prompted with a specific binary or ternary choice. No open "let me know" type endings.
- **Files**: `modules/conversation-flow/decisionLock.ts`

---

### TASK-007 · Visual Proof Drop Module (LeadDev)
- **Status**: 🔴 TODO
- **Agent**: LeadDev
- **Module**: `modules/visual-proof/`
- **Description**: Based on intent + product type, retrieve 2–3 matching past job images from storage. Send alongside offer as contextual proof.
- **Acceptance**: Images sent are relevant to intent. No generic catalog spam. Falls back gracefully if no match.
- **Files**: `modules/visual-proof/proofSelector.ts`, `modules/visual-proof/imageStore.ts`

---

### TASK-008 · Payment Link Injector (LeadDev + DevOps)
- **Status**: 🔴 TODO
- **Agent**: LeadDev
- **Module**: `modules/payment-gateway/`
- **Description**: After customer confirms order, generate a Paystack payment link with pre-filled amount and order metadata. Send via WhatsApp.
- **Acceptance**: Link generated per order. Amount matches offer. On payment, webhook triggers fulfillment.
- **Files**: `modules/payment-gateway/paystackAdapter.ts`, `modules/payment-gateway/paymentLinkBuilder.ts`

---

### TASK-009 · Fulfillment Ticket Creator (LeadDev)
- **Status**: 🔴 TODO
- **Agent**: LeadDev
- **Module**: `modules/fulfillment/`
- **Description**: On payment confirmation, create a production ticket in the DB with customer details, order specs, and status. Send customer a WhatsApp confirmation with order ID.
- **Acceptance**: Ticket created atomically. Customer notified instantly. Ticket queryable by admin dashboard.
- **Files**: `modules/fulfillment/ticketCreator.ts`, `modules/fulfillment/notifier.ts`

---

### TASK-010 · Behavioral Drop-off Tracker (Architect)
- **Status**: 🔴 TODO
- **Agent**: Architect
- **Module**: `modules/behavioral-engine/`
- **Description**: Track at which FSM state each conversation ends. Log intent, state reached, and outcome (converted/abandoned). Store in `analytics` DB table.
- **Acceptance**: Every session end writes to analytics. Dashboard endpoint returns drop-off percentages per state.
- **Files**: `modules/behavioral-engine/dropoffTracker.ts`, `modules/behavioral-engine/analyticsSchema.ts`

---

### TASK-011 · "Design Instantly" Mode (LeadDev)
- **Status**: 🔴 TODO
- **Agent**: LeadDev
- **Module**: `modules/design-generator/`
- **Description**: When customer says "I don't have a design", trigger DALL-E / GPT-4o Vision to generate a sticker mockup preview. Send image and ask: "Use this or tweak it?"
- **Acceptance**: Mockup generated in < 10 seconds. Customer can approve or request changes. Design saved to storage.
- **Files**: `modules/design-generator/mockupGenerator.ts`, `modules/design-generator/promptBuilder.ts`

---

### TASK-012 · Returning Customer Personalization (Architect)
- **Status**: 🔴 TODO
- **Agent**: Architect
- **Module**: `modules/behavioral-engine/`
- **Description**: Detect returning customers by phone number. Pull last order. Generate a personalized re-engagement message: "Last time you ordered 300pcs — want to repeat or upgrade to 500 at a discount?"
- **Acceptance**: Returns customers get personalized first message. New customers get standard entry hook. Zero false positives.
- **Files**: `modules/behavioral-engine/returningCustomer.ts`

---

### TASK-013 · Webhook Security + Rate Limiting (SecurityGuard)
- **Status**: 🔴 TODO
- **Agent**: SecurityGuard
- **Module**: `artifacts/api-server/src/middlewares/`
- **Description**: Add HMAC signature verification for WhatsApp webhooks. Implement per-phone-number rate limiting (max 30 messages/min). Block replay attacks via timestamp validation.
- **Acceptance**: Invalid signatures return 403. Flood attempts are throttled. No false bans on legitimate users.
- **Files**: `artifacts/api-server/src/middlewares/webhookAuth.ts`, `artifacts/api-server/src/middlewares/rateLimiter.ts`

---

### TASK-014 · Admin Analytics Dashboard API (DevOps + LeadDev)
- **Status**: 🔴 TODO
- **Agent**: DevOps
- **Module**: `artifacts/api-server/src/routes/`
- **Description**: Expose authenticated REST endpoints: conversion rate, drop-off by stage, best-performing offer templates, revenue totals.
- **Acceptance**: All endpoints require Bearer token. Data accurate to last 5 minutes. Response time < 200ms.
- **Files**: `artifacts/api-server/src/routes/analytics.ts`

---

### TASK-015 · QA Conversation Simulator (QAEngineer)
- **Status**: 🔴 TODO
- **Agent**: QAEngineer
- **Module**: `scripts/`
- **Description**: Build a CLI simulator that replays a synthetic customer conversation end-to-end: entry → intent → questions → offer → decision → payment. Assert each state transition is correct.
- **Acceptance**: 5 scenario scripts pass. Offer price matches pricing rules. Decision Lock always fires before payment stage.
- **Files**: `scripts/simulateConversation.ts`, `scripts/scenarios/`

---

## 📊 Backlog Summary

| Phase | Total | Done | In Progress | Blocked |
|-------|-------|------|-------------|---------|
| 1 — Foundation | 15 | 0 | 0 | 2 (env keys) |

**Velocity Target**: 3 tasks/session
**Next Priority**: TASK-001 → TASK-002 → TASK-005 (unblocked, highest impact)
