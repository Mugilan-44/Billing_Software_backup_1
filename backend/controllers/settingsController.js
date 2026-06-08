import CompanySettings from '../models/CompanySettings.js';

// @desc    Get company settings
// @route   GET /api/settings
// @access  Private
export const getSettings = async (req, res) => {
    try {
        let settings = await CompanySettings.findOne();
        if (!settings) {
            settings = await CompanySettings.create({
                companyName: 'My Transport Company',
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
        let settings = await CompanySettings.findOne();
        if (settings) {
            settings = await CompanySettings.findByIdAndUpdate(settings._id, req.body, {
                new: true,
                runValidators: true,
            });
        } else {
            settings = await CompanySettings.create(req.body);
        }
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
