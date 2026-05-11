# 🚀 QUICKSTART — Launch in 10 Minutes

> Everything is built. You need **3 real keys** and **3 commands**.

---

## STEP 1 — Get your 3 keys (5 min)

| Key | Where | Time |
|-----|-------|------|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) → Create new key | 1 min |
| `PAYSTACK_SECRET_KEY` + `PAYSTACK_PUBLIC_KEY` | [dashboard.paystack.com/#/settings/developer](https://dashboard.paystack.com/#/settings/developer) | 1 min |
| `DATABASE_URL` | [neon.tech](https://neon.tech) → New project → Copy connection string | 3 min |

---

## STEP 2 — Set secrets in Replit (1 min)

In your Replit project → **Secrets (padlock icon)** → Add each:

```
OPENAI_API_KEY        = sk-proj-...
PAYSTACK_SECRET_KEY   = sk_test_...
PAYSTACK_PUBLIC_KEY   = pk_test_...
DATABASE_URL          = postgresql://...
ADMIN_BEARER_TOKEN    = any-random-string-here
PORT                  = 8080
BASE_PATH             = /
```

---

## STEP 3 — Update Paystack key in HTML (30 sec)

Open `artifacts/storefront/index.html`, find line 22 and replace:

```html
window.PAYSTACK_PUBLIC_KEY = "pk_test_REPLACE_WITH_YOUR_KEY";
```

→ paste your real `pk_test_...` key there.

---

## STEP 4 — Seed the database (1 command)

```bash
cd artifacts/api-server
pnpm run seed
```

Expected output:
```
Seeding shop settings...
  shop settings seeded
Seeding categories...
  6 categories upserted
Seeding products...
  8 products upserted
Done.
```

---

## STEP 5 — Hit Run in Replit ▶

The `.replit` config starts everything. Confirm:

- ✅ API running on port 8080
- ✅ Storefront running on port 8081/3000
- ✅ Floating chat bubble (💬) appears bottom-right
- ✅ Microphone FAB (🎤) appears bottom-right

---

## STEP 6 — Test the full sale flow (2 min)

1. Click the 💬 chat bubble
2. Type: **"I need holographic stickers for my clothing brand"**
3. Sticky shows 3 product cards — click one
4. Say or type: **"how much for 100 medium?"**
5. Live ₦ quote appears
6. Say: **"yes let's order"**
7. Checkout form appears — fill name/phone/email
8. Click **Pay with Paystack** → test card: `4084 0840 8408 4081` | CVV: `408` | OTP: `12345`
9. ✅ Order confirmed — WhatsApp button appears

---

## STEP 7 — Test voice (30 sec)

1. Tap the 🎤 mic button
2. Say: **"Add 100 die-cut stickers medium matte to cart"**
3. Cart count updates, toast confirms ✅

---

## STEP 8 — Activate n8n WhatsApp bot

1. Go to [akameredon.app.n8n.cloud](https://akameredon.app.n8n.cloud)
2. Open the Sticker Bot workflow
3. Toggle top-right → **Active** (green)
4. WhatsApp the test number: **+1 555 640 0790**
5. Say: `Hello` → Sticky replies in 10 seconds ✅

---

## Share and get first sale

Post this on WhatsApp Status + Instagram Story:

> 🎨 **Custom stickers, ordered via AI chat.**
> Tell our bot what you need → get a mockup → pay in 60 seconds.
> Lagos-based. Ships nationwide. 3-day turnaround.
> [your-replit-url] — tap the chat bubble 👇

---

## Quick-fix table

| Problem | Fix |
|---------|-----|
| Chat returns error | Check `OPENAI_API_KEY` in Replit Secrets |
| "No products" in chat | Run `pnpm run seed` in `artifacts/api-server/` |
| Paystack popup blocked | Allow popups in browser, or check `window.PAYSTACK_PUBLIC_KEY` in console |
| Mic button does nothing | Use Chrome. Check browser microphone permission |
| n8n "Waiting for event" | Toggle workflow to Active + verify Meta webhook subscription |
| CORS error in browser | Add your Replit URL to `FRONTEND_URL` secret |
