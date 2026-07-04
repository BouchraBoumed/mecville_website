# Mecville — Production Deployment Guide

This guide deploys the **frontend on Vercel** and the **backend on Render**.
The two services are independent — the frontend talks to the backend over HTTPS
via a configurable API base URL (`VITE_API_URL`).

## Architecture

```
Browser
  └── Vercel (React static SPA, https://mecville.vercel.app)
        ├── Supabase (PostgreSQL + Auth + Storage)   ← direct client calls
        ├── Stripe / PayPal JS SDKs                  ← client-side
        └── Render Web Service (Express API, https://mecville-api.onrender.com/api)
              ├── /api/payments   (Stripe + PayPal)
              ├── /api/webhooks   (Stripe/PayPal webhooks)
              ├── /api/contact    (contact form)
              └── /api/admin      (admin actions)
```

| Component | Technology | Hosted on |
|-----------|-----------|-----------|
| Frontend | React 18 + Vite (static SPA) | Vercel |
| Backend | Express.js | Render (Web Service) |
| Database | Supabase (PostgreSQL) | Supabase (managed) |
| Auth | Supabase Auth | Supabase (managed) |
| Payments | Stripe + PayPal | hosted SDKs |

> The frontend never proxies `/api` in production — it calls the Render URL
> directly. The Vite dev proxy is only used for local development.

---

## Step 1: Set up Supabase

Follow **SUPABASE_SETUP.md** to:

1. Create a Supabase project.
2. Run `001_schema.sql` and `002_storage_bucket.sql` in the SQL Editor.
3. Optionally run `seed.sql` for sample data.
4. Note your **Project URL**, **anon/publishable key**, and **service_role key**.

---

## Step 2: Deploy the backend to Render

The backend is a Node.js web service. Render manages builds, deploys, TLS,
and a health check automatically.

### Option A — Render Blueprint (recommended)

1. Push the repo (with `render.yaml` at the root) to GitHub/GitLab.
2. In the Render Dashboard, go to **New → Blueprint**, select the repo.
3. Render reads `render.yaml` and creates a `mecville-api` web service.
4. In the service's **Environment** tab, set every secret env var listed in
   `back-end/.env.example`:

   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | `https://your-project.supabase.co` |
   | `SUPABASE_SECRET_KEY` | `your-service-role-key` |
   | `SUPABASE_PUBLISHABLE_KEY` | `your-anon-public-key` |
   | `STRIPE_SECRET_KEY` | `sk_live_...` |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
   | `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
   | `CORS_ORIGIN` | `https://mecville.vercel.app` (set after Step 3) |
   | `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` | (if PayPal enabled) |
   | `ENABLE_PAYPAL` | `true` or `false` |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `CONTACT_EMAIL` | (email) |
   | `SENTRY_DSN` | (optional) |

5. Deploy. Render builds with `npm install --omit=dev` and starts
   `npm start` (`node src/index.js`). It injects `PORT` automatically.
6. Confirm the service is live:
   ```bash
   curl https://mecville-api.onrender.com/api/health
   # {"status":"ok","timestamp":"..."}
   ```

> **Free tier note:** Render free web services spin down after 15 min of
> inactivity. The first request after idle takes ~30–60s to wake. For a
> production store, consider a paid plan to avoid cold starts.

### Option B — Manual Render web service

If you prefer not to use `render.yaml`:

1. Render Dashboard → **New → Web Service** → connect your repo.
2. Settings:
   - **Root Directory:** `back-end`
   - **Runtime:** Node
   - **Build Command:** `npm install --omit=dev`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
3. Add the same env vars as Option A.
4. Create the service.

---

## Step 3: Deploy the frontend to Vercel

The frontend is a Vite SPA. Vercel builds it and serves the static `dist/`
output with SPA fallback routing (configured in `front-end/vercel.json`).

### From the Vercel dashboard

1. Push the repo to GitHub/GitLab.
2. Vercel Dashboard → **Add New → Project** → import the repo.
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `front-end`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm install`
4. Add **Environment Variables** (these are baked into the build):

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `your-anon-public-key` |
   | `VITE_API_URL` | `https://mecville-api.onrender.com/api` |
   | `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |

5. **Deploy.** Vercel builds and deploys. You'll get a URL like
   `https://mecville.vercel.app` plus per-branch preview URLs.
6. Copy your production Vercel URL and set it as `CORS_ORIGIN` on the Render
   backend (Step 2 env var). Redeploy the backend if needed.
7. For Vercel preview deployments, you can set `CORS_ORIGIN` to a
   comma-separated list, e.g.
   `https://mecville.vercel.app,https://mecville-git-main-xyz.vercel.app`.

### Using the Vercel CLI

```bash
cd front-end
npm i -g vercel
vercel link            # link this directory to your Vercel project
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY
vercel env add VITE_API_URL
vercel env add VITE_STRIPE_PUBLISHABLE_KEY
vercel --prod          # deploy to production
```

---

## Step 4: Configure Stripe / PayPal webhooks

Point payment webhooks at the **Render backend** (not Vercel):

- **Stripe:** Dashboard → Developers → Webhooks → Add endpoint
  - URL: `https://mecville-api.onrender.com/api/webhooks/stripe`
  - Events: `payment_intent.payment_failed`, `payment_intent.succeeded`, etc.
  - Copy the signing secret into `STRIPE_WEBHOOK_SECRET` on Render.

- **PayPal:** Dashboard → Apps & Features → Webhooks
  - URL: `https://mecville-api.onrender.com/api/webhooks/paypal`
  - Copy the webhook ID into `PAYPAL_WEBHOOK_ID` on Render.

---

## Step 5: Make yourself admin

Sign up on the site, then run in the Supabase SQL Editor:

```sql
update profiles set role = 'admin' where email = 'your-email@example.com';
```

---

## Step 6: Verify

```bash
# Backend health (Render)
curl https://mecville-api.onrender.com/api/health

# Frontend (Vercel) — should return HTML
curl https://mecville.vercel.app/

# CORS preflight from the browser console on the Vercel site:
# fetch('https://mecville-api.onrender.com/api/health').then(r => r.json()).then(console.log)
```

---

## Updating the Site

### Frontend (Vercel)
Push to `main` (or merge a PR). Vercel rebuilds and deploys automatically.
To change env vars, edit them in the Vercel dashboard and trigger a redeploy
(Vercel rebuilds when env vars change).

### Backend (Render)
Push to `main`. Render rebuilds and deploys automatically. Change env vars in
the Render dashboard and click **Manual Deploy**.

### Database migrations
Run new SQL files in the Supabase SQL Editor.

---

## Monitoring

- **Render:** Dashboard → `mecville-api` → Logs / Metrics tabs.
- **Vercel:** Dashboard → your project → Logs / Analytics tabs.
- **Supabase:** Dashboard → Logs / Reports.
- **Stripe:** Dashboard → Developers → Events (webhook delivery).

### Optional: Sentry error tracking
1. Create a Node.js project at https://sentry.io.
2. `cd back-end && npm install @sentry/node`.
3. Add `SENTRY_DSN=your-dsn` to the Render env vars.
4. Redeploy.

---

## Troubleshooting

### Blank page on Vercel
- Confirm `dist/` was produced: check the Vercel build log for
  `dist/index.html`.
- Confirm `VITE_SUPABASE_URL` / `VITE_API_URL` were set as Vercel env vars
  **before** the build (Vite bakes them in at build time).

### API returns 502 / 503 on Render
- Render free services spin down after 15 min idle — the first request wakes
  the service (can take ~60s).
- Check Render logs for crashes.
- Confirm `npm start` runs locally (`cd back-end && npm start`).

### CORS errors in browser
- `CORS_ORIGIN` on the Render backend must include your exact Vercel URL
  (scheme + host, no trailing slash). Use a comma-separated list for multiple
  preview URLs.
- After changing `CORS_ORIGIN`, redeploy the backend.

### Payments fail / webhooks not received
- Webhook URL must point to Render: `https://mecville-api.onrender.com/api/webhooks/stripe`.
- `STRIPE_WEBHOOK_SECRET` on Render must match the signing secret shown in
  the Stripe dashboard for that endpoint.
- Check Stripe → Developers → Webhooks → your endpoint → Recent events for
  delivery attempts.

### Cart/checkout errors
- Verify Supabase keys: anon/publishable key in the **Vercel** env vars,
  service_role in the **Render** env vars. Never swap them.
- Confirm DB migrations were applied (tables exist).
- Confirm the `product-images` storage bucket exists in Supabase.

---

## Monthly Cost

| Item | Cost |
|------|------|
| Vercel (Hobby) | $0 |
| Render (free) | $0 (spins down when idle) |
| Render (Starter, no spin-down) | ~$7 USD/mo |
| Supabase (free tier) | $0 |
| Stripe | 2.9% + $0.30 per transaction |
| PayPal | 3.49% + fixed fee per transaction |
| Domain | ~$15 CAD/year |
| **Total fixed (free tiers)** | **~$0/mo + domain** |