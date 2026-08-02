# UX Benchmarking Plan

This document tracks the deferred UX benchmarking work for the Mecville
website. The framework follows the 5-step benchmarking process and the 8 UX
metrics from the evaluation. None of the items below are implemented yet —
this is the roadmap to execute once analytics instrumentation is approved.

## Status

| Area | Status |
|---|---|
| Goals & KPIs defined | Pending |
| Analytics instrumentation | Pending |
| Heatmap / session recording | Pending |
| Competitor baselines | Pending |
| Feedback loops | Pending |
| Continuous monitoring cadence | Pending |

---

## Step 1 — Goals & Metrics

Define the measurable UX goals before installing anything. Suggested KPIs:

- **Conversion rate** — % of sessions that complete checkout.
- **Average order value (AOV)** — mean `orders.total` per completed order.
- **Cart abandonment rate** — % of sessions that reach `/cart` but never
  reach `/order/confirm`.
- **Newsletter signup rate** — subscribes / unique visitors to the homepage.
- **Product findability** — % of sessions that reach a product page within
  2 clicks from the homepage (proxy for the Baileigh case-study metric).
- **Search-to-purchase** — % of sessions using the header search that end in
  a checkout within the same session.

Owners: define target values and a review cadence (e.g. monthly) before
instrumentation begins.

---

## Step 2 — Metric Analysis (Instrumentation)

Nothing is currently measured. To set a baseline, install in this order:

### 2.1 Google Analytics 4 (GA4)

- [ ] Add the GA4 tag (`gtag.js`) to `front-end/index.html` or via the
      `Seo` component's `<Helmet>`.
- [ ] Set the measurement ID in `front-end/.env` as
      `VITE_GA4_MEASUREMENT_ID`.
- [ ] Fire `page_view` events on route changes (React Router `useLocation`).
- [ ] Fire custom events:
      - `begin_checkout` when the user lands on `/checkout`.
      - `purchase` on the `CheckoutPage` success handler with the order
        `total`, `currency`, and `transaction_id`.
      - `add_to_cart` in `ProductCard` / `ProductPage` with `item_id`,
        `item_name`, `price`, `quantity`.
      - `search` when the header search form is submitted with `search_term`.
      - `sign_up` on successful `AccountPage` registration.
      - `newsletter_subscribe` on successful footer/homepage subscribe.

### 2.2 Microsoft Clarity (heatmaps + session recordings)

- [ ] Add the Clarity snippet to `front-end/index.html`.
- [ ] Set the project ID in `front-end/.env` as `VITE_CLARITY_ID`.
- [ ] This unlocks the Heatmaps / Click Tracking metric from the evaluation
      at no cost.

### 2.3 Honest newsletter feedback loop

- [ ] Create the `newsletter_subscribers` table in Supabase (id, email,
      created_at, source).
- [ ] Update `back-end/src/routes/newsletter.js` to return a real `4xx` on
      failure instead of the current soft-fail 200, so the dashboard count is
      trustworthy.

---

## Step 3 — Competitor Benchmarking

Once GA4 has ~30 days of data:

- [ ] Identify 3–5 competitor Pokémon TCG retailers (e.g. TCGplayer,
      Dave & Adam's, local Canadian peers).
- [ ] Record their public benchmarks where available (Lighthouse, Core Web
      Vitals) and any published conversion rates.
- [ ] Build a comparison sheet covering: conversion rate, AOV, mobile LCP,
      mobile CLS, and findability (categories-to-product depth).

---

## Step 4 — User Testing & Feedback Loops

- [ ] Add a post-purchase review prompt on the `CheckoutPage` success
      state — the `reviews` table already exists in the schema.
- [ ] Add a lightweight on-site feedback widget (e.g. Hotjar polls or a
      custom `feedback` route) on the `/contact` and `/help` pages.
- [ ] Run A/B tests on:
      - Hero CTA copy ("Shop Now" vs "Shop Sealed").
      - Number of featured products on the homepage (4 vs 8).
      - Promo-block order (Booster Boxes first vs Accessories first).

---

## Step 5 — Monitor & Adjust

- [ ] Schedule a monthly UX review covering: KPIs from Step 1, Clarity
      heatmaps, top exit pages from GA4, and any new dead-end states.
- [ ] Wire Lighthouse CI into the Vercel preview deploy so each PR gets a
      Core Web Vitals score against a budget (LCP < 2.5s, CLS < 0.1).
- [ ] Alert on conversion-rate drops > 15% week-over-week.

---

## UX Metrics Scorecard (to update after instrumentation)

| Metric | Baseline (date) | Target | Current |
|---|---|---|---|
| Conversion rate | — | TBD | — |
| Average order value | — | TBD | — |
| Cart abandonment rate | — | TBD | — |
| Bounce rate | — | TBD | — |
| Session duration | — | TBD | — |
| Newsletter signup rate | — | TBD | — |
| Mobile LCP (s) | — | < 2.5 | — |
| Mobile CLS | — | < 0.1 | — |
| Product findability (2-click) | — | TBD | — |
| Retention (returning visitors) | — | TBD | — |

---

## Fixes Already Implemented (from the evaluation)

These UX gaps were fixed in code and are not deferred:

- [x] Header consolidated — 11 redundant links reduced to 5 top-level items
      with a Shop dropdown (Header.jsx).
- [x] Silent error swallowing replaced with visible error + retry states on
      HomePage, ShopPage, ProductPage, CartPage, CheckoutPage, GalleryPage,
      NewArrivalsPage, FeaturedCollectionsPage (new `ErrorState` component).
- [x] Routes code-split with `React.lazy` + `Suspense`; initial bundle
      reduced 633 KB → 544 KB (gzip 193 KB → 171 KB), Checkout/Admin/Account
      loaded on demand (App.jsx).
- [x] Accessibility: `aria-controls` added to the menu toggle, `aria-current`
      on active nav links and account tabs, `aria-label` on primary nav
      (Header.jsx, AccountPage.jsx, main.css).
- [x] Loading states standardized — bare "Loading..." text replaced with
      skeleton placeholders across AccountPage, CartPage, CheckoutPage,
      ProductPage.
- [x] Empty states improved — dead-end messages replaced with helpful
      suggestions and CTAs via the `ErrorState` component.
- [x] Structured data — Organization + WebSite schema added to the `Seo`
      component (Seo.jsx).
- [x] Cart table column alignment fixed (main.css).
- [x] Header search bar alignment fixed (main.css).
- [x] Shop sidebar spacing tightened (main.css).
- [x] Promo blocks vertically centered (main.css).