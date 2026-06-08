import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { toRupees } from '../utils/rounding.js';

/**
 * Dynamically calculates the outstanding balance for a customer.
 * NEVER stored, always calculated on read to ensure ACID compliance.
 * Returns amounts in paise (integers). Callers can convert to Rupees.
 * 
 * @param {string} customerId 
 * @returns {Promise<Object>} { totalInvoiced, totalPaid, totalOutstanding, agingBuckets }
 */
export const calculateCustomerOutstanding = async (customerId) => {
    // 1. Get all non-draft, non-cancelled invoices for this customer
    const invoices = await Invoice.find({
        customerId,
        status: { $nin: ['Draft', 'Cancelled'] }
    }).lean();

    const invoiceIds = invoices.map(inv => inv._id);

    // 2. Get all payments for these invoices
    const payments = await Payment.find({
        invoiceId: { $in: invoiceIds }
    }).lean();

    let totalInvoiced = 0;
    let totalOutstanding = 0;

    const now = new Date();
    const agingBuckets = {
        '0-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0
    };

    invoices.forEach(invoice => {
        const invoiceTotal = invoice.grandTotal || 0;
        totalInvoiced += invoiceTotal;

        // Find payments applied specifically to this invoice
        const appliedToInvoice = payments
            .filter(p => String(p.invoiceId) === String(invoice._id))
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        const outstandingForInvoice = Math.max(0, invoiceTotal - appliedToInvoice);
        totalOutstanding += outstandingForInvoice;

        if (outstandingForInvoice > 0) {
            // Calculate aging based on due date
            const targetDate = invoice.dueDate || invoice.date;
            const diffTime = Math.abs(now - new Date(targetDate));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 30) {
                agingBuckets['0-30'] += outstandingForInvoice;
            } else if (diffDays <= 60) {
                agingBuckets['31-60'] += outstandingForInvoice;
            } else if (diffDays <= 90) {
                agingBuckets['61-90'] += outstandingForInvoice;
            } else {
                agingBuckets['90+'] += outstandingForInvoice;
            }
        }
    });

    const totalPaid = Math.max(0, totalInvoiced - totalOutstanding);

    // Return in paise (multiply standard Rupees by 100)
    return {
        totalInvoiced: Math.round(totalInvoiced * 100),
        totalPaid: Math.round(totalPaid * 100),
        totalOutstanding: Math.round(totalOutstanding * 100),
        agingBuckets: {
            '0-30': Math.round(agingBuckets['0-30'] * 100),
            '31-60': Math.round(agingBuckets['31-60'] * 100),
            '61-90': Math.round(agingBuckets['61-90'] * 100),
            '90+': Math.round(agingBuckets['90+'] * 100)
        }
    };
};
