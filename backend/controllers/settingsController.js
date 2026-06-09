import CompanySettings from '../models/CompanySettings.js';
import Company from '../models/Company.js';
import User from '../models/User.js';

// @desc    Get company settings
// @route   GET /api/settings
// @access  Private
export const getSettings = async (req, res) => {
    try {
        const companyId = req.user.role === 'SUPER_ADMIN' ? req.query.companyId : req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'companyId is required to fetch settings' });
        }

        let settings = await CompanySettings.findOne({ companyId });
        if (!settings) {
            const company = await Company.findById(companyId);
            settings = await CompanySettings.create({
                companyId,
                companyName: company?.businessName || 'My Company',
                email: company?.email || '',
                phone: company?.phone || '',
                gstin: company?.gstin || company?.gstNumber || '',
                address: {
                    street: company?.address?.street || '',
                    city: company?.address?.city || '',
                    state: company?.address?.state || '',
                    zipCode: company?.address?.zipCode || '',
                    country: company?.address?.country || 'India'
                }
            });
        }
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update company settings
// @route   PUT /api/settings
// @access  Private
export const updateSettings = async (req, res) => {
    try {
        const companyId = req.user.role === 'SUPER_ADMIN' ? req.query.companyId : req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'companyId is required to update settings' });
        }

        let settings = await CompanySettings.findOneAndUpdate(
            { companyId },
            { ...req.body, companyId },
            { new: true, runValidators: true, upsert: true }
        );

        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Get co-admin account details
// @route   GET /api/settings/co-admin
// @access  Private
export const getCoAdmin = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const coAdmin = await User.findOne({ companyId, isCoAdmin: true }).select('-password');
        res.json({ success: true, data: coAdmin });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create co-admin account
// @route   POST /api/settings/co-admin
// @access  Private
export const createCoAdmin = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const branchId = req.user.branchId;

        const existingCoAdmin = await User.findOne({ companyId, isCoAdmin: true });
        if (existingCoAdmin) {
            return res.status(400).json({ success: false, message: 'A Co-Admin account already exists for this company.' });
        }

        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields (name, email, password) are required.' });
        }

        const emailExists = await User.findOne({ email: email.toLowerCase() });
        if (emailExists) {
            return res.status(400).json({ success: false, message: 'Email address is already registered.' });
        }

        const coAdmin = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            role: 'ADMIN',
            companyId,
            branchId,
            isCoAdmin: true,
            isActive: true
        });

        const responseData = coAdmin.toObject();
        delete responseData.password;

        res.status(201).json({ success: true, data: responseData });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update co-admin details
// @route   PUT /api/settings/co-admin
// @access  Private
export const updateCoAdmin = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const coAdmin = await User.findOne({ companyId, isCoAdmin: true });
        if (!coAdmin) {
            return res.status(404).json({ success: false, message: 'Co-Admin account not found.' });
        }

        const { name, email, password } = req.body;
        if (name) coAdmin.name = name;
        
        if (email && email.toLowerCase() !== coAdmin.email) {
            const emailExists = await User.findOne({ email: email.toLowerCase() });
            if (emailExists) {
                return res.status(400).json({ success: false, message: 'Email address is already registered.' });
            }
            coAdmin.email = email.toLowerCase();
        }

        if (password && password.trim().length >= 6) {
            coAdmin.password = password;
        }

        await coAdmin.save();

        const responseData = coAdmin.toObject();
        delete responseData.password;

        res.json({ success: true, data: responseData });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete co-admin account
// @route   DELETE /api/settings/co-admin
// @access  Private
export const deleteCoAdmin = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const result = await User.deleteOne({ companyId, isCoAdmin: true });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Co-Admin account not found.' });
        }
        res.json({ success: true, message: 'Co-Admin account deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
