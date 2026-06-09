import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false,
    },
    role: {
        type: String,
        enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CASHIER', 'CUSTOMER'],
        required: true,
    },
    // Company association — null for SUPER_ADMIN
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        default: null,
    },
    // Branch association — required for ADMIN/STAFF/CASHIER
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        default: null,
    },
    // Customer record link — only for CUSTOMER role
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    permissions: {
        customers: { type: Boolean, default: true },
        vendors: { type: Boolean, default: true },
        items: { type: Boolean, default: true },
        quotations: { type: Boolean, default: true },
        salesOrders: { type: Boolean, default: true },
        invoices: { type: Boolean, default: true },
        challans: { type: Boolean, default: true },
        payments: { type: Boolean, default: true },
        creditNotes: { type: Boolean, default: true },
        purchaseBills: { type: Boolean, default: true },
        expenses: { type: Boolean, default: true },
        stock: { type: Boolean, default: true },
        reports: { type: Boolean, default: true },
        overallTax: { type: Boolean, default: true },
        withTax: { type: Boolean, default: true },
        noTax: { type: Boolean, default: true },
    },
    // Optional: track last login details
    lastLoginAt: {
        type: Date,
    },
    lastLoginIp: {
        type: String,
        default: '',
    },
    isPasswordResetRequired: {
        type: Boolean,
        default: false,
    },
    isCoAdmin: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
