/**
 * validate.js — Zod-powered Express middleware factory
 *
 * Usage:
 *   import { validateBody, validateQuery } from '../utils/validate.js'
 *   import { createInvoiceSchema } from '../validators/billing.validators.js'
 *
 *   router.post('/', validateBody(createInvoiceSchema), createInvoice)
 */

/**
 * Returns an Express middleware that validates `req.body` against a Zod schema.
 * On failure → 400 JSON with structured Zod error messages.
 * On success → parsed (coerced) data is attached to `req.validatedBody`.
 */
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }
  req.validatedBody = result.data;
  next();
};

/**
 * Returns an Express middleware that validates `req.query` against a Zod schema.
 * Parsed query is attached to `req.validatedQuery`.
 */
export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const errors = result.error.issues.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors,
    });
  }
  req.validatedQuery = result.data;
  next();
};

/**
 * Returns an Express middleware that validates `req.params` against a Zod schema.
 */
export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    const errors = result.error.issues.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Invalid route parameters',
      errors,
    });
  }
  req.validatedParams = result.data;
  next();
};
