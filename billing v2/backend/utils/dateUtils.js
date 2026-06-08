/**
 * dateUtils.js — Centralised, timezone-safe UTC date parsing
 *
 * Mongoose v9 / Node 22 / Prolync Billing System
 *
 * All date inputs (strings, numbers, Date objects) are normalised to a proper
 * JavaScript Date in UTC before being stored in MongoDB.  If the input is
 * absent or un-parseable the function returns `null` so the caller can decide
 * whether to reject the request or fall back to `new Date()`.
 */

/**
 * Parse any date-like value into a UTC Date object.
 *
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null}
 */
export function parseUTC(value) {
  if (value === null || value === undefined || value === '') return null;

  // Already a valid Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value;
  }

  // ISO-8601 string — parse directly; JS always interprets these as UTC
  if (typeof value === 'string') {
    // Reject obviously bad values that would silently produce a wrong year
    const trimmed = value.trim();
    if (!trimmed) return null;

    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return null;

    // Sanity-guard: reject dates outside the plausible billing window
    const year = d.getUTCFullYear();
    const currentYear = new Date().getUTCFullYear();
    if (year < 2000 || year > currentYear + 10) return null;

    return d;
  }

  // Unix timestamp (ms)
  if (typeof value === 'number') {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    const year = d.getUTCFullYear();
    const currentYear = new Date().getUTCFullYear();
    if (year < 2000 || year > currentYear + 10) return null;
    return d;
  }

  return null;
}

/**
 * Parse and REQUIRE a date value — throws a descriptive Error if invalid.
 *
 * @param {*}      value
 * @param {string} fieldName   — used in the error message, e.g. "dueDate"
 * @returns {Date}
 */
export function requireUTC(value, fieldName = 'date') {
  const d = parseUTC(value);
  if (!d) {
    throw new Error(
      `Invalid or missing date for field "${fieldName}". ` +
      `Received: ${JSON.stringify(value)}. ` +
      `Expected an ISO-8601 string (e.g. "2026-05-26" or "2026-05-26T00:00:00Z").`
    );
  }
  return d;
}

/**
 * Convenience helper — sanitize an entire object's date fields in-place.
 * Fields listed in dateFields will be parsed; invalid ones are set to null.
 *
 * @param {object}   obj
 * @param {string[]} dateFields
 */
export function sanitizeDates(obj, dateFields) {
  for (const field of dateFields) {
    if (Object.prototype.hasOwnProperty.call(obj, field)) {
      obj[field] = parseUTC(obj[field]);
    }
  }
}

/** Today at UTC midnight — useful for "date-only" comparisons. */
export function todayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Add `days` calendar days to a UTC Date without mutating the input. */
export function addDaysUTC(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
