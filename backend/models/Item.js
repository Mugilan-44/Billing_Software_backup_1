import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  sku:  { type: String, unique: true, sparse: true, trim: true },
  type: {
    type: String,
    enum: ['Goods', 'Service'],
    default: 'Goods',
  },
  category: {
    type: String,
    trim: true,
  },

  // Canonical fields (new code)
  hsnCode: { type: String, trim: true },
  gstPercent: { type: Number, default: 0 },
  availableStock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  trackStock: {
    type: Boolean,
    default: true
  },

  // Custom Tax System fields
  taxType: { type: String, default: 'GST' },
  taxRate: { type: Number, default: 0 },

  // Legacy fields (backward compat)
  hsnSacCode: { type: String, trim: true },
  gstPercentage: { type: Number, default: 0 },
  stockQuantity: { type: Number, default: 0 },
  lowStockAlert: { type: Number, default: 5 },

  purchasePrice: { type: Number, default: 0 },
  sellingPrice: {
    type: Number,
    required: true,
  },
  barcode: { type: String, trim: true },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  unit: { type: String, default: 'pcs' },
}, { timestamps: true });

itemSchema.index({ availableStock: 1 });

// Pre-save hook to keep canonical and legacy fields in sync
// NOTE: Mongoose v9+ requires async pre-hooks — next() callback is no longer supported
itemSchema.pre('save', async function () {
  // Sync availableStock <-> stockQuantity
  if (this.isModified('availableStock')) {
    this.stockQuantity = this.availableStock;
  } else if (this.isModified('stockQuantity')) {
    this.availableStock = this.stockQuantity;
  }

  // Sync taxRate <-> gstPercent <-> gstPercentage
  if (this.isModified('taxRate')) {
    this.gstPercent = this.taxRate;
    this.gstPercentage = this.taxRate;
  } else if (this.isModified('gstPercent')) {
    this.taxRate = this.gstPercent;
    this.gstPercentage = this.gstPercent;
  } else if (this.isModified('gstPercentage')) {
    this.taxRate = this.gstPercentage;
    this.gstPercent = this.gstPercentage;
  }

  // Handle initialization on new documents
  if (this.isNew) {
    if (this.taxRate !== undefined && (this.gstPercent === undefined || this.gstPercent === 0)) {
      this.gstPercent = this.taxRate;
      this.gstPercentage = this.taxRate;
    } else if (this.gstPercent !== undefined && (this.taxRate === undefined || this.taxRate === 0)) {
      this.taxRate = this.gstPercent;
      this.gstPercentage = this.gstPercent;
    }
  }

  // Sync hsnCode <-> hsnSacCode
  if (this.isModified('hsnCode')) {
    this.hsnSacCode = this.hsnCode;
  } else if (this.isModified('hsnSacCode')) {
    this.hsnCode = this.hsnSacCode;
  }
});

const Item = mongoose.model('Item', itemSchema);
export default Item;
