import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    paymentNumber: {
        type: String,
        required: true,
        unique: true,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
    },
    amount: {
        type: Number,
        required: true,
    },
    paymentDate: {
        type: Date,
        default: Date.now,
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'Bank', 'UPI', 'Cheque', 'Credit'],
        required: true,
    },
    referenceNumber: {
        type: String,
    },
    notes: String,
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
