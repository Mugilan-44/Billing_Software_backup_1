import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import CreditNote from '../models/CreditNote.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import Item from '../models/Item.js';
import AuditLog from '../models/AuditLog.js';
import CompanySettings from '../models/CompanySettings.js';
import { createCreditNoteSchema } from '../validators/billing.validators.js';
import { computeInvoiceTotals } from '../utils/billing.utils.js';
import { getNextSequenceValue, getNextCustomSequence } from '../utils/counter.utils.js';
import { generateCreditNotePDF } from '../utils/pdfGenerator.js';
import { findDocument } from '../utils/tenant.utils.js';
import { uploadPdfToCloudinary, sendSmtpEmail } from '../utils/emailService.js';

// @desc    Get all credit notes
// @route   GET /api/credit-notes
// @access  Private
export const getCreditNotes = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'SUPER_ADMIN') {
      query.companyId = req.user.companyId;
      query.branchId  = req.user.branchId;
    }
    if (req.query.taxMode) {
      query.taxMode = req.query.taxMode;
    }
    const notes = await CreditNote.find(query)
      .populate('customerId', 'companyName name')
      .populate('invoiceId',  'invoiceNumber subtotal subTotal grandTotal')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: notes.length, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create credit note (transactional)
// @route   POST /api/credit-notes
// @access  Private
export const createCreditNote = async (req, res) => {
  const parsed = createCreditNoteSchema.safeParse(req.body);

  if (parsed.success) {
    // ── NEW: transactional path ───────────────────────────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { invoiceId, amount, reason, lineItems, reference, salesPerson, subject, termsAndConditions, subTotal, taxTotal,
              includeTerms, includeSignature, includeBankDetails, includeUpiQr } = parsed.data;
      const creditAmount = Math.round(amount * 100) / 100;

      const invoice = await Invoice.findById(invoiceId).session(session);
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status === 'Cancelled') throw new Error('Cannot issue credit note on cancelled invoice');
      if (creditAmount > invoice.grandTotal) throw new Error('Credit amount exceeds invoice total');

      const taxMode = req.body.taxMode || 'WITH_TAX';
      const cnNumber = req.body.cnNumber || await getNextCustomSequence(req.user.companyId, 'creditNote', taxMode);

      const creditNote = new CreditNote({
        cnNumber,
        invoiceId,
        customerId: invoice.customerId,
        amount: creditAmount,
        reason,
        reference,
        salesPerson,
        subject,
        termsAndConditions,
        subTotal: subTotal || 0,
        taxTotal: taxTotal || 0,
        lineItems: lineItems || [],
        date: new Date(),
        createdBy: req.user._id,
        companyId: req.user.role !== 'SUPER_ADMIN' ? req.user.companyId : null,
        branchId: req.user.role !== 'SUPER_ADMIN' ? req.user.branchId : null,
        includeTerms,
        includeSignature,
        includeBankDetails,
        includeUpiQr,
        taxMode,
      });
      await creditNote.save({ session });

      // Reduce customer outstanding
      await Customer.findByIdAndUpdate(invoice.customerId,
        { $inc: { outstandingBalance: -creditAmount } },
        { session });

      // Restore stock if items returned
      if (lineItems?.length) {
        for (const item of lineItems) {
          if (item.itemId) {
            await Item.findByIdAndUpdate(item.itemId,
              { $inc: { availableStock: item.quantity, stockQuantity: item.quantity } },
              { session });
          }
        }
      }

      // Adjust invoice balance
      const currentBalanceDue = invoice.balanceDue ?? (invoice.grandTotal - invoice.amountPaid);
      invoice.balanceDue = Math.round(Math.max(0, currentBalanceDue - creditAmount) * 100) / 100;
      if (invoice.balanceDue === 0) invoice.status = 'Paid';
      await invoice.save({ session });

      await AuditLog.create([{
        module: 'CreditNote', action: 'CREATE',
        documentId: creditNote._id, userId: req.user._id,
        changes: { after: creditNote.toObject() },
      }], { session });

      await session.commitTransaction();
      return res.status(201).json({ success: true, data: creditNote });

    } catch (err) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: err.message });
    } finally {
      session.endSession();
    }
  }

  // ── LEGACY: old frontend format ───────────────────────────────────────────────
  try {
    const { invoiceId, customerId, reason, amount, date, notes } = req.body;
    const taxMode = req.body.taxMode || 'WITH_TAX';
    const cnNumber = req.body.cnNumber || await getNextCustomSequence(req.user.companyId, 'creditNote', taxMode);

    const notePayload = {
      cnNumber, invoiceId, customerId, reason,
      amount: Number(amount),
      date: date || Date.now(),
      notes,
      taxMode,
    };

    if (req.user.role !== 'SUPER_ADMIN') {
      notePayload.companyId = req.user.companyId;
      notePayload.branchId  = req.user.branchId;
    }

    const note = await CreditNote.create(notePayload);

    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      invoice.amountPaid = Math.round((invoice.amountPaid + Number(amount)) * 100) / 100;
      const balanceDue = invoice.balanceDue ?? (invoice.grandTotal - invoice.amountPaid + Number(amount));
      invoice.balanceDue = Math.round(Math.max(0, balanceDue - Number(amount)) * 100) / 100;

      if (invoice.amountPaid >= invoice.grandTotal) {
        invoice.status = 'Paid';
      } else if (invoice.amountPaid > 0) {
        invoice.status = 'Partial';
      }
      await invoice.save();
    }

    // Reduce customer outstanding
    if (customerId) {
      await Customer.findByIdAndUpdate(customerId,
        { $inc: { outstandingBalance: -Number(amount) } });
    }

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete credit note (reverses invoice balance)
// @route   DELETE /api/credit-notes/:id
// @access  Private
export const deleteCreditNote = async (req, res) => {
  try {
    const note = await CreditNote.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Credit Note not found' });
    }

    // Revert invoice amountPaid and balanceDue
    const invoice = await Invoice.findById(note.invoiceId);
    if (invoice) {
      invoice.amountPaid = Math.round(Math.max(0, invoice.amountPaid - note.amount) * 100) / 100;
      invoice.balanceDue = Math.round((invoice.grandTotal - invoice.amountPaid) * 100) / 100;
      if (invoice.amountPaid <= 0) {
        invoice.amountPaid = 0;
        invoice.status = 'Sent';
      } else if (invoice.amountPaid < invoice.grandTotal) {
        invoice.status = 'Partial';
      }
      await invoice.save();
    }

    // Reverse customer outstanding
    await Customer.findByIdAndUpdate(note.customerId,
      { $inc: { outstandingBalance: note.amount } });

    await note.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get credit note by ID
// @route   GET /api/credit-notes/:id
// @access  Private
export const getCreditNoteById = async (req, res) => {
  try {
    const creditNote = await findDocument(CreditNote, req.params.id, req.user);
    if (!creditNote) return res.status(404).json({ success: false, message: 'Credit Note not found' });
    
    await CreditNote.populate(creditNote, [
      { path: 'customerId', select: 'companyName name email phone gstin gstNumber address billingAddress shippingAddress stateCode' },
      { path: 'invoiceId', select: 'invoiceNumber date subTotal taxTotal grandTotal balanceDue' },
      { path: 'lineItems.itemId', select: 'name sku' }
    ]);

    const creditNoteObj = creditNote.toObject ? creditNote.toObject() : creditNote;
    const unifiedItems = (creditNoteObj.lineItems && creditNoteObj.lineItems.length > 0)
      ? creditNoteObj.lineItems.map(item => ({
          itemId: item.itemId,
          name: item.name || (item.itemId ? item.itemId.name : 'Item'),
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount || (item.quantity * item.rate),
          gstPercent: item.gstPercent ?? 0,
          discountPercent: item.discountPercent ?? 0,
        }))
      : [];

    res.json({ success: true, data: { ...creditNoteObj, items: unifiedItems } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Download credit note PDF
// @route   GET /api/credit-notes/:id/download
// @access  Private
export const downloadCreditNotePdf = async (req, res) => {
  try {
    const creditNote = await findDocument(CreditNote, req.params.id, req.user);
    if (!creditNote) return res.status(404).json({ success: false, message: 'Credit Note not found' });

    const { template = 'modern', color = '#dc2626' } = req.query;
    const templateName = template || 'modern';
    const colorClean = (color || '#dc2626').replace('#', '');
    const sanitizedCnNumber = creditNote.cnNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
    const filePath = path.join(process.cwd(), 'uploads', 'credit-notes', `${creditNote._id}-${sanitizedCnNumber}-${templateName}-${colorClean}.pdf`);

    const customer = await Customer.findById(creditNote.customerId);
    if (!customer) throw new Error('Customer not found');

    const processedItems = (creditNote.lineItems && creditNote.lineItems.length > 0)
      ? creditNote.lineItems.map(i => ({
          itemId: i.itemId?._id || i.itemId,
          name: i.name || 'Item',
          description: i.description || '',
          quantity: i.quantity,
          rate: i.rate,
          amount: i.amount || (i.quantity * i.rate),
          gstPercent: i.gstPercent ?? 0,
        }))
      : [];

    await CreditNote.populate(creditNote, { path: 'invoiceId', select: 'invoiceNumber' });

    const settings = await CompanySettings.findOne({ companyId: creditNote.companyId });
    if (settings) {
      const settingsObj = settings.toObject ? settings.toObject() : settings;
      await generateCreditNotePDF(creditNote, customer, processedItems, settingsObj, template, color, filePath);
    } else {
      await generateCreditNotePDF(creditNote, customer, processedItems, {}, template, color, filePath);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'PDF not found and could not be generated' });
    }

    res.download(filePath);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send credit note via email
// @route   POST /api/credit-notes/:id/send
// @access  Private
export const sendCreditNote = async (req, res) => {
  try {
    const creditNote = await findDocument(CreditNote, req.params.id, req.user);
    if (!creditNote) return res.status(404).json({ success: false, message: 'Credit Note not found' });

    const { template = 'modern', color = '#dc2626' } = req.query;
    const templateName = template || 'modern';
    const colorClean = (color || '#dc2626').replace('#', '');
    const sanitizedCnNumber = creditNote.cnNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
    const uploadsDir = path.join(process.cwd(), 'uploads', 'credit-notes');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, `${creditNote._id}-${sanitizedCnNumber}-${templateName}-${colorClean}.pdf`);

    const customer = await Customer.findById(creditNote.customerId);
    if (!customer) throw new Error('Customer not found');
    if (!customer.email) {
      return res.status(400).json({ success: false, message: 'Customer has no email address configured' });
    }

    const settings = await CompanySettings.findOne({ companyId: creditNote.companyId });
    if (!settings) throw new Error('Company settings not found');

    const processedItems = (creditNote.lineItems && creditNote.lineItems.length > 0)
      ? creditNote.lineItems.map(i => ({
          itemId: i.itemId?._id || i.itemId,
          name: i.name || 'Item',
          description: i.description || '',
          quantity: i.quantity,
          rate: i.rate,
          amount: i.amount || (i.quantity * i.rate),
          gstPercent: i.gstPercent ?? 0,
        }))
      : [];

    await CreditNote.populate(creditNote, { path: 'invoiceId', select: 'invoiceNumber' });

    const settingsObj = settings.toObject ? settings.toObject() : settings;
    await generateCreditNotePDF(creditNote, customer, processedItems, settingsObj, template, color, filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error('PDF file generation failed');
    }

    // Upload to Cloudinary
    let cloudinaryUrl;
    try {
      cloudinaryUrl = await uploadPdfToCloudinary(
        filePath,
        `${creditNote._id}-${sanitizedCnNumber}-${templateName}-${colorClean}`
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
      const subject = req.body.subject || `Credit Note ${creditNote.cnNumber} from ${settings.companyName || 'Prolync Billing'}`;
      const messageBody = req.body.message || `Hello ${customer.companyName || customer.name || 'Customer'},\n\nPlease find attached your Credit Note ${creditNote.cnNumber} for ₹${creditNote.amount.toFixed(2)}.\n\nThank you!\n\nBest regards,\n${settings.companyName || 'Prolync Billing'}`;

      let text = messageBody;
      if (!text.includes(cloudinaryUrl)) {
        text += `\n\nClick here for further details: ${cloudinaryUrl}`;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #dc2626; margin-top: 0; font-size: 20px;">Credit Note ${creditNote.cnNumber}</h2>
          <p style="white-space: pre-line;">${messageBody}</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${cloudinaryUrl}" target="_blank" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">
              Click here for further details
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">If the button above does not work, copy and paste this link into your browser:<br/><a href="${cloudinaryUrl}" style="color: #dc2626; text-decoration: underline;">${cloudinaryUrl}</a></p>
        </div>
      `;

      await sendSmtpEmail({
        to: emailTo,
        subject,
        text,
        html,
        attachments: [
          {
            filename: `${creditNote.cnNumber}.pdf`,
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

    res.json({ success: true, data: creditNote, message: 'Email sent successfully with Cloudinary link!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update credit note status
// @route   PUT /api/credit-notes/:id/status
// @access  Private
export const updateCreditNoteStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Open', 'Closed', 'Refunded', 'Applied'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const creditNote = await findDocument(CreditNote, req.params.id, req.user);
    if (!creditNote) {
      return res.status(404).json({ success: false, message: 'Credit Note not found' });
    }
    creditNote.status = status;
    await creditNote.save();
    res.status(200).json({ success: true, data: creditNote });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

