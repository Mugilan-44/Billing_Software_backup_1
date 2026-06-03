import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import Item from '../models/Item.js';
import Quotation from '../models/Quotation.js';
import SalesOrder from '../models/SalesOrder.js';
import AuditLog from '../models/AuditLog.js';
import Challan from '../models/Challan.js';
import InvoiceItem from '../models/InvoiceItem.js';
import LedgerEntry from '../models/LedgerEntry.js';
import StockHistory from '../models/StockHistory.js';
import CompanySettings from '../models/CompanySettings.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';
import { findDocument } from '../utils/tenant.utils.js';
import { createInvoiceSchema } from '../validators/billing.validators.js';
import { calculateInvoice } from '../utils/calculateInvoice.js';
import { roundTo } from '../utils/billing.utils.js';
import CalculationLog from '../models/CalculationLog.js';
import { parseUTC } from '../utils/dateUtils.js';
import Payment from '../models/Payment.js';
import fs from 'fs';
import path from 'path';
import { uploadPdfToCloudinary, sendSmtpEmail } from '../utils/emailService.js';


// ─── Helper: resolve company state code ──────────────────────────────────────
async function getCompanyStateCode(companyId) {
  try {
    const settings = await CompanySettings.findOne({ companyId: companyId || null }).lean();
    if (settings?.gstin) return settings.gstin.substring(0, 2);
    if (settings?.stateCode) return settings.stateCode;
    return null;
  } catch {
    return null;
  }
}

export const recalculateCustomerLedger = async (customerId, session = null) => {
  let query = LedgerEntry.find({ customerId }).sort({ date: 1, createdAt: 1 });
  if (session) {
    query = query.session(session);
  }
  const entries = await query;

  let runningBalance = 0;
  for (const entry of entries) {
    runningBalance = Math.round((runningBalance + (entry.debit || 0) - (entry.credit || 0)) * 100) / 100;
    entry.balance = runningBalance;
    await entry.save(session ? { session } : {});
  }

  const customer = await Customer.findById(customerId).session(session);
  if (customer) {
    customer.outstandingBalance = runningBalance;
    
    let invoiceQuery = Invoice.find({ customerId, status: { $nin: ['Draft', 'Cancelled'] } });
    if (session) {
      invoiceQuery = invoiceQuery.session(session);
    }
    const invoices = await invoiceQuery.lean();
    const totalBusiness = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    customer.totalBusiness = Math.round(totalBusiness * 100) / 100;
    await customer.save(session ? { session } : {});
  }
};


// @desc    Create new invoice (with Zod validation + transactions)
// @route   POST /api/invoices
// @access  Private
export const createInvoice = async (req, res) => {
  // Try new schema first, fall back to legacy
  const parsed = createInvoiceSchema.safeParse(req.body);

  if (parsed.success) {
    // ── NEW: transactional path ───────────────────────────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { customerId, lineItems, date, dueDate, notes, paymentTerms,
              linkedQuotationId, linkedSalesOrderId,
              invoiceDiscount = 0, placeOfSupply,
              taxType = 'GST', taxRate, isTaxed = true,
              useProductSpecificTax = true,
              tdsTcsType = 'None', tdsPercentage = 0, tcsPercentage = 0,
              includeTerms = true, includeSignature = false,
              billingAddress, shippingAddress } = parsed.data;

      const customer = await Customer.findById(customerId).session(session);
      if (!customer) throw new Error('Customer not found');

      // Scope CompanySettings to this company
      const companySettingsQuery = req.user.companyId
        ? { companyId: req.user.companyId }
        : {};
      const companySettings = await CompanySettings.findOne(companySettingsQuery).lean().session(session);

      const companyStateCode  = companySettings?.stateCode
        || (companySettings?.gstin || companySettings?.gstNumber || '').substring(0, 2)
        || null;
      const customerStateCode = customer.stateCode
        || (customer.gstin || customer.gstNumber || '').substring(0, 2)
        || null;

      const totals = calculateInvoice({
        lineItems,
        discountPercent: 0,
        discountFixed: invoiceDiscount,
        companyStateCode,
        customerStateCode,
        taxType,
        taxRate,
        isTaxed,
        useProductSpecificTax,
        tdsTcsType,
        tdsPercentage,
        tcsPercentage
      });

      const invoicePayload = {
        customerId,
        date:    new Date(date),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        lineItems: totals.lineItems,
        subtotal:      totals.subtotal.toNumber(),
        subTotal:      totals.subtotal.toNumber(),  // legacy alias
        taxableAmount: totals.taxableAmount.toNumber(),
        discountAmount: totals.discountAmount.toNumber(),
        discount:      totals.discountAmount.toNumber(),  // legacy alias
        cgst:          totals.cgst.toNumber(),
        sgst:          totals.sgst.toNumber(),
        igst:          totals.igst.toNumber(),
        taxAmount:     totals.taxAmount.toNumber(), 
        grandTotal:    totals.grandTotal.toNumber(),
        balanceDue:    totals.grandTotal.toNumber(),
        amountPaid:    0,
        placeOfSupply: placeOfSupply || customerStateCode || null,
        paymentTerms,
        notes,
        linkedQuotationId:  linkedQuotationId || undefined,
        linkedSalesOrderId: linkedSalesOrderId || undefined,
        status: 'Draft',
        createdBy: req.user._id,
        taxType,
        taxRate,
        isTaxed,
        useProductSpecificTax,
        tdsTcsType,
        tdsPercentage: Number(tdsPercentage) || 0,
        tdsAmount: totals.tdsAmount.toNumber(),
        tcsPercentage: Number(tcsPercentage) || 0,
        tcsAmount: totals.tcsAmount.toNumber(),
        includeTerms,
        includeSignature,
        billingAddress,
        shippingAddress,
        taxMode: req.body.taxMode || 'WITH_TAX',
        invoiceNumber: req.body.invoiceNumber || undefined
      };

      if (req.user.role !== 'SUPER_ADMIN') {
        invoicePayload.companyId = req.user.companyId;
        invoicePayload.branchId  = req.user.branchId;
      }

      const invoice = new Invoice(invoicePayload);
      await invoice.save({ session });

      // Audit Log for precise calculation
      await CalculationLog.create([{
        invoiceId: invoice._id,
        stepName: 'INITIAL_CREATION',
        inputValues: { lineItems, invoiceDiscount, companyStateCode, customerStateCode },
        calculatedValue: totals,
        userId: req.user._id
      }], { session });

      // FIX C8: Write LedgerEntry in transactional path
      await LedgerEntry.create([{
        companyId:   req.user.companyId || null,
        branchId:    req.user.branchId  || null,
        customerId,
        date:        invoice.date,
        type:        'Invoice',
        referenceId: invoice._id,
        description: `Invoice ${invoice.invoiceNumber}`,
        debit:       totals.grandTotal.toNumber(),
        credit:      0,
        balance:     roundTo(customer.outstandingBalance + totals.grandTotal.toNumber()),
      }], { session });

      // Recalculate customer balances and ledger running balances safely
      await recalculateCustomerLedger(customerId, session);

      // FIX C9: Write StockHistory for every stock OUT in transactional path
      for (const item of lineItems) {
        if (item.itemId) {
          const stock = await Item.findById(item.itemId).session(session);
          if (stock && (stock.trackStock !== false) && stock.type !== 'Service') {
            const available = stock.availableStock ?? stock.stockQuantity ?? 0;
            if (available < item.quantity) {
              throw new Error(`Insufficient stock for: ${stock.name} (available: ${available})`);
            }
            const newStock = roundTo(available - item.quantity);
            stock.availableStock = newStock;
            stock.stockQuantity  = newStock;
            await stock.save({ session });

            await StockHistory.create([{
              companyId:     req.user.companyId || null,
              branchId:      req.user.branchId  || null,
              itemId:        stock._id,
              action:        'OUT',
              quantity:      item.quantity,
              previousStock: available,
              currentStock:  newStock,
              referenceId:   invoice._id,
              referenceType: 'Invoice',
              notes:         `Invoice ${invoice.invoiceNumber}`,
            }], { session });
          }
        }
      }

      // Update linked documents
      if (linkedQuotationId) {
        await Quotation.findByIdAndUpdate(linkedQuotationId,
          { status: 'Converted', convertedToOrderId: invoice._id }, { session });
      }
      if (linkedSalesOrderId) {
        await SalesOrder.findByIdAndUpdate(linkedSalesOrderId,
          { status: 'Invoiced', convertedToInvoiceId: invoice._id }, { session });
      }

      await AuditLog.create([{
        module: 'Invoice', action: 'CREATE',
        documentId: invoice._id, userId: req.user._id,
        changes: { after: invoice.toObject() },
      }], { session });

      await session.commitTransaction();
      return res.status(201).json({ success: true, data: invoice });

    } catch (err) {
      await session.abortTransaction();
      if (err.code === 11000) {
        return res.status(400).json({ success: false, message: 'This Invoice Number already exists. Please choose a unique one.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    } finally {
      session.endSession();
    }
  }

  // ── LEGACY: non-validated path (existing frontend compatibility) ─────────────
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
      billingAddress,
      shippingAddress,
      includeTerms,
      includeSignature,
    } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) throw new Error('Customer not found');

    const settings = await CompanySettings.findOne({ companyId: req.user.companyId || null });
    if (!settings) throw new Error('Company settings not found. Please configure them first.');

    const companyState = settings.address?.state?.toLowerCase().trim();
    const customerState = customer.billingAddress?.state?.toLowerCase().trim();
    const isInterState = companyState && customerState && companyState !== customerState;

    let subTotal = 0;
    let totalTax = 0;
    let cgst = 0, sgst = 0, igst = 0;
    const processedItems = [];

    for (const i of items) {
      const dbItem = await Item.findById(i.itemId);
      if (!dbItem) throw new Error(`Item not found: ${i.itemId}`);

      const amount = i.quantity * i.rate;
      const taxAmount = amount * ((dbItem.gstPercentage || dbItem.gstPercent || 0) / 100);

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
        description: i.description || dbItem.description || '',
        quantity: i.quantity,
        rate: i.rate,
        amount,
        gstPercentage: dbItem.gstPercentage || dbItem.gstPercent || 0,
      });

      // FIX C1: Negative stock guard before deducting
      if (dbItem.type === 'Goods' && !challanId) {
        const available = dbItem.availableStock ?? dbItem.stockQuantity ?? 0;
        if (available < i.quantity) {
          throw new Error(
            `Insufficient stock for "${dbItem.name}". Available: ${available}, Requested: ${i.quantity}`
          );
        }
        const prevStock = available;
        const newStock  = roundTo(prevStock - i.quantity);
        dbItem.availableStock = newStock;
        dbItem.stockQuantity  = newStock;
        await dbItem.save();

        // FIX C9: Write StockHistory for legacy path
        await StockHistory.create([{
          companyId:     req.user.companyId || null,
          branchId:      req.user.branchId  || null,
          itemId:        dbItem._id,
          action:        'OUT',
          quantity:      i.quantity,
          previousStock: prevStock,
          currentStock:  newStock,
          referenceType: 'Invoice',
          notes:         'Invoice (legacy path)',
        }]);
      }
    }

    // FIX C2: Explicitly set taxAmount so GST aggregations work
    const r = (v) => Math.round(v * 100) / 100;
    const grandTotal = r(subTotal + totalTax - discount);
    const roundOff   = r(grandTotal - (subTotal + totalTax - discount));

    const invoicePayload = {
      customerId,
      transportDetails,
      subTotal:    r(subTotal),
      subtotal:    r(subTotal),
      discount,
      taxTotal:    { cgst: r(cgst), sgst: r(sgst), igst: r(igst), totalTax: r(totalTax) },
      cgst:        r(cgst),
      sgst:        r(sgst),
      igst:        r(igst),
      taxAmount:   r(totalTax),   // FIX C2: always populate
      roundOff,
      grandTotal,
      balanceDue:  grandTotal,
      amountPaid:  0,
      notes,
      dueDate,
      billingAddress,
      shippingAddress,
      includeTerms: includeTerms !== undefined ? includeTerms : true,
      includeSignature: includeSignature !== undefined ? includeSignature : false,
      taxMode: req.body.taxMode || 'WITH_TAX',
      invoiceNumber: req.body.invoiceNumber || undefined
    };

    if (date) invoicePayload.date = date;
    if (status) invoicePayload.status = status;

    if (req.user.role !== 'SUPER_ADMIN') {
      invoicePayload.companyId = req.user.companyId;
      invoicePayload.branchId  = req.user.branchId;
    }

    const invoice = new Invoice(invoicePayload);
    await invoice.save();

    const invoiceItemsDocs = processedItems.map(p => ({ ...p, invoiceId: invoice._id }));
    await InvoiceItem.insertMany(invoiceItemsDocs);

    customer.outstandingBalance = roundTo(customer.outstandingBalance + grandTotal);
    customer.totalBusiness      = roundTo((customer.totalBusiness || 0) + grandTotal);
    await customer.save();

    const ledgerEntry = new LedgerEntry({
      customerId,
      type: 'Invoice',
      referenceId: invoice._id,
      description: `Invoice ${invoice.invoiceNumber}`,
      debit: grandTotal,
      balance: customer.outstandingBalance,
    });
    await ledgerEntry.save();

    await generateInvoicePDF(invoice, customer, processedItems, settings).catch(() => {});

    if (challanId) {
      await Challan.findByIdAndUpdate(challanId, { status: 'Converted', invoiceId: invoice._id });
    }

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This Invoice Number already exists. Please choose a unique one.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices = async (req, res) => {
  try {
    const { status, customerId, from, to } = req.query;
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 20;
    const skip  = (page - 1) * limit;
    const filter = {};

    if (req.user.role !== 'SUPER_ADMIN') {
      filter.companyId = req.user.companyId;
      filter.branchId  = req.user.branchId;
    } else if (req.user.role === 'CUSTOMER') {
      filter.customerId = req.user.customerId;
    }

    if (status)     filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (req.query.taxMode) {
      filter.taxMode = req.query.taxMode;
    }
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('customerId', 'companyName name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      count:      invoices.length,
      data:       invoices,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await findDocument(Invoice, req.params.id, req.user);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    
    await Invoice.populate(invoice, [
      { path: 'customerId', select: 'companyName name email phone gstin gstNumber address billingAddress stateCode' },
      { path: 'lineItems.itemId', select: 'name sku' }
    ]);

    // Also fetch legacy InvoiceItems for backward compat
    const items = await InvoiceItem.find({ invoiceId: invoice._id }).lean();

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
      : items.map(item => ({
          ...item,
          gstPercent: item.gstPercentage ?? item.gstPercent ?? 0,
          gstPercentage: item.gstPercentage ?? item.gstPercent ?? 0,
        }));

    res.json({ success: true, data: { ...invoiceObj, items: unifiedItems } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadInvoicePdf = async (req, res) => {
  try {
    const invoice = await findDocument(Invoice, req.params.id, req.user);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const { template = 'modern', color = '#2563eb' } = req.query;
    const templateName = template || 'modern';
    const colorClean = (color || '#2563eb').replace('#', '');
    const sanitizedInvoiceNumber = invoice.invoiceNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
    const filePath = path.join(process.cwd(), 'uploads', 'invoices', `${invoice._id}-${sanitizedInvoiceNumber}-${templateName}-${colorClean}.pdf`);

    const customer = await Customer.findById(invoice.customerId);
    const items    = await InvoiceItem.find({ invoiceId: invoice._id }).populate('itemId');
    const processedItems = (invoice.lineItems && invoice.lineItems.length > 0)
      ? invoice.lineItems.map(i => ({
          itemId: i.itemId?._id || i.itemId,
          name: i.name || 'Item',
          description: i.description || '',
          quantity: i.quantity,
          rate: i.rate,
          amount: i.amount || (i.quantity * i.rate),
          gstPercentage: i.gstPercent ?? i.gstPercentage ?? 0,
        }))
      : items.map(i => ({
          itemId: i.itemId?._id || i.itemId,
          name: i.name || 'Item',
          description: i.description || '',
          quantity: i.quantity,
          rate: i.rate,
          amount: i.amount,
          gstPercentage: i.gstPercentage ?? i.gstPercent ?? 0,
        }));

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
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update an invoice
// @route   PUT /api/invoices/:id
// @access  Private
export const updateInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const invoice = await findDocument(Invoice, id, req.user, session);
    if (!invoice) throw new Error('Invoice not found');
    if (['Paid', 'Cancelled'].includes(invoice.status)) {
      throw new Error('Cannot edit a paid or cancelled invoice');
    }

    const customer = await Customer.findById(invoice.customerId).session(session);
    if (!customer) throw new Error('Customer not found');
    const settings = await CompanySettings.findOne({ companyId: req.user.companyId || null }).lean();

    const { lineItems, date, dueDate, notes, paymentTerms, status, transportDetails, termsAndConditions,
            taxType = 'GST', taxRate, isTaxed = true, useProductSpecificTax, tdsTcsType, tdsPercentage, tcsPercentage, includeTerms, includeSignature } = req.body;
    const actualLineItems = lineItems || req.body.items || []; // fallback for legacy frontend

    // Reverse old stock from embedded line items
    if (invoice.lineItems && invoice.lineItems.length) {
      for (const item of invoice.lineItems) {
        if (item.itemId) {
          await Item.findByIdAndUpdate(item.itemId,
            { $inc: { availableStock: item.quantity, stockQuantity: item.quantity } }, { session });
        }
      }
    }

    // Reverse old customer balance (only the unpaid portion)
    const oldBalanceDue = invoice.balanceDue ?? invoice.grandTotal;
    customer.outstandingBalance = Math.round((customer.outstandingBalance - oldBalanceDue) * 100) / 100;
    customer.totalBusiness = Math.round(((customer.totalBusiness || 0) - invoice.grandTotal) * 100) / 100;

    // Recompute with new line items
    const companyStateCode = settings?.stateCode || (settings?.gstin ? settings.gstin.substring(0, 2) : null);
    const customerStateCode = customer?.stateCode || (customer?.gstNumber ? customer.gstNumber.substring(0, 2) : null);
    
    const totals = calculateInvoice({
      lineItems: actualLineItems,
      companyStateCode,
      customerStateCode,
      taxType,
      taxRate,
      isTaxed,
      useProductSpecificTax: useProductSpecificTax !== undefined ? useProductSpecificTax : invoice.useProductSpecificTax,
      tdsTcsType: tdsTcsType !== undefined ? tdsTcsType : invoice.tdsTcsType,
      tdsPercentage: tdsPercentage !== undefined ? Number(tdsPercentage) : invoice.tdsPercentage,
      tcsPercentage: tcsPercentage !== undefined ? Number(tcsPercentage) : invoice.tcsPercentage
    });

    // Apply new stock deduction
    for (const item of totals.lineItems) {
      if (item.itemId) {
        const stock = await Item.findById(item.itemId).session(session);
        if (stock && (stock.trackStock !== false) && stock.type !== 'Service') {
          const available = stock.availableStock ?? stock.stockQuantity ?? 0;
          if (available < item.quantity) {
            throw new Error(`Insufficient stock for "${stock.name}"`);
          }
          const newStock = Math.round((available - item.quantity) * 100) / 100;
          stock.availableStock = newStock;
          stock.stockQuantity = newStock;
          await stock.save({ session });
        }
      }
    }

    // Update invoice fields explicitly
    invoice.lineItems     = totals.lineItems;
    invoice.subtotal      = totals.subtotal.toNumber();
    invoice.subTotal      = totals.subtotal.toNumber();  // legacy alias
    invoice.taxableAmount = totals.taxableAmount.toNumber();
    invoice.discountAmount = totals.discountAmount.toNumber();
    invoice.discount      = totals.discountAmount.toNumber();  // legacy alias
    invoice.cgst          = totals.cgst.toNumber();
    invoice.sgst          = totals.sgst.toNumber();
    invoice.igst          = totals.igst.toNumber();
    invoice.taxAmount     = totals.taxAmount.toNumber();
    invoice.grandTotal    = totals.grandTotal.toNumber();
    invoice.balanceDue    = Math.round((totals.grandTotal.toNumber() - (invoice.amountPaid || 0)) * 100) / 100;
    invoice.taxType       = taxType;
    invoice.taxRate       = taxRate;
    invoice.isTaxed       = isTaxed;
    if (useProductSpecificTax !== undefined) invoice.useProductSpecificTax = useProductSpecificTax;
    if (tdsTcsType !== undefined) invoice.tdsTcsType = tdsTcsType;
    if (tdsPercentage !== undefined) invoice.tdsPercentage = Number(tdsPercentage) || 0;
    if (tcsPercentage !== undefined) invoice.tcsPercentage = Number(tcsPercentage) || 0;
    invoice.tdsAmount     = totals.tdsAmount.toNumber();
    invoice.tcsAmount     = totals.tcsAmount.toNumber();
    
    if (date) invoice.date = new Date(date);
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (notes !== undefined) invoice.notes = notes;
    if (paymentTerms !== undefined) invoice.paymentTerms = paymentTerms;
    if (transportDetails) invoice.transportDetails = transportDetails;
    if (termsAndConditions !== undefined) invoice.termsAndConditions = termsAndConditions;
    if (status) invoice.status = status;
    if (req.body.billingAddress !== undefined) invoice.billingAddress = req.body.billingAddress;
    if (req.body.shippingAddress !== undefined) invoice.shippingAddress = req.body.shippingAddress;
    if (includeTerms !== undefined) invoice.includeTerms = includeTerms;
    if (includeSignature !== undefined) invoice.includeSignature = includeSignature;
    
    // Legacy support: drop old external items
    await InvoiceItem.deleteMany({ invoiceId: invoice._id }, { session });

    await invoice.save({ session });

    // Update the associated LedgerEntry debit amount
    const ledger = await LedgerEntry.findOne({ referenceId: invoice._id, type: 'Invoice' }).session(session);
    if (ledger) {
      ledger.debit = totals.grandTotal.toNumber();
      await ledger.save({ session });
    }

    // Safely recalculate all ledger running balances, customer outstandingBalance, and customer totalBusiness
    await recalculateCustomerLedger(customer._id, session);

    await session.commitTransaction();

    // Fire-and-forget PDF generation outside transaction
    if (settings) {
      generateInvoicePDF(invoice, customer, totals.lineItems, settings).catch(() => {});
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// @desc    Mark invoice as Sent
// @route   PUT /api/invoices/:id/send
// @access  Private
export const sendInvoice = async (req, res) => {
  try {
    const invoice = await findDocument(Invoice, req.params.id, req.user);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot send a cancelled invoice' });
    }

    const { template = 'modern', color = '#2563eb' } = req.query;
    const templateName = template || 'modern';
    const colorClean = (color || '#2563eb').replace('#', '');
    const sanitizedInvoiceNumber = invoice.invoiceNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
    const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, `${invoice._id}-${sanitizedInvoiceNumber}-${templateName}-${colorClean}.pdf`);

    const customer = await Customer.findById(invoice.customerId);
    if (!customer) throw new Error('Customer not found');
    if (!customer.email) {
      return res.status(400).json({ success: false, message: 'Customer has no email address configured' });
    }

    const settings = await CompanySettings.findOne({ companyId: invoice.companyId });
    if (!settings) throw new Error('Company settings not found');

    const items = await InvoiceItem.find({ invoiceId: invoice._id }).populate('itemId');
    const processedItems = (invoice.lineItems && invoice.lineItems.length > 0)
      ? invoice.lineItems.map(i => ({
          itemId: i.itemId?._id || i.itemId,
          name: i.name || 'Item',
          description: i.description || '',
          quantity: i.quantity,
          rate: i.rate,
          amount: i.amount || (i.quantity * i.rate),
          gstPercentage: i.gstPercent ?? i.gstPercentage ?? 0,
        }))
      : items.map(i => ({
          itemId: i.itemId?._id || i.itemId,
          name: i.name || 'Item',
          description: i.description || '',
          quantity: i.quantity,
          rate: i.rate,
          amount: i.amount,
          gstPercentage: i.gstPercentage ?? i.gstPercent ?? 0,
        }));

    const settingsObj = settings.toObject ? settings.toObject() : settings;
    const filteredSettings = {
      ...settingsObj,
      bankDetails: invoice.includeBankDetails !== false ? settingsObj.bankDetails : null,
      upiId: invoice.includeUpiQr !== false ? settingsObj.upiId : null,
      upiQrUrl: invoice.includeUpiQr !== false ? settingsObj.upiQrUrl : null,
    };

    await generateInvoicePDF(invoice, customer, processedItems, filteredSettings, template, color, filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error('PDF file generation failed');
    }

    // Upload to Cloudinary
    let cloudinaryUrl;
    try {
      cloudinaryUrl = await uploadPdfToCloudinary(
        filePath,
        `${invoice._id}-${sanitizedInvoiceNumber}-${templateName}-${colorClean}`
      );
    } catch (uploadErr) {
      return res.status(400).json({
        success: false,
        message: `Cloudinary upload failed: ${uploadErr.message}`
      });
    }

    // Send email using SMTP
    try {
      const emailTo = req.body.to || customer.email;
      const subject = req.body.subject || `Invoice ${invoice.invoiceNumber} from ${settings.companyName || 'Prolync Billing'}`;
      const messageBody = req.body.message || `Hello ${customer.companyName || customer.name || 'Customer'},\n\nPlease find attached your Invoice ${invoice.invoiceNumber} for ₹${invoice.grandTotal.toFixed(2)}.\n\nThank you for your business!\n\nBest regards,\n${settings.companyName || 'Prolync Billing'}`;

      let text = messageBody;
      if (!text.includes(cloudinaryUrl)) {
        text += `\n\nClick here for further details: ${cloudinaryUrl}`;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">Invoice ${invoice.invoiceNumber}</h2>
          <p style="white-space: pre-line;">${messageBody}</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${cloudinaryUrl}" target="_blank" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">
              Click here for further details
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">If the button above does not work, copy and paste this link into your browser:<br/><a href="${cloudinaryUrl}" style="color: #2563eb; text-decoration: underline;">${cloudinaryUrl}</a></p>
        </div>
      `;

      await sendSmtpEmail({
        to: emailTo,
        subject,
        text,
        html,
        attachments: [
          {
            filename: `${invoice.invoiceNumber}.pdf`,
            path: filePath
          }
        ]
      });
    } catch (emailErr) {
      return res.status(400).json({
        success: false,
        message: `SMTP Email sending failed: ${emailErr.message}`
      });
    }

    invoice.status      = 'Sent';
    invoice.emailSentAt = new Date();
    await invoice.save();

    res.json({ success: true, data: invoice, message: 'Email sent successfully with Cloudinary link!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Cancel an invoice (reverses all balances + restores stock)
// @route   PUT /api/invoices/:id/cancel
// @access  Private
export const cancelInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoice = await findDocument(Invoice, req.params.id, req.user, session);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'Cancelled') throw new Error('Invoice is already cancelled');
    if (invoice.amountPaid > 0) {
      throw new Error('Cannot cancel a paid or partially paid invoice. Issue a credit note instead.');
    }

    // Delete associated ledger entries and recalculate customer ledger balance
    await LedgerEntry.deleteMany({ referenceId: invoice._id }, { session });
    await recalculateCustomerLedger(invoice.customerId, session);

    // Restore stock from embedded lineItems
    if (invoice.lineItems?.length) {
      for (const item of invoice.lineItems) {
        if (item.itemId) {
          await Item.findByIdAndUpdate(item.itemId,
            { $inc: { availableStock: item.quantity, stockQuantity: item.quantity } },
            { session });
        }
      }
    }

    // Also restore from legacy InvoiceItems
    const legacyItems = await InvoiceItem.find({ invoiceId: invoice._id }).lean();
    for (const item of legacyItems) {
      if (item.itemId) {
        await Item.findByIdAndUpdate(item.itemId,
          { $inc: { availableStock: item.quantity, stockQuantity: item.quantity } },
          { session });
      }
    }

    invoice.status       = 'Cancelled';
    invoice.cancelledAt  = new Date();
    invoice.cancelReason = req.body.reason || '';
    await invoice.save({ session });

    await AuditLog.create([{
      module: 'Invoice', action: 'CANCEL',
      documentId: invoice._id, userId: req.user._id,
      changes: { reason: req.body.reason },
    }], { session });

    await session.commitTransaction();
    res.json({ success: true, message: 'Invoice cancelled. All balances reversed.' });

  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// @desc    Hard-delete an invoice with full cascade (transactional)
// @route   DELETE /api/invoices/:id
// @access  Private (SUPER_ADMIN, ADMIN only)
export const deleteInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoice = await findDocument(Invoice, req.params.id, req.user, session);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'Cancelled') {
      // Cancelled invoices can be deleted without further reversal
    } else if (invoice.amountPaid > 0) {
      throw new Error(
        'Cannot delete a partially or fully paid invoice. ' +
        'Void payments first or issue a credit note, then delete.'
      );
    }

    const snapshot = invoice.toObject();
    const round = (v) => Math.round(v * 100) / 100;

    // ── 1. Inventory rollback ─────────────────────────────────────────────────
    const lineItems = invoice.lineItems?.length
      ? invoice.lineItems
      : await InvoiceItem.find({ invoiceId: invoice._id }).lean();

    for (const li of lineItems) {
      const itemId = li.itemId;
      if (!itemId) continue;
      await Item.findByIdAndUpdate(
        itemId,
        { $inc: { availableStock: li.quantity, stockQuantity: li.quantity } },
        { session }
      );
    }

    // Delete invoice ledger entry
    await LedgerEntry.deleteMany({ referenceId: invoice._id }, { session });

    // ── 3. Cascade-delete all linked payments and their ledger entries ───────────
    const linkedPayments = await Payment.find({ invoiceId: invoice._id }).session(session).lean();
    if (linkedPayments.length) {
      await Payment.deleteMany({ invoiceId: invoice._id }, { session });
      const paymentIds = linkedPayments.map(p => p._id);
      await LedgerEntry.deleteMany({ referenceId: { $in: paymentIds } }, { session });
      // Also log each deleted payment
      const paymentLogs = linkedPayments.map(p => ({
        module:     'Payment',
        action:     'DELETE',
        documentId: p._id,
        userId:     req.user._id,
        changes:    { before: p, reason: `Cascade delete from Invoice ${invoice.invoiceNumber}` },
      }));
      await AuditLog.create(paymentLogs, { session });
    }

    // ── 4. Unlink source Quotation ────────────────────────────────────────────
    if (invoice.linkedQuotationId) {
      await Quotation.findByIdAndUpdate(
        invoice.linkedQuotationId,
        { $set: { status: 'Accepted', convertedToOrderId: null } },
        { session }
      );
    }

    // ── 5. Unlink source Sales Order ──────────────────────────────────────────
    if (invoice.linkedSalesOrderId) {
      await SalesOrder.findByIdAndUpdate(
        invoice.linkedSalesOrderId,
        { $set: { status: 'Confirmed', convertedToInvoiceId: null } },
        { session }
      );
    }

    // ── 6. Delete legacy InvoiceItems ─────────────────────────────────────────
    await InvoiceItem.deleteMany({ invoiceId: invoice._id }, { session });

    // ── 7. Audit log with full before-snapshot ────────────────────────────────
    await AuditLog.create([{
      module:     'Invoice',
      action:     'DELETE',
      documentId: invoice._id,
      userId:     req.user._id,
      changes:    { before: snapshot, reason: req.body.reason || 'Manual deletion' },
    }], { session });

    // ── 8. Delete the invoice ─────────────────────────────────────────────────
    await invoice.deleteOne({ session });

    // Recalculate customer balances and ledger running balances safely after deletion
    await recalculateCustomerLedger(invoice.customerId, session);

    await session.commitTransaction();
    res.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} permanently deleted. ` +
               `Stock restored, customer balances reversed, ${linkedPayments.length} payment(s) removed.`,
    });

  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

import PDFDocument from 'pdfkit';

// @desc    Stream invoice PDF directly to client
// @route   GET /api/invoices/:id/pdf
// @access  Private
export const streamInvoicePdf = async (req, res) => {
  try {
    const invoice = await findDocument(Invoice, req.params.id, req.user);
    if (!invoice) return res.status(404).json({ success: false, message: 'Not found' });

    await Invoice.populate(invoice, { path: 'customerId', select: 'companyName name email phone gstin gstNumber address billingAddress shippingAddress stateCode' });

    // FIX M4: scope CompanySettings to this company so PDF shows correct branding
    const companySettingsQuery = req.user?.companyId
      ? { companyId: req.user.companyId }
      : {};
    const company = await mongoose.model('CompanySettings').findOne(companySettingsQuery).lean();

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${invoice.invoiceNumber}.pdf"`
    );
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold')
       .text(company?.companyName || 'Prolync Billing', 50, 50);
    doc.fontSize(10).font('Helvetica');
    if (company?.address) {
       doc.text(`${company.address.street || ''} ${company.address.city || ''} ${company.address.state || ''}`, 50, 75);
    }
    doc.text(`GSTIN: ${company?.gstin || company?.gstNumber || 'N/A'}`, 50, 90);

    doc.fontSize(18).font('Helvetica-Bold')
       .text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(10).font('Helvetica')
       .text(`Invoice #: ${invoice.invoiceNumber}`, 400, 75, { align: 'right' })
       .text(`Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}`, 400, 90, { align: 'right' });
       
    if (invoice.dueDate) {
       doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 400, 105, { align: 'right' });
    }

    // Bill to
    doc.moveDown(2);
    doc.fontSize(11).font('Helvetica-Bold').text('Bill To:');
    doc.fontSize(10).font('Helvetica')
       .text(invoice.customerId?.companyName || invoice.customerId?.name || '');
    const formatAddress = (addr, flatFallback) => {
      if (!addr) return flatFallback || '';
      if (typeof addr === 'string') return addr;
      const hasValues = Object.values(addr).some(val => val !== undefined && val !== null && String(val).trim() !== '');
      if (!hasValues) return flatFallback || '';
      const streetParts = [addr.street1, addr.street2, addr.street].filter(Boolean).map(s => String(s).trim()).join(', ');
      return [streetParts, addr.city, addr.state, addr.zipCode || addr.pincode || addr.zip].filter(v => v && String(v).trim() !== '').join(', ');
    };
    const custBillingAddress = formatAddress(invoice.customerId?.billingAddress, invoice.customerId?.address);
    if (invoice.billingAddress) {
       doc.text(invoice.billingAddress);
    } else if (custBillingAddress) {
       doc.text(custBillingAddress);
    }
    doc.text(`GSTIN: ${invoice.customerId?.gstin || invoice.customerId?.gstNumber || 'N/A'}`)
       .text(invoice.customerId?.email || '');

    // Line items table
    doc.moveDown();
    const tableTop = doc.y + 10;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item',        50,  tableTop);
    doc.text('Qty',         280, tableTop);
    doc.text('Rate',        330, tableTop);
    doc.text('GST%',        390, tableTop);
    doc.text('Amount',      450, tableTop, { width: 80, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(530, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.font('Helvetica');
    for (const item of (invoice.lineItems || [])) {
      doc.text(item.name || 'Item',                  50,  y, { width: 220 });
      doc.text(String(item.quantity),                280, y);
      doc.text(`Rs. ${(item.rate || 0).toLocaleString('en-IN')}`, 330, y);
      doc.text(`${item.gstPercent || item.gstPercentage || 0}%`,           390, y);
      doc.text(`Rs. ${(item.amount || 0).toLocaleString('en-IN')}`, 450, y, { width: 80, align: 'right' });
      y += 20;
    }

    doc.moveTo(50, y).lineTo(530, y).stroke();
    y += 15;

    // Totals
    const addTotalRow = (label, value, bold = false) => {
      if (bold) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
      doc.text(label, 330, y);
      doc.text(`Rs. ${(value || 0).toLocaleString('en-IN')}`, 450, y, { width: 80, align: 'right' });
      y += 18;
    };

    addTotalRow('Subtotal',    invoice.subtotal || invoice.subTotal);
    if (invoice.cgst > 0) addTotalRow('CGST',  invoice.cgst);
    if (invoice.sgst > 0) addTotalRow('SGST',  invoice.sgst);
    if (invoice.igst > 0) addTotalRow('IGST',  invoice.igst);
    addTotalRow('Grand Total', invoice.grandTotal, true);
    addTotalRow('Amount Paid', invoice.amountPaid);
    addTotalRow('Balance Due', invoice.balanceDue, true);

    // Status watermark
    if (invoice.status === 'Paid') {
      doc.save();
      doc.rotate(-45, { origin: [300, 400] });
      doc.fontSize(80).fillColor('#1D9E75').opacity(0.15)
         .text('PAID', 100, 350);
      doc.restore();
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
