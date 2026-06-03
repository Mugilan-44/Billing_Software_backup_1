import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  branchId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },

  paymentNumber: {
    type: String,
    required: true,
    unique: true,
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },

  // Canonical fields (new code)
  date: {
    type: Date,
    default: Date.now,
  },
  mode: {
    type: String,
    enum: ['Cash', 'UPI', 'NEFT', 'RTGS', 'Cheque', 'Card', 'Bank', 'Credit'],
  },
  reference: {
    type: String,
  },

  // Legacy fields (kept for backward compat)
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Bank', 'UPI', 'Cheque', 'Credit', 'NEFT', 'RTGS', 'Card'],
  },
  referenceNumber: {
    type: String,
  },

  notes: String,
  thankYouNote: { type: String, default: 'Thank you for your business!' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  taxMode: { type: String, enum: ['WITH_TAX', 'WITHOUT_TAX'], default: 'WITH_TAX', index: true },
}, { timestamps: true });

paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ invoiceId: 1, companyId: 1 }); // fast reconciliation
paymentSchema.index({ companyId: 1, date: -1 });     // fast payment history

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
