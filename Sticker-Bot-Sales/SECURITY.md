# 🔒 Sleekblue Security & Data Policy

> **MISSION:** Protect customer payment intent, safeguard uploaded artwork, and prevent API credential leakage.

---

## 1. 🔑 Secrets Management & Rotation
The `.env` file is strictly forbidden from entering version control (`.gitignore` must block it). 

**Rotation Schedule:**
- **OpenAI API Key (`OPENAI_API_KEY`)**: Rotate every 90 days.
- **Paystack Secret Key (`PAYSTACK_SECRET_KEY`)**: Rotate immediately if any team member leaves the company, or every 180 days.
- **Neon Database URL (`DATABASE_URL`)**: Connection strings should use role-based access. Do not use the `postgres` superuser for the API.

## 2. 🛡️ Vulnerability Disclosure & Response
If a critical vulnerability is found (e.g., Paystack webhook bypass or SQL injection):
1. **Immediate Action:** Shut down the `api-server` immediately (scale to 0 instances or stop the Replit/VPS).
2. **Investigation:** Review the database `payments` and `orders` tables for anomalies.
3. **Patching:** The patch must pass through the `ci.yml` pipeline. Emergency bypasses are not permitted.
4. **Disclosure:** Notify impacted users within 72 hours via the WhatsApp bot if personal data was exposed.

## 3. 🖼️ Data Retention Policy
Customer artwork and data must not become a liability or an infinite storage cost.
- **Uploaded Artwork (Google Cloud Storage):** Files are held in a `private` bucket. Any artwork tied to an "abandoned" cart older than 30 days must be purged automatically by a cron job to minimize storage costs.
- **Conversational Logs (Database):** Chat histories in the database should be archived or anonymized after 90 days.
- **Payment Details:** We NEVER store card numbers. We only store the `paystackReference` and transaction status.

## 4. 🌐 Network & CORS Policy
- The `api-server` must strictly enforce CORS. Only requests originating from the authorized `FRONTEND_URL` (the production storefront domain) are permitted.
- The `/payments/webhook` route must only accept traffic from verified Paystack IP addresses. Any spoofed requests must be dropped instantly.
