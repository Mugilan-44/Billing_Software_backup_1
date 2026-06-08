import User from '../models/User.js';
import Company from '../models/Company.js';
import generateToken from '../utils/generateToken.js';

// ─── Shared helper ────────────────────────────────────────────────────────────
const buildUserPayload = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    branchId: user.branchId,
    customerId: user.customerId,
    token: generateToken(user._id),
});

// ─── UNIFIED LOGIN ────────────────────────────────────────────────────────────
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
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account is deactivated. Contact your administrator.' });
        }

        user.lastLoginAt = new Date();
        await user.save({ validateBeforeSave: false });

        res.json({ success: true, data: buildUserPayload(user) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── REGISTER (DISABLED for public use) ──────────────────────────────────────
// SUPER_ADMIN is created via the seed script only
// ADMIN is created by SUPER_ADMIN via /api/super-admin/admins
// CUSTOMER is created by ADMIN via their panel
// POST /api/auth/register → blocked
export const registerUser = async (req, res) => {
    return res.status(403).json({
        success: false,
        message: 'Public registration is disabled. SUPER_ADMIN must be seeded via CLI. ADMIN accounts are created by SUPER_ADMIN. CUSTOMER accounts are created by ADMIN.'
    });
};

// ─── GET PROFILE ──────────────────────────────────────────────────────────────
// GET /api/auth/profile   (requires protect middleware)
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('companyId', 'name logoUrl');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                customerId: user.customerId,
                isActive: user.isActive,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
