import Vendor from '../models/Vendor.js';

export const getVendors = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        }
        const vendors = await Vendor.find(query).sort({ companyName: 1 });
        res.status(200).json({ success: true, count: vendors.length, data: vendors });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const getVendorById = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
        res.status(200).json({ success: true, data: vendor });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const createVendor = async (req, res) => {
    try {
        // Prevent duplicate GST or email if critical
        if (req.body.email) {
            const existing = await Vendor.findOne({ email: req.body.email });
            if (existing) return res.status(400).json({ success: false, message: 'Vendor email already exists' });
        }
        const payload = { ...req.body };
        if (req.user.role === 'ADMIN') {
            payload.companyId = req.user.companyId;
            payload.branchId = req.user.branchId;
        }
        const vendor = await Vendor.create(payload);
        res.status(201).json({ success: true, data: vendor });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Invalid data', error: error.message });
    }
};

export const updateVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
        res.status(200).json({ success: true, data: vendor });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Invalid data', error: error.message });
    }
};

export const deleteVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        await vendor.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
