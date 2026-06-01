import CompanySettings from '../models/CompanySettings.js';
import Company from '../models/Company.js';

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
