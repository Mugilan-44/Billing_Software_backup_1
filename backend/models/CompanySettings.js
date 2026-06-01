import mongoose from 'mongoose';

const companySettingsSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        default: null,
        index: true,
    },
    companyName: {
        type: String,
        required: true,
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'India' }
    },
    phone: String,
    email: String,
    website: String,
    gstin:    { type: String, trim: true },     // canonical
    gstNumber: String,                            // legacy alias
    stateCode: { type: String, trim: true },      // derived from GSTIN first 2 chars
    finYearStart: {
        type: Date,
    },
    invoicePrefix: {
        type: String,
        default: 'INV/'
    },
    challanPrefix: {
        type: String,
        default: 'CHL/'
    },
    paymentPrefix: {
        type: String,
        default: 'PAY/'
    },
    currency: {
        code: { type: String, default: 'INR' },
        symbol: { type: String, default: '₹' }
    },
    logoUrl: String,
    signature: String,
    upiId:    { type: String, trim: true },       // UPI ID for payments
    upiQrUrl: { type: String, trim: true },       // uploaded QR code image URL
    bankDetails: {
        accountName: String,
        accountNumber: String,
        bankName: String,
        ifscCode: String,
        branch: String,
    },
    theme: {
        type: String,
        default: 'light'
    }
}, { timestamps: true });

const CompanySettings = mongoose.model('CompanySettings', companySettingsSchema);
export default CompanySettings;
