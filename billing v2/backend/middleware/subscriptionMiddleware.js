import Subscription from '../models/Subscription.js';

export const checkSubscription = async (req, res, next) => {
    // 1. Super Admins bypass subscription checks
    if (req.user && req.user.role === 'SUPER_ADMIN') {
        return next();
    }

    // 2. Read-only requests (GET) are allowed so users can access/export historical data
    if (req.method === 'GET') {
        return next();
    }

    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. No company associated with this account.'
            });
        }

        // Fetch subscription from separate subscriptions collection
        const subscription = await Subscription.findOne({ companyId });
        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: 'Subscription record not found. Please contact support.'
            });
        }

        const today = new Date();
        const hasExpired = subscription.expiryDate && new Date(subscription.expiryDate) < today;
        const isNotActive = !subscription.status || subscription.status.toUpperCase() !== 'ACTIVE';

        if (hasExpired || isNotActive) {
            return res.status(403).json({
                success: false,
                message: 'Subscription Expired'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Subscription validation error: ${error.message}`
        });
    }
};
