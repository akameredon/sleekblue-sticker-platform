# Customer Sticker Experience — Approved Requirements

Status: Working product requirements
Branch: `feature/label-studio-nigeria-mvp`

This document records decisions explicitly approved by the product owner. Unanswered questions remain open; do not treat assumptions as approved requirements.

## Round 1 of 5 — Gallery and design inspiration

1. **Gallery content:** Individual sticker designs only.
2. **Artwork presentation:** Flat, front-facing artwork.
3. **Product mockups:** Never show bottles, jars, cups, boxes, or other product mockups in the gallery or sticker-design presentation. Show stickers only.
4. **Inspiration source:** Pinterest.
5. **Selected reference behavior:** Use the selected reference's visual style to create an original sticker design; do not reproduce another designer's work exactly.
6. **Gallery interaction:** A simple visual gallery of designs.
7. **Initial gallery size:** Show 20 designs initially.
8. **Design coverage:** All types, including business, food, beauty, events, and more.
9. **Starting point:** Customers choose a reference design first, rather than starting with a blank sticker.
10. **Next customer step:** After choosing a reference design, customers enter their business details and generate the artwork prompt.

## Round 2 of 5 — Customer information

1. **Required information:** Business/brand name and product name.
2. **Phone number:** Optional.
3. **Social media handle:** Optional.
4. **Website:** Optional.
5. **Tagline or slogan:** Optional.
6. **Business logo:** Optional logo upload.
7. **Form layout:** One short form on one screen.
8. **Review before prompt:** Show a simple review of the entered text before generating the prompt.
9. **Contact details on sticker:** Customer chooses which supplied contact details appear using simple checkboxes.
10. **Missing optional information:** Allow customers to continue without it.

## Experience principles established by approved rounds

- Keep the customer journey simple and low-effort.
- The visual focus is the sticker artwork itself, not a staged product photograph or mockup.
- Keep the gallery visual and easy to browse.
- Use the selected reference to guide an original design.
- Keep customer information entry to one short screen.
- Only business/brand name and product name are mandatory; optional fields must not block progress.
- Let customers choose which optional contact information is printed.
- Show a review before creating the artwork prompt.
- Do not add extra customer steps or features unless approved in subsequent requirements rounds.

## Decisions still open

Rounds 3–5 have not yet been answered. Do not infer or implement decisions about sticker dimensions, shapes, quantity, pricing, payment, artwork handoff, upload, revisions, production, or other workflow details until they are covered by approved answers.

## Round 3 — Sticker size, shape and quantity (confirmed)

1. **Available shapes:** All shapes, including die-cut.
2. **Dimensions:** Customers can choose both preset and custom sizes.
3. **Measurement unit:** Millimetres (mm).
4. **Size preview:** Show a flat sticker preview at the selected proportions.
5. **Dimension guidance:** Customers choose from our recommended sizes.
6. **Sizes per order:** One sticker size per order; no mixed sizes in a single order.
7. **Quantity selection:** Both preset quantities and a custom quantity.
8. **Preset quantities:** 50, 100, 200, 500 and 1,000.
9. **Custom die-cut outline:** Customers may request a custom outline, but the team must approve it.
10. **When size/shape/quantity are selected:** After the customer chooses a design and enters business details.

**Round 3 experience principle:** Keep sizing visual and straightforward: present recommended sizes in millimetres, allow custom dimensions and quantities, show a flat proportionate preview, and make clear that custom die-cut outlines require approval.

## Round 4 — Artwork generation and editing (confirmed)

1. **Generation workflow:** Generate an artwork prompt for the customer to use elsewhere; do not generate the artwork inside this app as the selected workflow.
2. **Prompt inputs:** Use the selected reference's visual style, business details and uploaded logo.
3. **Initial design options:** Provide prompts for 3 design options.
4. **Reference treatment:** Use the Pinterest reference as visual-style inspiration to create original artwork; never copy the reference.
5. **Sticker text:** AI arranges the business and product details; the customer can edit the text.
6. **Uploaded logo:** Use the logo as supplied; do not redesign or distort it.
7. **Languages:** English by default, while allowing the customer to enter another language.
8. **Preview:** Flat, front-facing sticker artwork only; no product or lifestyle mockups.
9. **Editing:** Customers can edit text, colours and layout, then regenerate.
10. **Approval:** Customer approval of the final artwork is required before checkout.

**Round 4 experience principle:** The app prepares clear, usable prompts rather than generating images itself. It should preserve supplied logos, encourage original designs inspired by references, offer three design directions, and support a customer review/edit/approval step before checkout.

## Round 5 — Ordering, payment, printing and delivery (confirmed)

1. **Order placement:** A simple checkout after the customer approves the artwork.
2. **Pricing:** Automatically calculate prices based on size, shape, material and quantity.
3. **Payment methods:** Online payment and bank transfer.
4. **Production start:** Begin production only after payment is confirmed and artwork is approved.
5. **Print-ready approval:** Customer approves the artwork; staff performs a final production check.
6. **Order updates:** Send notifications through WhatsApp and email.
7. **Fulfilment:** Offer both pickup and delivery.
8. **Delivery charges:** Calculate delivery charges from the customer's delivery location.
9. **Support:** Provide both WhatsApp support and an in-app support form for changes or problems.
10. **After-order features:** Customers can view order status, reorder and access previous designs.

**Round 5 experience principle:** Keep checkout straightforward and transparent. Make the order's approval, payment, production and fulfilment stages clear; do not release an order to production until both artwork approval and payment confirmation are complete.

## Implementation decisions — Question set 1 (confirmed)

1. **External AI handoff:** Provide both a copy-prompt action and direct links to AI image tools.
2. **Artwork return:** Customers upload finished artwork from their phone or computer.
3. **Accepted artwork formats:** PNG, JPG/JPEG and PDF.
4. **Artwork editing:** Customers download artwork, edit it externally, then upload the revised version.
5. **Reference gallery management:** Staff selects and uploads approved Pinterest-inspired references.
6. **Materials and finishes:** Staff configures all available material and finish options.
7. **Pricing administration:** Staff manages prices in an admin panel; the app calculates customer totals.
8. **Online payment provider:** Paystack.
9. **Bank-transfer verification:** Customers upload proof of payment; staff manually verifies it before production.
10. **Order tracking access:** Provide both a private tracking link and a customer account.

**Implementation principle:** Keep the customer workflow straightforward while giving staff control over the reference gallery, available materials/finishes and pricing. External artwork editing is supported through download-and-reupload rather than a complex in-app editor.

## Implementation decisions — Question set 2 (confirmed)

1. **Production file formats:** Prepare PDF, SVG and CorelDRAW-compatible CDR files for staff.
2. **Bleed and cutting guides:** Automatically add bleed and cut lines.
3. **Raster resolution:** Target 300 DPI.
4. **Colour mode:** Use CMYK for print, converting RGB artwork where necessary.
5. **New-order handling:** Provide a central admin dashboard with a new-order queue.
6. **Customer-visible order statuses:** Order received; awaiting payment; payment confirmed; artwork review; approved; printing; ready for pickup/dispatched; completed.
7. **Artwork revisions:** Allow 3 revision rounds before staff assistance is required.
8. **Pre-print quality check:** Staff checks dimensions, resolution, bleed, cut line and artwork quality before printing.
9. **Retention:** Keep order records; retain artwork for 12 months.
10. **Admin permissions:** Owner, production staff and customer support have different role-based permissions.

**Production principle:** The system should prepare consistent print-production files and require a documented staff quality check before printing. Actual CDR compatibility, colour conversion, bleed and cut-line output must be validated against the production software and equipment during end-to-end testing.

