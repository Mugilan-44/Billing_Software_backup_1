import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    date: {
        type: Date,
        default: Date.now,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    reference: {
        type: String,
    },
    notes: {
        type: String,
    },
    status: {
        type: String,
        default: 'Paid'
    },
    paymentMethod: {
        type: String,
        default: 'Cash',
    },
    vehicleNumber: {
        type: String,
    },
    taxMode: {
        type: String,
        enum: ['WITH_TAX', 'WITHOUT_TAX'],
        default: 'WITH_TAX',
        index: true
    }
}, { timestamps: true });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
