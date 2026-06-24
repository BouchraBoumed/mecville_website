# Mecville Storefront — Fix Instructions for AI Agent

You are working in the `mecville_website` repo (branch `MVP1.0`), a React 18 + Vite + Supabase + Stripe storefront. Front-end source lives under `front-end/src/`. Implement the changes below **in priority order**. Do not change the visual brand (dark navy `#132541` + gold `#d4a84b`); these are functional and UX fixes within the existing design language.

## Ground rules
- Work tier by tier: finish and test all **P0** before P1, P1 before P2.
- After each ticket, run the app and confirm the acceptance criteria.
- Keep existing tokens, spacing, and component conventions in `src/styles/main.css`.
- Don't introduce new color values; reuse CSS variables already defined in `:root`.

---

## P0 — Critical (do first)

### P0-1 · Allow a guest cart (remove the login wall)
**Files:** `src/components/ProductCard.jsx`, `src/pages/ProductPage.jsx`, `src/api/data.js` (cart helpers), `src/contexts/` (cart/auth context)
**Problem:** Add-to-cart is blocked for logged-out users. In `ProductCard.jsx` (and the product page buy box) the handler short-circuits with something like `if (!user) { addToast('Please log in to add items…'); return; }`.
**Do:**
- Remove the `!user` guard from every add-to-cart path.
- Implement a guest cart persisted in `localStorage` (e.g. key `mecville_cart`) when there is no authenticated user.
- On login, merge the guest cart into the user's server cart, then clear the local copy.
- Cart read/update/remove helpers in `api/data.js` must transparently use the local cart when `user` is null and the Supabase cart when signed in.
**Acceptance:** A logged-out visitor can add items, see them in the cart, change quantities, and reach checkout without ever signing in. Logging in preserves those items.

### P0-2 · Guest checkout
**Files:** `src/pages/CheckoutPage.jsx`, `src/pages/AccountPage.jsx` (or wherever auth is gated), routing/guards
**Problem:** Completing a purchase currently requires an account.
**Do:**
- Let checkout proceed with just an email + shipping/billing details — no account required.
- Remove any route guard that redirects unauthenticated users from `/checkout` to `/account`/login.
- On the order-confirmation screen, offer an optional "Create an account to track this order" (pre-fill the email; set a password).
**Acceptance:** A guest can pay and receive an order confirmation. Account creation is offered after, never required before.

### P0-3 · Fix the `$$` double dollar sign in the order summary
**File:** `src/pages/CheckoutPage.jsx`
**Problem:** The order summary renders a double dollar sign on Subtotal, Tax, and Total — e.g. `$$262.13`. The template literal already includes a literal `$` plus the interpolated value: `` `$${total.toFixed(2)}` ``.
**Do:** Remove the extra leading `$` so it reads `` `${total.toFixed(2)}` `` (or `${value}` rendered once). Check the Subtotal, Shipping, Tax, and Total rows. The "Pay $X" button is already correct — only the summary rows are wrong.
**Acceptance:** Every money value in the order summary shows a single `$`.

---

## P1 — High (this sprint)

### P1-4 · Make the Cart "Total" honest
**File:** `src/pages/CartPage.jsx`
**Problem:** The row labeled "Total" equals the subtotal; tax and shipping only appear at checkout, so the number jumps right before payment.
**Do:** Either (a) rename the row to "Subtotal" and don't show a "Total" until tax/shipping are known, **or** (b) show estimated tax + shipping on the cart so the figure matches checkout. Prefer (a) if estimates aren't readily available.
**Acceptance:** The amount a shopper sees on the cart does not silently change at checkout, or is clearly labeled as a subtotal.

### P1-5 · One image treatment store-wide (stop cropping card art)
**Files:** `src/styles/main.css` (`.product-thumbnail`/card image rules), and any card components
**Problem:** Card/grid thumbnails use a square `aspect-ratio:1` with `object-fit:cover`, which crops portrait card art top and bottom. The single-product page already uses `object-fit:contain` correctly.
**Do:** Standardize on `object-fit:contain` on a padded surface, **or** give thumbnails a portrait ratio (~5:7). Apply the same treatment everywhere a product image appears (Home featured, Shop grid, Cart line items, Gallery, Related).
**Acceptance:** A given card looks identical and uncropped on every surface.

### P1-6 · Flip the elevation ramp so cards lift off the page
**File:** `src/styles/main.css` (`:root` tokens)
**Problem:** `--color-bg` (`#132541`) is lighter than `--color-card` (`#1a2332`), so cards recede instead of standing out.
**Do:** Make the page background a step **darker** than cards (e.g. base ≈ `#0f1c33`, card ≈ `#16243d`, hover one step lighter still — tune within the existing palette). Add/keep a subtle shadow and a hover lift on cards.
**Acceptance:** Product cards visually sit *above* the page surface, not below it.

### P1-7 · Header search + resolve Shop/Categories overlap
**File:** `src/components/Header.jsx`
**Problem:** No search in the header (only buried in the Shop sidebar), and "Shop" + the "Categories" dropdown both route to `/shop`, duplicating "All Products".
**Do:**
- Add a persistent search field (or an icon that expands to one) in the header; submitting routes to `/shop?search=…`.
- Make "Shop" the single browse entry with categories as its dropdown; remove the standalone duplicate "Categories" nav item / "All Products" repeat.
**Acceptance:** Search is reachable from every page; there is one clear path to the catalog.

### P1-8 · Real catalog filters
**File:** `src/pages/ShopPage.jsx`
**Problem:** Filtering is only category + text search + sort. No price range, no in-stock toggle, and none of the trading-card facets.
**Do:** Add to the sidebar: a **price range**, an **in-stock only** toggle, and checkbox facets for **set/series, condition (NM/LP/MP), grade (PSA/BGS/CGC), rarity, language** — read from `product.attributes`. Reflect active filters in the URL query so results are shareable.
**Acceptance:** A shopper can narrow the grid by price, availability, and card attributes; reloading preserves the filters.

### P1-9 · Polish bundle (hero, checkout trust, mobile buy bar, Gallery)
- **`src/components/HeroSection.jsx`** — replace the flat CSS-gradient hero with a real product image behind a dark overlay; keep the headline solid/high-contrast (not gold-on-busy); make the CTA specific ("Shop sealed" / "Browse singles").
- **`src/pages/CheckoutPage.jsx`** — add a secure-checkout cue ("🔒 Secure checkout · Stripe"), card-brand marks, and a one-line returns/authenticity note by the Pay button.
- **`src/pages/ProductPage.jsx`** — on mobile, pin a sticky bottom bar (price + Add to Cart) so the purchase is always one tap away.
- **`src/pages/GalleryPage.jsx`** — decide its purpose: make it a curated "New arrivals / Hits of the week" editorial wall **or** fold it into Shop and reclaim the nav slot (see P1-7).
**Acceptance:** Hero shows real imagery with a specific CTA; checkout shows trust signals; product buy controls stay reachable on mobile; Gallery is either distinct or removed.

---

## P2 — Polish (backlog)

### P2-10 · Tame accent overuse
**File:** `src/styles/main.css`
Reserve the solid gold fill for the single primary action and the price. Demote secondary actions ("View All") to quiet text links; let cards rest neutral until hover.

### P2-11 · Quantity steppers + dynamic shipping nudge + stock cues
**Files:** `src/pages/ProductPage.jsx`, `src/pages/CartPage.jsx`
Replace raw `<input type="number">` with a −/＋ stepper (44px targets). Make the free-shipping message dynamic ("Add $18 for free shipping" with a progress bar, or "✓ Free shipping unlocked"). Add a low-stock cue ("2 left") on cards and the product page.

### P2-12 · Logged-in state + always-on cart badge
**File:** `src/components/Header.jsx`
The cart badge currently only renders for logged-in users (`if (!user) { setCartCount(0); return; }`) — make it reflect the guest cart too. Show who's signed in (name/avatar) instead of a generic account glyph.

### P2-13 · Spelling + dead links
**Files:** `src/components/Footer.jsx`, `src/pages/ContactPage.jsx`
Standardize on "Pokémon" (accented é) everywhere — the footer says "Pokemon". Replace `href="#"` social links with real URLs or remove the icons until they exist.

### P2-14 · Trust & form niceties
**Files:** `src/pages/ProductPage.jsx`, `src/pages/AccountPage.jsx`, `src/pages/ContactPage.jsx`
Show an aggregate star rating near the product title once reviews exist. Add Google/Apple sign-in (Supabase Auth), a "Forgot password?" link, and a show/hide password toggle. Add inline (on-blur) validation to the contact and auth forms. Wrap the contact email/phone in `mailto:` / `tel:` links for mobile.

### P2-15 · Consolidate duplicate components
**Files:** `src/components/ProductCard.jsx`, `CategoryCard.jsx`, gallery card, `src/styles/main.css`
Collapse `.product-card`, `.category-card`, and the gallery card into one card component with variants. Tokenize any stray hard-coded colors into existing CSS variables.

---

## Keep (do not regress)
Real loading/empty states, focus-visible rings + sr-only labels + ARIA, the reduced-motion media query, the responsive cart-table reflow, per-page meta + JSON-LD product schema + sitemap/robots, and the token-based palette. Preserve all of these while making the changes above.
