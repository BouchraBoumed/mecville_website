import { describe, it, expect } from 'vitest';
import { calculateTax, PROVINCES } from '../utils/tax.js';

describe('calculateTax', () => {
  describe('HST provinces (harmonized rate)', () => {
    it('Ontario: 13%', () => {
      const result = calculateTax(100, 'ON');
      expect(result.rate).toBe(0.13);
      expect(result.amount).toBe(13);
      expect(result.label).toContain('HST 13%');
    });

    it('New Brunswick: 15%', () => {
      const result = calculateTax(100, 'NB');
      expect(result.rate).toBe(0.15);
      expect(result.amount).toBe(15);
    });

    it('Newfoundland: 15%', () => {
      const result = calculateTax(100, 'NL');
      expect(result.rate).toBe(0.15);
      expect(result.amount).toBe(15);
    });

    it('Nova Scotia: 15%', () => {
      const result = calculateTax(100, 'NS');
      expect(result.rate).toBe(0.15);
      expect(result.amount).toBe(15);
    });

    it('Prince Edward Island: 15%', () => {
      const result = calculateTax(100, 'PE');
      expect(result.rate).toBe(0.15);
      expect(result.amount).toBe(15);
    });
  });

  describe('Quebec (GST + QST)', () => {
    it('QC: 14.975%', () => {
      const result = calculateTax(100, 'QC');
      expect(result.rate).toBe(0.14975);
      expect(result.amount).toBe(14.98); // rounded to 2 decimals
      expect(result.label).toContain('QST');
    });

    it('QC: rounds correctly for non-round amounts', () => {
      const result = calculateTax(89.99, 'QC');
      expect(result.amount).toBeCloseTo(13.48, 2);
    });
  });

  describe('GST + PST provinces', () => {
    it('British Columbia: 12%', () => {
      const result = calculateTax(100, 'BC');
      expect(result.rate).toBe(0.12);
      expect(result.amount).toBe(12);
    });

    it('Saskatchewan: 11%', () => {
      const result = calculateTax(100, 'SK');
      expect(result.rate).toBe(0.11);
      expect(result.amount).toBe(11);
    });

    it('Manitoba: 12%', () => {
      const result = calculateTax(100, 'MB');
      expect(result.rate).toBe(0.12);
      expect(result.amount).toBe(12);
    });
  });

  describe('GST-only provinces/territories', () => {
    it('Alberta: 5%', () => {
      const result = calculateTax(100, 'AB');
      expect(result.rate).toBe(0.05);
      expect(result.amount).toBe(5);
    });

    it('Northwest Territories: 5%', () => {
      const result = calculateTax(100, 'NT');
      expect(result.rate).toBe(0.05);
    });

    it('Nunavut: 5%', () => {
      const result = calculateTax(100, 'NU');
      expect(result.rate).toBe(0.05);
    });

    it('Yukon: 5%', () => {
      const result = calculateTax(100, 'YT');
      expect(result.rate).toBe(0.05);
    });
  });

  describe('Edge cases', () => {
    it('null province defaults to GST 5%', () => {
      const result = calculateTax(100, null);
      expect(result.rate).toBe(0.05);
      expect(result.amount).toBe(5);
    });

    it('empty string province defaults to GST 5%', () => {
      const result = calculateTax(100, '');
      expect(result.rate).toBe(0.05);
    });

    it('unknown province defaults to GST 5%', () => {
      const result = calculateTax(100, 'XX');
      expect(result.rate).toBe(0.05);
    });

    it('lowercase province code is normalized to uppercase', () => {
      const result = calculateTax(100, 'qc');
      expect(result.rate).toBe(0.14975);
    });

    it('zero subtotal produces zero tax', () => {
      const result = calculateTax(0, 'QC');
      expect(result.amount).toBe(0);
    });

    it('large subtotal calculates correctly', () => {
      const result = calculateTax(10000, 'ON');
      expect(result.amount).toBe(1300);
    });

    it('non-numeric subtotal returns NaN (Number coercion)', () => {
      const result = calculateTax('invalid', 'ON');
      expect(result.amount).toBeNaN();
    });

    it('returns label for display', () => {
      const result = calculateTax(100, 'QC');
      expect(typeof result.label).toBe('string');
      expect(result.label.length).toBeGreaterThan(0);
    });

    it('returns rate for reference', () => {
      const result = calculateTax(100, 'ON');
      expect(typeof result.rate).toBe('number');
      expect(result.rate).toBeGreaterThan(0);
      expect(result.rate).toBeLessThan(1);
    });
  });
});

describe('PROVINCES', () => {
  it('returns all 13 Canadian provinces and territories', () => {
    expect(PROVINCES).toHaveLength(13);
  });

  it('each province has code and name', () => {
    for (const p of PROVINCES) {
      expect(p.code).toBeDefined();
      expect(p.name).toBeDefined();
      expect(typeof p.code).toBe('string');
      expect(p.code).toHaveLength(2);
    }
  });

  it('includes all expected codes', () => {
    const codes = PROVINCES.map(p => p.code);
    expect(codes).toContain('AB');
    expect(codes).toContain('BC');
    expect(codes).toContain('QC');
    expect(codes).toContain('ON');
    expect(codes).toContain('YT');
    expect(codes).toContain('NU');
    expect(codes).toContain('NT');
  });
});
