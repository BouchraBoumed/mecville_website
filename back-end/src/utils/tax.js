/**
 * Canadian tax calculation by province/territory.
 *
 * Rates as of 2025:
 *   GST  = 5%      (federal, applies everywhere)
 *   QST  = 9.975%  (Quebec only)
 *   PST  = varies   (BC 7%, SK 6%, MB 7%, ON has HST 13%)
 *   HST  = combined GST+PST in participating provinces
 *
 * For Quebec (where Mecville is based):
 *   GST 5% + QST 9.975% = 14.975% total
 *
 * Reference: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/gst-hst-calculator.html
 */

const TAX_RATES = {
  // HST provinces (harmonized)
  'ON': { rate: 0.13,    label: 'HST 13%' },
  'NB': { rate: 0.15,    label: 'HST 15%' },
  'NL': { rate: 0.15,    label: 'HST 15%' },
  'NS': { rate: 0.15,    label: 'HST 15%' },
  'PE': { rate: 0.15,    label: 'HST 15%' },

  // GST + QST (Quebec)
  'QC': { rate: 0.14975, label: 'GST 5% + QST 9.975%' },

  // GST + PST
  'BC': { rate: 0.12,    label: 'GST 5% + PST 7%' },
  'SK': { rate: 0.11,    label: 'GST 5% + PST 6%' },
  'MB': { rate: 0.12,    label: 'GST 5% + PST 7%' },

  // GST only (no provincial sales tax)
  'AB': { rate: 0.05,    label: 'GST 5%' },
  'NT': { rate: 0.05,    label: 'GST 5%' },
  'NU': { rate: 0.05,    label: 'GST 5%' },
  'YT': { rate: 0.05,    label: 'GST 5%' },

  // Default (unknown province — charge GST only as safest minimum)
  'DEFAULT': { rate: 0.05, label: 'GST 5%' },
};

/**
 * Calculate tax for an order based on shipping province.
 *
 * @param {number} subtotal - The pre-tax subtotal (in dollars)
 * @param {string} province - 2-letter province/territory code (QC, ON, BC, etc.)
 * @returns {{ rate: number, amount: number, label: string }}
 */
export function calculateTax(subtotal, province) {
  const key = (province || '').toUpperCase().slice(0, 2);
  const config = TAX_RATES[key] || TAX_RATES.DEFAULT;
  const amount = Math.round(Number(subtotal) * config.rate * 100) / 100;

  return {
    rate: config.rate,
    amount,
    label: config.label,
  };
}

/**
 * Get the list of Canadian provinces for dropdowns.
 * @returns {Array<{code: string, name: string}>}
 */
export const PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];
