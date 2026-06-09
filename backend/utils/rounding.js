import Decimal from 'decimal.js';

// Configure Decimal globally for this application
// ROUND_HALF_EVEN is the IEEE 754 standard (banker's rounding)
Decimal.set({ rounding: Decimal.ROUND_HALF_EVEN });

/**
 * Rounds a number or Decimal to exactly 2 decimal places using Banker's Rounding (ROUND_HALF_EVEN)
 * e.g. 1.005 -> 1.00, 2.005 -> 2.01, 1.0049 -> 1.00
 * @param {number|string|Decimal} value 
 * @returns {Decimal} The rounded Decimal object
 */
export const roundMoney = (value) => {
    return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
};

/**
 * Converts a standard currency float (e.g., 100.50) into an integer atomic unit (e.g., 10050 paise)
 * @param {number|string|Decimal} value (in Rupees)
 * @returns {number} Integer representing paise
 */
export const toPaise = (value) => {
    return roundMoney(value).times(100).toNumber();
};

/**
 * Converts an integer atomic unit (e.g., 10050 paise) into a standard currency Decimal (e.g., 100.50 Rupees)
 * @param {number} value (in paise)
 * @returns {Decimal} Decimal representing Rupees
 */
export const toRupees = (value) => {
    return new Decimal(value).div(100);
};

export { Decimal };
