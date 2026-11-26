# Pre-launch Security and Production Readiness Audit

**Repository:** akameredon/sleekblue-sticker-platform  
**Review date:** 26 November 2026  
**Status:** Substantial hardening and checkout implementation is committed on the feature branch. Do not launch or accept real customer artwork/payments until current CI, production configuration and end-to-end acceptance tests pass.

## Critical findings observed in the current main application code

1. **Admin API routes lacked an authorization gate on main.** This branch now applies the existing `requireAdmin` middleware to the admin router, sends the admin JWT from the dashboard and hides admin links from non-admin customers. This change still needs CI and role-based tests before it can be treated as verified.

2. **Order listing / detail exposure — mitigated in this branch.** `GET /orders` and `GET /orders/:id` now return 401 rather than exposing PII. Customer lookup requires the high-entropy order reference plus the full last 10 digits of the phone number. Test the lookup and response fields before release.

3. **Sequential order ID exposure — mitigated in this branch.** `GET /orders/:id` is closed pending an authenticated owner/admin path. Customer-facing tracking uses reference + phone. Private storage paths are omitted from customer order responses.

4. **Private object storage — hardened in this branch, not yet integration-tested.** Upload URL requests require a customer JWT and use customer-scoped paths; finalization assigns a private owner ACL; downloads require authentication and owner/ACL checks, with admin access for production staff. Uploads are limited by file type, filename and 20 MB size. Cross-customer denial tests remain required.

5. **Server-side pricing — implemented in this branch, commercial validation outstanding.** Catalogue orders are repriced using the server catalogue. Custom Label Studio orders use the supplied Sleekblue cost-sheet anchors for 100/500/1,000 quantities; unsupported tiers are rejected for manual quotes. The estimator targets 30% gross margin and treats wholesale anchors as batch costs. Verify materials, finishing, cutting, packaging, waste and the current factory sheet before publishing guaranteed prices.

6. **JWT signing — hardened in this branch.** Production now fails closed when JWT_SECRET is missing and tokens without expiry are rejected. Set a strong production secret and invalidate/rotate any tokens created using the old fallback before deployment.

7. **The default shop WhatsApp number is wrong.** `lib/shop.ts` seeds a placeholder number (2348000000000). Production settings must be explicitly set to +234 805 816 2036 and read back before launch.

8. **Potential secret-like value — removed from current example, history still needs review.** `.env.example` now uses a placeholder. Confirm whether the previously committed value was ever live; if so, rotate it immediately and remove it from repository history as appropriate. Never commit live credentials.

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
- [x] Close public order list and sequential-ID detail routes; use reference + phone lookup. Add automated regression tests before merge.
- [x] Add authenticated private upload, owner ACL finalization and owner/admin download checks. [ ] Test cross-customer access denial.
- [x] Recalculate catalogue and custom-label prices server-side. [ ] Validate the cost model with Sleekblue and add pricing tests.
- [x] Remove the production JWT fallback. [ ] Configure a strong production secret and rotate legacy tokens.
- [ ] Confirm whether the previously committed WhatsApp secret-like value was live; rotate if so and review git history.
- [ ] Set the correct WhatsApp business number in the database and verify it.
- [ ] Obtain written Sleekblue cost and production specification sheets.
- [ ] Build and verify production PDF/CMYK/bleed/cutline export with the actual print workflow.
- [ ] Implement shared customer design storage and server-side private/public controls.
- [ ] Verify Paystack webhooks, order state transitions and payment reconciliation.
- [ ] Run mobile, security, privacy and print-output acceptance tests.

**Release rule:** A UI preview or successful Git commit is not proof of a working production order system. Keep the project in staging until every critical gate is closed.

 
## Additional customer journey work in this branch

- Label Studio now submits custom-label orders to the order API using customer contact details and the server-calculated price.
- Paystack initialization checks the order's customer phone and email, uses a unique payment reference, and supports a configured callback URL.
- Paystack webhook signatures use timing-safe comparison; transaction reference and exact amount are verified before the order is confirmed.
- Payment status polling verifies the customer's phone and can recover a successful transaction if the webhook was delayed or missed.
- A payment-return page checks the payment and sends the customer to order tracking.
- Admin order status transitions now cover payment, production, ready, shipping and delivery stages with transition validation.
- WhatsApp inbox, conversation threads and outbound sends now require admin authorization.
- The cart uses the phone-verified tracking route; delivery is not silently treated as free pickup.

## Still blocking release

- Current CI must pass on the latest commit; the last observed run was still in progress or had not yet tested all subsequent commits.
- The design editor still stores drafts locally and sends a watermarked preview, not a print-ready CMYK/PDF/cutline file.
- The custom label checkout does not yet attach a production-ready artwork file to the order.
- Payment callback URL, Paystack keys, database, storage bucket and JWT secret must be configured in the real deployment.
- Delivery remains manually quoted; there is no courier integration or automatic delivery price.
- No live/test Paystack transaction, real print run, physical QC or delivery has been completed end-to-end.
- Supabase remains paused and no production deployment has been made.
