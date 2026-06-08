import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import CompanySettings from '../models/CompanySettings.js';

export const recordPayment = async (req, res) => {
    try {
        const {
            customerId,
            invoiceId,
            amount,
            paymentMode,
            referenceNumber,
            paymentDate,
            notes
        } = req.body;

        // Validate customer
        const customer = await Customer.findById(customerId);
        if (!customer) throw new Error('Customer not found');

        // Generate Payment Number with FY Logic
        const settings = await CompanySettings.findOne();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const fyString = currentMonth >= 3
            ? `${currentYear.toString().slice(-2)}-${(currentYear + 1).toString().slice(-2)}`
            : `${(currentYear - 1).toString().slice(-2)}-${currentYear.toString().slice(-2)}`;

        const count = await Payment.countDocuments();
        const paymentNumber = `${settings?.paymentPrefix || 'PAY-'}${fyString}-${(count + 1).toString().padStart(4, '0')}`;

        const paymentDoc = {
            paymentNumber,
            customerId,
            invoiceId,
            amount,
            paymentMode,
            referenceNumber,
            paymentDate,
            notes,
        };

        if (req.user.role === 'ADMIN') {
            paymentDoc.companyId = req.user.companyId;
            paymentDoc.branchId = req.user.branchId;
        }

        const payment = new Payment(paymentDoc);

        await payment.save();

        // Update Invoice if linked
        if (invoiceId) {
            const invoice = await Invoice.findById(invoiceId);
            if (!invoice) throw new Error('Invoice not found');

            const pendingAmount = invoice.grandTotal - invoice.amountPaid;
            if (amount > pendingAmount) throw new Error(`Payment amount (${amount}) exceeds pending invoice amount (${pendingAmount})`);

            invoice.amountPaid += amount;

            if (invoice.amountPaid >= invoice.grandTotal) {
                invoice.status = 'Paid';
            } else {
                invoice.status = 'Partially Paid';
            }
            await invoice.save();
        }

        // Update Customer Outstanding
        customer.outstandingBalance -= amount;
        await customer.save();

        // Create Ledger Entry
        const ledgerEntry = new LedgerEntry({
            customerId,
            type: 'Payment',
            referenceId: payment._id,
            description: `Payment Received (Ref: ${referenceNumber || paymentNumber})`,
            credit: amount,
            balance: customer.outstandingBalance
        });
        await ledgerEntry.save();

        res.status(201).json({ success: true, data: payment });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getPayments = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        } else if (req.user.role === 'CUSTOMER') {
            query.customerId = req.user.customerId;
        }
        const payments = await Payment.find(query)
            .populate('customerId', 'companyName')
            .populate('invoiceId', 'invoiceNumber');
        res.json({ success: true, count: payments.length, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
