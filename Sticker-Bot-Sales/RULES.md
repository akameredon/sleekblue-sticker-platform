# 🛡️ SLEEKBLUE STRICT PROJECT RULES (UNCOMPROMISING)

> **WARNING TO ALL AGENTS AND DEVELOPERS:** 
> Do not write a single line of code in this repository until you have read and internalized every rule on this list. Violating these rules will result in immediate rejection of the pull request or task execution.

---

## 1. 🚫 THE "ZERO-DEFECT" MINDSET
- **No placeholder code:** Never leave a `// TODO` or `console.log("here")` in production logic. 
- **No fake types:** `any` is strictly banned. Use exact Zod schemas for all data crossing boundaries.
- **Fail loud and early:** If a condition is impossible, throw a fatal error immediately. Do not silently swallow exceptions or return empty states.

## 2. 💅 UI/UX IS NOT NEGOTIABLE
- **Never ship a "naked" element:** Every button, input, and state change must have a defined hover state, active state, and a micro-animation (e.g., `transition-all duration-300`).
- **Mobile First, Always:** If a feature does not look premium on a 375px screen, it is considered broken.
- **Glassmorphism & SaaS Aesthetics:** Stick to the established brand tokens in `index.css`. Do not introduce generic Tailwind colors without design intent.

## 3. 🔒 NO DUMMY DEPENDENCIES
- **Dependency Paranoia:** Before running `pnpm install <package>`, verify that it cannot be written in 50 lines of vanilla JS.
- **Strict Imports:** Never import packages that do not exist in `pnpm-workspace.yaml`. As seen with the fatal `zod/v4` bug, verifying import paths is mandatory.
- **Supply Chain Defense:** The `minimumReleaseAge` of 1440 minutes in `pnpm-workspace.yaml` is law. Do not bypass it unless it is an emergency zero-day patch.

## 4. 🗄️ SINGLE SOURCE OF TRUTH (STATE)
- **Frontend:** The `Cart.tsx` context and `localStorage` are the only places order state should live before checkout. 
- **Backend:** `drizzle-orm` schemas are the absolute source of truth. Do not define TypeScript interfaces that duplicate Drizzle schema shapes. Infer them: `type Order = typeof schema.orders.$inferSelect;`.

## 5. 💰 PAYSTACK & FINANCIAL INTEGRITY
- **Never trust the client:** The frontend provides intent; the backend calculates the price. The `pricing.ts` engine is the only entity allowed to determine how much a user pays.
- **Webhook Supremacy:** An order is only "confirmed" when the server receives a valid, signature-verified Paystack webhook. The frontend success popup is purely cosmetic.

## 6. 🤖 AI IS A TOOL, NOT A GIMMICK
- **No open-ended chatting:** The AI's purpose is to close the sale. Keep system prompts aggressive, concise, and focused on driving the user toward the `calculateQuote()` tool and Paystack checkout.
- **Streaming is mandatory:** All AI responses must use Server-Sent Events (SSE). No loading spinners waiting for a 10-second completion.

## 7. 🚀 THE LAUNCH ORCHESTRATOR IS SACRED
- To start the environment, you **must** use `pnpm run launch`.
- You cannot bypass the environment checks. If `.env` is missing `DATABASE_URL` or `PAYSTACK_SECRET_KEY`, the app must crash on boot. Do not patch around it.

---
*Signed & Sealed for the Sleekblue Architecture.*
