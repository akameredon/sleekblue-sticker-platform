# ⚙️ SLEEKBLUE STANDARD WORKFLOWS (SOPs)

> **WARNING:** These are the immutable workflows for the Sleekblue project. Any agent, developer, or automation script interacting with this repository MUST follow these sequences exactly. Skipping steps introduces vulnerabilities and technical debt.

---

## 1. 🏗️ THE FEATURE IMPLEMENTATION WORKFLOW (TDD)
*Before writing any new business logic, you must follow this sequence:*

1. **Define the Schema:** Open `schema.ts`. If the feature requires data storage, build the Drizzle ORM schema first.
2. **Draft the Test:** Create the `.test.ts` file. Write the exact inputs you expect and the assertions for the output. The test must fail.
3. **Write the Engine:** Implement the isolated business logic (e.g., inside `pricing.ts` or `objectAcl.ts`). Do not touch the API route yet.
4. **Pass the Test:** Make the engine pass the `.test.ts` assertions.
5. **Expose the Route:** Only after the engine works in isolation, map it to an Express route in `api-server/src/routes/`.
6. **Integrate Frontend:** Connect the React component using the standardized data contract.

---

## 2. 🎨 THE UI/UX COMPONENT WORKFLOW
*When building or modifying visual elements in `artifacts/storefront/`:*

1. **Skeleton First:** Build the HTML structure with basic Tailwind layout classes (Flexbox/Grid).
2. **Apply Brand Tokens:** Inject the exact colors, fonts, and border radii defined in `index.css`. No raw hex codes allowed.
3. **Responsive Pass:** Resize the browser to 375px. Fix any overflow or stacking issues. The mobile view must be flawless before proceeding to desktop.
4. **Micro-Interaction Pass:** 
   - Add `hover:` and `focus:` states to all interactive elements.
   - Add entry animations (`animate-in fade-in slide-in-from-bottom-4`).
   - Ensure loading states are visually appealing (no naked spinners).
5. **Accessibility Check:** Ensure all SVGs have `aria-hidden="true"` or `<title>` tags, and buttons are keyboard-navigable.

---

## 3. 💳 THE PAYMENT & FULFILLMENT WORKFLOW
*This is the exact sequence of events for a transaction. It cannot be altered.*

1. **Intent (Frontend):** User requests a checkout. The AI or UI triggers the `calculateQuote()` tool.
2. **Initialization (Backend):** Frontend calls `POST /payments/initialize`. The backend locks in the price, generates a `paystackRef`, and returns an `access_code`.
3. **Execution (Client):** The Paystack inline widget opens. The user pays.
4. **Verification (Backend - CRITICAL):** 
   - Paystack hits `POST /payments/webhook`.
   - The backend validates the HMAC-SHA512 signature using `PAYSTACK_SECRET_KEY`.
   - The backend calls Paystack's verify endpoint server-to-server.
5. **Fulfillment (Database & WhatsApp):** 
   - The database order status changes to `confirmed`.
   - A personalized WhatsApp `wa.me` deep-link is generated for the client to track their order.

---

## 4. 🚀 THE LAUNCH & DEPLOYMENT WORKFLOW
*Before pushing to production, this checklist must be executed.*

1. **Environment Audit:** Verify all 4 critical keys are present in `.env` (`DATABASE_URL`, `OPENAI_API_KEY`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`).
2. **Dependency Verification:** Run `pnpm install` and ensure the `minimumReleaseAge` defense passes.
3. **Database Sync:** Run `pnpm run seed` to ensure the schema matches the codebase and required products are loaded.
4. **Build Check:** Run `pnpm run typecheck` and `pnpm run build`. Zero TypeScript errors are permitted.
5. **Ignition:** Execute `pnpm run launch`. Monitor the console for fatal startup errors.
