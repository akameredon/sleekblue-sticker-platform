# Architecture — Conversational Deal Engine

## System Overview

```
WhatsApp Customer
      │
      ▼
[WhatsApp Business API]
      │  (POST /webhook/whatsapp)
      ▼
[API Server — Fastify + TypeScript]
      │
      ├──► [Webhook Auth Middleware] ─── HMAC verify + rate limit
      │
      ├──► [Conversation Router]
      │         │
      │         ├──► [Intent Engine] ─────── GPT-4o classify intent
      │         │         └──► intents: BRANDING | PACKAGING | PERSONAL | RESELL
      │         │
      │         ├──► [Conversation FSM]
      │         │         States: ENTRY → DIAGNOSIS → OFFER → PROOF → DECISION → PAYMENT → FULFILLED
      │         │         Storage: PostgreSQL sessions table
      │         │
      │         ├──► [Question Engine] ───── Adaptive stacked Qs (max 5)
      │         │
      │         ├──► [Offer Builder] ──────── GPT-4o + pricing rules → formatted offer
      │         │
      │         ├──► [Visual Proof Module] ── Retrieve matching past-job images
      │         │
      │         ├──► [Decision Lock] ──────── Inject binary micro-decision prompt
      │         │
      │         └──► [Payment Gateway] ────── Paystack link → customer
      │
      ├──► [Design Generator] ─── DALL-E mockup (when no design)
      │
      ├──► [Fulfillment Module] ── Production ticket → DB → notify customer
      │
      ├──► [Behavioral Engine] ─── Drop-off tracking → A/B insights
      │
      └──► [Analytics API] ────── Admin dashboard endpoints

```

## Data Flow: Happy Path

```
1. Customer: "Hi"
2. [Intent Engine] → ENTRY state → send category hook
3. Customer: "Business branding"
4. [FSM] → DIAGNOSIS → [Question Engine] fires Q1: "How many pieces?"
5. Customer: "500"
6. [Question Engine] → Q2: "Do you have a design?"
7. Customer: "Yes"
8. [Question Engine] → Q3: "Budget range?"
9. Customer: "Under ₦80k"
10. [FSM] → OFFER → [Offer Builder] generates offer in < 3s
11. [Visual Proof] → sends 2 matching past-job images
12. [FSM] → DECISION → [Decision Lock] fires: "Lock this in or adjust quantity?"
13. Customer: "Lock it in"
14. [Payment Gateway] → Paystack link sent
15. Customer pays → webhook fires
16. [Fulfillment] → ticket created → "Order #1042 confirmed. Production starts in 2hrs."
17. [Behavioral Engine] → logs CONVERTED at PAYMENT state
```

## Database Schema (Core Tables)

```sql
-- Customer sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'ENTRY',
  intent TEXT,
  answers JSONB DEFAULT '{}',
  offer JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  phone_number TEXT NOT NULL,
  product_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_naira NUMERIC(12,2) NOT NULL,
  has_design BOOLEAN DEFAULT FALSE,
  design_url TEXT,
  payment_status TEXT DEFAULT 'PENDING',
  payment_ref TEXT,
  production_status TEXT DEFAULT 'QUEUED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Behavioral analytics
CREATE TABLE analytics_events (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  phone_number TEXT,
  event_type TEXT NOT NULL,
  state_from TEXT,
  state_to TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offer templates (for A/B testing)
CREATE TABLE offer_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  conversion_count INTEGER DEFAULT 0,
  send_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Module Contracts

### IntentEngine
```typescript
interface IntentResult {
  intent: 'BUSINESS_BRANDING' | 'PACKAGING' | 'PERSONAL_USE' | 'RESELLING';
  confidence: number; // 0–1
  rawMessage: string;
}
classifyIntent(message: string): Promise<IntentResult>
```

### OfferBuilder
```typescript
interface CustomerAnswers {
  intent: string;
  quantity: number;
  hasDesign: boolean;
  budgetRange: string;
}
interface Offer {
  productType: string;
  specs: string[];
  priceNaira: number;
  deliveryEta: string;
  messageFormatted: string;
}
buildOffer(answers: CustomerAnswers): Promise<Offer>
```

### ConversationFSM
```typescript
type FSMState = 'ENTRY' | 'DIAGNOSIS' | 'OFFER' | 'PROOF' | 'DECISION' | 'PAYMENT' | 'FULFILLED';
interface Session {
  phoneNumber: string;
  state: FSMState;
  intent?: string;
  answers: Record<string, unknown>;
  offer?: Offer;
}
transition(phoneNumber: string, event: string, payload?: unknown): Promise<Session>
getSession(phoneNumber: string): Promise<Session>
```
