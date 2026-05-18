# Mecville Theme - Deployment Guide

## Files to Upload

Upload the entire `wp-content/` folder to your Hostinger WordPress installation.

The theme is at: `wp-content/themes/mecville-theme/`

## Step 1: Upload Theme

1. Go to Hostinger hPanel → **File Manager**
2. Navigate to `public_html/wp-content/themes/`
3. Upload the `mecville-theme` folder here
4. Or use **Appearance → Themes → Add New → Upload Theme** and zip the folder first

## Step 2: Activate Theme & Required Plugins

In WordPress admin, activate these in order:

1. **Appearance → Themes** → Activate "Mecville - Pokémon TCG Store"
2. **Plugins → Add New** and install/activate:
   - **WooCommerce** (required)
   - **WooCommerce Stripe Payment Gateway** (free)
   - **WooCommerce PayPal Payments** (free)
   - **Wordfence Security** (free)
   - **Rank Math SEO** (free)
   - **LiteSpeed Cache** (free - works with Hostinger)

## Step 3: WooCommerce Setup Wizard

1. Go to **WooCommerce → Settings**
2. **General**: Currency = Canadian Dollar ($), Currency Position = left, Thousand Separator = `,`, Decimal Separator = `.`
3. **Products → Inventory**: Enable stock management
4. **Shipping**: Add shipping zones (Canada, US, International) with flat rates
5. **Payments**: Enable Stripe and PayPal, connect your accounts

## Step 4: Product Attributes Setup

Go to **Products → Attributes** and create:

| Name | Slug | Enable Archives? |
|------|------|-----------------|
| Set | set | Yes |
| Rarity | rarity | Yes |
| Condition | condition | Yes |
| Language | language | Yes |
| Grading Company | grading-company | Yes |

For **Condition**, add terms: Sealed, Near Mint, Lightly Played, Moderately Played, Heavily Played, Damaged, Graded
For **Rarity**, add terms: Common, Uncommon, Rare, Holo Rare, Ultra Rare, Special Art Rare, Hyper Rare, V, VMAX, VSTAR, ex
For **Language**, add terms: English, Japanese, French, German, Spanish

## Step 5: Create Categories

Go to **Products → Categories** and create:

- Sealed
  - Booster Boxes
  - Elite Trainer Boxes
  - Booster Bundles
- Singles
  - Modern
  - Vintage
  - Promos
- Graded Cards
  - PSA
  - BGS
  - CGC
- Bundles
  - Mixed Lots
  - Starter Bundles
  - Complete Sets

## Step 6: Create Pages

Go to **Pages → Add New**:

1. **Home** → use template "Homepage" → set as front page in Settings → Reading
2. **Shop** → WooCommerce will auto-create this
3. **Cart** → WooCommerce will auto-create this
4. **Checkout** → WooCommerce will auto-create this
5. **My Account** → WooCommerce will auto-create this
6. **Privacy Policy** → paste content from `sample-data/legal-page-content.txt`
7. **Terms and Conditions** → paste content
8. **Shipping Policy** → paste content
9. **Refund Policy** → paste content

**Settings → Reading**: Set "Your homepage displays" → "A static page" → Homepage = "Home"

**Appearance → Menus**: Create a primary menu with:
- Home, Shop, Categories dropdown (Sealed, Singles, Graded, Bundles), Contact

## Step 7: Homepage Customization

Go to **Appearance → Customize → Mecville Theme → Hero Banner**:

- Set your heading, subheading, CTA text
- Upload a hero background image (ideally 1920x800, something Pokemon TCG themed)
- Adjust accent color if desired

## Step 8: Import Products (CSV)

1. Go to **Products → All Products → Import**
2. Upload `sample-data/sample-products.csv`
3. Map columns appropriately:
   - SKU → SKU
   - Name → Name
   - Description → Description
   - Price → Regular Price
   - Categories → Categories
   - Attribute: Set → pa_set
   - etc.
4. Run import. Edit products after import to add actual images.

## Step 9: Speed Optimization

1. **LiteSpeed Cache**: Go to Settings → LiteSpeed Cache → enable all recommended options
2. Enable **Image Optimization** in LiteSpeed
3. **Enable caching** (page cache, browser cache)
4. Minify CSS/JS through LiteSpeed
5. Enable **CSS combine** and **CSS/JS minify**

## Step 10: Security (Wordfence)

1. Run Wordfence **Quick Setup** wizard
2. Enable **Login Security** (2FA for admin)
3. Run a **scan**

## Step 11: Test

- Place a test order through checkout
- Test Stripe payment (use test mode first)
- Test PayPal
- Check mobile responsiveness
- Run a PageSpeed test

## Budget Check (Monthly)

| Item | Cost |
|------|------|
| Hostinger Business | ~$5.59 CAD/mo |
| Wordfence (free) | $0 |
| Rank Math (free) | $0 |
| LiteSpeed Cache (free) | $0 |
| Stripe plugin (free) | $0 |
| PayPal plugin (free) | $0 |
| **Total** | **~$5.59 CAD/mo** |

✅ Well under the $50 CAD/month budget.
