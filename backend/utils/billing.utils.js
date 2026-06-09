/**
 * billing.utils.js
 * Core ERP Calculation Engine — Production Grade
 *
 * Rules enforced:
 * - ALL money values rounded to 2 decimal places at each step (prevents float drift)
 * - Never trust frontend totals — always recompute
 * - GST direction: CGST+SGST for intra-state, IGST for inter-state
 * - Invoice-level discounts applied AFTER line totals are summed
 */

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

// ─── GSTIN Validator ──────────────────────────────────────────────────────────
// Format: 2-digit state code + 10-digit PAN + 1 entity number + 1 Z + 1 check digit
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGSTIN(gstin) {
  if (!gstin) return { valid: false, error: 'GSTIN is required' };
  const cleaned = gstin.toUpperCase().trim();
  if (!GSTIN_REGEX.test(cleaned)) {
    return { valid: false, error: `Invalid GSTIN format: ${gstin}` };
  }
  return { valid: true, stateCode: cleaned.substring(0, 2) };
}

// ─── Financial Year Utility ───────────────────────────────────────────────────
export function getFinancialYear(date = new Date()) {
  const d = new Date(date);
  const month = d.getMonth(); // 0-indexed
  const year = d.getFullYear();
  // Indian FY: April (3) to March (2)
  if (month >= 3) {
    return { start: new Date(year, 3, 1), end: new Date(year + 1, 2, 31, 23, 59, 59, 999), label: `${year}-${year + 1}` };
  }
  return { start: new Date(year - 1, 3, 1), end: new Date(year, 2, 31, 23, 59, 59, 999), label: `${year - 1}-${year}` };
}

// ─── Core Invoice Totals Computation ─────────────────────────────────────────
/**
 * Computes all invoice financial fields from raw line items.
 *
 * @param {Array}  lineItems           - Raw line items from request body
 * @param {string} companyStateCode    - 2-char state code from company GSTIN
 * @param {string} customerStateCode   - 2-char state code from customer GSTIN
 * @param {number} invoiceDiscount     - Optional invoice-level discount (absolute ₹ value)
 * @returns {Object} All computed invoice financial fields
 */
export function computeInvoiceTotals(
  lineItems,
  companyStateCode,
  customerStateCode,
  invoiceDiscount = 0
) {
  // GST direction: only apply intra-state split when BOTH codes are present and equal
  // If EITHER is missing, we cannot determine — default to intra-state (safest for common case)
  // but callers should always try to populate state codes from GSTIN
  const isSameState =
    companyStateCode && customerStateCode
      ? String(companyStateCode).trim() === String(customerStateCode).trim()
      : true;

  let lineSubtotal = 0; // sum of taxable amounts (after item-level discounts)
  let lineTotalTax = 0; // sum of all item-level taxes

  const computed = lineItems.map((item) => {
    const qty     = r2(Number(item.quantity) || 0);
    const rate    = r2(Number(item.rate)     || 0);
    const discPct = r2(Math.min(100, Math.max(0, Number(item.discountPercent) || 0)));
    const gstPct  = r2(Math.min(100, Math.max(0, Number(item.gstPercent) || Number(item.gstPercentage) || 0)));

    if (qty <= 0 || rate < 0) {
      throw new Error(`Invalid quantity or rate for item: ${item.name || 'Unknown'}`);
    }

    const lineTotal  = r2(qty * rate);
    const discAmount = r2(lineTotal * (discPct / 100));
    const taxable    = r2(lineTotal - discAmount);
    const tax        = r2(taxable * (gstPct / 100));
    const amount     = r2(taxable + tax);

    // Accumulate — round each addition to prevent cascading float errors
    lineSubtotal = r2(lineSubtotal + taxable);
    lineTotalTax = r2(lineTotalTax + tax);

    return {
      ...item,
      // Preserve all original fields + add computed
      discountPercent: discPct,
      gstPercent:      gstPct,
      gstPercentage:   gstPct, // keep legacy alias in sync
      taxableAmount:   taxable,
      taxAmount:       tax,
      amount,
    };
  });

  // Invoice-level discount applied after line totals
  const invDiscount    = r2(Math.max(0, Number(invoiceDiscount) || 0));
  const subtotal       = r2(lineSubtotal - invDiscount);
  const totalTax       = r2(lineTotalTax); // tax is computed on pre-invoice-discount taxable

  // GST split
  const cgst = isSameState ? r2(totalTax / 2) : 0;
  const sgst = isSameState ? r2(totalTax / 2) : 0;
  const igst = !isSameState ? totalTax : 0;

  // Ensure cgst+sgst exactly equals totalTax (fix rounding split)
  // e.g., totalTax = 9.01 → cgst = 4.5, sgst = 4.5 = 9.0 ≠ 9.01
  // Assign remainder to cgst to keep sum exact
  const gstCheckSum = isSameState ? r2(cgst + sgst) : igst;
  const cgstFinal = isSameState ? r2(cgst + r2(totalTax - gstCheckSum)) : 0;

  const grandTotal = r2(subtotal + totalTax);

  return {
    lineItems:      computed,
    subtotal,
    subTotal:       subtotal, // legacy alias
    taxableAmount:  subtotal,
    discountAmount: invDiscount,
    cgst:           cgstFinal,
    sgst,
    igst,
    taxAmount:      totalTax,
    grandTotal,
    isSameState,
  };
}

// ─── Purchase Bill Totals ─────────────────────────────────────────────────────
/**
 * Computes purchase bill totals with input GST split.
 * Mirrors computeInvoiceTotals but for the purchase side.
 */
export function computePurchaseBillTotals(lineItems, companyStateCode, vendorStateCode) {
  return computeInvoiceTotals(lineItems, companyStateCode, vendorStateCode, 0);
}

// ─── Mark Overdue (utility for cron) ─────────────────────────────────────────
export async function markOverdueInvoices(Invoice) {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const result = await Invoice.updateMany(
    {
      dueDate:    { $lt: now },
      balanceDue: { $gt: 0 },
      status:     { $in: ['Sent', 'Partial'] },
    },
    { $set: { status: 'Overdue' } }
  );
  return result.modifiedCount;
}

export const roundTo = (value) => r2(value);
