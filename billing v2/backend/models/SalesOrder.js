import mongoose from 'mongoose';

const salesOrderLineItemSchema = new mongoose.Schema({
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

const salesOrderSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  branchId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },

  orderNumber: {
    type: String,
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },

  // New canonical line items
  lineItems: [salesOrderLineItemSchema],

  // Legacy items array
  items: [{
    itemId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    name:          String,
    quantity:      { type: Number, required: true, min: 1 },
    rate:          { type: Number, required: true, min: 0 },
    gstPercentage: { type: Number, required: true, min: 0 },
    _id: false,
  }],

  discount:   { type: Number, default: 0, min: 0 },
  subtotal:   { type: Number },
  subTotal:   { type: Number },  // legacy alias
  taxTotal:   { type: Number },
  isTaxed:            { type: Boolean, default: true },
  taxType:            { type: String, enum: ['GST', 'VAT', 'Sales Tax', 'None'], default: 'GST' },
  taxRate:            { type: Number, default: null },
  useProductSpecificTax: { type: Boolean, default: true },
  tdsTcsType:         { type: String, enum: ['None', 'TDS', 'TCS'], default: 'None' },
  tdsPercentage:      { type: Number, default: 0 },
  tdsAmount:          { type: Number, default: 0 },
  tcsPercentage:      { type: Number, default: 0 },
  tcsAmount:          { type: Number, default: 0 },
  grandTotal: { type: Number },

  date: { type: Date, default: Date.now },
  expectedDeliveryDate: { type: Date },

  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Invoiced', 'Cancelled'],
    default: 'Confirmed',
  },
  deliveryStatus: {
    type: String,
    enum: ['Pending', 'Partial', 'Delivered'],
    default: 'Pending',
  },

  // Canonical link fields
  linkedQuotationId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  convertedToInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },

  // Legacy link field
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },

  buyersRef: { type: String, trim: true },
  modeOfPayment: { type: String, trim: true },
  notes: String,
  includeTerms:       { type: Boolean, default: true },
  includeSignature:   { type: Boolean, default: false },
  includeBankDetails: { type: Boolean, default: true },
  includeUpiQr:       { type: Boolean, default: true },
  taxMode:            { type: String, enum: ['WITH_TAX', 'WITHOUT_TAX'], default: 'WITH_TAX', index: true },
}, { timestamps: true });

salesOrderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true });

const SalesOrder = mongoose.model('SalesOrder', salesOrderSchema);
export default SalesOrder;
