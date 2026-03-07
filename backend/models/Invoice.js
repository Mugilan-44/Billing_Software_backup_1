import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
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
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    dueDate: {
        type: Date,
    },
    transportDetails: {
        vehicleNumber: String,
        route: String,
        tripDate: Date,
        ewayBillNumber: String,
    },
    subTotal: {
        type: Number,
        required: true,
        default: 0,
    },
    discount: {
        type: Number,
        default: 0,
    },
    taxTotal: {
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },
        totalTax: { type: Number, default: 0 }
    },
    roundOff: {
        type: Number,
        default: 0,
    },
    grandTotal: {
        type: Number,
        required: true,
    },
    amountPaid: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue'],
        default: 'Draft',
    },
    isRecurring: {
        type: Boolean,
        default: false,
    },
    recurringInterval: {
        type: String,
        enum: ['Weekly', 'Monthly', 'Yearly'],
    },
    nextRecurringDate: {
        type: Date,
    },
    notes: String,
    termsAndConditions: String,
    challanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Challan',
    }
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
