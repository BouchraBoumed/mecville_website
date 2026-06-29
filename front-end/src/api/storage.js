/**
 * Upload product images to Supabase Storage.
 * Uses the frontend Supabase client — RLS policies enforce admin-only uploads.
 */

import { supabase } from '../lib/supabase';

const BUCKET = 'product-images';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Upload a product image to Supabase Storage.
 *
 * @param {File} file - The image file to upload
 * @param {string} productSlug - The product slug (used for path organization)
 * @returns {Promise<{src: string, alt: string}>} - The public URL and alt text
 */
export async function uploadProductImage(file, productSlug = 'misc') {
  if (!file) throw new Error('No file provided');

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only PNG, JPEG, and WebP images are allowed');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image must be 50MB or smaller');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `products/${productSlug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  return {
    src: publicUrlData.publicUrl,
    alt: file.name.replace(/\.[^.]+$/, ''),
  };
}
