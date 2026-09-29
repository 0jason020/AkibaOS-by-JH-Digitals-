# AkibaOS

AkibaOS is a responsive, installable web app for Rwanda-focused wallet, savings, bill, credit, onboarding, and support journeys. It works across phone, tablet, and desktop layouts. The app shell is auth-first: visitors sign in with email/password or Google; private pages require a Supabase session or an explicitly selected local preview.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:5173/`. `npm run build` and `npm run lint` are the production checks.

## Connect Supabase

1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The browser app uses only the publishable/anon key.
2. Apply the migrations in `supabase/migrations/` in filename order using the Supabase SQL Editor, or link the Supabase CLI project and run `npx supabase db push`.
3. In Supabase Auth, enable email/password and Google sign-in, configure Google OAuth credentials, and add the local and production app URLs to the redirect allowlist. Email confirmation can be enabled in Auth settings.
4. Deploy the frontend to Vercel or another static host with SPA rewrites. Add the same two public environment variables in that host, redeploy, and add its HTTPS origin to Supabase Auth redirect URLs.
5. Serve over HTTPS in production. The service worker and web manifest provide an installable shell; auth, storage, and API responses are not cached.

Never place a service-role key, JWT signing secret, database password, SMS provider secret, or payment-provider secret in a `VITE_*` variable. Vite variables are shipped to browsers. The service-role key and legacy JWT secret shared during setup must both be rotated before production, then update any server-side integrations with the replacement credentials. Supabase migrations have been prepared locally but still need to be applied to your project; this workspace does not have your database password or a Supabase CLI login.

## Backend included

- Email/password and Google sign-in with persistent Supabase sessions.
- A payment phone number stored on the user's profile; bill and wallet payment screens require it before checkout.
- Private profile, wallet read, savings-goal, group, transaction, bill-record, loan-application, and KYC tables.
- Row-level security on every user table, column-limited writes for account/profile data, a read-only wallet ledger for browser clients, and private per-user KYC storage paths.
- Server-side KYC submission RPC that sets `pending`; a trusted reviewer must set `verified`.
- Local migrations and Supabase CLI config under `supabase/`.

## Deliberately not simulated in live mode

Browser clients cannot change live balances or insert ledger/payment/contribution records. Bill payment, deposits, transfers, withdrawals, savings contributions, credit approval/disbursement, score decisions, and member invitations require trusted Edge Functions and the relevant regulated providers. Until those are connected, live money-moving controls remain disabled; the pages show provider requirements instead of fake success receipts. Loan requests can be stored as `submitted`, but that is not a loan offer or approval.

Use **Explore local preview** on the welcome screen to test simulated UI journeys. Preview values are stored in browser local storage and are clearly labeled; they are not financial records. Payment phone numbers are not verified by SMS during sign-in.

## Routes

- `/onboarding`: welcome, email/password sign-up, profile, account setup, and KYC review.
- `/`: authenticated overview.
- `/wallet`, `/savings`, `/bills`, `/credit`, `/transactions`: account tools and flows.
- `/profile`, `/notifications`, `/help`, `/offline`, `/ussd`: account and support tools.
