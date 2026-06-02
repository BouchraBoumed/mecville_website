/**
 * Migration script: WooCommerce (WordPress) → Supabase
 *
 * Usage:
 *   node src/utils/migrate.js
 *
 * Set these env vars before running:
 *   WC_URL=http://localhost:8881           # WordPress/WooCommerce URL
 *   WC_CONSUMER_KEY=ck_...                 # WooCommerce API key (if needed)
 *   WC_CONSUMER_SECRET=cs_...              # WooCommerce API secret (if needed)
 *   SUPABASE_URL=...                       # Already in .env
 *   SUPABASE_SERVICE_ROLE_KEY=...          # Already in .env
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ── Config ──────────────────────────────────────────────────
const WC_URL = process.env.WC_URL || 'http://localhost:8881';
const WC_KEY = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Track results
const stats = { categories: 0, products: 0, images: 0, errors: [] };

// ── Helpers ──────────────────────────────────────────────────
async function wcFetch(endpoint) {
  let url = `${WC_URL}/wp-json/wc/v3/${endpoint}`;
  if (WC_KEY && WC_SECRET) {
    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
    url += `${url.includes('?') ? '&' : '?'}consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WC API ${res.status} for ${endpoint}: ${text.substring(0, 200)}`);
  }
  return res.json();
}

async function downloadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const name = url.split('/').pop().split('?')[0] || `img-${Date.now()}.jpg`;
    return { buffer, name };
  } catch {
    return null;
  }
}

async function uploadToSupabase(image, productSlug, index) {
  const ext = path.extname(image.name) || '.jpg';
  const fileName = `products/${productSlug}/${index}${ext}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(fileName, image.buffer, {
      contentType: `image/${ext.replace('.', '')}`,
      upsert: true,
    });

  if (error) {
    // Bucket might not exist — try creating it
    if (error.message?.includes('bucket')) {
      await supabase.storage.createBucket('product-images', { public: true });
      const { error: retryError } = await supabase.storage
        .from('product-images')
        .upload(fileName, image.buffer, {
          contentType: `image/${ext.replace('.', '')}`,
          upsert: true,
        });
      if (retryError) {
        console.error(`  ⚠ Upload failed for ${fileName}: ${retryError.message}`);
        return null;
      }
    } else {
      console.error(`  ⚠ Upload failed for ${fileName}: ${error.message}`);
      return null;
    }
  }

  const { data: publicUrl } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return { src: publicUrl.publicUrl, alt: fileName };
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() || `item-${Date.now()}`;
}

// ── Migration Steps ──────────────────────────────────────────

async function migrateCategories() {
  console.log('\n📁 Migrating categories...');
  const categories = await wcFetch('products/categories?per_page=100');

  for (const cat of categories) {
    if (cat.slug === 'uncategorized') continue;

    const existing = await supabase
      .from('categories')
      .select('id')
      .eq('slug', cat.slug)
      .maybeSingle();

    if (existing.data) {
      console.log(`  ↻ Skipped "${cat.name}" (already exists)`);
      continue;
    }

    const { error } = await supabase
      .from('categories')
      .insert({
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        image_url: cat.image?.src || null,
        sort_order: cat.menu_order || 0,
      });

    if (error) {
      stats.errors.push(`Category "${cat.name}": ${error.message}`);
      console.error(`  ✗ Failed "${cat.name}": ${error.message}`);
    } else {
      stats.categories++;
      console.log(`  ✓ "${cat.name}"`);
    }
  }
}

async function migrateProducts() {
  console.log('\n📦 Migrating products...');
  let page = 1;
  let total = 0;

  while (true) {
    const products = await wcFetch(`products?per_page=20&page=${page}`);

    if (products.length === 0) break;

    for (const wp of products) {
      await migrateSingleProduct(wp);
      total++;
    }
    page++;
  }

  console.log(`\n  Total: ${total} products processed`);
}

async function migrateSingleProduct(wp) {
  const slug = wp.slug || slugify(wp.name);

  // Check if already migrated
  const existing = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing.data) {
    console.log(`  ↻ Skipped "${wp.name}" (already exists)`);
    return;
  }

  // Map category
  let categoryId = null;
  if (wp.categories?.length > 0) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', wp.categories[0].slug)
      .maybeSingle();
    categoryId = cat?.id || null;
  }

  // Map attributes to simple key-value object
  const attributes = {};
  for (const attr of wp.attributes || []) {
    const key = attr.name?.toLowerCase().replace(/\s+/g, '_') || `attr_${attr.id}`;
    attributes[key] = attr.options?.join(', ') || attr.option || '';
  }

  // Handle price
  const price = wp.regular_price
    ? parseFloat(wp.regular_price)
    : wp.price
      ? parseFloat(wp.price)
      : 0;
  const salePrice = wp.sale_price ? parseFloat(wp.sale_price) : null;
  const comparePrice = salePrice ? price : null;

  // Migrate images
  const images = [];
  if (wp.images?.length > 0) {
    for (let i = 0; i < wp.images.length; i++) {
      const img = wp.images[i];
      const downloaded = await downloadImage(img.src);
      if (downloaded) {
        const uploaded = await uploadToSupabase(downloaded, slug, i);
        if (uploaded) {
          images.push(uploaded);
          stats.images++;
        } else {
          // Fall back to original URL
          images.push({ src: img.src, alt: img.alt || '' });
        }
      }
      // Small delay to avoid overwhelming the image server
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const product = {
    name: wp.name,
    slug,
    description: wp.description || '',
    short_description: wp.short_description || '',
    price: salePrice || price,
    compare_price: comparePrice,
    sku: wp.sku || null,
    stock: wp.stock_quantity ?? (wp.stock_status === 'instock' ? 999 : 0),
    stock_alert: 5,
    category_id: categoryId,
    images,
    attributes,
    featured: wp.featured || false,
    active: wp.status === 'publish' || wp.status === 'published',
    meta_title: wp.meta_data?.find(m => m.key === '_yoast_wpseo_title')?.value || wp.name,
    meta_description: wp.meta_data?.find(m => m.key === '_yoast_wpseo_metadesc')?.value || '',
  };

  const { error } = await supabase.from('products').insert(product);
  if (error) {
    stats.errors.push(`Product "${wp.name}": ${error.message}`);
    console.error(`  ✗ Failed "${wp.name}": ${error.message}`);
  } else {
    stats.products++;
    console.log(`  ✓ "${wp.name}" — $${product.price} (${images.length} images)`);
  }
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  WooCommerce → Supabase Migration    ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`Source: ${WC_URL}`);

  try {
    await migrateCategories();
    await migrateProducts();
  } catch (err) {
    console.error('\n❌ Migration aborted:', err.message);
    stats.errors.push(`Fatal: ${err.message}`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('📊 Migration Summary:');
  console.log(`  Categories: ${stats.categories} created`);
  console.log(`  Products:   ${stats.products} created`);
  console.log(`  Images:     ${stats.images} uploaded`);
  if (stats.errors.length > 0) {
    console.log(`  Errors:     ${stats.errors.length}`);
    stats.errors.forEach(e => console.log(`    • ${e}`));
  }
  console.log('═══════════════════════════════════════\n');
}

main().catch(console.error);
