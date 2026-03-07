import Quotation from '../models/Quotation.js';
import Customer from '../models/Customer.js';

export const getQuotations = async (req, res) => {
    try {
        let query = req.user.role === 'Sales' ? { 'items.name': { $exists: true } } : {};
        if (req.user.role === 'ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        } else if (req.user.role === 'CUSTOMER') {
            query.customerId = req.user.customerId;
        }
        const quotations = await Quotation.find(query).populate('customerId', 'companyName email phone').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: quotations.length, data: quotations });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const getQuotationById = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id).populate('customerId', 'companyName email phone billingAddress');
        if (!quotation) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }
        res.status(200).json({ success: true, data: quotation });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const createQuotation = async (req, res) => {
    try {
        const {
            customerId, items, discount, validityDate,
            quoteDate, referenceNumber, salesperson, projectName, subject, adjustment,
            tdsPercentage, tdsAmount,
            notes, termsAndConditions
        } = req.body;

        // Calculate totals
        let subTotal = 0;
        let taxTotal = 0;

        items.forEach(item => {
            const amount = item.quantity * item.rate;
            const tax = amount * (item.gstPercentage / 100);
            subTotal += amount;
            taxTotal += tax;
        });

        const grandTotal = Math.round(subTotal + taxTotal - (Number(discount) || 0) - (Number(tdsAmount) || 0) + (Number(adjustment) || 0));

        // Generate Quote number (e.g., QT-YYYY-XXXX)
        const year = new Date().getFullYear();
        const count = await Quotation.countDocuments();
        const quoteNumber = `QT-${year}-${String(count + 1).padStart(4, '0')}`;

        const processedItems = items; // Assuming items from req.body are already processed or this is a placeholder

        const quotationPayload = {
            quoteNumber,
            customerId,
            items: processedItems,
            validityDate,
            quoteDate,
            referenceNumber,
            salesperson,
            projectName,
            subject,
            discount: Number(discount) || 0,
            tdsPercentage: Number(tdsPercentage) || 0,
            tdsAmount: Number(tdsAmount) || 0,
            adjustment: Number(adjustment) || 0,
            subTotal,
            taxTotal,
            grandTotal,
            notes,
            termsAndConditions
        };

        if (req.user.role === 'ADMIN') {
            quotationPayload.companyId = req.user.companyId;
            quotationPayload.branchId = req.user.branchId;
        }

        const quotation = await Quotation.create(quotationPayload);

        res.status(201).json({ success: true, data: quotation });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const updateQuotationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const quotation = await Quotation.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });

        if (!quotation) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        res.status(200).json({ success: true, data: quotation });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const deleteQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        await quotation.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
