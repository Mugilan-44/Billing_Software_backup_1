import Invoice from '../models/Invoice.js';
import PurchaseBill from '../models/PurchaseBill.js';
import { roundMoney, Decimal } from '../utils/rounding.js';

/**
 * Calculates GST Liability (Output GST - Input GST) for a given date range and company
 * Returns amounts in paise.
 * 
 * @param {string} companyId 
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Promise<Object>} { outputGst, inputGst, netLiability }
 */
export const calculateGstLiability = async (companyId, startDate, endDate) => {
    const query = {
        companyId,
        date: { $gte: startDate, $lte: endDate },
        status: { $nin: ['Draft', 'Cancelled'] }
    };

    // 1. Calculate Total Output GST (from Sales Invoices)
    const invoices = await Invoice.find(query).lean();
    
    let totalOutputCgst = 0;
    let totalOutputSgst = 0;
    let totalOutputIgst = 0;

    invoices.forEach(inv => {
        totalOutputCgst += (inv.cgst || 0);
        totalOutputSgst += (inv.sgst || 0);
        totalOutputIgst += (inv.igst || 0);
    });

    const totalOutputGst = totalOutputCgst + totalOutputSgst + totalOutputIgst;

    // 2. Calculate Total Input GST (from Purchase Bills)
    const purchaseBills = await PurchaseBill.find(query).lean();

    let totalInputCgst = 0;
    let totalInputSgst = 0;
    let totalInputIgst = 0;

    purchaseBills.forEach(bill => {
        totalInputCgst += (bill.cgst || 0);
        totalInputSgst += (bill.sgst || 0);
        totalInputIgst += (bill.igst || 0);
    });

    const totalInputGst = totalInputCgst + totalInputSgst + totalInputIgst;

    // 3. Net Liability
    const netLiability = totalOutputGst - totalInputGst;

    return {
        outputGst: {
            total: totalOutputGst,
            cgst: totalOutputCgst,
            sgst: totalOutputSgst,
            igst: totalOutputIgst
        },
        inputGst: {
            total: totalInputGst,
            cgst: totalInputCgst,
            sgst: totalInputSgst,
            igst: totalInputIgst
        },
        netLiability
    };
};
