/**
 * WooCommerce CSV Product Import → Supabase
 *
 * Reads a WooCommerce product export (the kind WooCommerce → Products → Export
 * produces) and upserts products into the Supabase `products` table.
 *
 * Usage:
 *   cd back-end
 *   node src/utils/wc-import.js ../wc-product-export-23-6-2026-1782187414690.csv
 *   node src/utils/wc-import.js <path> --dry-run    # print mapping, write nothing
 *
 * Mapping (WooCommerce → products table):
 *   Name                         → name
 *   (slugified Name)             → slug
 *   SKU                          → sku
 *   GTIN, UPC, EAN, or ISBN      → barcode
 *   Short description            → short_description
 *   Description                  → description
 *   Regular price                → price              (the selling price)
 *   Sale price                   → compare_price      (original; price stays = regular)
 *     NOTE: WooCommerce semantics inverted vs. our DB. WC "Sale price" is the
 *     discounted price the customer pays; "Regular price" is the list price.
 *     Our DB: price = what customer pays, compare_price = crossed-out list.
 *     So when a sale price exists, price = sale price, compare_price = regular.
 *     When no sale price, price = regular, compare_price = null.
 *   In stock? + Stock            → stock              (0 if "Out of stock?" or blank)
 *   Low stock amount              → stock_alert
 *   Weight (kg)                  → weight
 *   Is featured? (1/0)            → featured
 *   Published (1/0)               → active
 *   Categories (WC hierarchy)    → category_id (first matching leaf; created if absent)
 *   Images (comma-sep URLs)       → images [{src, alt}]
 *   Attribute 1 name/value        → attributes[name] = value
 *   Tags                          → attributes.tags (string)
 *   Brands                        → attributes.brand (string)
 *
 * Existing products are matched by slug and UPDATED; new ones are INSERTED.
 */
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DRY_RUN = process.argv.includes('--dry-run');

const stats = { inserted: 0, updated: 0, skipped: 0, errors: [] };
const categoryCache = new Map(); // slug → id

function slugify(text) {
  // Match the convention used by the existing DB products: keep unicode letters
  // (so "Pokémon" → "pokémon", emoji stripped), lowercase, whitespace → "-",
  // collapse repeated "-", and cap at 80 chars (the products.slug column
  // length in this schema). Fallback to a timestamp if empty.
  const s = (text || '')
    .toLowerCase()
    // strip emoji and symbols, but keep letters/digits (incl. unicode)/spaces/hyphens
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f]/gu, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 80)
    .replace(/^-+|-+$/g, '');
  return s || `item-${Date.now()}`;
}

function stripHtml(html) {
  if (!html) return '';
  // Decode common entities then strip tags; preserve paragraph/line breaks.
  let s = String(html)
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s;
}

function cleanDescription(html) {
  // Keep HTML but normalize WooCommerce's escaped newlines (\n inside the CSV
  // string are literal "\n" because the WC export encodes newlines that way).
  if (!html) return '';
  return String(html).replace(/\\n/g, '\n').trim();
}

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function int(v, def = 0) {
  if (v == null || v === '') return def;
  const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : def;
}
function bool(v) {
  return String(v).trim().toLowerCase() === '1' || String(v).trim().toLowerCase() === 'true';
}

async function resolveCategoryId(catsField) {
  if (!catsField) return null;
  // WooCommerce Categories: comma-separated; ">" denotes hierarchy (e.g.
  // "Pokemon ETB > Mega evolution Pokemon Center"). Use the last segment
  // (the leaf) as the category name.
  const entries = catsField.split(',').map((s) => s.trim()).filter(Boolean);
  for (const entry of entries) {
    const leaf = entry.split('>').map((s) => s.trim()).filter(Boolean).pop();
    if (!leaf) continue;
    const slug = slugify(leaf);
    if (categoryCache.has(slug)) return categoryCache.get(slug);
    let { data } = await supabase.from('categories').select('id').eq('slug', slug).maybeSingle();
    if (data) {
      categoryCache.set(slug, data.id);
      return data.id;
    }
    const { data: created, error } = await supabase
      .from('categories')
      .insert({ name: leaf, slug })
      .select('id')
      .single();
    if (error) {
      console.error(`  ⚠ category create failed "${leaf}": ${error.message}`);
      return null;
    }
    categoryCache.set(slug, created.id);
    console.log(`  + created category: ${leaf} (${slug})`);
    return created.id;
  }
  return null;
}

function mapImages(imagesField, name) {
  if (!imagesField) return [];
  return imagesField
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
    .map((src) => ({ src, alt: name }));
}

function mapAttributes(row) {
  const a = {};
  // WooCommerce attributes: "Attribute 1 name" / "Attribute 1 value(s)" up to N.
  for (let i = 1; i <= 10; i++) {
    const an = row[`Attribute ${i} name`];
    const av = row[`Attribute ${i} value(s)`];
    if (an && av) a[an.trim().toLowerCase().replace(/\s+/g, '_')] = av.trim();
  }
  if (row['Tags']) a.tags = row['Tags'].trim();
  if (row['Brands']) a.brand = row['Brands'].trim();
  return a;
}

function mapRow(row) {
  const name = (row['Name'] || '').trim();
  const slug = slugify(name);
  const regular = num(row['Regular price']);
  const sale = num(row['Sale price']);
  // DB semantics: price = what customer pays, compare_price = crossed-out list.
  const price = sale != null ? sale : (regular != null ? regular : 0);
  const comparePrice = sale != null ? regular : null;

  const inStock = bool(row['In stock?']);
  const stockRaw = int(row['Stock'], null);
  const stock = !inStock ? 0 : (stockRaw != null ? stockRaw : 0);

  const images = mapImages(row['Images'], name);
  const attributes = mapAttributes(row);

  return {
    name,
    slug,
    description: cleanDescription(row['Description']) || stripHtml(row['Description']) || '',
    short_description: stripHtml(row['Short description']) || '',
    price,
    compare_price: comparePrice,
    sku: row['SKU']?.trim() || null,
    barcode: row['GTIN, UPC, EAN, or ISBN']?.trim() || null,
    stock,
    stock_alert: int(row['Low stock amount'], 5),
    weight: num(row['Weight (kg)']),
    images,
    attributes,
    featured: bool(row['Is featured?']),
    active: row['Published'] === '' ? true : bool(row['Published']),
    meta_title: name || null,
  };
}

async function upsertProduct(row) {
  const p = mapRow(row);
  if (!p.name) { stats.skipped++; return; }

  if (DRY_RUN) {
    console.log(`  → ${p.slug} | $${p.price}${p.compare_price ? ` (was $${p.compare_price})` : ''} | stock=${p.stock} | imgs=${p.images.length} | sku=${p.sku || '-'} | feat=${p.featured}`);
    return;
  }

  const categoryId = await resolveCategoryId(row['Categories']);
  p.category_id = categoryId;

  const { data: existing } = await supabase.from('products').select('id,featured').eq('slug', p.slug).maybeSingle();
  let match = existing;
  // Fallback: match by SKU when slug differs (e.g. legacy DB used a slightly
  // different 80-char truncation). SKU is unique per product in the WooCommerce
  // export, so this is safe for identifying the same product.
  if (!match && p.sku) {
    const { data: bySku } = await supabase.from('products').select('id,featured').eq('sku', p.sku).maybeSingle();
    match = bySku;
  }
  if (match) {
    // Preserve the existing featured flag — the CSV's "Is featured?" column is
    // unreliable (all 0) and overwriting it would un-feature curated products.
    const { featured, ...rest } = p;
    const { error } = await supabase.from('products').update(rest).eq('id', match.id);
    if (error) {
      stats.errors.push(`${p.name}: ${error.message}`);
      console.error(`  ✗ update "${p.name}": ${error.message}`);
    } else {
      stats.updated++;
      console.log(`  ↻ ${p.name.slice(0, 60)} — $${p.price} (${p.images.length} imgs)`);
    }
    return;
  }

  const { error } = await supabase.from('products').insert(p);
  if (error) {
    stats.errors.push(`${p.name}: ${error.message}`);
    console.error(`  ✗ insert "${p.name}": ${error.message}`);
  } else {
    stats.inserted++;
    console.log(`  ✓ ${p.name.slice(0, 60)} — $${p.price} (${p.images.length} imgs)`);
  }
}

async function main() {
  const csvPath = process.argv.find((a) => !a.startsWith('-') && a.endsWith('.csv'));
  if (!csvPath) {
    console.error('Usage: node src/utils/wc-import.js <path-to-woocommerce.csv> [--dry-run]');
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════');
  console.log(`  WooCommerce CSV Import → Supabase${DRY_RUN ? '  [DRY RUN]' : ''}`);
  console.log('═══════════════════════════════════════');
  console.log(`CSV: ${csvPath}`);

  const parser = fs.createReadStream(csvPath).pipe(
    parse({ columns: true, relax_quotes: true, relax_column_count: true, skip_empty_lines: true, bom: true })
  );

  let count = 0;
  for await (const row of parser) {
    count++;
    try {
      await upsertProduct(row);
    } catch (err) {
      stats.errors.push(`row ${count}: ${err.message}`);
      console.error(`  ✗ row ${count}: ${err.message}`);
    }
    // light throttle to be gentle on Supabase
    await new Promise((r) => setTimeout(r, 80));
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`  Rows read:   ${count}`);
  console.log(`  Inserted:    ${stats.inserted}`);
  console.log(`  Updated:     ${stats.updated}`);
  console.log(`  Skipped:     ${stats.skipped}`);
  if (stats.errors.length) {
    console.log(`  Errors:      ${stats.errors.length}`);
    stats.errors.forEach((e) => console.log(`    • ${e}`));
  }
  console.log('═══════════════════════════════════════');
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });