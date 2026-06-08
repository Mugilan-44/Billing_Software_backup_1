import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Challan from '../models/Challan.js';
import Item from '../models/Item.js';
import Customer from '../models/Customer.js';
import CompanySettings from '../models/CompanySettings.js';
import { findDocument } from '../utils/tenant.utils.js';
import { getNextCustomSequence } from '../utils/counter.utils.js';
import { calculateInvoice } from '../utils/calculateInvoice.js';
import { generateChallanPDF } from '../utils/pdfGenerator.js';
import { uploadPdfToCloudinary, sendSmtpEmail } from '../utils/emailService.js';

const applyChallanCalculations = async (req) => {
    const customer = await findDocument(Customer, req.body.customerId, req.user);
    if (!customer) {
        throw new Error('Customer not found');
    }
    
    const settings = await CompanySettings.findOne({ companyId: req.user.companyId || null });
    
    const companyStateCode = settings?.stateCode || (settings?.gstin ? settings.gstin.substring(0, 2) : null);
    const customerStateCode = customer?.stateCode || (customer?.gstNumber ? customer.gstNumber.substring(0, 2) : null);
    
    const calculated = calculateInvoice({
        lineItems: req.body.items || [],
        companyStateCode,
        customerStateCode,
        taxType: req.body.taxType || 'GST',
        taxRate: req.body.taxRate !== undefined ? req.body.taxRate : null,
        isTaxed: req.body.isTaxed !== false,
        useProductSpecificTax: req.body.useProductSpecificTax !== false,
        tdsTcsType: req.body.tdsTcsType || 'None',
        tdsPercentage: req.body.tdsPercentage || 0,
        tcsPercentage: req.body.tcsPercentage || 0
    });
    
    req.body.items = calculated.lineItems;
    req.body.subtotal = calculated.subtotal.toNumber();
    req.body.discountAmount = calculated.discountAmount.toNumber();
    req.body.taxAmount = calculated.taxAmount.toNumber();
    req.body.cgst = calculated.cgst.toNumber();
    req.body.sgst = calculated.sgst.toNumber();
    req.body.igst = calculated.igst.toNumber();
    req.body.isTaxed = req.body.isTaxed !== false;
    req.body.taxType = req.body.taxType || 'GST';
    req.body.taxRate = req.body.taxRate !== undefined ? req.body.taxRate : null;
    req.body.useProductSpecificTax = req.body.useProductSpecificTax !== false;
    req.body.tdsTcsType = req.body.tdsTcsType || 'None';
    req.body.tdsPercentage = req.body.tdsPercentage || 0;
    req.body.tdsAmount = calculated.tdsAmount.toNumber();
    req.body.tcsPercentage = req.body.tcsPercentage || 0;
    req.body.tcsAmount = calculated.tcsAmount.toNumber();
    req.body.grandTotal = calculated.grandTotal.toNumber();
};

export const createChallan = async (req, res) => {
    try {
        const taxMode = req.body.taxMode || 'WITH_TAX';
        if (!req.body.challanNumber) {
            const challanNumber = await getNextCustomSequence(req.user.companyId, 'challan', taxMode);
            req.body.challanNumber = challanNumber;
        }

        if (req.user.role !== 'SUPER_ADMIN') {
            req.body.companyId = req.user.companyId;
            req.body.branchId = req.user.branchId;
        }

        // Deduct Stock — with negative stock guard
        for (const i of req.body.items || []) {
            const dbItem = await findDocument(Item, i.itemId, req.user);
            if (dbItem && dbItem.type === 'Goods') {
                if (dbItem.stockQuantity < i.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for item '${dbItem.name}'. Available: ${dbItem.stockQuantity}, Requested: ${i.quantity}`,
                    });
                }
                dbItem.stockQuantity -= i.quantity;
                await dbItem.save();
            }
        }

        // Apply pricing calculations
        await applyChallanCalculations(req);

        const challan = new Challan({ ...req.body, taxMode });
        await challan.save();

        res.status(201).json({ success: true, data: challan });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'This Delivery Challan Number already exists. Please choose a unique one.' });
        }
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getChallans = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        }
        if (req.query.taxMode) {
            query.taxMode = req.query.taxMode;
        }
        const challans = await Challan.find(query).populate('customerId', 'companyName');
        res.json({ success: true, count: challans.length, data: challans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getChallanById = async (req, res) => {
    try {
        const challan = await findDocument(Challan, req.params.id, req.user);
        if (!challan) return res.status(404).json({ success: false, message: 'Challan not found' });
        await Challan.populate(challan, { path: 'customerId' });
        res.json({ success: true, data: challan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateChallanStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const challan = await findDocument(Challan, req.params.id, req.user);
        if (!challan) return res.status(404).json({ success: false, message: 'Challan not found' });
        challan.status = status;
        await challan.save();
        res.json({ success: true, data: challan });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateChallan = async (req, res) => {
    try {
        const challan = await findDocument(Challan, req.params.id, req.user);
        if (!challan) return res.status(404).json({ success: false, message: 'Challan not found' });

        // Restore old stock first
        for (const i of challan.items) {
            const dbItem = await findDocument(Item, i.itemId, req.user);
            if (dbItem && dbItem.type === 'Goods') {
                dbItem.stockQuantity += i.quantity;
                if (dbItem.availableStock !== undefined) {
                    dbItem.availableStock += i.quantity;
                }
                await dbItem.save();
            }
        }

        // Deduct new stock with negative guard
        const newItems = req.body.items || [];
        for (const i of newItems) {
            const dbItem = await findDocument(Item, i.itemId, req.user);
            if (dbItem && dbItem.type === 'Goods') {
                if (dbItem.stockQuantity < i.quantity) {
                    // Rollback previously restored items (re-deduct them)
                    for (const prev of challan.items) {
                        const prevDbItem = await findDocument(Item, prev.itemId, req.user);
                        if (prevDbItem && prevDbItem.type === 'Goods') {
                            prevDbItem.stockQuantity -= prev.quantity;
                            if (prevDbItem.availableStock !== undefined) {
                                prevDbItem.availableStock -= prev.quantity;
                            }
                            await prevDbItem.save();
                        }
                    }
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for item '${dbItem.name}'. Available: ${dbItem.stockQuantity}, Requested: ${i.quantity}`,
                    });
                }
                dbItem.stockQuantity -= i.quantity;
                if (dbItem.availableStock !== undefined) {
                    dbItem.availableStock -= i.quantity;
                }
                await dbItem.save();
            }
        }

        // Apply pricing calculations to request body
        await applyChallanCalculations(req);

        // Update other fields
        const { customerId, date, transportDetails, items, status, notes, challanNumber, challanType, termsAndConditions,
                includeTerms, includeSignature, includeBankDetails, includeUpiQr } = req.body;
        if (customerId) challan.customerId = customerId;
        if (date) challan.date = date;
        if (transportDetails) challan.transportDetails = transportDetails;
        if (items) challan.items = req.body.items;
        if (status) challan.status = status;
        if (notes !== undefined) challan.notes = notes;
        if (challanNumber) challan.challanNumber = challanNumber;
        if (challanType) challan.challanType = challanType;
        if (termsAndConditions !== undefined) challan.termsAndConditions = termsAndConditions;
        if (includeTerms !== undefined) challan.includeTerms = includeTerms;
        if (includeSignature !== undefined) challan.includeSignature = includeSignature;
        if (includeBankDetails !== undefined) challan.includeBankDetails = includeBankDetails;
        if (includeUpiQr !== undefined) challan.includeUpiQr = includeUpiQr;

        // Apply top level calculations
        challan.subtotal = req.body.subtotal;
        challan.discountAmount = req.body.discountAmount;
        challan.taxAmount = req.body.taxAmount;
        challan.cgst = req.body.cgst;
        challan.sgst = req.body.sgst;
        challan.igst = req.body.igst;
        challan.isTaxed = req.body.isTaxed;
        challan.taxType = req.body.taxType;
        challan.taxRate = req.body.taxRate;
        challan.useProductSpecificTax = req.body.useProductSpecificTax;
        challan.tdsTcsType = req.body.tdsTcsType;
        challan.tdsPercentage = req.body.tdsPercentage;
        challan.tdsAmount = req.body.tdsAmount;
        challan.tcsPercentage = req.body.tcsPercentage;
        challan.tcsAmount = req.body.tcsAmount;
        challan.grandTotal = req.body.grandTotal;

        await challan.save();
        res.json({ success: true, data: challan });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const downloadChallanPdf = async (req, res) => {
  try {
    const challan = await findDocument(Challan, req.params.id, req.user);
    if (!challan) return res.status(404).json({ success: false, message: 'Challan not found' });

    const { template = 'modern', color = '#2563eb' } = req.query;
    const templateName = template || 'modern';
    const colorClean = (color || '#2563eb').replace('#', '');
    const sanitizedChallanNumber = challan.challanNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'challans');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, `${challan._id}-${sanitizedChallanNumber}-${templateName}-${colorClean}.pdf`);

    const customer = await Customer.findById(challan.customerId);
    const processedItems = challan.items.map(i => ({
      itemId: i.itemId?._id || i.itemId,
      name: i.name || 'Item',
      description: i.description || '',
      quantity: i.quantity,
      rate: i.rate,
      amount: i.amount || (i.quantity * i.rate),
      gstPercentage: i.gstPercent ?? i.gstPercentage ?? 0,
    }));

    const settings = await CompanySettings.findOne({ companyId: challan.companyId });
    if (customer && settings) {
      const settingsObj = settings.toObject ? settings.toObject() : settings;
      const filteredSettings = {
        ...settingsObj,
        bankDetails: challan.includeBankDetails !== false ? settingsObj.bankDetails : null,
        upiId: challan.includeUpiQr !== false ? settingsObj.upiId : null,
        upiQrUrl: challan.includeUpiQr !== false ? settingsObj.upiQrUrl : null,
      };
      await generateChallanPDF(challan, customer, processedItems, filteredSettings, template, color, filePath);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'PDF not found and could not be generated' });
    }

    res.download(filePath);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendChallan = async (req, res) => {
  try {
    const challan = await findDocument(Challan, req.params.id, req.user);
    if (!challan) return res.status(404).json({ success: false, message: 'Challan not found' });

    const { template = 'modern', color = '#2563eb' } = req.query;
    const templateName = template || 'modern';
    const colorClean = (color || '#2563eb').replace('#', '');
    const sanitizedChallanNumber = challan.challanNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'challans');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, `${challan._id}-${sanitizedChallanNumber}-${templateName}-${colorClean}.pdf`);

    const customer = await Customer.findById(challan.customerId);
    if (!customer) throw new Error('Customer not found');
    if (!customer.email) {
      return res.status(400).json({ success: false, message: 'Customer has no email address configured' });
    }

    const settings = await CompanySettings.findOne({ companyId: challan.companyId });
    if (!settings) throw new Error('Company settings not found');

    const processedItems = challan.items.map(i => ({
      itemId: i.itemId?._id || i.itemId,
      name: i.name || 'Item',
      description: i.description || '',
      quantity: i.quantity,
      rate: i.rate,
      amount: i.amount || (i.quantity * i.rate),
      gstPercentage: i.gstPercent ?? i.gstPercentage ?? 0,
    }));

    const settingsObj = settings.toObject ? settings.toObject() : settings;
    const filteredSettings = {
      ...settingsObj,
      bankDetails: challan.includeBankDetails !== false ? settingsObj.bankDetails : null,
      upiId: challan.includeUpiQr !== false ? settingsObj.upiId : null,
      upiQrUrl: challan.includeUpiQr !== false ? settingsObj.upiQrUrl : null,
    };

    await generateChallanPDF(challan, customer, processedItems, filteredSettings, template, color, filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error('PDF file generation failed');
    }

    let cloudinaryUrl;
    try {
      cloudinaryUrl = await uploadPdfToCloudinary(
        filePath,
        `${challan._id}-${sanitizedChallanNumber}-${templateName}-${colorClean}`
      );
    } catch (uploadErr) {
      return res.status(400).json({
        success: false,
        message: `Cloudinary upload failed: ${uploadErr.message}`
      });
    }

    const emailSubject = `Delivery Challan ${challan.challanNumber} from ${settings.companyName || 'Our Company'}`;
    const emailBody = `
      <p>Dear ${customer.name || 'Customer'},</p>
      <p>Please find attached the delivery challan <strong>${challan.challanNumber}</strong>.</p>
      <p>Total Amount: <strong>${settings.currency?.symbol || 'INR'} ${challan.grandTotal}</strong></p>
      <p>Thank you for your business!</p>
    `;

    await sendSmtpEmail({
      to: customer.email,
      subject: emailSubject,
      html: emailBody,
      attachmentUrl: cloudinaryUrl,
      attachmentName: `${challan.challanNumber}.pdf`
    });

    res.json({ success: true, message: 'Challan sent successfully via email' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteChallan = async (req, res) => {
    try {
        const challan = await findDocument(Challan, req.params.id, req.user);
        if (!challan) return res.status(404).json({ success: false, message: 'Challan not found' });

        // Restore stock
        for (const i of challan.items) {
            const dbItem = await findDocument(Item, i.itemId, req.user);
            if (dbItem && dbItem.type === 'Goods') {
                dbItem.stockQuantity += i.quantity;
                if (dbItem.availableStock !== undefined) {
                    dbItem.availableStock += i.quantity;
                }
                await dbItem.save();
            }
        }

        await challan.deleteOne();
        res.json({ success: true, message: 'Challan deleted successfully and stock restored' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
