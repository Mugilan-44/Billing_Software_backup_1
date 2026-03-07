import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    quoteNumber: {
        type: String,
        required: true,
        unique: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
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
        type: Number,
        required: true
    },
    grandTotal: {
        type: Number,
        required: true
    },
    validityDate: {
        type: Date
    },
    quoteDate: {
        type: Date,
        default: Date.now
    },
    referenceNumber: {
        type: String
    },
    salesperson: {
        type: String
    },
    projectName: {
        type: String
    },
    subject: {
        type: String
    },
    adjustment: {
        type: Number,
        default: 0
    },
    tdsPercentage: {
        type: Number,
        default: 0
    },
    tdsAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Converted'],
        default: 'Draft'
    },
    notes: {
        type: String
    },
    termsAndConditions: {
        type: String
    }
}, { timestamps: true });

const Quotation = mongoose.model('Quotation', quotationSchema);
export default Quotation;
