import CreditNote from '../models/CreditNote.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import mongoose from 'mongoose';

export const getCreditNotes = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        }
        const notes = await CreditNote.find(query)
            .populate('customerId', 'companyName')
            .populate('invoiceId', 'invoiceNumber subTotal grandTotal')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: notes.length, data: notes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const createCreditNote = async (req, res) => {
    try {
        const { invoiceId, customerId, reason, amount, date, notes } = req.body;

        const count = await CreditNote.countDocuments();
        const year = new Date().getFullYear();
        const cnNumber = `CN/${year}-${year + 1}/${(count + 1).toString().padStart(3, '0')}`;

        const notePayload = {
            cnNumber,
            invoiceId,
            customerId,
            reason,
            amount: Number(amount),
            date: date || Date.now(),
            notes
        };

        if (req.user.role === 'ADMIN') {
            notePayload.companyId = req.user.companyId;
            notePayload.branchId = req.user.branchId;
        }

        const note = await CreditNote.create(notePayload);

        // Update the invoice amount to reflect this credit mathematically
        // Wait, normally credit notes are stored separately for accounting rather than decreasing Invoice GrandTotal directly.
        // We will reduce Customer's overall Outstanding Balance via Ledgers when checking Dashboard. If user forces it we can do:
        const invoice = await Invoice.findById(invoiceId);
        if (invoice) {
            // we treat CN as amountPaid increment for the sake of simplicity or decrease GrandTotal. 
            // In SaaS, a CreditNote applies as "Payment" technically to that invoice if closed.
            invoice.amountPaid += Number(amount);

            if (invoice.amountPaid >= invoice.grandTotal) {
                invoice.status = 'Paid';
            } else if (invoice.amountPaid > 0) {
                invoice.status = 'Partially Paid';
            }
            await invoice.save();
        }

        res.status(201).json({ success: true, data: note });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteCreditNote = async (req, res) => {
    try {
        const note = await CreditNote.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ success: false, message: 'Credit Note not found' });
        }

        // Revert invoice amountPaid
        const invoice = await Invoice.findById(note.invoiceId);
        if (invoice) {
            invoice.amountPaid -= note.amount;
            if (invoice.amountPaid <= 0) {
                invoice.amountPaid = 0;
                invoice.status = 'Sent';
            } else if (invoice.amountPaid < invoice.grandTotal) {
                invoice.status = 'Partially Paid';
            }
            await invoice.save();
        }

        await note.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
