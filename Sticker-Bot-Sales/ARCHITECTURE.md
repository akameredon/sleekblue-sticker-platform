# 🏛️ SLEEKBLUE ARCHITECTURE MAP

> This document defines the structural integrity of the Sleekblue application. Do not deviate from this stack or data flow without architectural review.

---

## 1. 🏗️ THE MONOREPO STACK
We use `pnpm` workspaces to manage dependencies globally and ensure strict versioning.

- **`artifacts/storefront/` (The UI Engine)**
  - **Framework:** React 19 + Vite.
  - **Styling:** Tailwind CSS v4 + Vanilla `index.css` (for brand tokens and micro-animations).
  - **Routing:** `wouter` (lightweight, hook-based routing).
  - **Icons:** `lucide-react`.
  - **Key Concept:** The UI is purely presentation and state. It holds zero business logic. It relies on the backend for all calculations.

- **`artifacts/api-server/` (The Brain)**
  - **Framework:** Node.js + Express 5.
  - **Database ORM:** Drizzle ORM.
  - **Database Engine:** PostgreSQL (Neon.tech).
  - **Validation:** Zod (Strict schema parsing for every API route).
  - **Key Concept:** The backend is the single source of truth for pricing, permissions, and payment verification.

## 2. 🔀 CORE DATA FLOWS

### A. The Chat / AI Stream Flow
`Storefront (FloatingChat.tsx)` -> Sends Message -> `API Server (routes/openai.ts)` -> Connects to OpenAI GPT-4o -> Returns Server-Sent Events (SSE) -> `Storefront` renders markdown & interactive components via tools.

### B. The Checkout & Payment Flow (Zero-Trust)
1. `Storefront` triggers `POST /payments/initialize` with order ID.
2. `API Server` locks price, calls Paystack API, returns `access_code`.
3. `Storefront` opens Paystack inline popup.
4. User pays -> Paystack servers hit `API Server (POST /payments/webhook)`.
5. `API Server` verifies HMAC-SHA512 signature -> Updates DB to `confirmed`.
6. `Storefront` polls `GET /payments/:reference` to show success screen.

### C. The Asset Pipeline (Secure Storage)
1. User uploads artwork via `ObjectUploader.tsx`.
2. `API Server` generates a secure, time-limited presigned URL via Google Cloud Storage.
3. Client uploads directly to bucket (bypassing our servers for bandwidth).
4. `objectAcl.ts` ensures `visibility: "private"`. Only the system and the specific user can read the file.

## 3. 🔌 EXTERNAL INTEGRATIONS
- **OpenAI:** Powers the conversational logic and image mockups.
- **Paystack:** Exclusive payment processor. Handles Card, Transfer, USSD.
- **Neon:** Serverless Postgres.
- **n8n / WhatsApp:** (External bot) Hooks into our webhook to handle post-sale communication and cart abandonment.
