import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        unique: true,
    },
    plan: {
        type: String,
        required: true,
        default: 'Premium',
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
    expiryDate: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED'],
        default: 'ACTIVE',
        required: true,
    },
    maxUsers: {
        type: Number,
        default: 10,
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
