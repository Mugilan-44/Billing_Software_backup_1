import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
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

  // Canonical name field (new code uses 'name')
  name:        { type: String, trim: true },

  // Legacy field (old code uses 'companyName')
  companyName: {
    type: String,
    trim: true,
  },

  // Canonical GSTIN (new code uses 'gstin')
  gstin:       { type: String, trim: true },

  // Legacy field (old code uses 'gstNumber')
  gstNumber:   { type: String, trim: true },

  stateCode:   { type: String, trim: true },  // first 2 digits of GSTIN

  contactPerson: { type: String, trim: true },
  email:       { type: String, trim: true, lowercase: true },
  phone:       { type: String, trim: true },
  address:     { type: String, trim: true },  // flat string
  billingAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
  },

  outstandingBalance: { type: Number, default: 0 },  // sum of all unpaid payables
  totalBusiness:      { type: Number, default: 0 },  // lifetime purchase amount
  openingBalance:     { type: Number, default: 0 },  // legacy field

  creditPeriod: { type: Number, default: 30 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

// Pre-save: keep name <-> companyName and gstin <-> gstNumber in sync
// NOTE: Mongoose v9+ requires async pre-hooks — next() callback is no longer supported
vendorSchema.pre('save', async function () {
  if (this.isModified('name') && !this.companyName) this.companyName = this.name;
  if (this.isModified('companyName') && !this.name) this.name = this.companyName;
  if (this.isModified('gstin') && !this.gstNumber) this.gstNumber = this.gstin;
  if (this.isModified('gstNumber') && !this.gstin) this.gstin = this.gstNumber;
});

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor;
