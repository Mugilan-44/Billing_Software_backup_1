import mongoose from 'mongoose';

const paymentAllocationSchema = new mongoose.Schema({
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true
    },
    amountApplied: {
        type: Number, // Stored as integer (paise)
        required: true,
        min: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Prevent double allocations by creating a compound index
paymentAllocationSchema.index({ paymentId: 1, invoiceId: 1 }, { unique: true });

const PaymentAllocation = mongoose.model('PaymentAllocation', paymentAllocationSchema);
export default PaymentAllocation;
