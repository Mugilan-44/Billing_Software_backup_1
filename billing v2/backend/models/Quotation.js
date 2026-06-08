import mongoose from 'mongoose';
import { getNextCustomSequence } from '../utils/counter.utils.js';

const quotationLineItemSchema = new mongoose.Schema({
  itemId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  name:            String,
  hsnCode:         String,
  quantity:        { type: Number, required: true, min: 1 },
  rate:            { type: Number, required: true, min: 0 },
  discountPercent: { type: Number, default: 0 },
  gstPercent:      { type: Number, default: 0 },
  // Legacy alias
  gstPercentage:   { type: Number, default: 0 },
  amount:          Number,
}, { _id: false });

const quotationSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  branchId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },

  quoteNumber: {
    type: String,
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },

  // New canonical line items
  lineItems: [quotationLineItemSchema],

  // Legacy items array (old code)
  items: [{
    itemId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    name:          String,
    quantity:      { type: Number, required: true, min: 1 },
    rate:          { type: Number, required: true, min: 0 },
    gstPercentage: { type: Number, required: true, min: 0 },
    _id: false,
  }],

  discount:    { type: Number, default: 0, min: 0 },
  subtotal:    { type: Number },
  subTotal:    { type: Number },  // legacy alias
  taxTotal:    { type: Number },
  grandTotal:  { type: Number },

  // Canonical date fields
  date:       { type: Date, default: Date.now },
  validUntil: { type: Date },

  // Legacy date fields
  quoteDate:      { type: Date, default: Date.now },
  validityDate:   { type: Date },

  referenceNumber:    String,
  salesperson:        String,
  projectName:        String,
  subject:            String,
  adjustment:         { type: Number, default: 0 },
  isTaxed:            { type: Boolean, default: true },
  taxType:            { type: String, enum: ['GST', 'VAT', 'Sales Tax', 'None'], default: 'GST' },
  taxRate:            { type: Number, default: null },
  useProductSpecificTax: { type: Boolean, default: true },
  tdsTcsType:         { type: String, enum: ['None', 'TDS', 'TCS'], default: 'None' },
  tdsPercentage:      { type: Number, default: 0 },
  tdsAmount:          { type: Number, default: 0 },
  tcsPercentage:      { type: Number, default: 0 },
  tcsAmount:          { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Converted'],
    default: 'Draft',
  },

  convertedToOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },

  notes:              String,
  termsAndConditions: String,
  includeTerms:       { type: Boolean, default: true },
  includeSignature:   { type: Boolean, default: false },
  includeBankDetails: { type: Boolean, default: true },
  includeUpiQr:       { type: Boolean, default: true },
  taxMode:            { type: String, enum: ['WITH_TAX', 'WITHOUT_TAX'], default: 'WITH_TAX', index: true },
}, { timestamps: true });

quotationSchema.index({ companyId: 1, quoteNumber: 1 }, { unique: true });

quotationSchema.pre('validate', async function () {
  if (this.isNew && !this.quoteNumber) {
    try {
      this.quoteNumber = await getNextCustomSequence(this.companyId, 'quotation', this.taxMode || 'WITH_TAX');
    } catch (err) {
      throw new Error(`Failed to generate atomic sequential quotation ID: ${err.message}`);
    }
  }
});

const Quotation = mongoose.model('Quotation', quotationSchema);
export default Quotation;
