import User from '../models/User.js';
import Company from '../models/Company.js';
import generateToken from '../utils/generateToken.js';

// ─── Create Company ───────────────────────────────────────────────────────────
// POST /api/super-admin/companies
export const createCompany = async (req, res) => {
    try {
        const { name, email, phone, gstin, pan, address } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Company name is required' });
        }

        const company = await Company.create({
            name, email, phone, gstin, pan, address,
            createdBy: req.user._id,
        });

        res.status(201).json({ success: true, data: company });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Get All Companies ────────────────────────────────────────────────────────
// GET /api/super-admin/companies
export const getCompanies = async (req, res) => {
    try {
        const companies = await Company.find({}).sort({ createdAt: -1 });
        res.json({ success: true, count: companies.length, data: companies });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Get Single Company ───────────────────────────────────────────────────────
// GET /api/super-admin/companies/:id
export const getCompanyById = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        res.json({ success: true, data: company });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Update Company ───────────────────────────────────────────────────────────
// PUT /api/super-admin/companies/:id
export const updateCompany = async (req, res) => {
    try {
        const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        res.json({ success: true, data: company });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Delete Company ───────────────────────────────────────────────────────────
// DELETE /api/super-admin/companies/:id
export const deleteCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        await company.deleteOne();
        res.json({ success: true, message: 'Company deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Create Admin User (for a company) ───────────────────────────────────────
// POST /api/super-admin/admins
export const createAdmin = async (req, res) => {
    try {
        const { name, email, password, companyId, branchId } = req.body;

        if (!name || !email || !password || !companyId || !branchId) {
            return res.status(400).json({ success: false, message: 'Name, email, password, companyId, and branchId are all required' });
        }

        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }

        const admin = await User.create({
            name, email, password,
            role: 'ADMIN',
            companyId,
            branchId,
            isActive: true,
        });

        res.status(201).json({
            success: true,
            data: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                companyId: admin.companyId,
                branchId: admin.branchId,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Create Super Admin ──────────────────────────────────────────────────────
// POST /api/super-admin/super-admins
export const createSuperAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }

        const admin = await User.create({
            name, email, password,
            role: 'SUPER_ADMIN',
            isActive: true,
        });

        res.status(201).json({
            success: true,
            data: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Get All Super Admins ────────────────────────────────────────────────────
// GET /api/super-admin/super-admins
export const getSuperAdmins = async (req, res) => {
    try {
        const admins = await User.find({ role: 'SUPER_ADMIN' }).sort({ createdAt: -1 });
        res.json({ success: true, count: admins.length, data: admins });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Get All Admins ───────────────────────────────────────────────────────────
// GET /api/super-admin/admins
export const getAdmins = async (req, res) => {
    try {
        const admins = await User.find({ role: 'ADMIN' })
            .populate('companyId', 'name')
            .populate('branchId', 'branchName')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: admins.length, data: admins });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Update Admin Permissions ─────────────────────────────────────────────────
// PATCH /api/super-admin/admins/:id/permissions
export const updateAdminPermissions = async (req, res) => {
    try {
        const { permissions } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (user.role !== 'ADMIN') {
            return res.status(400).json({ success: false, message: 'Can only update permissions for Admin users' });
        }

        user.permissions = permissions;
        await user.save({ validateBeforeSave: false });

        res.json({ success: true, data: user.permissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Toggle User Active Status ────────────────────────────────────────────────
// PATCH /api/super-admin/users/:id/toggle
export const toggleUserActive = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent deactivating self
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
        }

        user.isActive = !user.isActive;
        await user.save({ validateBeforeSave: false });
        res.json({ success: true, data: { _id: user._id, isActive: user.isActive } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Get System Stats ─────────────────────────────────────────────────────────
// GET /api/super-admin/stats
export const getSystemStats = async (req, res) => {
    try {
        const [totalCompanies, totalAdmins, totalCustomers, activeCompanies] = await Promise.all([
            Company.countDocuments(),
            User.countDocuments({ role: 'ADMIN' }),
            User.countDocuments({ role: 'CUSTOMER' }),
            Company.countDocuments({ isActive: true }),
        ]);

        res.json({
            success: true,
            data: { totalCompanies, totalAdmins, totalCustomers, activeCompanies }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
