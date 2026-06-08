import mongoose from 'mongoose';

const challanSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    challanNumber: {
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
    transportDetails: {
        vehicleNumber: String,
        driverName: String,
        route: String,
    },
    items: [{
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: true,
        },
        name: String,
        quantity: {
            type: Number,
            required: true,
        },
        rate: Number,
        amount: Number,
    }],
    status: {
        type: String,
        enum: ['Draft', 'Sent', 'Delivered', 'Converted'],
        default: 'Draft',
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
    },
    notes: String,
}, { timestamps: true });

const Challan = mongoose.model('Challan', challanSchema);
export default Challan;
