import express from 'express';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import CompanySettings from '../models/CompanySettings.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// @desc    Get Invoice Data publicly for sharing
// @route   GET /api/public/invoices/:token
// @access  Public
router.get('/invoices/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const invoice = await Invoice.findOne({ shareToken: token })
            .populate('customerId', 'companyName email phone billingAddress gstNumber gstin stateCode')
            .populate('lineItems.itemId');
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        
        // Track stats safely
        invoice.viewCount = (invoice.viewCount || 0) + 1;
        invoice.lastViewedAt = new Date();
        await invoice.save();

        const legacyItems = await mongoose.model('InvoiceItem').find({ invoiceId: invoice._id }).populate('itemId');
        
        // Fetch company-scoped settings for proper tenant branding (logo, currency, name)
        const settings = await CompanySettings.findOne({ companyId: invoice.companyId });

        const invoiceObj = invoice.toObject ? invoice.toObject() : invoice;
        const unifiedItems = (invoiceObj.lineItems && invoiceObj.lineItems.length > 0)
          ? invoiceObj.lineItems.map(item => ({
              itemId: item.itemId,
              name: item.name || (item.itemId ? item.itemId.name : 'Item'),
              hsnCode: item.hsnCode || (item.itemId ? item.itemId.hsnCode : ''),
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount || (item.quantity * item.rate),
              gstPercentage: item.gstPercent ?? item.gstPercentage ?? 0,
              gstPercent: item.gstPercent ?? item.gstPercentage ?? 0,
              discountPercent: item.discountPercent ?? 0,
            }))
          : legacyItems.map(item => ({
              ...item,
              gstPercent: item.gstPercentage ?? item.gstPercent ?? 0,
              gstPercentage: item.gstPercentage ?? item.gstPercent ?? 0,
            }));

        // Clean internal IDs or company secrets before sending to public view
        res.json({ success: true, data: { invoice: { ...invoiceObj, items: unifiedItems }, settings } });
    } catch (error) {
        console.error('Error fetching public invoice:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Download invoice PDF publicly
// @route   GET /api/public/invoices/:token/download
// @access  Public
router.get('/invoices/:token/download', async (req, res) => {
    try {
        const token = req.params.token;
        const invoice = await Invoice.findOne({ shareToken: token });
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        const { template = 'modern', color = '#2563eb' } = req.query;
        const templateName = template || 'modern';
        const colorClean = (color || '#2563eb').replace('#', '');
        const sanitizedInvoiceNumber = invoice.invoiceNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
        const filePath = path.join(process.cwd(), 'uploads', 'invoices', `${invoice._id}-${sanitizedInvoiceNumber}-${templateName}-${colorClean}.pdf`);

        const customer = await mongoose.model('Customer').findById(invoice.customerId);
        const items = await mongoose.model('InvoiceItem').find({ invoiceId: invoice._id }).populate('itemId');
        
        const processedItems = (invoice.lineItems && invoice.lineItems.length > 0)
            ? invoice.lineItems.map(i => ({
                itemId: i.itemId?._id || i.itemId,
                name: i.name || 'Item',
                quantity: i.quantity,
                rate: i.rate,
                amount: i.amount || (i.quantity * i.rate),
                gstPercentage: i.gstPercent ?? i.gstPercentage ?? 0,
              }))
            : items.map(i => ({
                itemId: i.itemId?._id || i.itemId,
                name: i.name || 'Item',
                quantity: i.quantity,
                rate: i.rate,
                amount: i.amount,
                gstPercentage: i.gstPercentage ?? i.gstPercent ?? 0,
              }));

        // Scoped settings fetch
        const settings = await CompanySettings.findOne({ companyId: invoice.companyId });
        if (customer && settings) {
            const settingsObj = settings.toObject ? settings.toObject() : settings;
            const filteredSettings = {
                ...settingsObj,
                bankDetails: invoice.includeBankDetails !== false ? settingsObj.bankDetails : null,
                upiId: invoice.includeUpiQr !== false ? settingsObj.upiId : null,
                upiQrUrl: invoice.includeUpiQr !== false ? settingsObj.upiQrUrl : null,
            };
            await generateInvoicePDF(invoice, customer, processedItems, filteredSettings, template, color, filePath);
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'PDF not found and could not be generated' });
        }

        res.download(filePath);
    } catch (error) {
        console.error('Error downloading public invoice:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// @desc    Get Quotation Data publicly for sharing
router.get('/quotations/:id', async (req, res) => {
    try {
        const Quotation = mongoose.model('Quotation');
        const quotation = await Quotation.findById(req.params.id).populate('customerId');
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
        const settings = await CompanySettings.findOne({ companyId: quotation.companyId });
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
        const settings = await CompanySettings.findOne({ companyId: order.companyId });
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
        const settings = await CompanySettings.findOne({ companyId: challan.companyId });
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
        const settings = await CompanySettings.findOne({ companyId: bill.companyId });
        res.json({ success: true, data: { bill, settings } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
