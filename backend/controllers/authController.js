import User from '../models/User.js';
import Company from '../models/Company.js';
import Subscription from '../models/Subscription.js';
import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';

// Helper to determine home landing path based on role
const getHomeRedirectPath = (role) => {
    if (role === 'SUPER_ADMIN') {
        return '/admin';
    }
    return '/dashboard';
};

// Shared helper to build standard payload
const buildUserPayload = (user, company, subscription) => {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return {
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            branchId: user.branchId,
            customerId: user.customerId,
            isPasswordResetRequired: user.isPasswordResetRequired,
            permissions: user.permissions,
        },
        company: company ? {
            _id: company._id,
            businessName: company.businessName,
            gstNumber: company.gstNumber,
            isActive: company.isActive,
        } : null,
        subscription: subscription ? {
            plan: subscription.plan,
            startDate: subscription.startDate,
            expiryDate: subscription.expiryDate,
            status: subscription.status,
            maxUsers: subscription.maxUsers,
        } : null,
        accessToken,
        refreshToken,
        redirectUrl: getHomeRedirectPath(user.role)
    };
};

// ─── LOGIN ────────────────────────────────────────────────────────────
// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email } = req.body;
        const password = req.body.password?.trim();

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid login credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account is deactivated. Contact your administrator.' });
        }

        // Fetch company and subscription details (if non-SUPER_ADMIN)
        let company = null;
        let subscription = null;

        if (user.role !== 'SUPER_ADMIN') {
            if (!user.companyId) {
                return res.status(403).json({ success: false, message: 'No company associated with this account.' });
            }

            company = await Company.findById(user.companyId);
            if (!company || !company.isActive) {
                return res.status(403).json({ success: false, message: 'Your business account is suspended or inactive.' });
            }

            subscription = await Subscription.findOne({ companyId: user.companyId });
        }

        // IP/Device logging
        user.lastLoginAt = new Date();
        user.lastLoginIp = req.ip || req.headers['x-forwarded-for'] || '';
        await user.save({ validateBeforeSave: false });

        res.json({ success: true, data: buildUserPayload(user, company, subscription) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── REFRESH TOKEN ──────────────────────────────────────────────────
// POST /api/auth/refresh-token
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token is required' });
        }

        const secret = process.env.JWT_REFRESH_SECRET || 'zoho_transport_refresh_secret_key_2026';
        const decoded = jwt.verify(refreshToken, secret);

        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(403).json({ success: false, message: 'Session is expired or account is disabled' });
        }

        const newAccessToken = generateAccessToken(user._id);
        res.json({ success: true, accessToken: newAccessToken });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Token expired or invalid session' });
    }
};

// ─── CHANGE PASSWORD (FIRST LOGIN OR MANUAL RESET) ────────────────────
// PUT /api/auth/change-password
export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
        }

        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify old password (unless super admin manually bypassed, or if it is first login reset where we verify old)
        if (oldPassword) {
            const isMatch = await user.matchPassword(oldPassword);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Incorrect old password' });
            }
        }

        user.password = newPassword;
        user.isPasswordResetRequired = false;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET PROFILE ──────────────────────────────────────────────────────
// GET /api/auth/profile
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let company = null;
        let subscription = null;

        if (user.role !== 'SUPER_ADMIN' && user.companyId) {
            company = await Company.findById(user.companyId).lean();
            subscription = await Subscription.findOne({ companyId: user.companyId }).lean();
        }

        res.json({
            success: true,
            data: {
                user,
                company,
                subscription
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Disabled public signup route
export const registerUser = async (req, res) => {
    return res.status(403).json({
        success: false,
        message: 'Public registration is disabled. Super Admin must provision accounts.'
    });
};
