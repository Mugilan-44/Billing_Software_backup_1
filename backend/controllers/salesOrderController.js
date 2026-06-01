import fs from 'fs';
import path from 'path';
import SalesOrder from '../models/SalesOrder.js';
import Quotation from '../models/Quotation.js';
import Customer from '../models/Customer.js';
import CompanySettings from '../models/CompanySettings.js';
import { findDocument } from '../utils/tenant.utils.js';
import { getNextSequenceValue } from '../utils/counter.utils.js';
import { generateSalesOrderPDF } from '../utils/pdfGenerator.js';
import { uploadPdfToCloudinary, sendSmtpEmail } from '../utils/emailService.js';

export const getSalesOrders = async (req, res) => {
    try {
        let query = req.user.role === 'Sales' ? { 'items.name': { $exists: true } } : {};
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        } else if (req.user.role === 'CUSTOMER') {
            query.customerId = req.user.customerId;
        }
        const salesOrders = await SalesOrder.find(query).populate('customerId', 'companyName email phone').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: salesOrders.length, data: salesOrders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const getSalesOrderById = async (req, res) => {
    try {
        const salesOrder = await findDocument(SalesOrder, req.params.id, req.user);
        if (!salesOrder) {
            return res.status(404).json({ success: false, message: 'Sales Order not found' });
        }
        await SalesOrder.populate(salesOrder, { path: 'customerId', select: 'companyName email phone billingAddress' });
        res.status(200).json({ success: true, data: salesOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const createSalesOrder = async (req, res) => {
    try {
        const { customerId, items, discount, expectedDeliveryDate, notes, quotationId, buyersRef, modeOfPayment,
                includeTerms = true, includeSignature = false, includeBankDetails = true, includeUpiQr = true } = req.body;

        let subTotal = 0;
        let taxTotal = 0;

        items.forEach(item => {
            const amount = item.quantity * item.rate;
            const tax = amount * ((item.gstPercentage || item.gstPercent || 0) / 100);
            subTotal += amount;
            taxTotal += tax;
        });

        const grandTotal = Math.round(subTotal + taxTotal - (discount || 0));

        const orderNumber = await getNextSequenceValue('salesOrder', 'SO');

        const salesOrderPayload = {
            orderNumber,
            customerId,
            quotationId,
            items,
            lineItems: items,
            discount: discount || 0,
            subTotal,
            subtotal: subTotal,
            taxTotal,
            grandTotal,
            expectedDeliveryDate,
            notes,
            buyersRef,
            modeOfPayment,
            includeTerms,
            includeSignature,
            includeBankDetails,
            includeUpiQr
        };

        if (req.user.role !== 'SUPER_ADMIN') {
            salesOrderPayload.companyId = req.user.companyId;
            salesOrderPayload.branchId = req.user.branchId;
        }

        const salesOrder = await SalesOrder.create(salesOrderPayload);

        if (quotationId) {
            await Quotation.findByIdAndUpdate(quotationId, { status: 'Converted' });
        }

        res.status(201).json({ success: true, data: salesOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const updateSalesOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const salesOrder = await findDocument(SalesOrder, req.params.id, req.user);
        if (!salesOrder) {
            return res.status(404).json({ success: false, message: 'Sales Order not found' });
        }
        salesOrder.status = status;
        await salesOrder.save();
        res.status(200).json({ success: true, data: salesOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const deleteSalesOrder = async (req, res) => {
    try {
        const salesOrder = await findDocument(SalesOrder, req.params.id, req.user);
        if (!salesOrder) {
            return res.status(404).json({ success: false, message: 'Sales Order not found' });
        }

        await salesOrder.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const updateSalesOrder = async (req, res) => {
    try {
        const salesOrder = await findDocument(SalesOrder, req.params.id, req.user);
        if (!salesOrder) {
            return res.status(404).json({ success: false, message: 'Sales Order not found' });
        }

        const { customerId, items, discount, expectedDeliveryDate, notes, status, buyersRef, modeOfPayment,
                includeTerms, includeSignature, includeBankDetails, includeUpiQr } = req.body;

        if (customerId) salesOrder.customerId = customerId;
        if (items) {
            salesOrder.items = items;
            salesOrder.lineItems = items;
            
            let subTotal = 0;
            let taxTotal = 0;
            items.forEach(item => {
                const amount = item.quantity * item.rate;
                const tax = amount * ((item.gstPercentage || item.gstPercent || 0) / 100);
                subTotal += amount;
                taxTotal += tax;
            });
            salesOrder.subTotal = subTotal;
            salesOrder.subtotal = subTotal;
            salesOrder.taxTotal = taxTotal;
        }

        if (discount !== undefined) salesOrder.discount = Number(discount) || 0;
        if (expectedDeliveryDate !== undefined) salesOrder.expectedDeliveryDate = expectedDeliveryDate;
        if (notes !== undefined) salesOrder.notes = notes;
        if (status !== undefined) salesOrder.status = status;
        if (buyersRef !== undefined) salesOrder.buyersRef = buyersRef;
        if (modeOfPayment !== undefined) salesOrder.modeOfPayment = modeOfPayment;
        if (includeTerms !== undefined) salesOrder.includeTerms = includeTerms;
        if (includeSignature !== undefined) salesOrder.includeSignature = includeSignature;
        if (includeBankDetails !== undefined) salesOrder.includeBankDetails = includeBankDetails;
        if (includeUpiQr !== undefined) salesOrder.includeUpiQr = includeUpiQr;

        const disc = salesOrder.discount || 0;
        const sub = salesOrder.subTotal || 0;
        const tax = salesOrder.taxTotal || 0;
        salesOrder.grandTotal = Math.round(sub + tax - disc);

        await salesOrder.save();
        res.status(200).json({ success: true, data: salesOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const downloadSalesOrderPdf = async (req, res) => {
  try {
    const salesOrder = await findDocument(SalesOrder, req.params.id, req.user);
    if (!salesOrder) return res.status(404).json({ success: false, message: 'Sales Order not found' });

    const { template = 'modern', color = '#2563eb' } = req.query;
    const templateName = template || 'modern';
    const colorClean = (color || '#2563eb').replace('#', '');
    const sanitizedOrderNumber = salesOrder.orderNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'sales-orders');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, `${salesOrder._id}-${sanitizedOrderNumber}-${templateName}-${colorClean}.pdf`);

    const customer = await Customer.findById(salesOrder.customerId);
    const processedItems = salesOrder.items.map(i => ({
      itemId: i.itemId?._id || i.itemId,
      name: i.name || 'Item',
      description: i.description || '',
      quantity: i.quantity,
      rate: i.rate,
      amount: i.amount || (i.quantity * i.rate),
      gstPercentage: i.gstPercent ?? i.gstPercentage ?? 0,
    }));

    const settings = await CompanySettings.findOne({ companyId: salesOrder.companyId });
    if (customer && settings) {
      const settingsObj = settings.toObject ? settings.toObject() : settings;
      const filteredSettings = {
        ...settingsObj,
        bankDetails: salesOrder.includeBankDetails !== false ? settingsObj.bankDetails : null,
        upiId: salesOrder.includeUpiQr !== false ? settingsObj.upiId : null,
        upiQrUrl: salesOrder.includeUpiQr !== false ? settingsObj.upiQrUrl : null,
      };
      await generateSalesOrderPDF(salesOrder, customer, processedItems, filteredSettings, template, color, filePath);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'PDF not found and could not be generated' });
    }

    res.download(filePath);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendSalesOrder = async (req, res) => {
  try {
    const salesOrder = await findDocument(SalesOrder, req.params.id, req.user);
    if (!salesOrder) return res.status(404).json({ success: false, message: 'Sales Order not found' });

    const { template = 'modern', color = '#2563eb' } = req.query;
    const templateName = template || 'modern';
    const colorClean = (color || '#2563eb').replace('#', '');
    const sanitizedOrderNumber = salesOrder.orderNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'sales-orders');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, `${salesOrder._id}-${sanitizedOrderNumber}-${templateName}-${colorClean}.pdf`);

    const customer = await Customer.findById(salesOrder.customerId);
    if (!customer) throw new Error('Customer not found');
    if (!customer.email) {
      return res.status(400).json({ success: false, message: 'Customer has no email address configured' });
    }

    const settings = await CompanySettings.findOne({ companyId: salesOrder.companyId });
    if (!settings) throw new Error('Company settings not found');

    const processedItems = salesOrder.items.map(i => ({
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
      bankDetails: salesOrder.includeBankDetails !== false ? settingsObj.bankDetails : null,
      upiId: salesOrder.includeUpiQr !== false ? settingsObj.upiId : null,
      upiQrUrl: salesOrder.includeUpiQr !== false ? settingsObj.upiQrUrl : null,
    };

    await generateSalesOrderPDF(salesOrder, customer, processedItems, filteredSettings, template, color, filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error('PDF file generation failed');
    }

    let cloudinaryUrl;
    try {
      cloudinaryUrl = await uploadPdfToCloudinary(
        filePath,
        `${salesOrder._id}-${sanitizedOrderNumber}-${templateName}-${colorClean}`
      );
    } catch (uploadErr) {
      return res.status(400).json({
        success: false,
        message: `Cloudinary upload failed: ${uploadErr.message}`
      });
    }

    const emailSubject = `Sales Order ${salesOrder.orderNumber} from ${settings.companyName || 'Our Company'}`;
    const emailBody = `
      <p>Dear ${customer.name || 'Customer'},</p>
      <p>Please find attached the sales order <strong>${salesOrder.orderNumber}</strong>.</p>
      <p>Total Amount: <strong>${settings.currency?.symbol || 'INR'} ${salesOrder.grandTotal}</strong></p>
      <p>Thank you for your business!</p>
    `;

    await sendSmtpEmail({
      to: customer.email,
      subject: emailSubject,
      html: emailBody,
      attachmentUrl: cloudinaryUrl,
      attachmentName: `${salesOrder.orderNumber}.pdf`
    });

    res.json({ success: true, message: 'Sales Order sent successfully via email' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
