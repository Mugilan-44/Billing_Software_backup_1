import mongoose from 'mongoose';
import crypto from 'crypto';
import { getNextCustomSequence } from '../utils/counter.utils.js';
const { Schema } = mongoose;

const lineItemSchema = new Schema({
  itemId:          { type: Schema.Types.ObjectId, ref: 'Item' },
  name:            { type: String, required: true },
  description:     String,
  hsnCode:         String,
  quantity:        { type: Number, required: true },
  rate:            { type: Number, required: true },
  discountPercent: { type: Number, default: 0 },
  gstPercent:      { type: Number, default: 0 },
  amount:          Number,
}, { _id: false });

const invoiceSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
  branchId:  { type: Schema.Types.ObjectId, ref: 'Branch', default: null },

  invoiceNumber:      { type: String, required: true },
  customerId:         { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  date:               { type: Date, required: true, default: Date.now },
  dueDate:            { type: Date },
  lineItems:          [lineItemSchema],

  // Totals — flat fields (canonical schema)
  subtotal:           { type: Number, default: 0 },
  discountAmount:     { type: Number, default: 0 },   // invoice-level discount
  taxableAmount:      { type: Number, default: 0 },
  cgst:               { type: Number, default: 0 },
  sgst:               { type: Number, default: 0 },
  igst:               { type: Number, default: 0 },
  taxAmount:          { type: Number, default: 0, index: true }, // total GST — indexed for aggregations
  grandTotal:         { type: Number, required: true },
  amountPaid:         { type: Number, default: 0 },
  balanceDue:         { type: Number, default: 0 },

  // GST compliance fields
  placeOfSupply:      { type: String, trim: true },   // legally required
  reverseCharge:      { type: Boolean, default: false },

  taxType:            { type: String, enum: ['GST', 'VAT', 'Sales Tax', 'None'], default: 'GST' },
  taxRate:            { type: Number, default: null },
  isTaxed:            { type: Boolean, default: true },
  useProductSpecificTax: { type: Boolean, default: true },
  tdsTcsType:         { type: String, enum: ['None', 'TDS', 'TCS'], default: 'None' },
  tdsPercentage:      { type: Number, default: 0 },
  tdsAmount:          { type: Number, default: 0 },
  tcsPercentage:      { type: Number, default: 0 },
  tcsAmount:          { type: Number, default: 0 },
  includeTerms:       { type: Boolean, default: true },
  includeSignature:   { type: Boolean, default: false },
  includeBankDetails: { type: Boolean, default: true },
  includeUpiQr:       { type: Boolean, default: true },

  // Legacy fields — kept for backward compat with existing records and controllers
  subTotal:           { type: Number, default: 0 },
  discount:           { type: Number, default: 0 },
  taxTotal: {
    cgst:     { type: Number, default: 0 },
    sgst:     { type: Number, default: 0 },
    igst:     { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
  },
  roundOff:           { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Partial', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Draft',
  },

  paymentTerms:       String,
  notes:              String,
  termsAndConditions: String,
  salesPerson:        String,

  billingAddress:     String,
  shippingAddress:    String,
  linkedQuotationId:  { type: Schema.Types.ObjectId, ref: 'Quotation' },
  linkedSalesOrderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },

  emailSentAt:        Date,
  cancelledAt:        Date,
  cancelReason:       String,

  createdBy:          { type: Schema.Types.ObjectId, ref: 'User' },

  // Legacy fields
  transportDetails: {
    vehicleNumber: String,
    route:         String,
    tripDate:      Date,
    ewayBillNumber: String,
  },
  isRecurring:        { type: Boolean, default: false },
  recurringInterval:  { type: String, enum: ['Weekly', 'Monthly', 'Yearly'] },
  nextRecurringDate:  Date,
  challanId:          { type: Schema.Types.ObjectId, ref: 'Challan' },

  shareToken:         { type: String, unique: true, index: true },
  isPublic:           { type: Boolean, default: true },
  viewCount:          { type: Number, default: 0 },
  lastViewedAt:       Date,
  taxMode:            { type: String, enum: ['WITH_TAX', 'WITHOUT_TAX'], default: 'WITH_TAX', index: true },
}, { timestamps: true });

invoiceSchema.index({ companyId: 1, customerId: 1 });
invoiceSchema.index({ companyId: 1, status: 1 });
invoiceSchema.index({ companyId: 1, date: -1 });
invoiceSchema.index({ companyId: 1, dueDate: 1, status: 1 }); // for overdue cron
invoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });


invoiceSchema.pre('validate', async function () {
  if (this.isNew && !this.shareToken) {
    this.shareToken = crypto.randomBytes(24).toString('hex');
  }
  if (this.isNew && !this.invoiceNumber) {
    try {
      this.invoiceNumber = await getNextCustomSequence(this.companyId, 'invoice', this.taxMode || 'WITH_TAX');
    } catch (err) {
      throw new Error(`Failed to generate atomic sequential invoice ID: ${err.message}`);
    }
  }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
