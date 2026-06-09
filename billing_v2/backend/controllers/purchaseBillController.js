import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import PurchaseBill from '../models/PurchaseBill.js';
import Vendor from '../models/Vendor.js';
import Item from '../models/Item.js';
import StockHistory from '../models/StockHistory.js';
import VendorLedgerEntry from '../models/VendorLedgerEntry.js';
import CompanySettings from '../models/CompanySettings.js';
import { createPurchaseBillSchema } from '../validators/billing.validators.js';
import { getNextCustomSequence } from '../utils/counter.utils.js';
import { parseUTC } from '../utils/dateUtils.js';
import { findDocument } from '../utils/tenant.utils.js';
import AuditLog from '../models/AuditLog.js';
import { generatePurchaseBillPDF } from '../utils/pdfGenerator.js';
import { uploadPdfToCloudinary, sendSmtpEmail } from '../utils/emailService.js';
import { calculateInvoice } from '../utils/calculateInvoice.js';

// @desc    Create a purchase bill (transactional)
// @route   POST /api/purchase-bills
// @access  Private
export const createPurchaseBill = async (req, res) => {
  const parsed = createPurchaseBillSchema.safeParse(req.body);

  if (parsed.success) {
    // ── NEW: transactional path ───────────────────────────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { vendorId, lineItems, date, dueDate, notes,
              taxType = 'GST', taxRate, isTaxed = true, useProductSpecificTax = true,
              tdsTcsType = 'None', tdsPercentage = 0, tcsPercentage = 0, discount = 0,
              includeTerms = true, includeSignature = false, includeBankDetails = true, includeUpiQr = true } = parsed.data;

      const vendor = await findDocument(Vendor, vendorId, req.user, session);
      if (!vendor) throw new Error('Vendor not found');

      const companySettings = await CompanySettings.findOne({ companyId: req.user.companyId || null }).session(session);
      const companyStateCode = companySettings?.stateCode || (companySettings?.gstin ? companySettings.gstin.substring(0, 2) : null);
      const vendorStateCode = vendor?.stateCode || (vendor?.gstNumber ? vendor.gstNumber.substring(0, 2) : null);

      const totals = calculateInvoice({
        lineItems,
        discountPercent: 0,
        discountFixed: Number(discount) || 0,
        companyStateCode,
        customerStateCode: vendorStateCode,
        taxType,
        taxRate,
        isTaxed,
        useProductSpecificTax,
        tdsTcsType,
        tdsPercentage,
        tcsPercentage
      });

      const subtotal = totals.subtotal.toNumber();
      const taxAmount = totals.taxAmount.toNumber();
      const grandTotal = totals.grandTotal.toNumber();

      const taxMode = req.body.taxMode || 'WITH_TAX';
      const billNumber = req.body.billNumber || await getNextCustomSequence(req.user.companyId, 'purchaseBill', taxMode);

      const bill = new PurchaseBill({
        companyId: req.user.companyId || null,
        branchId:  req.user.branchId || null,
        billNumber, vendorId,
        date:      new Date(date),
        billDate:  new Date(date),
        dueDate:   dueDate ? new Date(dueDate) : undefined,
        lineItems: totals.lineItems,
        items:     totals.lineItems,
        subtotal, subTotal: subtotal,
        taxAmount, taxTotal: taxAmount,
        cgst:      totals.cgst.toNumber(),
        sgst:      totals.sgst.toNumber(),
        igst:      totals.igst.toNumber(),
        discount:  Number(discount) || 0,
        grandTotal,
        balanceDue: grandTotal,
        notes,
        isTaxed,
        taxType,
        taxRate,
        useProductSpecificTax,
        taxMode,
        tdsTcsType,
        tdsPercentage: Number(tdsPercentage) || 0,
        tdsAmount: totals.tdsAmount.toNumber(),
        tcsPercentage: Number(tcsPercentage) || 0,
        tcsAmount: totals.tcsAmount.toNumber(),
        includeTerms,
        includeSignature,
        includeBankDetails,
        includeUpiQr,
      });
      await bill.save({ session });

      // FIX H7: openingBalance is a STATIC field set at vendor creation.
      // Only update outstandingBalance (money owed to vendor) and totalBusiness (lifetime purchases).
      vendor.outstandingBalance = Math.round(((vendor.outstandingBalance || 0) + grandTotal) * 100) / 100;
      vendor.totalBusiness      = Math.round(((vendor.totalBusiness || 0) + grandTotal) * 100) / 100;
      await vendor.save({ session });

      // Save a ledger entry for the vendor
      await VendorLedgerEntry.create([{
        companyId:   req.user.companyId || null,
        branchId:    req.user.branchId  || null,
        vendorId,
        type:        'PurchaseBill',
        referenceId: bill._id,
        description: `Purchase Bill ${billNumber}`,
        credit:      grandTotal,
        balance:     vendor.outstandingBalance,
      }], { session });

      // Increase stock for goods items + write StockHistory
      for (const item of lineItems) {
        if (item.itemId) {
          const dbItem = await Item.findById(item.itemId).session(session);
          if (dbItem && dbItem.type !== 'Service') {
            const prevStock = dbItem.availableStock ?? dbItem.stockQuantity ?? 0;
            const newStock  = Math.round((prevStock + item.quantity) * 100) / 100;
            dbItem.availableStock = newStock;
            dbItem.stockQuantity  = newStock;
            await dbItem.save({ session });

            await StockHistory.create([{
              companyId:     req.user.companyId || null,
              branchId:      req.user.branchId  || null,
              itemId:        dbItem._id,
              action:        'IN',
              quantity:      item.quantity,
              previousStock: prevStock,
              currentStock:  newStock,
              referenceId:   bill._id,
              referenceType: 'PurchaseBill',
              notes:         `Purchase Bill ${billNumber}`,
            }], { session });
          }
        }
      }

      await session.commitTransaction();
      return res.status(201).json({ success: true, data: bill });

    } catch (err) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: err.message });
    } finally {
      session.endSession();
    }
  }

  // ── LEGACY: old frontend format ───────────────────────────────────────────────
  try {
    const { vendorId, items, discount = 0, notes } = req.body;

    const vendor = await findDocument(Vendor, vendorId, req.user);
    if (!vendor) throw new Error('Vendor not found');

    let subTotal = 0, taxTotal = 0;
    const processedItems = [];

    for (const i of items) {
      const dbItem = await Item.findById(i.itemId);
      if (!dbItem) throw new Error(`Item not found: ${i.itemId}`);

      const amount    = i.quantity * i.rate;
      const taxAmount = amount * ((dbItem.gstPercentage || dbItem.gstPercent || 0) / 100);
      subTotal  += amount;
      taxTotal  += taxAmount;

      processedItems.push({
        itemId: dbItem._id, name: dbItem.name,
        quantity: i.quantity, rate: i.rate,
        gstPercentage: dbItem.gstPercentage || dbItem.gstPercent || 0,
      });
    }

    const grandTotal = Math.round(subTotal + taxTotal - discount);

    const taxMode = req.body.taxMode || 'WITH_TAX';
    const billNumber = req.body.billNumber || await getNextCustomSequence(req.user.companyId, 'purchaseBill', taxMode);

    const purchaseBillPayload = {
      billNumber, vendorId, items: processedItems,
      discount, subTotal, subtotal: subTotal,
      taxTotal, taxAmount: taxTotal,
      grandTotal, balanceDue: grandTotal, notes, taxMode
    };

    if (req.user.role !== 'SUPER_ADMIN') {
      purchaseBillPayload.companyId = req.user.companyId;
      purchaseBillPayload.branchId  = req.user.branchId;
    }

    const purchaseBill = new PurchaseBill(purchaseBillPayload);
    await purchaseBill.save();

    for (const i of processedItems) {
      const dbItem = await Item.findById(i.itemId);
      if (dbItem && dbItem.type !== 'Service') {
        const prevStock  = dbItem.stockQuantity || 0;
        const newStock   = prevStock + i.quantity;
        dbItem.stockQuantity  = newStock;
        dbItem.availableStock = newStock;
        await dbItem.save();

        const stockHistory = new StockHistory({
          itemId: dbItem._id, action: 'IN', quantity: i.quantity,
          previousStock: prevStock, currentStock: newStock,
          referenceId: purchaseBill._id, referenceType: 'PurchaseBill',
          notes: `Purchase Bill ${billNumber}`,
        });
        await stockHistory.save();
      }
    }

    // FIX H7: do NOT touch openingBalance — it is a static field
    vendor.outstandingBalance = Math.round(((vendor.outstandingBalance || 0) + grandTotal) * 100) / 100;
    vendor.totalBusiness      = Math.round(((vendor.totalBusiness || 0) + grandTotal) * 100) / 100;
    await vendor.save();

    const ledgerEntry = new VendorLedgerEntry({
      vendorId, type: 'PurchaseBill', referenceId: purchaseBill._id,
      description: `Purchase Bill ${billNumber}`, credit: grandTotal,
      balance: vendor.openingBalance,
    });
    await ledgerEntry.save();

    res.status(201).json({ success: true, data: purchaseBill });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This Purchase Bill Number already exists. Please choose a unique one.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Pay a purchase bill
// @route   POST /api/purchase-bills/:id/pay
// @access  Private
export const payPurchaseBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { amount, date, mode, reference } = req.body;
    const payAmount = Math.round(Number(amount) * 100) / 100;

    const bill = await findDocument(PurchaseBill, req.params.id, req.user, session);
    if (!bill) throw new Error('Purchase bill not found');
    if (bill.status === 'Paid') throw new Error('Bill already fully paid');
    if (payAmount > bill.balanceDue + 0.01) {
      throw new Error(`Payment ₹${payAmount} exceeds balance due ₹${bill.balanceDue}`);
    }

    bill.amountPaid = Math.round(((bill.amountPaid || 0) + payAmount) * 100) / 100;
    bill.balanceDue = Math.round((bill.grandTotal - bill.amountPaid) * 100) / 100;
    bill.status     = bill.balanceDue <= 0.01 ? 'Paid' : 'Partial';
    if (bill.balanceDue < 0) bill.balanceDue = 0;
    await bill.save({ session });

    if (bill.vendorId) {
      await Vendor.findByIdAndUpdate(bill.vendorId,
        { $inc: { outstandingBalance: -payAmount } },
        { session }
      );
    }

    await session.commitTransaction();
    res.json({ success: true, data: bill });
  } catch (err) {
    await session.abortTransaction();
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'This Purchase Bill Number already exists. Please choose a unique one.' });
    }
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// @desc    Get all purchase bills
// @route   GET /api/purchase-bills
// @access  Private
export const getPurchaseBills = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'SUPER_ADMIN') {
      query.companyId = req.user.companyId;
      query.branchId  = req.user.branchId;
    }
    const bills = await PurchaseBill.find(query)
      .populate('vendorId', 'companyName name email')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single purchase bill
// @route   GET /api/purchase-bills/:id
// @access  Private
export const getPurchaseBillById = async (req, res) => {
  try {
    const bill = await findDocument(PurchaseBill, req.params.id, req.user);
    if (!bill) return res.status(404).json({ success: false, message: 'Purchase Bill not found' });
    await PurchaseBill.populate(bill, { path: 'vendorId' });
    res.status(200).json({ success: true, data: bill });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update purchase bill status
// @route   PUT /api/purchase-bills/:id/status
// @access  Private
export const updatePurchaseBillStatus = async (req, res) => {
  try {
    const bill = await findDocument(PurchaseBill, req.params.id, req.user);
    if (!bill) return res.status(404).json({ success: false, message: 'Purchase Bill not found' });
    bill.status = req.body.status;
    await bill.save();
    res.status(200).json({ success: true, data: bill });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a purchase bill with cascading vendor + stock reversal (transactional)
// @route   DELETE /api/purchase-bills/:id
// @access  Private
export const deletePurchaseBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bill = await findDocument(PurchaseBill, req.params.id, req.user, session);
    if (!bill) throw new Error('Purchase Bill not found');
    if (bill.status === 'Paid') {
      throw new Error(
        'Cannot delete a fully paid purchase bill. ' +
        'Contact your accountant to reverse the payment entry first.'
      );
    }

    const snapshot  = bill.toObject();
    const round     = (v) => Math.round(v * 100) / 100;
    const lineItems  = bill.lineItems?.length ? bill.lineItems : bill.items || [];

    // ── 1. Inventory deduction (with zero-floor guard) ────────────────────────
    for (const li of lineItems) {
      if (!li.itemId) continue;
      const item = await Item.findById(li.itemId).session(session);
      if (!item) continue;

      const currentStock = item.availableStock ?? item.stockQuantity ?? 0;
      if (currentStock - li.quantity < 0) {
        throw new Error(
          `Cannot delete bill: item "${item.name}" currently has ` +
          `${currentStock} units in stock, but the bill added ${li.quantity}. ` +
          `Deleting would drive stock below zero. Reconcile inventory first.`
        );
      }

      await Item.findByIdAndUpdate(
        li.itemId,
        { $inc: { availableStock: -li.quantity, stockQuantity: -li.quantity } },
        { session }
      );
    }

    // ── 2. Vendor balance reversal ──────────────────────────────────────────
    if (bill.vendorId) {
      await Vendor.findByIdAndUpdate(
        bill.vendorId,
        {
          $inc: {
            outstandingBalance: -round(bill.grandTotal),
            totalBusiness:      -round(bill.grandTotal),
            openingBalance:     -round(bill.grandTotal),
          },
        },
        { session }
      );
    }

    // ── 3. Audit log before deletion ──────────────────────────────────────────
    await AuditLog.create([{
      module:     'PurchaseBill',
      action:     'DELETE',
      documentId: bill._id,
      userId:     req.user._id,
      changes:    { before: snapshot, reason: req.body.reason || 'Manual deletion' },
    }], { session });

    // ── 4. Delete the bill ──────────────────────────────────────────────────
    await bill.deleteOne({ session });

    await session.commitTransaction();
    res.json({
      success: true,
      message: `Purchase Bill ${bill.billNumber} deleted. ` +
               `Vendor balances and stock have been reversed.`,
    });

  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// @desc    Update purchase bill with cascading vendor + stock adjustments (transactional)
// @route   PUT /api/purchase-bills/:id
// @access  Private
export const updatePurchaseBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bill = await findDocument(PurchaseBill, req.params.id, req.user, session);
    if (!bill) return res.status(404).json({ success: false, message: 'Purchase Bill not found' });
    if (bill.status === 'Paid') {
      throw new Error('Cannot edit a fully paid purchase bill.');
    }

    const { vendorId, lineItems, items, discount = 0, notes, date, dueDate,
            taxType = 'GST', taxRate, isTaxed = true, useProductSpecificTax = true,
            tdsTcsType = 'None', tdsPercentage = 0, tcsPercentage = 0,
            includeTerms, includeSignature, includeBankDetails, includeUpiQr } = req.body;

    const round = (v) => Math.round(v * 100) / 100;

    // ── 1. Revert Old Stock ──────────────────────────────────────────
    const oldLineItems = bill.lineItems?.length ? bill.lineItems : bill.items || [];
    for (const oldLi of oldLineItems) {
      if (!oldLi.itemId) continue;
      const dbItem = await Item.findById(oldLi.itemId).session(session);
      if (dbItem && dbItem.type !== 'Service') {
        const prevStock = dbItem.availableStock ?? dbItem.stockQuantity ?? 0;
        const newStock = Math.round((prevStock - oldLi.quantity) * 100) / 100;
        dbItem.availableStock = newStock;
        dbItem.stockQuantity = newStock;
        await dbItem.save({ session });

        await StockHistory.create([{
          companyId:     req.user.companyId || null,
          branchId:      req.user.branchId  || null,
          itemId:        dbItem._id,
          action:        'OUT',
          quantity:      oldLi.quantity,
          previousStock: prevStock,
          currentStock:  newStock,
          referenceId:   bill._id,
          referenceType: 'PurchaseBill',
          notes:         `Purchase Bill ${bill.billNumber} Update Reversal`,
        }], { session });
      }
    }

    // ── 2. Revert Old Vendor Balance ─────────────────────────────────
    if (bill.vendorId) {
      const oldVendor = await findDocument(Vendor, bill.vendorId, req.user, session);
      if (oldVendor) {
        oldVendor.outstandingBalance = Math.round(((oldVendor.outstandingBalance || 0) - bill.grandTotal) * 100) / 100;
        oldVendor.totalBusiness      = Math.round(((oldVendor.totalBusiness || 0) - bill.grandTotal) * 100) / 100;
        await oldVendor.save({ session });
      }
    }

    // ── 3. Calculate New Totals & items ──────────────────────────────
    const sourceItems = lineItems || items || [];
    const companySettings = await CompanySettings.findOne({ companyId: req.user.companyId || null }).session(session);
    const companyStateCode = companySettings?.stateCode || (companySettings?.gstin ? companySettings.gstin.substring(0, 2) : null);
    
    const activeVendorId = vendorId || bill.vendorId;
    const activeVendor = await findDocument(Vendor, activeVendorId, req.user, session);
    const vendorStateCode = activeVendor?.stateCode || (activeVendor?.gstNumber ? activeVendor.gstNumber.substring(0, 2) : null);

    const totals = calculateInvoice({
      lineItems: sourceItems,
      discountPercent: 0,
      discountFixed: Number(discount) || 0,
      companyStateCode,
      customerStateCode: vendorStateCode,
      taxType,
      taxRate,
      isTaxed,
      useProductSpecificTax,
      tdsTcsType,
      tdsPercentage: Number(tdsPercentage) || 0,
      tcsPercentage: Number(tcsPercentage) || 0
    });

    const subtotal = totals.subtotal.toNumber();
    const taxAmount = totals.taxAmount.toNumber();
    const newGrandTotal = totals.grandTotal.toNumber();

    // ── 4. Apply New Stock ───────────────────────────────────────────
    for (const item of totals.lineItems) {
      const dbItem = await Item.findById(item.itemId).session(session);
      if (dbItem && dbItem.type !== 'Service') {
        const prevStock = dbItem.availableStock ?? dbItem.stockQuantity ?? 0;
        const newStock  = Math.round((prevStock + item.quantity) * 100) / 100;
        dbItem.availableStock = newStock;
        dbItem.stockQuantity  = newStock;
        await dbItem.save({ session });

        await StockHistory.create([{
          companyId:     req.user.companyId || null,
          branchId:      req.user.branchId  || null,
          itemId:        dbItem._id,
          action:        'IN',
          quantity:      item.quantity,
          previousStock: prevStock,
          currentStock:  newStock,
          referenceId:   bill._id,
          referenceType: 'PurchaseBill',
          notes:         `Purchase Bill ${bill.billNumber} Updated`,
        }], { session });
      }
    }

    // ── 5. Update Bill Fields ────────────────────────────────────────
    if (vendorId) bill.vendorId = vendorId;
    if (date) {
      bill.date = new Date(date);
      bill.billDate = new Date(date);
    }
    if (dueDate) bill.dueDate = new Date(dueDate);
    bill.lineItems = totals.lineItems;
    bill.items = totals.lineItems;
    bill.subtotal = subtotal;
    bill.subTotal = subtotal;
    bill.taxAmount = taxAmount;
    bill.taxTotal = taxAmount;
    bill.cgst = totals.cgst.toNumber();
    bill.sgst = totals.sgst.toNumber();
    bill.igst = totals.igst.toNumber();
    bill.discount = Number(discount) || 0;
    bill.grandTotal = newGrandTotal;
    bill.balanceDue = Math.max(0, newGrandTotal - (bill.amountPaid || 0));
    
    bill.isTaxed = isTaxed;
    bill.taxType = taxType;
    bill.taxRate = taxRate;
    bill.useProductSpecificTax = useProductSpecificTax;
    bill.tdsTcsType = tdsTcsType;
    bill.tdsPercentage = Number(tdsPercentage) || 0;
    bill.tdsAmount = totals.tdsAmount.toNumber();
    bill.tcsPercentage = Number(tcsPercentage) || 0;
    bill.tcsAmount = totals.tcsAmount.toNumber();

    if (notes !== undefined) bill.notes = notes;
    if (includeTerms !== undefined) bill.includeTerms = includeTerms;
    if (includeSignature !== undefined) bill.includeSignature = includeSignature;
    if (includeBankDetails !== undefined) bill.includeBankDetails = includeBankDetails;
    if (includeUpiQr !== undefined) bill.includeUpiQr = includeUpiQr;

    await bill.save({ session });

    // ── 6. Apply New Vendor Balance ──────────────────────────────────
    if (bill.vendorId) {
      const newVendor = await findDocument(Vendor, bill.vendorId, req.user, session);
      if (newVendor) {
        newVendor.outstandingBalance = Math.round(((newVendor.outstandingBalance || 0) + newGrandTotal) * 100) / 100;
        newVendor.totalBusiness      = Math.round(((newVendor.totalBusiness || 0) + newGrandTotal) * 100) / 100;
        await newVendor.save({ session });
      }
    }

    // Audit log
    await AuditLog.create([{
      module:     'PurchaseBill',
      action:     'UPDATE',
      documentId: bill._id,
      userId:     req.user._id,
      changes:    { after: bill.toObject() },
    }], { session });

    await session.commitTransaction();
    res.json({ success: true, data: bill });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

export const downloadPurchaseBillPdf = async (req, res) => {
  try {
    const purchaseBill = await findDocument(PurchaseBill, req.params.id, req.user);
    if (!purchaseBill) return res.status(404).json({ success: false, message: 'Purchase Bill not found' });

    const { template = 'modern', color = '#2563eb' } = req.query;
    const templateName = template || 'modern';
    const colorClean = (color || '#2563eb').replace('#', '');
    const sanitizedBillNumber = purchaseBill.billNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'purchase-bills');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, `${purchaseBill._id}-${sanitizedBillNumber}-${templateName}-${colorClean}.pdf`);

    const vendor = await Vendor.findById(purchaseBill.vendorId);
    const processedItems = purchaseBill.items.map(i => ({
      itemId: i.itemId?._id || i.itemId,
      name: i.name || 'Item',
      description: i.description || '',
      quantity: i.quantity,
      rate: i.rate,
      amount: i.amount || (i.quantity * i.rate),
      gstPercentage: i.gstPercent ?? i.gstPercentage ?? 0,
    }));

    const settings = await CompanySettings.findOne({ companyId: purchaseBill.companyId });
    if (vendor && settings) {
      const settingsObj = settings.toObject ? settings.toObject() : settings;
      const filteredSettings = {
        ...settingsObj,
        bankDetails: purchaseBill.includeBankDetails !== false ? settingsObj.bankDetails : null,
        upiId: purchaseBill.includeUpiQr !== false ? settingsObj.upiId : null,
        upiQrUrl: purchaseBill.includeUpiQr !== false ? settingsObj.upiQrUrl : null,
      };
      await generatePurchaseBillPDF(purchaseBill, vendor, processedItems, filteredSettings, template, color, filePath);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'PDF not found and could not be generated' });
    }

    res.download(filePath);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendPurchaseBill = async (req, res) => {
  try {
    const purchaseBill = await findDocument(PurchaseBill, req.params.id, req.user);
    if (!purchaseBill) return res.status(404).json({ success: false, message: 'Purchase Bill not found' });

    const { template = 'modern', color = '#2563eb' } = req.query;
    const templateName = template || 'modern';
    const colorClean = (color || '#2563eb').replace('#', '');
    const sanitizedBillNumber = purchaseBill.billNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'purchase-bills');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, `${purchaseBill._id}-${sanitizedBillNumber}-${templateName}-${colorClean}.pdf`);

    const vendor = await Vendor.findById(purchaseBill.vendorId);
    if (!vendor) throw new Error('Vendor not found');
    if (!vendor.email) {
      return res.status(400).json({ success: false, message: 'Vendor has no email address configured' });
    }

    const settings = await CompanySettings.findOne({ companyId: purchaseBill.companyId });
    if (!settings) throw new Error('Company settings not found');

    const processedItems = purchaseBill.items.map(i => ({
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
      bankDetails: purchaseBill.includeBankDetails !== false ? settingsObj.bankDetails : null,
      upiId: purchaseBill.includeUpiQr !== false ? settingsObj.upiId : null,
      upiQrUrl: purchaseBill.includeUpiQr !== false ? settingsObj.upiQrUrl : null,
    };

    await generatePurchaseBillPDF(purchaseBill, vendor, processedItems, filteredSettings, template, color, filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error('PDF file generation failed');
    }

    let cloudinaryUrl;
    try {
      cloudinaryUrl = await uploadPdfToCloudinary(
        filePath,
        `${purchaseBill._id}-${sanitizedBillNumber}-${templateName}-${colorClean}`
      );
    } catch (uploadErr) {
      return res.status(400).json({
        success: false,
        message: `Cloudinary upload failed: ${uploadErr.message}`
      });
    }

    const emailSubject = `Purchase Bill ${purchaseBill.billNumber} from ${settings.companyName || 'Our Company'}`;
    const emailBody = `
      <p>Dear ${vendor.name || 'Vendor'},</p>
      <p>Please find attached the purchase bill <strong>${purchaseBill.billNumber}</strong>.</p>
      <p>Total Amount: <strong>${settings.currency?.symbol || 'INR'} ${purchaseBill.grandTotal}</strong></p>
      <p>Thank you for your business!</p>
    `;

    await sendSmtpEmail({
      to: vendor.email,
      subject: emailSubject,
      html: emailBody,
      attachmentUrl: cloudinaryUrl,
      attachmentName: `${purchaseBill.billNumber}.pdf`
    });

    res.json({ success: true, message: 'Purchase Bill sent successfully via email' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
