import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Quotation from '../models/Quotation.js';
import SalesOrder from '../models/SalesOrder.js';
import Customer from '../models/Customer.js';
import CompanySettings from '../models/CompanySettings.js';
import { computeInvoiceTotals } from '../utils/billing.utils.js';
import { getNextSequenceValue } from '../utils/counter.utils.js';
import { generateQuotationPDF } from '../utils/pdfGenerator.js';
import { findDocument } from '../utils/tenant.utils.js';
import { uploadPdfToCloudinary, sendSmtpEmail } from '../utils/emailService.js';

// @desc    Get all quotations
// @route   GET /api/quotations
// @access  Private
export const getQuotations = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'SUPER_ADMIN') {
      query.companyId = req.user.companyId;
      query.branchId  = req.user.branchId;
    } else if (req.user.role === 'CUSTOMER') {
      query.customerId = req.user.customerId;
    }
    if (req.query.taxMode) {
      query.taxMode = req.query.taxMode;
    }
    const quotations = await Quotation.find(query)
      .populate('customerId', 'companyName name email phone')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, count: quotations.length, data: quotations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single quotation
// @route   GET /api/quotations/:id
// @access  Private
export const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customerId', 'companyName name email phone billingAddress')
      .lean();
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    res.status(200).json({ success: true, data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create quotation
// @route   POST /api/quotations
// @access  Private
export const createQuotation = async (req, res) => {
  try {
    const {
      customerId, items, discount, validityDate,
      quoteDate, referenceNumber, salesperson, projectName, subject, adjustment,
      tdsPercentage = 0, tcsPercentage = 0, tdsTcsType = 'None', notes, termsAndConditions,
      includeTerms = true, includeSignature = false, includeBankDetails = true, includeUpiQr = true,
      isTaxed = true, taxType = 'GST', taxRate = null, useProductSpecificTax = true
    } = req.body;

    let subTotal = 0, taxTotal = 0;
    const computedItems = (items || []).map(item => {
      const amount = item.quantity * item.rate;
      const discountPercent = item.discountPercent || item.discount || 0;
      const discountAmt = amount * (discountPercent / 100);
      const itemSubtotal = amount - discountAmt;
      
      const itemTaxRate = isTaxed
        ? (useProductSpecificTax ? (item.gstPercentage || item.gstPercent || 0) : (taxRate !== null && taxRate !== undefined && taxRate !== '' ? Number(taxRate) : (item.gstPercentage || item.gstPercent || 0)))
        : 0;
      
      const itemTax = itemSubtotal * (itemTaxRate / 100);
      subTotal += itemSubtotal;
      taxTotal += itemTax;

      return {
        ...item,
        gstPercentage: itemTaxRate,
        gstPercent: itemTaxRate,
        amount: itemSubtotal + itemTax
      };
    });

    let calculatedTdsAmount = 0;
    let calculatedTcsAmount = 0;
    if (tdsTcsType === 'TDS') {
      calculatedTdsAmount = subTotal * (Number(tdsPercentage) / 100);
    } else if (tdsTcsType === 'TCS') {
      calculatedTcsAmount = subTotal * (Number(tcsPercentage) / 100);
    }

    const disc = Number(discount) || 0;
    const adj = Number(adjustment) || 0;
    const grandTotal = Math.round(subTotal + taxTotal - disc - calculatedTdsAmount + calculatedTcsAmount + adj);

    const quoteNumber = req.body.quoteNumber || undefined;
    const taxMode = req.body.taxMode || 'WITH_TAX';

    const quotationPayload = {
      quoteNumber, customerId, items: computedItems, lineItems: computedItems,
      validityDate, quoteDate, referenceNumber, salesperson,
      projectName, subject,
      discount: disc,
      tdsPercentage: Number(tdsPercentage) || 0,
      tdsAmount: calculatedTdsAmount,
      tcsPercentage: Number(tcsPercentage) || 0,
      tcsAmount: calculatedTcsAmount,
      tdsTcsType,
      adjustment: adj,
      subTotal, subtotal: subTotal, taxTotal, grandTotal,
      notes, termsAndConditions,
      includeTerms, includeSignature, includeBankDetails, includeUpiQr,
      isTaxed, taxType, taxRate, useProductSpecificTax, taxMode
    };

    if (req.user.role !== 'SUPER_ADMIN') {
      quotationPayload.companyId = req.user.companyId;
      quotationPayload.branchId  = req.user.branchId;
    }

    const quotation = await Quotation.create(quotationPayload);
    res.status(201).json({ success: true, data: quotation });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This Quotation Number already exists. Please choose a unique one.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update quotation status
// @route   PUT /api/quotations/:id/status
// @access  Private
export const updateQuotationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id, { status }, { new: true, runValidators: true });
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    res.status(200).json({ success: true, data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete quotation
// @route   DELETE /api/quotations/:id
// @access  Private
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

// @desc    Convert quotation to sales order (transactional)
// @route   POST /api/quotations/:id/convert-to-order
// @access  Private
export const convertToSalesOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const quotation = await Quotation.findById(req.params.id).session(session);
    if (!quotation) throw new Error('Quotation not found');
    if (quotation.status === 'Converted') throw new Error('Already converted to a sales order');
    if (quotation.status === 'Rejected')  throw new Error('Cannot convert a rejected quotation');

    const orderNumber = await getNextSequenceValue('salesOrder', 'SO', quotation.companyId);

    // Use lineItems if available (new schema), else fall back to items (legacy schema)
    const sourceLineItems = quotation.lineItems?.length ? quotation.lineItems : quotation.items;

    const order = new SalesOrder({
      orderNumber,
      customerId:        quotation.customerId,
      date:              new Date(),
      lineItems:         sourceLineItems,
      items:             sourceLineItems,
      subtotal:          quotation.subtotal || quotation.subTotal,
      subTotal:          quotation.subtotal || quotation.subTotal,
      taxTotal:          quotation.taxTotal,
      grandTotal:        quotation.grandTotal,
      linkedQuotationId: quotation._id,
      quotationId:       quotation._id,
      status:            'Confirmed',
    });
    await order.save({ session });

    quotation.status             = 'Converted';
    quotation.convertedToOrderId = order._id;
    await quotation.save({ session });

    await session.commitTransaction();
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// @desc    Update quotation
// @route   PUT /api/quotations/:id
// @access  Private
export const updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const {
      customerId, items, discount, validityDate,
      quoteDate, referenceNumber, salesperson, projectName, subject, adjustment,
      tdsPercentage, tdsAmount, notes, termsAndConditions, status,
      includeTerms, includeSignature, includeBankDetails, includeUpiQr,
      isTaxed, taxType, taxRate, useProductSpecificTax,
      tdsTcsType, tcsPercentage, tcsAmount
    } = req.body;

    if (customerId) quotation.customerId = customerId;
    if (isTaxed !== undefined) quotation.isTaxed = isTaxed;
    if (taxType !== undefined) quotation.taxType = taxType;
    if (taxRate !== undefined) quotation.taxRate = taxRate;
    if (useProductSpecificTax !== undefined) quotation.useProductSpecificTax = useProductSpecificTax;
    if (tdsTcsType !== undefined) quotation.tdsTcsType = tdsTcsType;

    if (items) {
      let subTotal = 0;
      let taxTotal = 0;
      const computedItems = items.map(item => {
        const amount = item.quantity * item.rate;
        const discountPercent = item.discountPercent || item.discount || 0;
        const discountAmt = amount * (discountPercent / 100);
        const itemSubtotal = amount - discountAmt;
        
        const currentIsTaxed = isTaxed !== undefined ? isTaxed : quotation.isTaxed;
        const currentUseProd = useProductSpecificTax !== undefined ? useProductSpecificTax : quotation.useProductSpecificTax;
        const currentGlobalRate = taxRate !== undefined ? taxRate : quotation.taxRate;

        const itemTaxRate = currentIsTaxed
          ? (currentUseProd ? (item.gstPercentage || item.gstPercent || 0) : (currentGlobalRate !== null && currentGlobalRate !== undefined && currentGlobalRate !== '' ? Number(currentGlobalRate) : (item.gstPercentage || item.gstPercent || 0)))
          : 0;
        
        const itemTax = itemSubtotal * (itemTaxRate / 100);
        subTotal += itemSubtotal;
        taxTotal += itemTax;

        return {
          ...item,
          gstPercentage: itemTaxRate,
          gstPercent: itemTaxRate,
          amount: itemSubtotal + itemTax
        };
      });

      quotation.items = computedItems;
      quotation.lineItems = computedItems;
      quotation.subTotal = subTotal;
      quotation.subtotal = subTotal;
      quotation.taxTotal = taxTotal;
    } else {
      // Re-run totals logic on existing items if other parameters changed
      let subTotal = quotation.subTotal || 0;
      let taxTotal = quotation.taxTotal || 0;
      const currentItems = quotation.items || [];
      const currentIsTaxed = isTaxed !== undefined ? isTaxed : quotation.isTaxed;
      const currentUseProd = useProductSpecificTax !== undefined ? useProductSpecificTax : quotation.useProductSpecificTax;
      const currentGlobalRate = taxRate !== undefined ? taxRate : quotation.taxRate;

      taxTotal = 0;
      subTotal = 0;
      quotation.items = currentItems.map(item => {
        const amount = item.quantity * item.rate;
        const discountPercent = item.discountPercent || item.discount || 0;
        const discountAmt = amount * (discountPercent / 100);
        const itemSubtotal = amount - discountAmt;
        
        const itemTaxRate = currentIsTaxed
          ? (currentUseProd ? (item.gstPercentage || item.gstPercent || 0) : (currentGlobalRate !== null && currentGlobalRate !== undefined && currentGlobalRate !== '' ? Number(currentGlobalRate) : (item.gstPercentage || item.gstPercent || 0)))
          : 0;
        
        const itemTax = itemSubtotal * (itemTaxRate / 100);
        subTotal += itemSubtotal;
        taxTotal += itemTax;

        return {
          ...item,
          gstPercentage: itemTaxRate,
          gstPercent: itemTaxRate,
          amount: itemSubtotal + itemTax
        };
      });
      quotation.subTotal = subTotal;
      quotation.subtotal = subTotal;
      quotation.taxTotal = taxTotal;
    }

    if (discount !== undefined) quotation.discount = Number(discount) || 0;
    if (validityDate !== undefined) quotation.validityDate = validityDate;
    if (quoteDate !== undefined) quotation.quoteDate = quoteDate;
    if (referenceNumber !== undefined) quotation.referenceNumber = referenceNumber;
    if (salesperson !== undefined) quotation.salesperson = salesperson;
    if (projectName !== undefined) quotation.projectName = projectName;
    if (subject !== undefined) quotation.subject = subject;
    if (adjustment !== undefined) quotation.adjustment = Number(adjustment) || 0;
    
    const finalSub = quotation.subTotal || 0;
    const finalTdsTcsType = tdsTcsType !== undefined ? tdsTcsType : quotation.tdsTcsType;
    const finalTdsPct = tdsPercentage !== undefined ? Number(tdsPercentage) : quotation.tdsPercentage;
    const finalTcsPct = tcsPercentage !== undefined ? Number(tcsPercentage) : quotation.tcsPercentage;

    let calculatedTdsAmount = 0;
    let calculatedTcsAmount = 0;
    if (finalTdsTcsType === 'TDS') {
      calculatedTdsAmount = finalSub * (finalTdsPct / 100);
    } else if (finalTdsTcsType === 'TCS') {
      calculatedTcsAmount = finalSub * (finalTcsPct / 100);
    }

    quotation.tdsPercentage = finalTdsPct;
    quotation.tdsAmount = calculatedTdsAmount;
    quotation.tcsPercentage = finalTcsPct;
    quotation.tcsAmount = calculatedTcsAmount;

    if (notes !== undefined) quotation.notes = notes;
    if (termsAndConditions !== undefined) quotation.termsAndConditions = termsAndConditions;
    if (status !== undefined) quotation.status = status;
    if (includeTerms !== undefined) quotation.includeTerms = includeTerms;
    if (includeSignature !== undefined) quotation.includeSignature = includeSignature;
    if (includeBankDetails !== undefined) quotation.includeBankDetails = includeBankDetails;
    if (includeUpiQr !== undefined) quotation.includeUpiQr = includeUpiQr;

    const disc = quotation.discount || 0;
    const tds = quotation.tdsAmount || 0;
    const tcs = quotation.tcsAmount || 0;
    const adj = quotation.adjustment || 0;
    const sub = quotation.subTotal || 0;
    const tax = quotation.taxTotal || 0;
    quotation.grandTotal = Math.round(sub + tax - disc - tds + tcs + adj);

    await quotation.save();
    res.status(200).json({ success: true, data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export const downloadQuotationPdf = async (req, res) => {
  try {
    const quotation = await findDocument(Quotation, req.params.id, req.user);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const { template = 'modern', color = '#2563eb' } = req.query;
    const templateName = template || 'modern';
    const colorClean = (color || '#2563eb').replace('#', '');
    const sanitizedQuoteNumber = quotation.quoteNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'quotations');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, `${quotation._id}-${sanitizedQuoteNumber}-${templateName}-${colorClean}.pdf`);

    const customer = await Customer.findById(quotation.customerId);
    const processedItems = quotation.items.map(i => ({
      itemId: i.itemId?._id || i.itemId,
      name: i.name || 'Item',
      description: i.description || '',
      quantity: i.quantity,
      rate: i.rate,
      amount: i.amount || (i.quantity * i.rate),
      gstPercentage: i.gstPercent ?? i.gstPercentage ?? 0,
    }));

    const settings = await CompanySettings.findOne({ companyId: quotation.companyId });
    if (customer && settings) {
      const settingsObj = settings.toObject ? settings.toObject() : settings;
      const filteredSettings = {
        ...settingsObj,
        bankDetails: quotation.includeBankDetails !== false ? settingsObj.bankDetails : null,
        upiId: quotation.includeUpiQr !== false ? settingsObj.upiId : null,
        upiQrUrl: quotation.includeUpiQr !== false ? settingsObj.upiQrUrl : null,
      };
      await generateQuotationPDF(quotation, customer, processedItems, filteredSettings, template, color, filePath);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'PDF not found and could not be generated' });
    }

    res.download(filePath);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendQuotation = async (req, res) => {
  try {
    const quotation = await findDocument(Quotation, req.params.id, req.user);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const { template = 'modern', color = '#2563eb' } = req.query;
    const templateName = template || 'modern';
    const colorClean = (color || '#2563eb').replace('#', '');
    const sanitizedQuoteNumber = quotation.quoteNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'quotations');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, `${quotation._id}-${sanitizedQuoteNumber}-${templateName}-${colorClean}.pdf`);

    const customer = await Customer.findById(quotation.customerId);
    if (!customer) throw new Error('Customer not found');
    if (!customer.email) {
      return res.status(400).json({ success: false, message: 'Customer has no email address configured' });
    }

    const settings = await CompanySettings.findOne({ companyId: quotation.companyId });
    if (!settings) throw new Error('Company settings not found');

    const processedItems = quotation.items.map(i => ({
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
      bankDetails: quotation.includeBankDetails !== false ? settingsObj.bankDetails : null,
      upiId: quotation.includeUpiQr !== false ? settingsObj.upiId : null,
      upiQrUrl: quotation.includeUpiQr !== false ? settingsObj.upiQrUrl : null,
    };

    await generateQuotationPDF(quotation, customer, processedItems, filteredSettings, template, color, filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error('PDF file generation failed');
    }

    let cloudinaryUrl;
    try {
      cloudinaryUrl = await uploadPdfToCloudinary(
        filePath,
        `${quotation._id}-${sanitizedQuoteNumber}-${templateName}-${colorClean}`
      );
    } catch (uploadErr) {
      return res.status(400).json({
        success: false,
        message: `Cloudinary upload failed: ${uploadErr.message}`
      });
    }

    const emailSubject = `Quotation ${quotation.quoteNumber} from ${settings.companyName || 'Our Company'}`;
    const emailBody = `
      <p>Dear ${customer.name || 'Customer'},</p>
      <p>Please find attached the quotation <strong>${quotation.quoteNumber}</strong>.</p>
      <p>Total Amount: <strong>${settings.currency?.symbol || 'INR'} ${quotation.grandTotal}</strong></p>
      <p>Thank you for your business!</p>
    `;

    await sendSmtpEmail({
      to: customer.email,
      subject: emailSubject,
      html: emailBody,
      attachmentUrl: cloudinaryUrl,
      attachmentName: `${quotation.quoteNumber}.pdf`
    });

    quotation.status = 'Sent';
    await quotation.save();

    res.json({ success: true, message: 'Quotation sent successfully via email' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
