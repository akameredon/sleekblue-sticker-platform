# Complete customer test order — acceptance runbook

Status: ready for controlled end-to-end execution. The first physical artwork/cutter milestone has been confirmed successful by the operator on 2026-11-26.

## What is already physically validated

- One production SVG export was opened in CorelDRAW.
- The print job was prepared through SignMaster 3.5 Basic.
- The MYCUT MC1200 CCD camera read the registration marks.
- The MC1200 successfully contour-cut the printed sample.

This confirms the first-label artwork and cutter path. It does not yet validate the complete customer order, payment, production tracking, or fulfilment journey.

## Controlled test order

Use a clearly identified QA order, not a real customer order.

Suggested test specification:
- Customer: Sleekblue QA Test
- Email: qa@example.com (replace only if the application requires a verified test inbox)
- Phone: use a dedicated test number accepted by the configured validation; do not use an unrelated customer's number
- Artwork reference: MAMA'S KITCHEN / JOLLOF SPICE
- Shape: circle
- Finished size: 50 × 50 mm
- Bleed: 3 mm per edge
- Quantity: select a quantity supported by the configured server-side price sheet; do not invent or override the price
- Finish/material: choose the exact stock and finish physically available for the run
- Fulfilment: pickup for the first controlled test; delivery is not part of this acceptance run

Before creating the order, confirm the production material, finish, quantity tier and server-calculated quote with the factory cost sheet. The existing estimator is not a guaranteed factory quote outside validated cost-sheet coverage.

## Execution gates

### Gate 1 — Customer design and quote
- Open the customer storefront in the intended test environment.
- Create the 50 × 50 mm circular label and enter the sample artwork details.
- Confirm the preview, shape, dimensions, quantity and finish.
- Submit a quote/order request.
- Confirm the server recalculates the price; never trust a client-submitted total.
- Record the order reference and displayed total.

Pass: the order is accepted with the expected dimensions, quantity, finish and server-calculated total.

### Gate 2 — Payment (test mode only)
- Confirm the backend is using Paystack TEST keys and the correct test callback URL.
- Confirm the live secret key is not configured in the test environment.
- Initialize checkout for the test order.
- Complete a Paystack test transaction using Paystack's current test-card instructions.
- Verify the callback/return page and server-side transaction verification.
- Confirm the exact amount and reference match the order.
- Confirm the order becomes paid only after server-side verification/webhook or the documented verified status-poll recovery.

Pass: payment status is verified by the server and is linked to the correct order and exact amount.

Stop: if test/live key mode is uncertain, do not enter card details or proceed.

### Gate 3 — Admin order handling
- Sign in as an administrator.
- Find the order by its reference.
- Confirm customer details, items, dimensions, quantity, finish, total and payment status.
- Confirm private customer artwork is accessible only to the owner/admin.
- Move the order through the allowed production status transitions.
- Confirm invalid status transitions are rejected.

Pass: the admin sees the correct order and the state transitions are recorded accurately.

### Gate 4 — Production artwork
- Open the Production Artwork exporter.
- Recreate or load the exact test order specification.
- Export print artwork and separate cutline at matching page dimensions.
- Open the print SVG in CorelDRAW; verify page size, trim geometry, bleed, fonts and alignment.
- Save the production CDR working copy.
- Prepare the print-and-cut layout in SignMaster 3.5 Basic using the confirmed MC1200 CCD device profile.
- Generate registration marks inside SignMaster.
- Print using the approved material and printer/RIP profile.
- Read marks and contour-cut on the MC1200.

Pass: the printed order matches the approved artwork and the cut is centred, clean, dimensionally acceptable and does not cut through the backing liner.

### Gate 5 — Quality control and fulfilment
- Inspect print colour, legibility, coverage, finish, adhesion and cut quality.
- Count usable stickers and record spoilage.
- Record measured dimensions and operator acceptance.
- Package the order.
- For this first run, use pickup only; record ready-for-pickup and collection confirmation.
- Verify the customer-facing tracking page shows the correct status without exposing private storage paths.

Pass: the QA order is complete, collected or explicitly marked as an internally retained test sample, and its final status is visible in tracking.

## Evidence to record

- Order reference and timestamp
- Server-calculated quote and quantity tier
- Paystack test reference and verified amount (never store card details)
- Admin status history
- Production artwork filenames and dimensions
- CorelDRAW version and saved CDR filename
- SignMaster version and selected MC1200 CCD device profile
- Printer/RIP profile, stock, finish and registration-mark preset
- MC1200 cut settings used by the operator
- QC result, measured trim size, usable count and spoilage
- Pickup/collection result

## Release criteria

Keep the PR in draft and do not enable live payments or production deployment until:
1. All five gates pass in the intended test environment.
2. Paystack test-mode verification succeeds.
3. The physical test order passes QC.
4. Customer tracking and admin status updates are verified.
5. Factory pricing, material, finish and fulfilment assumptions are approved.

A successful physical sample is a confirmed milestone, not proof that the full customer journey is production-ready.
