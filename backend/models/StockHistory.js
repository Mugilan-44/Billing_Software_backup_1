import mongoose from 'mongoose';

const stockHistorySchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true
    },
    action: {
        type: String,
        enum: ['IN', 'OUT', 'ADJUSTMENT'],
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    previousStock: {
        type: Number,
        required: true
    },
    currentStock: {
        type: Number,
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId, // Can be Invoice ID or Purchase Bill ID
        required: false
    },
    referenceType: {
        type: String,
        enum: ['Invoice', 'PurchaseBill', 'Manual'],
        required: true
    },
    notes: {
        type: String
    }
}, { timestamps: true });

const StockHistory = mongoose.model('StockHistory', stockHistorySchema);
export default StockHistory;
