import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';
import Customer from '../models/Customer.js';
import PurchaseBill from '../models/PurchaseBill.js';

export const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = { status: { $ne: 'Draft' } };

        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const invoices = await Invoice.find(query)
            .populate('customerId', 'companyName gstNumber')
            .sort({ createdAt: -1 });

        const reportData = invoices.map(inv => ({
            date: inv.createdAt.toISOString().split('T')[0],
            invoiceNumber: inv.invoiceNumber,
            customer: inv.customerId?.companyName,
            gstin: inv.customerId?.gstNumber || 'URD',
            subTotal: inv.subTotal,
            taxTotal: inv.taxTotal.totalTax,
            discount: inv.discount,
            grandTotal: inv.grandTotal,
            status: inv.status
        }));

        res.json({ success: true, data: reportData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getGSTReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = { status: { $ne: 'Draft' } };

        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const invoices = await Invoice.find(query)
            .populate('customerId', 'companyName gstNumber state')
            .sort({ createdAt: -1 });

        const reportData = invoices.map(inv => ({
            date: inv.createdAt.toISOString().split('T')[0],
            invoiceNumber: inv.invoiceNumber,
            customer: inv.customerId?.companyName,
            gstin: inv.customerId?.gstNumber || 'URD',
            taxableValue: inv.subTotal,
            cgst: inv.taxTotal.cgst,
            sgst: inv.taxTotal.sgst,
            igst: inv.taxTotal.igst,
            totalTax: inv.taxTotal.totalTax,
            invoiceValue: inv.grandTotal
        }));

        res.json({ success: true, data: reportData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getOutstandingAgingReport = async (req, res) => {
    try {
        const customers = await Customer.find({ outstandingBalance: { $gt: 0 } });
        const now = new Date();

        // This is a simplified proxy: we just get the customer balance and we bucket it based on their oldest unpaid invoice
        // For accurate aging, we should aggregate over unpaid invoices.

        const unpaidInvoices = await Invoice.aggregate([
            { $match: { status: { $in: ['Sent', 'Partially Paid', 'Overdue'] } } },
            {
                $project: {
                    customerId: 1,
                    pendingAmount: { $subtract: ["$grandTotal", "$amountPaid"] },
                    ageInDays: {
                        $divide: [{ $subtract: [now, "$createdAt"] }, 1000 * 60 * 60 * 24]
                    }
                }
            }
        ]);

        const agingMap = {};

        unpaidInvoices.forEach(inv => {
            const cid = inv.customerId.toString();
            if (!agingMap[cid]) {
                agingMap[cid] = { "0-15": 0, "16-30": 0, "30+": 0, total: 0 };
            }
            if (inv.ageInDays <= 15) agingMap[cid]["0-15"] += inv.pendingAmount;
            else if (inv.ageInDays <= 30) agingMap[cid]["16-30"] += inv.pendingAmount;
            else agingMap[cid]["30+"] += inv.pendingAmount;

            agingMap[cid].total += inv.pendingAmount;
        });

        const reportData = customers.map(c => {
            const aging = agingMap[c._id.toString()] || { "0-15": c.outstandingBalance, "16-30": 0, "30+": 0, total: c.outstandingBalance };
            return {
                customer: c.companyName,
                phone: c.phone || 'N/A',
                "0-15_Days": aging["0-15"],
                "16-30_Days": aging["16-30"],
                "Above_30_Days": aging["30+"],
                totalOutstanding: aging.total > 0 ? aging.total : c.outstandingBalance // fallback
            };
        });

        res.json({ success: true, data: reportData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getGstSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let queryInvoices = { status: { $ne: 'Draft' } };
        let queryBills = {};

        if (startDate && endDate) {
            queryInvoices.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
            queryBills.billDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const [invoices, bills] = await Promise.all([
            Invoice.find(queryInvoices).populate('customerId', 'companyName gstNumber').sort({ createdAt: -1 }),
            PurchaseBill.find(queryBills).populate('vendorId', 'companyName gstNumber').sort({ createdAt: -1 })
        ]);

        let totalOutputGst = 0;
        let totalInputGst = 0;

        const outputGstData = invoices.map(inv => {
            totalOutputGst += inv.taxTotal.totalTax;
            return {
                id: inv._id,
                date: inv.createdAt.toISOString().split('T')[0],
                transactionNumber: inv.invoiceNumber,
                partyName: inv.customerId?.companyName,
                gstin: inv.customerId?.gstNumber || 'URD',
                taxableValue: inv.subTotal,
                taxAmount: inv.taxTotal.totalTax,
                type: 'Output'
            };
        });

        const inputGstData = bills.map(bill => {
            totalInputGst += bill.taxTotal;
            return {
                id: bill._id,
                date: new Date(bill.billDate).toISOString().split('T')[0],
                transactionNumber: bill.billNumber,
                partyName: bill.vendorId?.companyName,
                gstin: bill.vendorId?.gstNumber || 'URD',
                taxableValue: bill.subTotal,
                taxAmount: bill.taxTotal,
                type: 'Input'
            };
        });

        res.json({
            success: true,
            data: {
                totalOutputGst,
                totalInputGst,
                netGstPayable: totalOutputGst - totalInputGst,
                transactions: [...outputGstData, ...inputGstData].sort((a, b) => new Date(b.date) - new Date(a.date)) // unified ledger array
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
