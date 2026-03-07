import mongoose from 'mongoose';

const salesOrderSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    quotationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quotation' // Optional link
    },
    items: [{
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: true
        },
        name: String,
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        rate: {
            type: Number,
            required: true,
            min: 0
        },
        gstPercentage: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    subTotal: {
        type: Number,
        required: true
    },
    taxTotal: {
        type: Number,
        required: true
    },
    grandTotal: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Delivered', 'Cancelled', 'Invoiced'],
        default: 'Pending'
    },
    expectedDeliveryDate: {
        type: Date
    },
    notes: {
        type: String
    }
}, { timestamps: true });

const SalesOrder = mongoose.model('SalesOrder', salesOrderSchema);
export default SalesOrder;
