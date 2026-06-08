import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true,
    },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    description: String,
    quantity: {
        type: Number,
        required: true,
    },
    rate: {
        type: Number,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    gstPercentage: {
        type: Number,
        default: 0,
    },
    discountPercentage: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

const InvoiceItem = mongoose.model('InvoiceItem', invoiceItemSchema);
export default InvoiceItem;
