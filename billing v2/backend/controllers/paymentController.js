import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import AuditLog from '../models/AuditLog.js';
import LedgerEntry from '../models/LedgerEntry.js';
import CompanySettings from '../models/CompanySettings.js';
import { recordPaymentSchema } from '../validators/billing.validators.js';
import { getNextSequenceValue } from '../utils/counter.utils.js';
import { recalculateCustomerLedger } from './invoiceController.js';
import { parseUTC } from '../utils/dateUtils.js';
import { findDocument } from '../utils/tenant.utils.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

const round = (v) => Math.round(v * 100) / 100;

/**
 * Re-derive invoice status from amountPaid vs grandTotal.
 * Keeps "Overdue" intact if no payment covers the balance.
 */
function deriveInvoiceStatus(invoice) {
  const balance = round(invoice.grandTotal - invoice.amountPaid);
  if (balance <= 0)    return 'Paid';
  if (invoice.amountPaid > 0) return 'Partial';
  // Restore appropriate unpaid status
  if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) return 'Overdue';
  return invoice.status === 'Draft' ? 'Draft' : 'Sent';
}

// ─── @desc  Record a payment (transactional) ──────────────────────────────────
// @route POST /api/payments
// @access Private
export const recordPayment = async (req, res) => {
  const parsed = recordPaymentSchema.safeParse(req.body);

  if (parsed.success) {
    // ── NEW: fully transactional path ────────────────────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { invoiceId, amount, date, mode, reference, notes } = parsed.data;
      const payAmount = round(amount);

      const invoice = await findDocument(Invoice, invoiceId, req.user, session);
      if (!invoice)                      throw new Error('Invoice not found');
      if (invoice.status === 'Cancelled') throw new Error('Cannot record payment on a cancelled invoice');
      if (invoice.status === 'Paid')      throw new Error('Invoice is already fully paid');

      const balanceDue = round(
        invoice.balanceDue !== undefined
          ? invoice.balanceDue
          : invoice.grandTotal - invoice.amountPaid
      );
      if (payAmount > balanceDue + 0.01) {
        throw new Error(`Payment ₹${payAmount} exceeds balance due ₹${balanceDue.toFixed(2)}`);
      }

      const paymentNumber = await getNextSequenceValue('payment', 'PMT', req.user.companyId);
      const payDate = parseUTC(date) || new Date();

      const payment = new Payment({
        paymentNumber,
        invoiceId,
        customerId:      invoice.customerId,
        amount:          payAmount,
        date:            payDate,
        paymentDate:     payDate,          // legacy field kept in sync
        mode,
        paymentMode:     mode,             // legacy
        reference,
        referenceNumber: reference,        // legacy
        notes,
        createdBy:       req.user._id,
        ...(req.user.role !== 'SUPER_ADMIN' && {
          companyId: req.user.companyId,
          branchId:  req.user.branchId,
        }),
      });
      await payment.save({ session });

      // ── SAFE RECONCILIATION: Sum all payments directly ────────────────────
      const paymentAgg = await Payment.aggregate([
        { $match: { invoiceId: invoice._id } },
        { $group: { _id: null, sum: { $sum: '$amount' } } }
      ]).session(session);
      
      const totalPaid = round(paymentAgg[0]?.sum || 0);

      invoice.amountPaid = totalPaid;
      invoice.balanceDue = round(Math.max(0, invoice.grandTotal - totalPaid));
      invoice.status     = deriveInvoiceStatus(invoice);
      await invoice.save({ session });

      // Create ledger entry
      const ledgerEntry = new LedgerEntry({
        customerId: invoice.customerId,
        type:        'Payment',
        referenceId: payment._id,
        description: `Payment Received (Ref: ${reference || paymentNumber})`,
        credit:      payAmount,
        date:        payDate,
        balance:     0,
      });
      await ledgerEntry.save({ session });

      // Recalculate customer balances and ledger running balances safely
      await recalculateCustomerLedger(invoice.customerId, session);

      await AuditLog.create([{
        module:     'Payment',
        action:     'CREATE',
        documentId: payment._id,
        userId:     req.user._id,
        changes:    { after: payment.toObject() },
      }], { session });

      await session.commitTransaction();
      return res.status(201).json({ success: true, data: { payment, invoice } });

    } catch (err) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: err.message });
    } finally {
      session.endSession();
    }
  }

  // ── LEGACY: older frontend format (non-Zod path) ──────────────────────────
  try {
    const {
      customerId, invoiceId, amount, paymentMode,
      referenceNumber, paymentDate, notes,
    } = req.body;

    const customer = await findDocument(Customer, customerId, req.user);
    if (!customer) throw new Error('Customer not found');

    const settings     = await CompanySettings.findOne({ companyId: req.user.companyId || null });
    const paymentNumber = await getNextSequenceValue('payment', 'PMT', req.user.companyId);
    const payDate      = parseUTC(paymentDate) || new Date();
    const payAmount    = round(Number(amount));

    const paymentDoc = {
      paymentNumber, customerId, invoiceId, amount: payAmount,
      paymentMode, referenceNumber,
      paymentDate: payDate, date: payDate,
      mode: paymentMode, reference: referenceNumber,
      notes,
    };

    if (req.user.role !== 'SUPER_ADMIN') {
      paymentDoc.companyId = req.user.companyId;
      paymentDoc.branchId  = req.user.branchId;
    }

    const payment = new Payment(paymentDoc);
    await payment.save();

    if (invoiceId) {
      const invoice = await findDocument(Invoice, invoiceId, req.user);
      if (!invoice) throw new Error('Invoice not found');

      const balanceDue = round(
        invoice.balanceDue !== undefined
          ? invoice.balanceDue
          : invoice.grandTotal - invoice.amountPaid
      );
      if (payAmount > balanceDue + 0.01) {
        throw new Error(`Payment amount (${payAmount}) exceeds pending balance (${balanceDue.toFixed(2)})`);
      }

      const paymentAgg = await Payment.aggregate([
        { $match: { invoiceId: invoice._id } },
        { $group: { _id: null, sum: { $sum: '$amount' } } }
      ]);
      const totalPaid = round(paymentAgg[0]?.sum || 0);

      invoice.amountPaid = totalPaid;
      invoice.balanceDue = round(Math.max(0, invoice.grandTotal - totalPaid));
      invoice.status     = deriveInvoiceStatus(invoice);
      await invoice.save();
    }

    const ledgerEntry = new LedgerEntry({
      customerId,
      type:        'Payment',
      referenceId: payment._id,
      description: `Payment Received (Ref: ${referenceNumber || paymentNumber})`,
      credit:      payAmount,
      balance:     round(customer.outstandingBalance - payAmount),
    });
    await ledgerEntry.save();

    // Recalculate customer balances and ledger running balances safely
    await recalculateCustomerLedger(customerId);

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── @desc  Get all payments ──────────────────────────────────────────────────
// @route GET /api/payments
// @access Private
export const getPayments = async (req, res) => {
  try {
    const { customerId, invoiceId, from, to } = req.query;
    const filter = {};

    if (req.user.role !== 'SUPER_ADMIN') {
      filter.companyId = req.user.companyId;
      filter.branchId  = req.user.branchId;
    } else if (req.user.role === 'CUSTOMER') {
      filter.customerId = req.user.customerId;
    }

    if (customerId) filter.customerId = customerId;
    if (invoiceId)  filter.invoiceId  = invoiceId;
    if (from || to) {
      filter.date = {};
      const fromDate = parseUTC(from);
      const toDate   = parseUTC(to);
      if (fromDate) filter.date.$gte = fromDate;
      if (toDate)   filter.date.$lte = toDate;
    }

    const payments = await Payment.find(filter)
      .populate('invoiceId',  'invoiceNumber grandTotal balanceDue')
      .populate('customerId', 'companyName name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── @desc  Delete a payment (cascading reversal, transactional) ──────────────
// @route DELETE /api/payments/:id
// @access Private
export const deletePayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await findDocument(Payment, req.params.id, req.user, session);
    if (!payment) throw new Error('Payment not found');

    const snapshot = payment.toObject();
    const payAmount = round(payment.amount);

    // Delete payment ledger entry
    await LedgerEntry.deleteMany({ referenceId: payment._id }, { session });

    // ── 3. Audit log before deletion ─────────────────────────────────────────
    await AuditLog.create([{
      module:     'Payment',
      action:     'DELETE',
      documentId: payment._id,
      userId:     req.user._id,
      changes:    { before: snapshot, reason: req.body?.reason || 'Manual deletion' },
    }], { session });

    // ── 3. Delete the payment ─────────────────────────────────────────────────
    await payment.deleteOne({ session });

    // ── 4. Reverse invoice using safe reconciliation ───────────────────────────
    const invoice = await findDocument(Invoice, payment.invoiceId, req.user, session);
    if (invoice) {
      const paymentAgg = await Payment.aggregate([
        { $match: { invoiceId: invoice._id } },
        { $group: { _id: null, sum: { $sum: '$amount' } } }
      ]).session(session);
      
      const totalPaid = round(paymentAgg[0]?.sum || 0);
      invoice.amountPaid = totalPaid;
      invoice.balanceDue = round(invoice.grandTotal - totalPaid);
      invoice.status     = deriveInvoiceStatus(invoice);
      await invoice.save({ session });
    }

    // Recalculate customer balances and ledger running balances safely
    const customerId = payment.customerId || invoice?.customerId;
    if (customerId) {
      await recalculateCustomerLedger(customerId, session);
    }

    await session.commitTransaction();
    res.json({
      success: true,
      message: `Payment ${payment.paymentNumber} deleted. Invoice and customer balances have been reversed.`,
    });

  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// ─── @desc  Update a payment (reconciling invoices, transactional) ──────────
// @route PUT /api/payments/:id
// @access Private
export const updatePayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await findDocument(Payment, req.params.id, req.user, session);
    if (!payment) throw new Error('Payment not found');

    const oldAmount = payment.amount;
    const oldInvoiceId = payment.invoiceId;
    const oldCustomerId = payment.customerId;

    const {
      customerId, invoiceId, amount, paymentMode,
      referenceNumber, paymentDate, notes,
    } = req.body;

    const payAmount = round(Number(amount));

    // Update payment fields
    if (customerId) payment.customerId = customerId;
    payment.invoiceId = invoiceId || null;
    payment.amount = payAmount;
    if (paymentMode) {
      payment.paymentMode = paymentMode;
      payment.mode = paymentMode;
    }
    if (referenceNumber !== undefined) {
      payment.referenceNumber = referenceNumber;
      payment.reference = referenceNumber;
    }
    if (paymentDate) {
      const payDate = parseUTC(paymentDate) || new Date();
      payment.paymentDate = payDate;
      payment.date = payDate;
    }
    if (notes !== undefined) payment.notes = notes;

    await payment.save({ session });

    // Update ledger entry
    const ledgerEntry = await LedgerEntry.findOne({ referenceId: payment._id }).session(session);
    if (ledgerEntry) {
      ledgerEntry.customerId = payment.customerId;
      ledgerEntry.credit = payAmount;
      if (paymentDate) ledgerEntry.date = payment.paymentDate;
      ledgerEntry.description = `Payment Received (Ref: ${payment.referenceNumber || payment.paymentNumber})`;
      await ledgerEntry.save({ session });
    } else {
      const newLedger = new LedgerEntry({
        customerId: payment.customerId,
        type: 'Payment',
        referenceId: payment._id,
        description: `Payment Received (Ref: ${payment.referenceNumber || payment.paymentNumber})`,
        credit: payAmount,
        date: payment.paymentDate || new Date(),
        balance: 0,
      });
      await newLedger.save({ session });
    }

    // Reconcile old invoice (if any)
    if (oldInvoiceId) {
      const oldInvoice = await findDocument(Invoice, oldInvoiceId, req.user, session);
      if (oldInvoice) {
        const paymentAgg = await Payment.aggregate([
          { $match: { invoiceId: oldInvoice._id } },
          { $group: { _id: null, sum: { $sum: '$amount' } } }
        ]).session(session);
        const totalPaid = round(paymentAgg[0]?.sum || 0);
        oldInvoice.amountPaid = totalPaid;
        oldInvoice.balanceDue = round(oldInvoice.grandTotal - totalPaid);
        oldInvoice.status = deriveInvoiceStatus(oldInvoice);
        await oldInvoice.save({ session });
      }
    }

    // Reconcile new invoice (if any and different)
    if (invoiceId && String(invoiceId) !== String(oldInvoiceId)) {
      const newInvoice = await findDocument(Invoice, invoiceId, req.user, session);
      if (newInvoice) {
        const paymentAgg = await Payment.aggregate([
          { $match: { invoiceId: newInvoice._id } },
          { $group: { _id: null, sum: { $sum: '$amount' } } }
        ]).session(session);
        const totalPaid = round(paymentAgg[0]?.sum || 0);
        newInvoice.amountPaid = totalPaid;
        newInvoice.balanceDue = round(newInvoice.grandTotal - totalPaid);
        newInvoice.status = deriveInvoiceStatus(newInvoice);
        await newInvoice.save({ session });
      }
    }

    // Recalculate customer ledgers
    if (payment.customerId) {
      await recalculateCustomerLedger(payment.customerId, session);
    }
    if (oldCustomerId && String(oldCustomerId) !== String(payment.customerId)) {
      await recalculateCustomerLedger(oldCustomerId, session);
    }

    await session.commitTransaction();
    res.json({ success: true, data: payment });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ─── @desc  Get single payment ────────────────────────────────────────────────
// @route GET /api/payments/:id
// @access Private
export const getPaymentById = async (req, res) => {
  try {
    const payment = await findDocument(Payment, req.params.id, req.user);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

