import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Challan from '../models/Challan.js';
import fs from 'fs';
import path from 'path';
import InvoiceItem from '../models/InvoiceItem.js';
import Customer from '../models/Customer.js';
import Item from '../models/Item.js';
import LedgerEntry from '../models/LedgerEntry.js';
import CompanySettings from '../models/CompanySettings.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
export const createInvoice = async (req, res) => {
    try {
        const {
            customerId,
            transportDetails,
            items,
            discount = 0,
            notes,
            challanId,
            dueDate,
            date,
            status,
        } = req.body;

        // Validate customer
        const customer = await Customer.findById(customerId);
        if (!customer) throw new Error('Customer not found');

        // Get Company Settings for Prefix and State Tax comparison
        const settings = await CompanySettings.findOne();
        if (!settings) throw new Error('Company settings not found. Please configure them first.');

        const companyState = settings.address?.state?.toLowerCase().trim();
        const customerState = customer.billingAddress?.state?.toLowerCase().trim();
        const isInterState = companyState && customerState && companyState !== customerState;

        // Process items & calculate totals
        let subTotal = 0;
        let totalTax = 0;
        let cgst = 0, sgst = 0, igst = 0;
        const processedItems = [];

        for (const i of items) {
            const dbItem = await Item.findById(i.itemId);
            if (!dbItem) throw new Error(`Item not found: ${i.itemId}`);

            const amount = i.quantity * i.rate;
            const taxAmount = amount * (dbItem.gstPercentage / 100);

            subTotal += amount;
            totalTax += taxAmount;

            if (isInterState) {
                igst += taxAmount;
            } else {
                cgst += taxAmount / 2;
                sgst += taxAmount / 2;
            }

            processedItems.push({
                itemId: dbItem._id,
                name: dbItem.name,
                quantity: i.quantity,
                rate: i.rate,
                amount,
                gstPercentage: dbItem.gstPercentage
            });

            // Reduce stock only if NOT from a challan (challan already deducted it)
            if (dbItem.type === 'Goods' && !challanId) {
                dbItem.stockQuantity -= i.quantity;
                await dbItem.save();
            }
        }

        const grandTotal = Math.round(subTotal + totalTax - discount);
        const roundOff = grandTotal - (subTotal + totalTax - discount);

        // Generate Invoice Number with FY logic if not provided by frontend
        let invoiceNumber = req.body.invoiceNumber;

        if (!invoiceNumber) {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            const fyString = currentMonth >= 3
                ? `${currentYear.toString().slice(-2)}-${(currentYear + 1).toString().slice(-2)}`
                : `${(currentYear - 1).toString().slice(-2)}-${currentYear.toString().slice(-2)}`;

            const count = await Invoice.countDocuments();
            invoiceNumber = `${settings.invoicePrefix || 'INV-'}${fyString}-${(count + 1).toString().padStart(4, '0')}`;
        }

        // 1. Save Invoice
        const invoicePayload = {
            invoiceNumber,
            customerId,
            transportDetails,
            subTotal,
            discount,
            taxTotal: { cgst, sgst, igst, totalTax },
            roundOff,
            grandTotal,
            notes,
            dueDate,
        };

        if (date) invoicePayload.date = date;
        if (status) invoicePayload.status = status;

        if (req.user.role === 'ADMIN') {
            invoicePayload.companyId = req.user.companyId;
            invoicePayload.branchId = req.user.branchId;
        }

        const invoice = new Invoice(invoicePayload);

        await invoice.save();

        // 2. Save Invoice Items
        const invoiceItemsDocs = processedItems.map(p => ({
            ...p,
            invoiceId: invoice._id
        }));
        await InvoiceItem.insertMany(invoiceItemsDocs);

        // 3. Update Customer Outstanding
        customer.outstandingBalance += grandTotal;
        await customer.save();

        // 4. Create Ledger Entry
        const ledgerEntry = new LedgerEntry({
            customerId,
            type: 'Invoice',
            referenceId: invoice._id,
            description: `Invoice ${invoiceNumber}`,
            debit: grandTotal,
            balance: customer.outstandingBalance
        });
        await ledgerEntry.save();

        // 5. Generate PDF
        await generateInvoicePDF(invoice, customer, processedItems, settings);

        // 6. Update Challan if converted
        if (challanId) {
            await Challan.findByIdAndUpdate(challanId, {
                status: 'Converted',
                invoiceId: invoice._id
            });
        }

        res.status(201).json({ success: true, data: invoice });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        } else if (req.user.role === 'CUSTOMER') {
            query.customerId = req.user.customerId;
        }
        const invoices = await Invoice.find(query).populate('customerId', 'companyName email');
        res.json({ success: true, count: invoices.length, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate('customerId');
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        const items = await InvoiceItem.find({ invoiceId: invoice._id });

        res.json({ success: true, data: { ...invoice._doc, items } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Download invoice PDF
// @route   GET /api/invoices/:id/download
// @access  Private
export const downloadInvoicePdf = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        const filePath = path.join(process.cwd(), 'uploads', 'invoices', `${invoice.invoiceNumber}.pdf`);

        if (!fs.existsSync(filePath)) {
            console.log(`PDF not found for Invoice ${invoice.invoiceNumber}, regenerating...`);
            const customer = await Customer.findById(invoice.customerId);
            const items = await InvoiceItem.find({ invoiceId: invoice._id }).populate('itemId');
            const processedItems = items.map(i => ({
                itemId: i.itemId?._id,
                name: i.name || (i.itemId ? i.itemId.name : 'Unknown Item'),
                quantity: i.quantity,
                rate: i.rate,
                amount: i.amount,
                gstPercentage: i.gstPercentage
            }));
            const settings = await CompanySettings.findOne();

            if (customer && settings) {
                await generateInvoicePDF(invoice, customer, processedItems, settings);
            }
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'PDF document not found and could not be generated' });
        }

        res.download(filePath);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update an invoice
// @route   PUT /api/invoices/:id
// @access  Private
export const updateInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            customerId,
            transportDetails,
            items,
            discount = 0,
            notes,
            termsAndConditions,
            status
        } = req.body;

        const invoice = await Invoice.findById(id);
        if (!invoice) throw new Error('Invoice not found');

        const oldGrandTotal = invoice.grandTotal;

        const customer = await Customer.findById(customerId);
        if (!customer) throw new Error('Customer not found');

        const settings = await CompanySettings.findOne();
        const companyState = settings?.address?.state?.toLowerCase().trim();
        const customerState = customer.billingAddress?.state?.toLowerCase().trim();
        const isInterState = companyState && customerState && companyState !== customerState;

        let subTotal = 0;
        let totalTax = 0;
        let cgst = 0, sgst = 0, igst = 0;
        const processedItems = [];

        // First, revert old stock changes (assuming Goods were deducted on creation).
        // Since we don't know the exact previous items' types easily without querying, we will fetch old items.
        const oldItems = await InvoiceItem.find({ invoiceId: invoice._id });
        for (const oldItem of oldItems) {
            const dItem = await Item.findById(oldItem.itemId);
            if (dItem && dItem.type === 'Goods') {
                dItem.stockQuantity += oldItem.quantity;
                await dItem.save();
            }
        }

        for (const i of items) {
            const dbItem = await Item.findById(i.itemId);
            if (!dbItem) throw new Error(`Item not found: ${i.itemId}`);

            const amount = i.quantity * i.rate;
            const taxAmount = amount * (dbItem.gstPercentage / 100);

            subTotal += amount;
            totalTax += taxAmount;

            if (isInterState) {
                igst += taxAmount;
            } else {
                cgst += taxAmount / 2;
                sgst += taxAmount / 2;
            }

            processedItems.push({
                itemId: dbItem._id,
                name: dbItem.name,
                quantity: i.quantity,
                rate: i.rate,
                amount,
                gstPercentage: dbItem.gstPercentage,
                invoiceId: invoice._id
            });

            if (dbItem.type === 'Goods') {
                dbItem.stockQuantity -= i.quantity;
                await dbItem.save();
            }
        }

        const grandTotal = Math.round(subTotal + totalTax - discount);
        const roundOff = grandTotal - (subTotal + totalTax - discount);

        invoice.customerId = customerId;
        invoice.transportDetails = transportDetails;
        invoice.subTotal = subTotal;
        invoice.discount = discount;
        invoice.taxTotal = { cgst, sgst, igst, totalTax };
        invoice.roundOff = roundOff;
        invoice.grandTotal = grandTotal;
        invoice.notes = notes;
        invoice.termsAndConditions = termsAndConditions;
        if (status) invoice.status = status;

        await invoice.save();

        // Delete old items and insert new
        await InvoiceItem.deleteMany({ invoiceId: invoice._id });
        await InvoiceItem.insertMany(processedItems);

        // Adjust customer outstanding balance
        const difference = grandTotal - oldGrandTotal;
        customer.outstandingBalance += difference;
        await customer.save();

        // Regenerate PDF
        if (settings) {
            await generateInvoicePDF(invoice, customer, processedItems, settings);
        }

        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
