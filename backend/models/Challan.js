import mongoose from 'mongoose';

const challanSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    challanNumber: {
        type: String,
        required: true,
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
        gstPercent: { type: Number, default: 0 },
        gstPercentage: { type: Number, default: 0 },
        discountPercent: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },
        amount: Number,
    }],
    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    isTaxed: { type: Boolean, default: true },
    taxType: { type: String, enum: ['GST', 'VAT', 'Sales Tax', 'None'], default: 'GST' },
    taxRate: { type: Number, default: null },
    useProductSpecificTax: { type: Boolean, default: true },
    tdsTcsType:         { type: String, enum: ['None', 'TDS', 'TCS'], default: 'None' },
    tdsPercentage:      { type: Number, default: 0 },
    tdsAmount:          { type: Number, default: 0 },
    tcsPercentage:      { type: Number, default: 0 },
    tcsAmount:          { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
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
    challanType: {
        type: String,
        enum: ['Supply', 'Job Work', 'Others', 'Returnable', 'Non-Returnable'],
        default: 'Supply',
    },
    termsAndConditions: String,
    includeTerms:       { type: Boolean, default: true },
    includeSignature:   { type: Boolean, default: false },
    includeBankDetails: { type: Boolean, default: true },
    includeUpiQr:       { type: Boolean, default: true },
    taxMode:            { type: String, enum: ['WITH_TAX', 'WITHOUT_TAX'], default: 'WITH_TAX', index: true },
}, { timestamps: true });

challanSchema.index({ companyId: 1, challanNumber: 1 }, { unique: true });

const Challan = mongoose.model('Challan', challanSchema);
export default Challan;
