/**
 * Validation for admin product create/update operations.
 * Ensures types, ranges, and required fields are correct before hitting Supabase.
 */

import { AppError } from './errors.js';

const VALIDATORS = {
  name: (v) => {
    if (typeof v !== 'string' || v.trim().length === 0) return 'name must be a non-empty string';
    if (v.length > 300) return 'name must be 300 characters or less';
    return null;
  },
  slug: (v) => {
    if (typeof v !== 'string' || v.trim().length === 0) return 'slug must be a non-empty string';
    if (!/^[a-z0-9-]+$/.test(v)) return 'slug must contain only lowercase letters, numbers, and hyphens';
    if (v.length > 200) return 'slug must be 200 characters or less';
    return null;
  },
  description: (v) => {
    if (v !== null && v !== undefined && typeof v !== 'string') return 'description must be a string';
    return null;
  },
  short_description: (v) => {
    if (v !== null && v !== undefined && typeof v !== 'string') return 'short_description must be a string';
    return null;
  },
  price: (v) => {
    const n = Number(v);
    if (isNaN(n) || n < 0) return 'price must be a non-negative number';
    if (n > 999999.99) return 'price must be less than 1,000,000';
    return null;
  },
  compare_price: (v) => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    if (isNaN(n) || n < 0) return 'compare_price must be a non-negative number';
    return null;
  },
  sku: (v) => {
    if (v !== null && v !== undefined) {
      if (typeof v !== 'string') return 'sku must be a string';
      if (v.length > 100) return 'sku must be 100 characters or less';
    }
    return null;
  },
  stock: (v) => {
    const n = parseInt(v);
    if (isNaN(n) || n < 0) return 'stock must be a non-negative integer';
    if (n > 999999) return 'stock must be less than 1,000,000';
    return null;
  },
  stock_alert: (v) => {
    if (v === undefined || v === null) return null;
    const n = parseInt(v);
    if (isNaN(n) || n < 0) return 'stock_alert must be a non-negative integer';
    return null;
  },
  category_id: (v) => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    if (isNaN(n) || n <= 0) return 'category_id must be a positive number';
    return null;
  },
  images: (v) => {
    if (v === undefined || v === null) return null;
    if (!Array.isArray(v)) return 'images must be an array';
    for (const img of v) {
      if (typeof img !== 'object' || img === null) return 'each image must be an object';
      if (typeof img.src !== 'string') return 'each image must have a src string';
    }
    return null;
  },
  attributes: (v) => {
    if (v === undefined || v === null) return null;
    if (typeof v !== 'object' || Array.isArray(v)) return 'attributes must be an object';
    return null;
  },
  featured: (v) => {
    if (typeof v !== 'boolean') return 'featured must be a boolean';
    return null;
  },
  active: (v) => {
    if (typeof v !== 'boolean') return 'active must be a boolean';
    return null;
  },
};

/**
 * Validate a product object against the validators.
 * Throws AppError with 400 status if any field is invalid.
 *
 * @param {Object} data - The product data to validate
 * @param {boolean} isCreate - If true, name and slug are required
 * @returns {Object} - The validated and coerced data
 */
export function validateProduct(data, isCreate = false) {
  const errors = [];
  const cleaned = {};

  for (const [field, validator] of Object.entries(VALIDATORS)) {
    if (field in data) {
      const err = validator(data[field]);
      if (err) {
        errors.push({ field, message: err });
      } else {
        // Coerce numeric fields
        if (field === 'price' || field === 'compare_price') {
          cleaned[field] = data[field] !== null && data[field] !== undefined ? Number(data[field]) : null;
        } else if (field === 'stock' || field === 'stock_alert') {
          cleaned[field] = parseInt(data[field]);
        } else if (field === 'category_id') {
          cleaned[field] = data[field] !== null ? Number(data[field]) : null;
        } else {
          cleaned[field] = data[field];
        }
      }
    }
  }

  // Required fields for create
  if (isCreate) {
    if (!data.name) errors.push({ field: 'name', message: 'name is required' });
    if (!data.slug) errors.push({ field: 'slug', message: 'slug is required' });
    if (data.price === undefined) errors.push({ field: 'price', message: 'price is required' });
  }

  if (errors.length > 0) {
    const message = errors.map(e => `${e.field}: ${e.message}`).join('; ');
    throw new AppError(`Validation failed: ${message}`, 400, 'VALIDATION_ERROR');
  }

  return cleaned;
}

/**
 * Validate order status updates.
 */
export function validateOrderUpdate(data) {
  const errors = [];
  const cleaned = {};

  if ('status' in data) {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(data.status)) {
      errors.push({ field: 'status', message: `must be one of: ${validStatuses.join(', ')}` });
    } else {
      cleaned.status = data.status;
    }
  }

  if ('tracking_number' in data) {
    if (data.tracking_number !== null && typeof data.tracking_number !== 'string') {
      errors.push({ field: 'tracking_number', message: 'must be a string or null' });
    } else if (typeof data.tracking_number === 'string' && data.tracking_number.length > 100) {
      errors.push({ field: 'tracking_number', message: 'must be 100 characters or less' });
    } else {
      cleaned.tracking_number = data.tracking_number;
    }
  }

  if (errors.length > 0) {
    const message = errors.map(e => `${e.field}: ${e.message}`).join('; ');
    throw new AppError(`Validation failed: ${message}`, 400, 'VALIDATION_ERROR');
  }

  if (Object.keys(cleaned).length === 0) {
    throw new AppError('No valid fields to update', 400, 'VALIDATION_ERROR');
  }

  return cleaned;
}
