import { calculateInvoice } from '../utils/calculateInvoice.js';
import { roundMoney, Decimal } from '../utils/rounding.js';

describe('Billing Engine: calculateInvoice', () => {

    test('Validation Criteria: Qty 3 × ₹99.99 × 18% GST', () => {
        const input = {
            lineItems: [
                { quantity: 3, rate: 99.99, gstPercentage: 18 }
            ]
        };

        const result = calculateInvoice(input);

        // Expected: Subtotal ₹299.97, Tax ₹53.99, Total ₹353.96
        expect(result.subtotal.toNumber()).toBe(299.97);
        expect(result.taxAmount.toNumber()).toBe(53.99);
        expect(result.grandTotal.toNumber()).toBe(353.96);
    });

    test('Bankers Rounding Rules (ROUND_HALF_EVEN)', () => {
        expect(roundMoney(1.005).toNumber()).toBe(1.00);
        expect(roundMoney(2.005).toNumber()).toBe(2.00); // True ROUND_HALF_EVEN: 0 is even, so 2.005 -> 2.00
        // Let's implement EXACTLY what the user wrote in their prompt.
    });

    test('100% discount', () => {
        const input = {
            lineItems: [
                { quantity: 5, rate: 100, gstPercentage: 18 } // 500
            ],
            discountPercent: 100
        };
        const result = calculateInvoice(input);
        expect(result.subtotal.toNumber()).toBe(500);
        expect(result.discountAmount.toNumber()).toBe(500);
        expect(result.taxableAmount.toNumber()).toBe(0);
        expect(result.taxAmount.toNumber()).toBe(0);
        expect(result.grandTotal.toNumber()).toBe(0);
    });

    test('Zero quantity items', () => {
        const input = {
            lineItems: [
                { quantity: 0, rate: 100, gstPercentage: 18 }
            ]
        };
        const result = calculateInvoice(input);
        expect(result.subtotal.toNumber()).toBe(0);
        expect(result.grandTotal.toNumber()).toBe(0);
    });

    test('Mixed tax rates on same invoice', () => {
        const input = {
            lineItems: [
                { quantity: 1, rate: 100, gstPercentage: 5 }, // Tax: 5
                { quantity: 1, rate: 100, gstPercentage: 18 } // Tax: 18
            ]
        };
        const result = calculateInvoice(input);
        expect(result.subtotal.toNumber()).toBe(200);
        expect(result.taxableAmount.toNumber()).toBe(200);
        expect(result.taxAmount.toNumber()).toBe(23);
        expect(result.grandTotal.toNumber()).toBe(223);
    });

    test('GST Computation (Indian Context) - Inter-state', () => {
        const input = {
            lineItems: [
                { quantity: 1, rate: 100, gstPercentage: 18 }
            ],
            companyStateCode: '33',
            customerStateCode: '29' // different state
        };
        const result = calculateInvoice(input);
        expect(result.cgst.toNumber()).toBe(0);
        expect(result.sgst.toNumber()).toBe(0);
        expect(result.igst.toNumber()).toBe(18);
    });

    test('GST Computation (Indian Context) - Intra-state', () => {
        const input = {
            lineItems: [
                { quantity: 1, rate: 100, gstPercentage: 18 }
            ],
            companyStateCode: '33',
            customerStateCode: '33' // same state
        };
        const result = calculateInvoice(input);
        expect(result.cgst.toNumber()).toBe(9);
        expect(result.sgst.toNumber()).toBe(9);
        expect(result.igst.toNumber()).toBe(0);
    });
});
