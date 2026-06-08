import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
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
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true,
    },
    type: {
        type: String,
        enum: ['Goods', 'Service'],
        required: true,
    },
    category: {
        type: String,
        trim: true,
    },
    hsnSacCode: {
        type: String,
        trim: true,
    },
    gstPercentage: {
        type: Number,
        required: true,
        default: 0,
    },
    purchasePrice: {
        type: Number,
        default: 0,
    },
    sellingPrice: {
        type: Number,
        required: true,
    },
    stockQuantity: {
        type: Number,
        default: 0,
    },
    lowStockAlert: {
        type: Number,
        default: 5,
    },
    barcode: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active',
    },
    unit: {
        type: String,
        default: 'pcs'
    }
}, { timestamps: true });

const Item = mongoose.model('Item', itemSchema);
export default Item;
