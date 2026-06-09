import mongoose from 'mongoose';

const calculationLogSchema = new mongoose.Schema({
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true
    },
    stepName: {
        type: String,
        required: true
    },
    inputValues: {
        type: Object,
        required: true
    },
    calculatedValue: {
        type: Object,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

const CalculationLog = mongoose.model('CalculationLog', calculationLogSchema);
export default CalculationLog;
