import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ─── Base Auth Middleware ────────────────────────────────────────────────────

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account is deactivated. Contact your administrator.' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
    }
};

// ─── Role-Based Authorization ─────────────────────────────────────────────────
// Usage: authorizeRoles('SUPER_ADMIN', 'ADMIN')

export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
            });
        }
        next();
    };
};

// ─── Company Data Isolation ───────────────────────────────────────────────────
// Injects companyId into req for ADMIN/CUSTOMER queries
// SUPER_ADMIN bypasses this (can see all)

export const companyScope = (req, res, next) => {
    if (req.user.role === 'SUPER_ADMIN') {
        // Super admin can optionally filter by a specific company via query param
        req.companyId = req.query.companyId || null;
    } else if (req.user.role === 'ADMIN' || req.user.role === 'CUSTOMER') {
        if (!req.user.companyId) {
            return res.status(403).json({ success: false, message: 'No company associated with this account' });
        }
        req.companyId = req.user.companyId;
    }
    next();
};

// ─── Module Permission Check ──────────────────────────────────────────────────
// Checks if ADMIN has access to a specific module
export const checkPermission = (moduleName) => {
    return (req, res, next) => {
        // Super admin has all permissions
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        // Customers/Others might not have granular permissions for all modules
        if (req.user.role === 'ADMIN') {
            if (req.user.permissions && req.user.permissions[moduleName] === false) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. You don't have permission to access the ${moduleName} module.`
                });
            }
        }

        next();
    };
};

// ─── Legacy alias (kept for any remaining old references) ────────────────────
export const authorize = authorizeRoles;

// ─── New alias used by billing controllers ────────────────────────────────────
export const authenticate = protect;
