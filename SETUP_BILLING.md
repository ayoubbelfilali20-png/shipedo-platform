# Shipedo — Weekly Billing Setup

This is the real (non-mock) invoice / payout system that lets admin send
weekly statements to every seller in one click. It does three things at
once for each seller:

1. Sends an HTML statement by email (via Resend)
2. Inserts a payout row in `seller_payouts` (the new table)
3. Makes that payout visible on the seller dashboard and on
   `/seller/invoices` so the seller sees what they were credited.

---

## 1. Apply the Supabase migration

Open the Supabase SQL editor (or psql) and run the file:

```
supabase/migrations/001_seller_payouts.sql
```

This creates the `seller_payouts` table, the `seller_wallet_summary`
view, and the RLS policies (service-role write, anon read).

---

## 2. Add environment variables to `.env.local`

Append these to the existing `.env.local`:

```dotenv
# --- Resend (transactional email) ---
# Get a key at https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx

# Sender — for production verify a domain at https://resend.com/domains.
# For development you can use the test sender below; it will only deliver
# to the email address attached to your Resend account.
RESEND_FROM_EMAIL="Shipedo Billing <onboarding@resend.dev>"

# --- Supabase service role (server-only) ---
# Found in Supabase → Project Settings → API → service_role secret.
# NEVER expose this to the client. It is only read inside /api routes.
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# --- Optional: default delivery fee per delivered order (MAD) ---
DELIVERY_FEE_MAD=30
```

After editing `.env.local`, restart `npm run dev`.

> The send endpoint will refuse to run if `RESEND_API_KEY` is missing
> (unless you call it with `{ "dry_run": true }`). The service-role key
> is required to bypass RLS when inserting into `seller_payouts`.

---

## 3. How to use it

1. Log in as admin and open **OPERATIONS → Weekly Billing** in the
   sidebar (`/dashboard/billing`).
2. Pick a period (`Last week` is the default), adjust the per-order
   delivery fee if needed, and hit **Refresh preview**.
3. The table shows every seller that has at least one delivered order
   in the period, with their gross revenue, delivery fees, and net
   payout. By default all sellers are selected — uncheck any you want
   to skip.
4. Click **Send to N sellers**, confirm in the modal, and the system
   will:
   - send each seller an HTML statement via Resend,
   - insert a row in `seller_payouts`,
   - refresh the preview (so re-sending the same period twice is
     blocked by the unique index).

If a seller has no email on file the row is reported as `skipped`. If
Resend fails for a row, the row is saved with `status='failed'` and the
provider error is stored in `email_error` so you can investigate.

---

## 4. What sellers see

- **`/seller/invoices`** — lists every payout from `seller_payouts`
  filtered by their `seller_id`. Each row opens a statement modal that
  matches the email design.
- **`/seller`** (dashboard) — when there is at least one sent payout, a
  dark "Credited by Shipedo" banner appears above the quick actions
  with the running total and a link to the invoices page.

---

## 5. Files added or modified

```
supabase/migrations/001_seller_payouts.sql   (new)
lib/resend.ts                                 (new — server-only Resend client)
lib/supabaseAdmin.ts                          (new — server-only Supabase client)
lib/billing.ts                                (new — period math, aggregation, email template)
app/api/admin/billing/preview/route.ts        (new)
app/api/admin/billing/send/route.ts           (new)
app/dashboard/billing/page.tsx                (new — admin one-click UI)
app/seller/invoices/page.tsx                  (rewritten — real seller payouts)
app/seller/page.tsx                           (added "Credited by Shipedo" banner)
components/dashboard/Sidebar.tsx              (added Weekly Billing nav item)
lib/i18n.tsx                                  (new keys: nav_billing, dash_credited_by_shipedo, …)
package.json                                  (added "resend" dependency)
```

---

## 6. Currency note

The new billing UI uses **MAD** by default. The existing seller
transactions/wallet pages still display KES for legacy reasons; that
surface is large and untouched. You can override the currency on a
per-run basis by passing `{ "currency": "MAD" }` to the API endpoints.

---

## 7. Smoke test

```bash
# 1. Aggregate without sending — never touches Resend or DB
curl -X POST http://localhost:3000/api/admin/billing/preview \
  -H 'content-type: application/json' \
  -d '{"preset":"last_week"}'

# 2. Same but as a dry run via the send endpoint
curl -X POST http://localhost:3000/api/admin/billing/send \
  -H 'content-type: application/json' \
  -d '{"preset":"last_week","dry_run":true}'

# 3. Live send (uses Resend, writes seller_payouts rows)
curl -X POST http://localhost:3000/api/admin/billing/send \
  -H 'content-type: application/json' \
  -d '{"preset":"last_week","sent_by":"admin"}'
```
