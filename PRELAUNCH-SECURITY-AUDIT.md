# Pre-launch Security and Production Readiness Audit

**Repository:** akameredon/sleekblue-sticker-platform  
**Review date:** 26 November 2026  
**Status:** Do not launch or accept real customer artwork/payments until critical items are fixed and retested.

## Critical findings observed in the current main application code

1. **Admin API routes lacked an authorization gate on main.** This branch now applies the existing `requireAdmin` middleware to the admin router, sends the admin JWT from the dashboard and hides admin links from non-admin customers. This change still needs CI and role-based tests before it can be treated as verified.

2. **Order listing exposes customer data.** `GET /orders` in `routes/orders.ts` returns recent order details, including customer name, phone, address, order items and artwork URLs, without authentication.

3. **Order-by-ID access is predictable.** `GET /orders/:id` accepts a sequential database ID and returns the full order without proving ownership. Replace this with an authenticated owner/admin check or a high-entropy, scoped tracking token that reveals only minimal tracking information.

4. **Private object storage route is not private.** `GET /storage/objects/*path` streams an object without authentication or ACL verification. The commented-out auth example is not an access control. Add ownership checks and enforce ACLs before returning bytes. Never expose private artwork via a public bucket or guessable path.

5. **Order creation trusts browser-supplied prices.** `POST /orders` accepts each line's unitPrice from the client and calculates totals from it. Recalculate every quote on the server from an approved price table; reject stale or tampered quotes and bind the final quote to the order.

6. **JWT signing has an unsafe fallback.** `lib/auth.ts` defaults JWT_SECRET to a known development string. Production must fail closed if a strong secret is missing; rotate any previously used fallback secret and invalidate existing tokens.

7. **The default shop WhatsApp number is wrong.** `lib/shop.ts` seeds a placeholder number (2348000000000). Production settings must be explicitly set to +234 805 816 2036 and read back before launch.

8. **Potential secret-like value in the example environment file.** `.env.example` contains a non-placeholder-looking WHATSAPP_API_SECRET. Confirm it is not a live credential. If it is real or has ever been used, rotate it immediately and remove it from repository history as appropriate. Never commit live credentials.

## Product and commercial readiness

- The previous sticker image generator and OpenAI/voice chat routes were unmounted in this branch so the free-first MVP does not invoke those paid AI endpoints. Their source files remain in the repository but are no longer mounted by the API router.
- Current default pricing values in `lib/pricing.ts` are not validated against Sleekblue's wholesale cost sheet. Do not publish or accept them as approved prices.
- The new public/private choice is currently stored only in the browser's local draft. It is not a server-side permission setting and does not publish to a shared gallery yet.
- The design studio produces a watermarked preview, not a production PDF. It does not guarantee CMYK profile, bleed, safe area, vector text, or a cutter-ready path.
- The new WhatsApp handoff opens the confirmed business number and downloads a low-resolution preview; the customer must attach the preview manually. It does not silently upload or deliver the original artwork.
- Confirm the eligibility, sample material, fulfilment cost and delivery conditions for the 10-free-sticker offer before advertising it.
- Credits, referral commissions and Meta advertising services must remain disabled until contribution-margin rules, expiry, attribution, payout and pass-through ad-spend rules are implemented.

## Required release gates

- [x] Add server-side admin authorization to the admin router and send the admin JWT from the dashboard (this branch); test anonymous, customer and admin roles in CI before merge.
- [ ] Restrict order reads to the owner/admin; remove sequential-ID disclosure.
- [ ] Enforce private object-storage ACLs and test cross-customer access denial.
- [ ] Recalculate and validate all prices server-side.
- [ ] Remove JWT secret fallback and verify production secret configuration.
- [ ] Confirm/rotate any exposed secret-like credentials.
- [ ] Set the correct WhatsApp business number in the database and verify it.
- [ ] Obtain written Sleekblue cost and production specification sheets.
- [ ] Build and verify production PDF/CMYK/bleed/cutline export with the actual print workflow.
- [ ] Implement shared customer design storage and server-side private/public controls.
- [ ] Verify Paystack webhooks, order state transitions and payment reconciliation.
- [ ] Run mobile, security, privacy and print-output acceptance tests.

**Release rule:** A UI preview or successful Git commit is not proof of a working production order system. Keep the project in staging until every critical gate is closed.
