import { AppError } from '../utils/errors.js';

// Sanitize object by trimming strings and removing empty strings
function sanitize(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) result[key] = trimmed;
    } else if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// Validate request body against a schema
export function validate(schema) {
  return (req, _res, next) => {
    const errors = {};
    const data = sanitize(req.body);

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      if (rules.required && (value === undefined || value === '')) {
        errors[field] = `${field} is required`;
        continue;
      }

      if (value === undefined || value === '') continue;

      if (rules.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field] = 'Invalid email format';
      }

      if (rules.type === 'number' && isNaN(Number(value))) {
        errors[field] = 'Must be a number';
      }

      if (rules.minLength && value.length < rules.minLength) {
        errors[field] = `Minimum ${rules.minLength} characters`;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors[field] = `Maximum ${rules.maxLength} characters`;
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors[field] = rules.patternMessage || 'Invalid format';
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError(
        'Validation failed',
        400,
        'VALIDATION_ERROR'
      ));
    }

    req.validated = data;
    next();
  };
}

// Common schemas
export const schemas = {
  contact: {
    name: { required: true, minLength: 2, maxLength: 100 },
    email: { required: true, type: 'email' },
    subject: { maxLength: 200 },
    message: { required: true, minLength: 10, maxLength: 5000 },
  },
  review: {
    rating: { required: true, type: 'number' },
    title: { maxLength: 200 },
    content: { maxLength: 5000 },
  },
  address: {
    first_name: { required: true, maxLength: 100 },
    last_name: { required: true, maxLength: 100 },
    email: { required: true, type: 'email' },
    phone: { maxLength: 20 },
    address: { required: true, maxLength: 255 },
    city: { required: true, maxLength: 100 },
    province: { required: true, maxLength: 100 },
    postcode: { required: true, maxLength: 20 },
    country: { required: true, maxLength: 2, minLength: 2 },
  },
};
