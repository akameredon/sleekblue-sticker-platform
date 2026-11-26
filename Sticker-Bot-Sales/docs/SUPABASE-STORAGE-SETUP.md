# Supabase Storage setup for Sticker Platform

The API now uses Supabase Storage instead of the Replit object-storage sidecar.

## Required environment

Set these values on the **API server only**:

- `SUPABASE_URL=https://sjyclvtbcrgufhijzmim.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` (or the Supabase secret key, never a publishable key)
- `SUPABASE_ARTWORK_BUCKET=customer-artwork`

Never expose the service-role/secret key to the storefront, prefix it with `VITE_` or `NEXT_PUBLIC_`, or commit it to Git.

## Bucket requirements

Create a bucket named `customer-artwork` in Supabase Storage and set it to **Private**. Do not create a public bucket for customer artwork. Set a 20 MB file-size limit and allow only:

- `image/png`
- `image/jpeg`
- `image/webp`
- `image/svg+xml`
- `application/pdf`
- `application/postscript`

The API issues short-lived signed upload URLs after authenticating the customer. The browser uploads directly to that signed URL. The API then verifies the object exists and writes its owner/visibility ACL to `public.object_acl`. Private downloads are proxied by the authenticated API after an owner/admin ACL check.

## Database

The hosted project migration `create_sticker_platform_app_schema` creates the application's Drizzle tables and a separate `object_acl` table. The migration `link_sticker_orders_to_customer_accounts` adds the optional `orders.user_id` relationship. All newly created app tables have RLS enabled; the API connects through its server-side database connection.

Supabase's `storage` schema is intentionally treated as read-only. Create/manage buckets and objects through the Storage API or Supabase Studio, not direct SQL writes to `storage.buckets` or `storage.objects`.

## Verification still required

After the bucket and API secrets are configured, run a real authenticated upload, complete it, download it as the owner, confirm another customer receives 403, and verify no public URL can read the artwork. Then run the customer registration and order-creation journey against the deployed API using test data. Paystack must remain in test mode.
