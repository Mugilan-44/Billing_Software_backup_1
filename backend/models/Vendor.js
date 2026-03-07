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
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    gstNumber: {
        type: String,
        trim: true
    },
    contactPerson: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    billingAddress: {
        street: String,
        city: String,
        state: String,
        pincode: String
    },
    openingBalance: {
        type: Number,
        default: 0
    },
    creditPeriod: {
        type: Number, // in days
        default: 30
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor;
