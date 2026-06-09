import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    businessName: {
        type: String,
        required: [true, 'Business name is required'],
        trim: true,
    },
    ownerName: {
        type: String,
        trim: true,
    },
    gstNumber: {
        type: String,
        trim: true,
    },
    // Keep email, phone, gstin (gstNumber alias) for backward compat
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },
    phone: { type: String },
    gstin: { type: String, trim: true },
    pan: { type: String, trim: true },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'India' },
    },
    logoUrl: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    financialYearStart: { type: String, default: 'April' },
    invoicePrefix: { type: String, default: 'INV' },
    isActive: { type: Boolean, default: true },
    subscriptionStatus: {
        type: String,
        enum: ['Active', 'Expired', 'Suspended'],
        default: 'Active',
    },
    subscriptionStartDate: {
        type: Date,
        default: Date.now,
    },
    subscriptionEndDate: {
        type: Date,
        default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtuals for legacy support mapping
companySchema.virtual('name').get(function() {
    return this.businessName;
}).set(function(val) {
    this.businessName = val;
});

companySchema.virtual('gstin_alias').get(function() {
    return this.gstNumber;
}).set(function(val) {
    this.gstNumber = val;
});

const Company = mongoose.model('Company', companySchema);
export default Company;
