import { describe, it, expect } from 'vitest';
import { validateProduct, validateOrderUpdate } from '../utils/validate-product.js';
import { AppError } from '../utils/errors.js';

describe('validateProduct — Create mode (isCreate=true)', () => {
  it('accepts a valid product with all fields', () => {
    const data = {
      name: 'Charizard VMAX',
      slug: 'charizard-vmax',
      description: '<p>A great card</p>',
      short_description: 'Awesome card',
      price: '599.99',
      compare_price: '699.99',
      sku: 'CHR-VMAX-001',
      stock: '10',
      stock_alert: '3',
      category_id: '1',
      images: [{ src: 'https://example.com/img.jpg', alt: 'Charizard' }],
      attributes: { set: 'Darkness Ablaze', rarity: 'Ultra Rare' },
      featured: true,
      active: true,
    };
    const result = validateProduct(data, true);
    expect(result.name).toBe('Charizard VMAX');
    expect(result.price).toBe(599.99);
    expect(result.stock).toBe(10);
    expect(result.category_id).toBe(1);
    expect(result.featured).toBe(true);
  });

  it('throws on missing name (required for create)', () => {
    expect(() => validateProduct({ slug: 'test', price: '10' }, true)).toThrow(AppError);
  });

  it('throws on missing slug (required for create)', () => {
    expect(() => validateProduct({ name: 'Test', price: '10' }, true)).toThrow(AppError);
  });

  it('throws on missing price (required for create)', () => {
    expect(() => validateProduct({ name: 'Test', slug: 'test' }, true)).toThrow(AppError);
  });

  it('throws with VALIDATION_ERROR code', () => {
    try {
      validateProduct({}, true);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('validateProduct — Update mode (isCreate=false)', () => {
  it('accepts partial update with just name', () => {
    const result = validateProduct({ name: 'Updated Name' }, false);
    expect(result.name).toBe('Updated Name');
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('accepts partial update with just price', () => {
    const result = validateProduct({ price: '29.99' }, false);
    expect(result.price).toBe(29.99);
  });

  it('returns empty object for empty input (no fields to validate)', () => {
    const result = validateProduct({}, false);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('does not require name/slug/price', () => {
    const result = validateProduct({ stock: '50' }, false);
    expect(result.stock).toBe(50);
  });
});

describe('validateProduct — Field validators', () => {
  describe('name', () => {
    it('rejects empty string', () => {
      expect(() => validateProduct({ name: '' }, false)).toThrow(AppError);
    });

    it('rejects non-string', () => {
      expect(() => validateProduct({ name: 123 }, false)).toThrow(AppError);
    });

    it('rejects name over 300 chars', () => {
      expect(() => validateProduct({ name: 'x'.repeat(301) }, false)).toThrow(AppError);
    });

    it('accepts name at exactly 300 chars', () => {
      const result = validateProduct({ name: 'x'.repeat(300) }, false);
      expect(result.name).toHaveLength(300);
    });
  });

  describe('slug', () => {
    it('rejects slug with uppercase', () => {
      expect(() => validateProduct({ slug: 'Invalid-Slug' }, false)).toThrow(AppError);
    });

    it('rejects slug with spaces', () => {
      expect(() => validateProduct({ slug: 'has space' }, false)).toThrow(AppError);
    });

    it('rejects slug with special chars', () => {
      expect(() => validateProduct({ slug: 'slug!@#' }, false)).toThrow(AppError);
    });

    it('accepts slug with hyphens and numbers', () => {
      const result = validateProduct({ slug: 'charizard-vmax-189' }, false);
      expect(result.slug).toBe('charizard-vmax-189');
    });
  });

  describe('price', () => {
    it('rejects negative price', () => {
      expect(() => validateProduct({ price: '-10' }, false)).toThrow(AppError);
    });

    it('rejects non-numeric price', () => {
      expect(() => validateProduct({ price: 'abc' }, false)).toThrow(AppError);
    });

    it('accepts zero price', () => {
      const result = validateProduct({ price: '0' }, false);
      expect(result.price).toBe(0);
    });

    it('accepts decimal price', () => {
      const result = validateProduct({ price: '59.99' }, false);
      expect(result.price).toBe(59.99);
    });

    it('coerces string to number', () => {
      const result = validateProduct({ price: '100' }, false);
      expect(result.price).toBe(100);
      expect(typeof result.price).toBe('number');
    });
  });

  describe('compare_price', () => {
    it('accepts null', () => {
      const result = validateProduct({ compare_price: null }, false);
      expect(result.compare_price).toBeNull();
    });

    it('rejects negative', () => {
      expect(() => validateProduct({ compare_price: '-5' }, false)).toThrow(AppError);
    });
  });

  describe('stock', () => {
    it('rejects negative stock', () => {
      expect(() => validateProduct({ stock: '-1' }, false)).toThrow(AppError);
    });

    it('accepts zero stock', () => {
      const result = validateProduct({ stock: '0' }, false);
      expect(result.stock).toBe(0);
    });

    it('coerces to integer', () => {
      const result = validateProduct({ stock: '42' }, false);
      expect(result.stock).toBe(42);
      expect(typeof result.stock).toBe('number');
    });
  });

  describe('images', () => {
    it('rejects non-array images', () => {
      expect(() => validateProduct({ images: 'not-array' }, false)).toThrow(AppError);
    });

    it('rejects image object without src', () => {
      expect(() => validateProduct({ images: [{ alt: 'no src' }] }, false)).toThrow(AppError);
    });

    it('accepts array of image objects with src', () => {
      const result = validateProduct({ images: [{ src: 'https://example.com/img.jpg' }] }, false);
      expect(result.images).toHaveLength(1);
    });

    it('accepts empty array', () => {
      const result = validateProduct({ images: [] }, false);
      expect(result.images).toEqual([]);
    });
  });

  describe('attributes', () => {
    it('rejects array as attributes', () => {
      expect(() => validateProduct({ attributes: ['wrong'] }, false)).toThrow(AppError);
    });

    it('accepts plain object', () => {
      const result = validateProduct({ attributes: { set: 'SV', rarity: 'Rare' } }, false);
      expect(result.attributes.set).toBe('SV');
    });

    it('accepts null', () => {
      const result = validateProduct({ attributes: null }, false);
      expect(result.attributes).toBeNull();
    });
  });

  describe('featured / active', () => {
    it('rejects non-boolean featured', () => {
      expect(() => validateProduct({ featured: 'yes' }, false)).toThrow(AppError);
    });

    it('rejects non-boolean active', () => {
      expect(() => validateProduct({ active: 1 }, false)).toThrow(AppError);
    });

    it('accepts boolean true', () => {
      const result = validateProduct({ featured: true, active: true }, false);
      expect(result.featured).toBe(true);
      expect(result.active).toBe(true);
    });

    it('accepts boolean false', () => {
      const result = validateProduct({ featured: false, active: false }, false);
      expect(result.featured).toBe(false);
      expect(result.active).toBe(false);
    });
  });

  describe('sku', () => {
    it('rejects non-string sku', () => {
      expect(() => validateProduct({ sku: 123 }, false)).toThrow(AppError);
    });

    it('rejects sku over 100 chars', () => {
      expect(() => validateProduct({ sku: 'x'.repeat(101) }, false)).toThrow(AppError);
    });

    it('accepts null sku', () => {
      const result = validateProduct({ sku: null }, false);
      expect(result.sku).toBeNull();
    });
  });

  describe('category_id', () => {
    it('accepts null', () => {
      const result = validateProduct({ category_id: null }, false);
      expect(result.category_id).toBeNull();
    });

    it('rejects zero', () => {
      expect(() => validateProduct({ category_id: '0' }, false)).toThrow(AppError);
    });

    it('coerces to number', () => {
      const result = validateProduct({ category_id: '5' }, false);
      expect(result.category_id).toBe(5);
    });
  });
});

describe('validateOrderUpdate', () => {
  it('accepts valid status', () => {
    const result = validateOrderUpdate({ status: 'shipped' });
    expect(result.status).toBe('shipped');
  });

  it('accepts tracking_number', () => {
    const result = validateOrderUpdate({ tracking_number: 'TRK123456' });
    expect(result.tracking_number).toBe('TRK123456');
  });

  it('accepts both status and tracking_number', () => {
    const result = validateOrderUpdate({ status: 'shipped', tracking_number: 'TRK789' });
    expect(result.status).toBe('shipped');
    expect(result.tracking_number).toBe('TRK789');
  });

  it('rejects invalid status', () => {
    expect(() => validateOrderUpdate({ status: 'invalid' })).toThrow(AppError);
  });

  it('rejects empty object', () => {
    expect(() => validateOrderUpdate({})).toThrow(AppError);
  });

  it('rejects non-string tracking_number', () => {
    expect(() => validateOrderUpdate({ tracking_number: 123 })).toThrow(AppError);
  });

  it('rejects tracking_number over 100 chars', () => {
    expect(() => validateOrderUpdate({ tracking_number: 'x'.repeat(101) })).toThrow(AppError);
  });

  it('accepts null tracking_number', () => {
    const result = validateOrderUpdate({ tracking_number: null });
    expect(result.tracking_number).toBeNull();
  });

  it('accepts all valid statuses', () => {
    const valid = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    for (const status of valid) {
      const result = validateOrderUpdate({ status });
      expect(result.status).toBe(status);
    }
  });

  it('throws with VALIDATION_ERROR code', () => {
    try {
      validateOrderUpdate({ status: 'bad' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.statusCode).toBe(400);
    }
  });
});
