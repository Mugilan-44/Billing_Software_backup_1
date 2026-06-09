import mongoose from 'mongoose';

const companySettingsSchema = new mongoose.Schema({
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
    gstNumber: String,
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
    signatureUrl: String,
    upiQrUrl: String,
    bankDetails: {
        accountName: String,
        accountNumber: String,
        bankName: String,
        ifscCode: String,
        branch: String,
    }
}, { timestamps: true });

const CompanySettings = mongoose.model('CompanySettings', companySettingsSchema);
export default CompanySettings;
