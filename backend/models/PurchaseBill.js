import mongoose from 'mongoose';

const purchaseBillLineItemSchema = new mongoose.Schema({
  itemId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  name:       String,
  hsnCode:    String,
  quantity:   Number,
  rate:       Number,
  gstPercent: Number,
  // Legacy alias
  gstPercentage: Number,
  amount:     Number,
}, { _id: false });

const purchaseBillSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  branchId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },

  billNumber: {
    type: String,
    required: true,
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },

  // Canonical date fields
  date:    { type: Date, default: Date.now },
  dueDate: { type: Date },

  // Legacy date field
  billDate: { type: Date, default: Date.now },

  // Line items (new embedded schema)
  lineItems: [purchaseBillLineItemSchema],

  // Legacy items array (old schema)
  items: [{
    itemId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    name:          String,
    quantity:      Number,
    rate:          Number,
    gstPercentage: Number,
    _id: false,
  }],

  discount:    { type: Number, default: 0, min: 0 },
  subtotal:    { type: Number, default: 0 },
  subTotal:    { type: Number, default: 0 },  // legacy alias
  taxAmount:   { type: Number, default: 0 },  // canonical total GST (input)
  taxTotal:    { type: Number, default: 0 },  // legacy alias (flat number)
  // Input GST breakdown (for GST credit filing)
  cgst:        { type: Number, default: 0 },
  sgst:        { type: Number, default: 0 },
  igst:        { type: Number, default: 0 },
  isTaxed:            { type: Boolean, default: true },
  taxType:            { type: String, enum: ['GST', 'VAT', 'Sales Tax', 'None'], default: 'GST' },
  taxRate:            { type: Number, default: null },
  useProductSpecificTax: { type: Boolean, default: true },
  tdsTcsType:         { type: String, enum: ['None', 'TDS', 'TCS'], default: 'None' },
  tdsPercentage:      { type: Number, default: 0 },
  tdsAmount:          { type: Number, default: 0 },
  tcsPercentage:      { type: Number, default: 0 },
  tcsAmount:          { type: Number, default: 0 },
  placeOfSupply: { type: String, trim: true },
  grandTotal:  { type: Number, required: true },
  amountPaid:  { type: Number, default: 0 },
  balanceDue:  { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['Unpaid', 'Partial', 'Partially Paid', 'Paid', 'Overdue'],
    default: 'Unpaid',
  },
  notes: String,
  includeTerms:       { type: Boolean, default: true },
  includeSignature:   { type: Boolean, default: false },
  includeBankDetails: { type: Boolean, default: true },
  includeUpiQr:       { type: Boolean, default: true },
  taxMode:            { type: String, enum: ['WITH_TAX', 'WITHOUT_TAX'], default: 'WITH_TAX', index: true },
}, { timestamps: true });

purchaseBillSchema.index({ vendorId: 1 });
purchaseBillSchema.index({ companyId: 1, status: 1 });
purchaseBillSchema.index({ companyId: 1, date: -1 });
purchaseBillSchema.index({ companyId: 1, dueDate: 1, status: 1 }); // for overdue
purchaseBillSchema.index({ companyId: 1, vendorId: 1 });
purchaseBillSchema.index({ companyId: 1, billNumber: 1 }, { unique: true });

const PurchaseBill = mongoose.model('PurchaseBill', purchaseBillSchema);
export default PurchaseBill;
