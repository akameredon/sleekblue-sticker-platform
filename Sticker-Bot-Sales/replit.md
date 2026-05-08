# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Application: Sticker Lab (storefront)

AI-driven conversational sales storefront for a vinyl die-cut sticker printing business based in Lagos. WhatsApp deep-link checkout (no payment processor).

### Artifacts

- `artifacts/storefront` (`/`) — React + Vite shop UI (Tailwind v4 + shadcn/ui).
- `artifacts/api-server` (`/api`) — Express API + PostgreSQL + Drizzle.
- `artifacts/mockup-sandbox` (`/__mockup`) — design preview.

### Routes (storefront)

- `/` Home — hero, categories, featured products, recently-viewed strip, how-it-works, testimonial.
- `/shop` — catalog with category pills + search.
- `/p/:slug` — product detail with live quote (size/finish/quantity → `useCalculateQuote`), wishlist heart, add to cart, customer reviews section.
- `/cart` — cart editor + checkout form (incl. artwork file upload via presigned URLs) → creates order then redirects to `/orders/:id`.
- `/orders/:id` — order summary + auto-opens `wa.me` link with full order text (incl. artwork links).
- `/track` — order lookup by reference + last 4 digits of phone.
- `/wishlist` — saved products (localStorage-only, no auth).
- `/chat` — streaming AI assistant (SSE) using `/api/openai/conversations/:id/messages`.

### Local persistence

- `localStorage["stickerlab.cart"]` — array of `CartItem`.
- `localStorage["stickerlab.conversationId"]` — current AI conversation id.
- `localStorage["stickerlab.wishlist"]` — array of product slugs.
- `localStorage["stickerlab.recent"]` — recently viewed slugs (max 8, MRU first).

### v5 backend additions

- `reviews` table + `orders.artworkUrls jsonb`. Avg rating recomputed on review insert.
- `POST /orders/lookup` (reference + last 4 digits of phone).
- `GET /products/:slug/reviews`, `POST /products/:slug/reviews`.
- `POST /storage/uploads/request-url` returns presigned PUT URL (Google Cloud Storage via Replit object storage). Public URL served from `/api/storage/<objectPath>`.

### Backend integration

- All hooks come from `@workspace/api-client-react` (Orval-generated from OpenAPI).
- Shop info, catalog, products, quote, orders + WhatsApp handoff, OpenAI chat (SSE).
- AI uses Replit AI Integrations (OpenAI proxy) — no API key required.

### Configuration

- WhatsApp number lives in `shop_settings` row (default placeholder `2348000000000`). Update via DB.
- NGN currency formatting in `src/lib/format.ts`.
