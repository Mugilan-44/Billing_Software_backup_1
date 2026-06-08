export const enforceCompanyIsolation = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (req.user.role === 'SUPER_ADMIN') {
        // Super Admins can query any company or filter by companyId parameter
        if (req.query.companyId) {
            req.companyId = req.query.companyId;
        }
        return next();
    }

    if (!req.user.companyId) {
        return res.status(403).json({
            success: false,
            message: 'Tenant boundary error: No company associated with this account.'
        });
    }

    // Force the user's company ID onto the request object, body, and queries
    req.companyId = req.user.companyId;
    req.body.companyId = req.user.companyId;
    req.query.companyId = req.user.companyId.toString();

    next();
};
