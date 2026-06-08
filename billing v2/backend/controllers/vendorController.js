import Vendor from '../models/Vendor.js';
import { findDocument } from '../utils/tenant.utils.js';
import { createVendorSchema, updateVendorSchema } from '../validators/vendor.validators.js';

export const getVendors = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        }
        const vendors = await Vendor.find(query)
            .select('-__v')
            .sort({ companyName: 1 })
            .lean();
        res.status(200).json({ success: true, count: vendors.length, data: vendors });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const getVendorById = async (req, res) => {
    try {
        const vendor = await findDocument(Vendor, req.params.id, req.user);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
        res.status(200).json({ success: true, data: vendor });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const createVendor = async (req, res) => {
    try {
        const parsed = createVendorSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
            });
        }

        const payload = { ...parsed.data };
        if (req.user.role !== 'SUPER_ADMIN') {
            payload.companyId = req.user.companyId;
            payload.branchId  = req.user.branchId;
        }

        // Auto-derive stateCode from GSTIN if not provided
        const gstin = payload.gstin || payload.gstNumber;
        if (gstin && !payload.stateCode) {
            payload.stateCode = gstin.substring(0, 2);
        }

        // Seed financial running totals
        payload.outstandingBalance = payload.openingBalance || 0;
        payload.totalBusiness      = 0;

        // Check for duplicate email within same company
        if (payload.email) {
            const companyFilter = req.user.role !== 'SUPER_ADMIN' ? { companyId: req.user.companyId } : {};
            const existing = await Vendor.findOne({ email: payload.email, ...companyFilter });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Vendor with this email already exists' });
            }
        }

        const vendor = await Vendor.create(payload);
        res.status(201).json({ success: true, data: vendor });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Invalid data', error: error.message });
    }
};

// FIX C5: strict field allowlist — prevents financial field tampering
export const updateVendor = async (req, res) => {
    try {
        const parsed = updateVendorSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
            });
        }

        const vendor = await findDocument(Vendor, req.params.id, req.user);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        // Apply only validated fields — never spread raw req.body
        Object.assign(vendor, parsed.data);

        // Auto-sync stateCode from GSTIN if updated
        const gstin = parsed.data.gstin || parsed.data.gstNumber;
        if (gstin) vendor.stateCode = gstin.substring(0, 2);

        await vendor.save();
        res.status(200).json({ success: true, data: vendor });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Invalid data', error: error.message });
    }
};

export const deleteVendor = async (req, res) => {
    try {
        const vendor = await findDocument(Vendor, req.params.id, req.user);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        await vendor.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
