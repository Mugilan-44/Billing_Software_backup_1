import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  branchId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },

  paymentNumber: {
    type: String,
    required: true,
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
    enum: ['Cash', 'UPI', 'NEFT', 'RTGS', 'Cheque', 'Card', 'Bank', 'Credit', 'Bank Transfer', 'Bank Transfer (NEFT/RTGS)', 'UPI / QR', 'UPI/QR'],
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
    enum: ['Cash', 'Bank', 'UPI', 'Cheque', 'Credit', 'NEFT', 'RTGS', 'Card', 'Bank Transfer', 'Bank Transfer (NEFT/RTGS)', 'UPI / QR', 'UPI/QR'],
  },
  referenceNumber: {
    type: String,
  },

  notes: String,
  thankYouNote: { type: String, default: 'Thank you for your business!' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  taxMode: { type: String, enum: ['WITH_TAX', 'WITHOUT_TAX'], default: 'WITH_TAX', index: true },
}, { timestamps: true });

paymentSchema.pre('validate', function() {
  const normalize = (val) => {
    if (!val) return val;
    if (val === 'Bank Transfer' || val === 'Bank Transfer (NEFT/RTGS)') return 'Bank';
    if (val === 'UPI / QR' || val === 'UPI/QR') return 'UPI';
    return val;
  };
  if (this.paymentMode) this.paymentMode = normalize(this.paymentMode);
  if (this.mode) this.mode = normalize(this.mode);
});

paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ invoiceId: 1, companyId: 1 }); // fast reconciliation
paymentSchema.index({ companyId: 1, date: -1 });     // fast payment history
paymentSchema.index({ companyId: 1, paymentNumber: 1 }, { unique: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
