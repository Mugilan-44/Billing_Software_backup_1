import mongoose from 'mongoose';

const vendorLedgerEntrySchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    type: {
        type: String,
        enum: ['PurchaseBill', 'PaymentMade', 'DebitNote', 'OpeningBalance'],
        required: true,
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    description: String,
    debit: {
        type: Number, // Decrease to payable
        default: 0,
    },
    credit: {
        type: Number, // Increase to payable (e.g. Purchase Bills)
        default: 0,
    },
    balance: {
        type: Number, // Running total owed to vendor
        required: true,
    },
}, { timestamps: true });

const VendorLedgerEntry = mongoose.model('VendorLedgerEntry', vendorLedgerEntrySchema);
export default VendorLedgerEntry;
