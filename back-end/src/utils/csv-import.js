/**
 * CSV Product Import → Supabase
 *
 * Place your CSV file as back-end/data/products.csv
 * Put images in back-end/data/images/ (named by SKU, or referenced in CSV column)
 *
 * Usage:
 *   cd back-end
 *   npm run import       # uses back-end/data/products.csv
 *   node src/utils/csv-import.js path/to/your-file.csv
 *
 * CSV column headers accepted (case-insensitive):
 *   name, slug (auto-generated if missing), description, short_description, price,
 *   compare_price, sku, stock, stock_alert, category, images, set, rarity, condition,
 *   language, grading_company, featured, active
 *
 * The "images" column can contain filenames (looked up in data/images/) or URLs.
 * If missing, images are matched to back-end/data/images/<sku>.*
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_IMAGE_DIR = path.resolve(__dirname, '../../data/images');
const stats = { created: 0, skipped: 0, images: 0, errors: [] };

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() || `item-${Date.now()}`;
}

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    if (Object.values(row).some(v => v)) rows.push(row);
  }

  console.log(`Parsed ${rows.length} products from CSV`);
  return rows;
}

async function resolveCategory(categoryName) {
  if (!categoryName) return null;
  const slug = slugify(categoryName);
  let { data } = await supabase.from('categories').select('id').eq('slug', slug).maybeSingle();
  if (data) return data.id;

  const { data: created, error } = await supabase
    .from('categories')
    .insert({ name: categoryName, slug })
    .select('id')
    .single();
  if (error) {
    console.error(`  ⚠ Failed to create category "${categoryName}": ${error.message}`);
    return null;
  }
  console.log(`  Created category: ${categoryName}`);
  return created.id;
}

function findImageFiles(sku) {
  if (!sku) return [];
  try {
    const files = fs.readdirSync(DEFAULT_IMAGE_DIR);
    return files.filter(f => {
      const name = path.parse(f).name.toLowerCase();
      return name === sku.toLowerCase() || name.startsWith(sku.toLowerCase());
    });
  } catch {
    return [];
  }
}

function resolveImages(csvImages, sku) {
  const sources = [];

  if (csvImages) {
    csvImages.split(';').forEach(src => {
      sources.push(src.trim());
    });
  }

  if (sources.length === 0 && sku) {
    const matched = findImageFiles(sku);
    sources.push(...matched);
  }

  return sources;
}

async function uploadToSupabase(imagePath, productSlug, index) {
  const ext = path.extname(imagePath) || '.jpg';
  const fileName = `products/${productSlug}/${index}${ext}`;
  const buffer = fs.readFileSync(imagePath);

  const contentType = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif',
  }[ext.toLowerCase()] || 'image/jpeg';

  try {
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, { contentType, upsert: true });

    if (error) {
      if (error.message?.includes('bucket')) {
        await supabase.storage.createBucket('product-images', { public: true });
        const { error: retry } = await supabase.storage
          .from('product-images')
          .upload(fileName, buffer, { contentType, upsert: true });
        if (retry) { console.error(`  ⚠ Upload failed: ${retry.message}`); return null; }
      } else {
        console.error(`  ⚠ Upload failed: ${error.message}`);
        return null;
      }
    }

    const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return { src: publicUrl.publicUrl, alt: path.basename(imagePath) };
  } catch (err) {
    console.error(`  ⚠ Upload error: ${err.message}`);
    return null;
  }
}

async function importRow(row) {
  const name = row.name;
  if (!name) return;

  const slug = row.slug || slugify(name);
  const sku = row.sku || '';

  const existing = await supabase.from('products').select('id').eq('slug', slug).maybeSingle();
  if (existing.data) {
    console.log(`  ↻ Skipped "${name}" (already exists)`);
    stats.skipped++;
    return;
  }

  const categoryId = await resolveCategory(row.category);

  const attributes = {};
  if (row.set) attributes.set = row.set;
  if (row.rarity) attributes.rarity = row.rarity;
  if (row.condition) attributes.condition = row.condition;
  if (row.language) attributes.language = row.language;
  if (row.grading_company) attributes.grading_company = row.grading_company;

  const price = parseFloat(row.price) || 0;
  const comparePrice = row.compare_price ? parseFloat(row.compare_price) : null;

  const imageSources = resolveImages(row.images, sku);
  const images = [];

  for (let i = 0; i < imageSources.length; i++) {
    const src = imageSources[i];
    if (src.startsWith('http')) {
      images.push({ src, alt: name });
    } else {
      const imgPath = path.resolve(DEFAULT_IMAGE_DIR, src);
      if (fs.existsSync(imgPath)) {
        const uploaded = await uploadToSupabase(imgPath, slug, i);
        if (uploaded) { images.push(uploaded); stats.images++; }
      }
    }
    await new Promise(r => setTimeout(r, 100));
  }

  const product = {
    name,
    slug,
    description: row.description || '',
    short_description: row.short_description || '',
    price: comparePrice || price,
    compare_price: comparePrice,
    sku: sku || null,
    stock: parseInt(row.stock) || 0,
    stock_alert: parseInt(row.stock_alert) || 5,
    category_id: categoryId,
    images,
    attributes,
    featured: String(row.featured).toLowerCase() === 'true',
    active: row.active !== 'false',
  };

  const { error } = await supabase.from('products').insert(product);
  if (error) {
    stats.errors.push(`Product "${name}": ${error.message}`);
    console.error(`  ✗ Failed "${name}": ${error.message}`);
  } else {
    stats.created++;
    console.log(`  ✓ "${name}" — $${product.price} (${images.length} images)`);
  }
}

async function main() {
  const csvPath = process.argv[2] || path.resolve(__dirname, '../../data/products.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    console.error('Usage: node src/utils/csv-import.js <path-to-csv>');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════');
  console.log('  CSV Product Import → Supabase');
  console.log('═══════════════════════════════════════');
  console.log(`CSV:  ${csvPath}`);
  console.log(`Imgs: ${DEFAULT_IMAGE_DIR}`);

  try {
    const rows = parseCSV(csvPath);
    for (const row of rows) {
      await importRow(row);
      await new Promise(r => setTimeout(r, 150));
    }
  } catch (err) {
    console.error('\n❌ Import aborted:', err.message);
    stats.errors.push(`Fatal: ${err.message}`);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  Created:  ' + stats.created);
  console.log('  Skipped:  ' + stats.skipped);
  console.log('  Images:   ' + stats.images);
  if (stats.errors.length > 0) {
    console.log('  Errors:   ' + stats.errors.length);
    stats.errors.forEach(e => console.log('    • ' + e));
  }
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);
