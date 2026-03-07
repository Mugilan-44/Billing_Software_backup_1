import express from 'express';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import CompanySettings from '../models/CompanySettings.js';

const router = express.Router();

// @desc    Get Invoice Data publicly for sharing
// @route   GET /api/public/invoices/:id
// @access  Public
router.get('/invoices/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate('customerId', 'companyName email phone billingAddress gstNumber');
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        const items = await mongoose.model('InvoiceItem').find({ invoiceId: invoice._id }).populate('itemId', 'name hsnCode gstPercentage');
        const settings = await CompanySettings.findOne();
        res.json({ success: true, data: { invoice: { ...invoice._doc, items }, settings } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get Quotation Data publicly for sharing
router.get('/quotations/:id', async (req, res) => {
    try {
        const Quotation = mongoose.model('Quotation');
        const quotation = await Quotation.findById(req.params.id).populate('customerId');
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
        const settings = await CompanySettings.findOne();
        res.json({ success: true, data: { quotation, settings } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get Sales Order Data publicly for sharing
router.get('/orders/:id', async (req, res) => {
    try {
        const SalesOrder = mongoose.model('SalesOrder');
        const order = await SalesOrder.findById(req.params.id).populate('customerId');
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        const settings = await CompanySettings.findOne();
        res.json({ success: true, data: { order, settings } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get Delivery Challan Data publicly for sharing
router.get('/challans/:id', async (req, res) => {
    try {
        const Challan = mongoose.model('Challan');
        const challan = await Challan.findById(req.params.id).populate('customerId');
        if (!challan) return res.status(404).json({ success: false, message: 'Challan not found' });
        const settings = await CompanySettings.findOne();
        res.json({ success: true, data: { challan, settings } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get Purchase Bill Data publicly for sharing
router.get('/purchase-bills/:id', async (req, res) => {
    try {
        const PurchaseBill = mongoose.model('PurchaseBill');
        const bill = await PurchaseBill.findById(req.params.id).populate('vendorId');
        if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
        const settings = await CompanySettings.findOne();
        res.json({ success: true, data: { bill, settings } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
