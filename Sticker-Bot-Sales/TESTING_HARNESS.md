# Reliability & Testing Harness

To maintain a $10,000 valuation, the project utilizes a multi-tier testing strategy to ensure business continuity.

### 1. Pricing Engine Verification (Unit Tests)
**Path**: `apps/api/src/services/pricing.test.ts`
- Validates that square-inch calculations for vinyl die-cuts are accurate across different finishes (Matte vs. Holographic).
- Ensures bulk discounts trigger correctly at the 50, 100, and 500 quantity milestones.

### 2. Conversational Flow (AI Integration Tests)
**Path**: `lib/integrations/openai/tests/chat.spec.ts`
- Mocks OpenAI responses to ensure the `Chat.tsx` component correctly parses delta streams and handles JSON errors without crashing the browser.

### 3. Checkout-to-WhatsApp Flow (E2E Tests)
**Path**: `apps/storefront/e2e/checkout.spec.ts`
- **Tool**: Playwright.
- **Scenario**: User adds 100 stickers -> Uploads a 5MB PNG -> Fills checkout -> Clicks "Place Order".
- **Verification**: Ensures the order is written to the DB and the `window.location` correctly redirects to the `wa.me` (WhatsApp) URL with the correct order ID.

### 4. ACL Security Audits
**Path**: `artifacts/api-server/src/lib/objectAcl.test.ts`
- Rigorous testing of the `canAccessObject` function to ensure a `userId` from User A cannot access a `private` file owned by User B.

### How to run the harness:
```bash
pnpm test        # Runs Vitest for logic
pnpm exec playwright test  # Runs E2E browser tests
```