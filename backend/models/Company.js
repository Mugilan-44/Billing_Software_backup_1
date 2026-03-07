import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
    },
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
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });

const Company = mongoose.model('Company', companySchema);
export default Company;
