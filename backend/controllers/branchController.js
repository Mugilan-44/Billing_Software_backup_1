import Branch from '../models/Branch.js';
import Company from '../models/Company.js';

// @desc    Create new branch
// @route   POST /api/branches
// @access  Private/SuperAdmin
export const createBranch = async (req, res) => {
    try {
        const { companyId, branchName, branchCode, address, phone } = req.body;

        if (!companyId || !branchName || !branchCode) {
            return res.status(400).json({ success: false, message: 'Please provide companyId, branchName, and branchCode' });
        }

        const branchExists = await Branch.findOne({ companyId, branchCode });
        if (branchExists) {
            return res.status(400).json({ success: false, message: 'Branch code already exists for this company' });
        }

        const branch = await Branch.create({
            companyId,
            branchName,
            branchCode,
            address,
            phone,
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, data: branch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all branches
// @route   GET /api/branches
// @access  Private/SuperAdmin/Admin
export const getBranches = async (req, res) => {
    try {
        const { companyId } = req.query;
        let query = {};

        // If filtering by company
        if (companyId) {
            query.companyId = companyId;
        }

        // Admins can only see their own branch (unless SUPER_ADMIN)
        if (req.user.role !== 'SUPER_ADMIN') {
            query._id = req.user.branchId;
        }

        let branches = await Branch.find(query)
            .populate('companyId', 'name')
            .sort({ createdAt: -1 });

        // Fallback: If no branches exist for this company, auto-create a default one
        if (branches.length === 0 && companyId && req.user.role === 'SUPER_ADMIN') {
            const company = await Company.findById(companyId);
            if (company) {
                const newBranch = await Branch.create({
                    companyId: company._id,
                    branchName: 'Main Branch',
                    branchCode: 'MAIN',
                    address: company.address?.street || '',
                    phone: company.phone || '',
                    createdBy: req.user._id
                });
                branches = [newBranch];
            }
        }

        res.json({ success: true, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update branch
// @route   PUT /api/branches/:id
// @access  Private/SuperAdmin
export const updateBranch = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        const updatedBranch = await Branch.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json({ success: true, data: updatedBranch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete branch
// @route   DELETE /api/branches/:id
// @access  Private/SuperAdmin
export const deleteBranch = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        await branch.deleteOne();
        res.json({ success: true, message: 'Branch removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
