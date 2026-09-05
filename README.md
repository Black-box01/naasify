# NAASIFY — Backend-as-a-Service Marketplace

A complete BaaS marketplace where an admin publishes cloud services (backend
hosting, frontend hosting, SMTP emailing, databases, storage, domain names,
cloud computing, VPS, VPN) with **quarterly / half-yearly / annual** plans. The
public pricing page renders exactly what the admin published — including a
highlighted middle **All-in-One** bundle (every service, seeded at **₦350,000 /
year**) — displayed in **USD by default** with a live NGN↔USD converter.
Checkout is via **Flutterwave or Paystack** (auto-detected from env; signed,
idempotent webhook + callback verification) and requires signing in first. There
is a role-gated admin panel plus a contact page that emails
**info@naasify.online** via Resend.

**Design:** dark purple (`#7c3aed`) + cyan (`#06b6d4`), floating pill glass
navbar, pill buttons, layered-shadow glass cards, animated gradient hero/CTA
sections, and a dot-grid cursor-reveal effect.

---

## Tech stack

| Layer      | Choice                                                       |
| ---------- | ------------------------------------------------------------ |
| Framework  | Next.js **16.2.10** (App Router, `proxy.ts`)                  |
| UI         | React **19.2.4**, TypeScript 5, Tailwind CSS **v4** (CSS-first) |
| Database/Auth | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) + RLS   |
| Payments   | Flutterwave + Paystack (raw `fetch` + `node:crypto`, auto-detected)                |
| Email      | Resend                                                        |
| Validation | Zod v4                                                        |
| Package manager | npm                                                      |

No icon/animation/UI-kit libraries — inline SVG icons, CSS keyframes, and
hand-rolled primitives keep the runtime dependency budget small.

> **Next 16 note:** `middleware.ts` is deprecated. Route protection lives in
> [`proxy.ts`](./proxy.ts) exporting `function proxy(request)`.

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env.local   # then fill in the values (see table below)

# 3. Run the dev server
npm run dev                  # http://localhost:3000
```

### Scripts

| Script                  | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `npm run dev`           | Start the dev server                                 |
| `npm run build`         | Production build                                     |
| `npm run start`         | Serve the production build                           |
| `npm run lint`          | ESLint                                               |
| `npm run typecheck`     | `tsc --noEmit`                                       |
| `npm run verify:webhook`| Sign + double-POST a sample Paystack event to prove the signature check and idempotency gate (dev server must be running) |

---

## Environment variables

Copy `.env.example` → `.env.local`. All values are required for the matching
feature to work; the app degrades gracefully where noted.

> **Gateway auto-detection:** when both `FLW_SECRET_KEY` and `PAYSTACK_SECRET_KEY`
> are set, **Flutterwave wins**. Set only one to use it, or set `PAYMENT_GATEWAY`
> to force a gateway. Until `FLW_SECRET_KEY` exists, checkout keeps using Paystack.

| Variable                          | Where used              | Notes                                                        |
| --------------------------------- | ----------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`        | client + server         | Supabase project URL                                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | client + server         | Public anon key (RLS applies)                                 |
| `SUPABASE_SERVICE_ROLE_KEY`       | **server only**         | Bypasses RLS — orders, subscriptions, webhook, email flags    |
| `PAYSTACK_SECRET_KEY`             | **server only**         | Live/test secret key; also the webhook HMAC secret            |
| `PAYSTACK_PUBLIC_KEY`             | reference               | Public key (kept for completeness)                            |
| `FLW_SECRET_KEY`                  | **server only**         | Flutterwave secret key; when set, Flutterwave becomes the active gateway |
| `FLW_PUBLIC_KEY`                  | reference               | Flutterwave public key (kept for completeness)                |
| `FLW_SECRET_HASH`                 | **server only**         | Must equal the Flutterwave dashboard webhook secret hash (`verif-hash`) |
| `PAYMENT_GATEWAY`                 | **server only**         | Optional override: `flutterwave` or `paystack` (else auto-detected) |
| `RESEND_API_KEY`                  | **server only**         | Missing key → emails skipped, contact still saves (`emailed:false`) |
| `RESEND_FROM_EMAIL`               | **server only**         | Default `NAASIFY <info@naasify.online>`                          |
| `CONTACT_TO_EMAIL`                | **server only**         | Inbox for contact messages (default `info@naasify.online`)       |
| `NEXT_PUBLIC_APP_URL`             | client + server         | Base URL for callback/redirect links                          |
| `FX_FALLBACK_NGN_PER_USD`         | **server only**         | Fallback rate when the live FX API is unreachable (default 1500) |
| `FX_API_URL`                      | **server only**         | Live USD→NGN rate endpoint                                    |

---

## Supabase setup

1. **Create a Supabase project** at <https://supabase.com>.
2. Open the **SQL Editor** and run [`supabase/schema.sql`](./supabase/schema.sql).
   It is idempotent (`create … if not exists`, `drop policy if exists`) — safe to
   run more than once. It creates all tables, indexes, the
   `naasify_is_admin()` helper, a profile-bootstrap trigger, and **Row Level
   Security** policies.
3. Run [`supabase/seed.sql`](./supabase/seed.sql). It seeds 9 services, a
   Starter/Pro/Enterprise ladder per service across all three cycles, and the
   three **bundle** rows (`service_id = NULL`): Launch, the highlighted
   **All-in-One** (₦350,000 / year), and Enterprise. Also idempotent
   (`on conflict do nothing`).
4. Copy the project URL + anon key + service role key into `.env.local`.
5. **Make sign-up instant (no email verification).** In the Supabase dashboard go
   to **Authentication → Sign In / Up → Email** and turn **off** “Confirm email”
   (optionally disable “Secure email change” too). With confirmation off,
   `supabase.auth.signUp(...)` returns a session immediately and the app
   redirects straight to `/dashboard` — users never have to click a verification
   link. If confirmation is left on, sign-up still works but the user sees a
   “check your email” notice until they verify.

Every paid order is recorded in `naasify_orders` (amount, currency,
`billing_cycle` = the purchased **duration**, merchant reference + `gateway`, status,
`paid_at`) and, on activation, in `naasify_subscriptions` (`starts_at` →
`ends_at`). Both are surfaced on the user **Dashboard**: each subscription shows
its full start → end date span, and the order-history table has a dedicated
**Duration** column.

### Promote an admin

Sign up through the app at `/signup` (or create the user in Supabase Auth with
**Auto Confirm User** enabled), then promote it in the SQL Editor:

```sql
update public.naasify_profiles set role = 'admin' where email = 'you@example.com';
```

Only admins can reach `/admin` and the `/api/admin/*` routes. This is enforced
in three places (defense in depth): `proxy.ts`, `requireAdmin()` /
`requireAdminApi()`, and RLS admin-only policies.

### Verify RLS (optional)

With the **anon** key, `select * from naasify_plans;` returns active plans, while
`select * from naasify_contact_messages;` returns nothing — confirming the public can
read published pricing but never the inbox.

---

## Resend (contact + receipt email)

1. Create a Resend account and add a `RESEND_API_KEY`.
2. **Verify the `naasify.online` domain** (SPF/DKIM) so mail can be sent from
   `info@naasify.online`.
3. **Until the domain is verified**, set `RESEND_FROM_EMAIL=onboarding@resend.dev`
   for testing — otherwise sends will be rejected.

The contact flow **inserts the message into the database first**, then attempts
email. If Resend is down or unconfigured, the form still succeeds
(`{ "success": true, "emailed": false }`), the row is visible in
`/admin/messages`, and `email_sent` stays `false`.

---

## Flutterwave

Flutterwave is the **default gateway whenever `FLW_SECRET_KEY` is set** (it wins
over Paystack when both are configured).

1. In the Flutterwave dashboard → **Settings → Webhooks**, add the callback URL:

   ```
   https://<your-domain>/api/webhooks/flutterwave
   ```

2. Set that webhook's **secret hash** to the exact value of `FLW_SECRET_HASH`.
   Flutterwave echoes it back in the `verif-hash` header (plain equality, **not**
   an HMAC), compared with a length-guarded `timingSafeEqual`.

The [`/api/webhooks/flutterwave`](./app/api/webhooks/flutterwave/route.ts) route
mirrors the Paystack webhook: an idempotency gate on
`naasify_flutterwave_events.event_id`, activation only on a successful
`charge.completed`, and it **always returns 200 for a validly hashed event**.
`confirmAndActivate()` re-verifies by Flutterwave's numeric `transaction_id`, so
the webhook body is never trusted for the amount/status.

---

## Paystack

1. In the Paystack dashboard → **Settings → Webhooks**, set the callback URL to:

   ```
   https://<your-domain>/api/webhooks/paystack
   ```

2. Copy the webhook secret into `PAYSTACK_SECRET_KEY` (the same secret key). The
   signature is **HMAC-SHA512 of the raw request body**, compared with a
   length-guarded `timingSafeEqual`.

**Idempotency (triple guard):**

- `naasify_paystack_events.event_id` primary-key insert gate (`on conflict do nothing`) —
  duplicate deliveries short-circuit with `200 { duplicate: true }`.
- Conditional `update naasify_orders … where status <> 'paid'` — races lose and no-op.
- `naasify_subscriptions.order_id` UNIQUE — a second activation insert is ignored.

The webhook **always returns 200 for a validly signed event** (Paystack retries
on non-2xx). The [`/checkout/callback`](./app/(marketing)/checkout/callback/page.tsx)
page and [`/api/checkout/verify`](./app/api/checkout/verify/route.ts) are a
safety net that re-runs the same idempotent `confirmAndActivate()` when the
webhook is unreachable (e.g. local dev).

### Prove the webhook locally

```bash
npm run dev                 # in one terminal
npm run verify:webhook      # in another
```

The script signs a sample `charge.success`, POSTs a bad signature (expects
**401**), then POSTs the valid event twice (expects **200** + **200 duplicate**)
and prints the resulting row counts.

> Amounts are always recomputed **server-side from the DB plan** in
> [`lib/orders.ts`](./lib/orders.ts) — the client never sends a price. USD-stored
> plans are converted to NGN kobo at the live (or fallback) rate.

---

## Currency conversion

Prices are stored per-row with their own `currency` column and are never
mutated. [`lib/fx.ts`](./lib/fx.ts) fetches the live USD→NGN rate
(`next: { revalidate: 3600 }`), and **never throws** — on network error,
non-200, or an implausible rate (outside 500–5000) it falls back to
`FX_FALLBACK_NGN_PER_USD`. The rate is resolved in a server component and passed
to the client as a prop, so the browser makes **zero** currency network calls.

---

## Project structure

```
naasify/
├─ app/
│  ├─ layout.tsx            # fonts, metadata, OG/twitter, skip-link
│  ├─ globals.css           # Tailwind v4 @theme tokens + glass/pill/gradient utilities
│  ├─ icon.png              # file-based favicon
│  ├─ (marketing)/          # public site: home, pricing, contact, checkout/{start,callback}
│  ├─ (auth)/               # login, signup
│  ├─ (app)/dashboard/      # signed-in subscription + order history
│  ├─ (admin)/admin/        # role-gated panel: overview, services, plans, orders, messages
│  └─ api/                  # contact, checkout/verify, webhooks/{flutterwave,paystack}, admin/*
├─ components/
│  ├─ layout/  effects/  ui/  home/  pricing/  admin/  checkout/
│  ├─ ContactForm.tsx  AuthCard.tsx  SignOutButton.tsx
├─ lib/
│  ├─ supabase/{client,server,admin}.ts   auth.ts   validation.ts
│  ├─ money.ts   fx.ts   pricing.ts   payments.ts   paystack.ts   flutterwave.ts   orders.ts   redirect.ts
│  ├─ email/{resend,templates}.ts   utils.ts   constants.ts   types.ts   adminApi.ts
├─ proxy.ts                 # Next 16 route protection (replaces middleware.ts)
├─ supabase/{schema.sql,seed.sql}
├─ scripts/verify-webhook.mjs
├─ public/logo.png
└─ configs (package.json, tsconfig.json, next.config.ts, postcss/eslint, .env.example)
```

### Route protection

`proxy.ts` runs on the Node.js runtime and:

- redirects unauthenticated visitors from `/dashboard*` → `/login?next=…`
- redirects non-admins from `/admin*` → `/dashboard`
- redirects signed-in users from `/login`/`/signup` → their landing page (admins →
  `/admin`, everyone else → `/dashboard`, honouring a safe `?next`)

The matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `logo.png`,
and `api/webhooks` (so the gateway signature/hash bodies are never altered).

---

## Deploying to Vercel

1. Push the repo and import it into Vercel (framework preset: **Next.js**, no
   custom build command needed).
2. Add environment variables in the Vercel project settings. Keep the
   **server-only secrets** out of any `NEXT_PUBLIC_` prefix:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FLW_SECRET_KEY`, `FLW_SECRET_HASH`
   - `PAYSTACK_SECRET_KEY`
   - `RESEND_API_KEY`
   - plus `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `NEXT_PUBLIC_APP_URL` (set to your production URL), and the optional
     `PAYMENT_GATEWAY` / `FX_*` / `CONTACT_TO_EMAIL` / `RESEND_FROM_EMAIL`.
3. Update the webhook URLs to
   `https://<your-production-domain>/api/webhooks/flutterwave` (set the dashboard
   secret hash to `FLW_SECRET_HASH`) and
   `https://<your-production-domain>/api/webhooks/paystack`.
4. Verify the `naasify.online` domain in Resend before going live.

---

## Stage-gate checklist

| Stage | Gate                                                                                              | Status |
| ----- | ------------------------------------------------------------------------------------------------- | ------ |
| 0     | `npm run typecheck && npm run build` pass; `/logo.png` serves                                       | ✅ |
| 1     | `schema.sql` + `seed.sql` run twice with zero errors; anon can read plans but not messages          | ✅ |
| 2     | Unauthenticated `/dashboard` → 307 `/login`; authed response is `private, no-store`; non-admin blocked from `/admin` | ✅ |
| 3     | Build clean; cursor layer absent on coarse pointers; no long tasks from the rAF loop                | ✅ |
| 4     | `/pricing` shows All-in-One; NGN↔USD ratio matches the live rate; bad `FX_API_URL` still renders     | ✅ |
| 5     | Unauthenticated `POST /api/admin/services` → 401; non-admin → 403; admin toggles reflect on `/pricing` | ✅ |
| 6     | `POST /api/contact` → `{ success: true, emailed: … }` + DB row; blank key still saves + shows in inbox | ✅ |
| 7     | Bad signature → 401; double POST → 200/200 with exactly one subscription; test charge activates      | ✅ |
| 8     | `rm -rf .next && npm run build && npm run typecheck && npm run lint` all clean                       | ✅ |

---

## License

Private — all rights reserved.
# naasify
