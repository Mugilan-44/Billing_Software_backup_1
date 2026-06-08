import mongoose from 'mongoose';

const creditNoteSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  branchId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },

  cnNumber: {
    type: String,
    required: true,
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },

  reference: String,
  salesPerson: String,
  subject: String,
  termsAndConditions: String,
  subTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },

  // Detailed line items
  lineItems: [{
    itemId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    name:            { type: String, required: true },
    quantity:        { type: Number, required: true },
    rate:            { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    gstPercent:      { type: Number, default: 0 },
    amount:          { type: Number, default: 0 },
    _id: false,
  }],

  status: {
    type: String,
    enum: ['Open', 'Closed', 'Refunded', 'Applied'],
    default: 'Open',
  },
  notes:     String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  includeTerms:       { type: Boolean, default: true },
  includeSignature:   { type: Boolean, default: false },
  includeBankDetails: { type: Boolean, default: true },
  includeUpiQr:       { type: Boolean, default: true },
  taxMode:            { type: String, enum: ['WITH_TAX', 'WITHOUT_TAX'], default: 'WITH_TAX', index: true },
}, { timestamps: true });

creditNoteSchema.index({ companyId: 1, cnNumber: 1 }, { unique: true });

export default mongoose.model('CreditNote', creditNoteSchema);
