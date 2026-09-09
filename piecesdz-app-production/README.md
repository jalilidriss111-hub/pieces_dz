# PiecesDZ — Production Setup Guide

A real, deployable Next.js + Supabase app connecting Algerian car owners with parts shops, wreckers, and suppliers. No mock data, no fake auth — this guide gets you a working instance end to end.

---

## 1. Create your Supabase project (free tier)

1. Go to https://supabase.com → **Start your project** → sign in with GitHub.
2. **New project** → choose an organization, name it `piecesdz`, set a database password (save it), pick a region close to Algeria (e.g. `eu-west-3` Paris or `eu-central-1`).
3. Wait ~2 minutes for provisioning.

### Run the schema

1. In the Supabase dashboard, open **SQL Editor** → **New query**.
2. Copy the entire contents of `supabase/schema.sql` from this repo and paste it in.
3. Click **Run**. This creates all tables, RLS policies, triggers, the `shop_ratings` view, and enables Realtime — with **zero seed data** (the platform starts empty by design).

### Get your API keys

1. **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon / public** key. You'll need these in step 3.

---

## 2. Set up Google OAuth

### 2a. Create a Google Cloud OAuth client

1. Go to https://console.cloud.google.com/ → create a new project (or reuse one).
2. **APIs & Services** → **OAuth consent screen** → choose **External** → fill in app name (`PiecesDZ`), support email, developer email → save through the steps (you can leave scopes/test users default for now; publish later when ready for real users).
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `PiecesDZ`.
   - **Authorized redirect URIs** — add exactly this (replace `<PROJECT_REF>` with your Supabase project ref, visible in your Supabase project URL):
     ```
     https://<PROJECT_REF>.supabase.co/auth/v1/callback
     ```
4. Click **Create**. Copy the **Client ID** and **Client Secret**.

### 2b. Connect Google to Supabase Auth

1. In Supabase dashboard: **Authentication** → **Providers** → **Google**.
2. Toggle it **On**.
3. Paste the **Client ID** and **Client Secret** from step 2a.
4. Save.

### 2c. Configure allowed redirect URLs in Supabase

1. **Authentication** → **URL Configuration**.
2. Set **Site URL** to your production URL (or `http://localhost:3000` while developing).
3. Under **Redirect URLs**, add:
   ```
   http://localhost:3000/auth/callback
   https://your-production-domain.com/auth/callback
   ```

---

## 3. Configure environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon public key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

When you deploy (e.g. to Vercel), set the same three variables in your hosting provider's environment settings, with `NEXT_PUBLIC_SITE_URL` pointing at your real domain — and add that domain's `/auth/callback` to Supabase's Redirect URLs (step 2c).

---

## 4. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Click **Connexion** → **Continue with Google** → you'll be redirected to Google, then back to `/auth/callback`, which exchanges the code for a real session and creates your `profiles` row automatically (via the `handle_new_user` trigger).

---

## 5. How the real backend works

- **Auth**: Supabase Auth (Google OAuth). Sessions are stored in cookies and refreshed by `middleware.ts` on every request. `app/api/auth/signout` clears the session server-side.
- **Database**: Postgres via Supabase, with Row Level Security enforced on every table — customers can only see/edit their own requests and blocked list; shop owners can only write responses/news for their own shop; everyone can read public shop/news/review data. See `supabase/schema.sql` for the exact policies.
- **Request → notification pipeline**: submitting a search (`app/search/page.tsx`) calls `POST /api/requests`, which inserts a row into `part_requests`. There's no fan-out table — instead, an RLS policy lets any shop owner whose `wilaya` matches (or where `all_algeria = true`) `SELECT` that request directly. Their dashboard (`app/shop/page.tsx`) queries and subscribes to exactly those rows.
- **Realtime**: `part_requests`, `shop_responses`, and `news_posts` are added to the `supabase_realtime` publication. The customer's results page and requests dashboard subscribe via `supabase.channel(...).on('postgres_changes', ...)` so new shop responses appear instantly without polling.
- **Responses**: only created when a shop owner submits the "Marquer disponible" form (`POST /api/responses`), which upserts into `shop_responses`. A trigger flips the parent request's status to `found`. Nothing else writes to this table — there is no bot, cron job, or simulated responder anywhere in the codebase.
- **Ratings**: `POST /api/reviews` upserts one row per (customer, shop) into `reviews`. The `shop_ratings` SQL view computes `avg(rating)` and `count(*)` live — the dashboard and shop profile always read this view, never a cached/stored average, so the number shown is always a strict function of real submitted reviews.
- **Blocked shops**: stored server-side in `blocked_shops`, scoped by RLS to the owning customer, so the list follows the user across devices/browsers instead of living in `localStorage`.

---

## 6. Empty-by-design behavior

Fresh install → `shops`, `part_requests`, `shop_responses`, `news_posts`, and `reviews` are all empty. The home page shows real counts (`0` until people sign up), the news feed shows an empty-state message instead of any placeholder content, and shop directories only ever list rows that a real authenticated user inserted through the onboarding flow. There is no seed script — running the schema alone is sufficient and intentionally leaves the app blank.

---

## 7. Deploying

1. Push this repo to GitHub.
2. Import it into Vercel (https://vercel.com/new).
3. Add the three environment variables from step 3, with `NEXT_PUBLIC_SITE_URL` set to your Vercel domain.
4. Add `https://<your-vercel-domain>/auth/callback` to Supabase's Redirect URLs (step 2c) and, if needed, add the same domain's callback in your Google OAuth client if you locked it to specific origins.
5. Deploy. Google sign-in, the database, and Realtime all work identically in production — nothing in this codebase is environment-specific beyond these URLs.

---

## Project structure

```
app/
  page.tsx                    Landing page (real counts, real news preview)
  login/page.tsx              Google OAuth sign-in
  auth/callback/route.ts      OAuth code exchange
  dashboard/page.tsx          Profile, sign out, blocked list
  search/page.tsx             Multi-step part search + live results
  requests/page.tsx           Customer's request history + reviews
  news/page.tsx                Public news feed + shop posting form
  shop/onboarding/page.tsx    Shop registration
  shop/page.tsx                Shop owner dashboard (incoming requests)
  api/
    requests/                 Create / close part requests
    responses/                 Shop owner responses
    reviews/                    Star ratings + comments
    news/                        Publish news posts
    shops/                       Register a shop
    blocked-shops/              Block / unblock
    auth/signout/                Sign out
components/
  NavBar.tsx                  Server component reading real session
  ui.tsx                       Shared UI primitives
lib/
  supabase/client.ts          Browser Supabase client
  supabase/server.ts          Server Supabase client (cookies-based)
  reference-data.ts           Static taxonomy (brands, wilayas, categories) — not business data
types/database.ts             TypeScript types matching the SQL schema
supabase/schema.sql           Full schema, RLS policies, triggers, Realtime setup
middleware.ts                 Refreshes auth session on every request
```
