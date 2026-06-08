import mongoose from 'mongoose';

const purchaseBillSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    billNumber: {
        type: String,
        required: true,
        unique: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
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
        type: Number, // Input GST
        required: true
    },
    grandTotal: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Unpaid', 'Partially Paid', 'Paid', 'Overdue'],
        default: 'Unpaid'
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    billDate: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String
    }
}, { timestamps: true });

const PurchaseBill = mongoose.model('PurchaseBill', purchaseBillSchema);
export default PurchaseBill;
