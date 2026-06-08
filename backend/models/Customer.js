import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
    attention: String,
    country: { type: String, default: 'India' },
    street1: String,
    street2: String,
    city: String,
    state: String,
    zipCode: String,
    phone: String,
    fax: String,
}, { _id: false });

const contactPersonSchema = new mongoose.Schema({
    salutation: { type: String, default: '' },
    firstName: String,
    lastName: String,
    email: String,
    workPhone: String,
    mobile: String,
}, { _id: false });

const customerSchema = new mongoose.Schema({
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
    customerType: { type: String, enum: ['Business', 'Individual'], default: 'Business' },
    salutation: { type: String, default: '' },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    companyName: {
        type: String,
        required: [true, 'Customer/Company name is required'],
        trim: true,
    },
    displayName: { type: String, trim: true },
    currency: { type: String, default: 'INR' },
    email: {
        type: String,
        match: [/^(?:\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$)?$/, 'Please add a valid email'],
        default: ''
    },
    workPhone: { type: String },
    mobile: { type: String },
    phone: { type: String }, // legacy compat
    contactPerson: { type: String, trim: true }, // legacy compat
    gstNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    paymentTerms: { type: String, default: 'Due on Receipt' },
    remarks: { type: String },
    billingAddress: addressSchema,
    shippingAddress: addressSchema,
    contactPersons: [contactPersonSchema],
    creditPeriod: { type: Number, default: 15 },
    openingBalance: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
