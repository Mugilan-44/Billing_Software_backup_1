import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import User from '../models/User.js';
import { findDocument } from '../utils/tenant.utils.js';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validators.js';
import { calculateCustomerOutstanding } from '../services/outstandingService.js';
import { toRupees } from '../utils/rounding.js';

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        } else if (req.user.role === 'CUSTOMER') {
            query._id = req.user.customerId;
        }
        const customers = await Customer.find(query)
            .select('-__v')
            .sort({ companyName: 1 })
            .lean();

        // Dynamically compute outstanding balance and aging
        const enrichedCustomers = await Promise.all(customers.map(async (cus) => {
            const stats = await calculateCustomerOutstanding(cus._id);
            return {
                ...cus,
                outstandingBalance: toRupees(stats.totalOutstanding).toNumber(),
                totalBusiness: toRupees(stats.totalInvoiced).toNumber(),
                agingBuckets: {
                    '0-30': toRupees(stats.agingBuckets['0-30']).toNumber(),
                    '31-60': toRupees(stats.agingBuckets['31-60']).toNumber(),
                    '61-90': toRupees(stats.agingBuckets['61-90']).toNumber(),
                    '90+': toRupees(stats.agingBuckets['90+']).toNumber(),
                }
            };
        }));

        res.json({ success: true, count: enrichedCustomers.length, data: enrichedCustomers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
export const getCustomerById = async (req, res) => {
    try {
        const customer = await findDocument(Customer, req.params.id, req.user);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        res.json({ success: true, data: customer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
export const createCustomer = async (req, res) => {
    try {
        const parsed = createCustomerSchema.safeParse(req.body);
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

        // FIX H8: Correctly seed outstandingBalance from openingBalance
        payload.outstandingBalance = payload.openingBalance || 0;
        payload.totalBusiness      = 0;

        const customer = await Customer.create(payload);
        res.status(201).json({ success: true, data: customer });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update customer — strict field allowlist (prevents financial field tampering)
// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomer = async (req, res) => {
    try {
        // Validate with strict schema (rejects companyId, outstandingBalance, totalBusiness, etc.)
        const parsed = updateCustomerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
            });
        }

        const customer = await findDocument(Customer, req.params.id, req.user);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        // Apply only validated fields — never spread raw req.body
        Object.assign(customer, parsed.data);

        // Auto-sync stateCode from GSTIN if GSTIN updated
        const gstin = parsed.data.gstin || parsed.data.gstNumber;
        if (gstin) {
            customer.stateCode = gstin.substring(0, 2);
        }

        await customer.save();
        res.json({ success: true, data: customer });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
export const deleteCustomer = async (req, res) => {
    try {
        const customer = await findDocument(Customer, req.params.id, req.user);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        await customer.deleteOne();
        res.json({ success: true, message: 'Customer removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get customer ledger — running balance
// @route   GET /api/customers/:id/ledger
// @access  Private
export const getCustomerLedger = async (req, res) => {
    try {
        const customer = await findDocument(Customer, req.params.id, req.user);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const ledger = await LedgerEntry.find({ customerId: customer._id })
            .sort({ date: 1, createdAt: 1 })
            .lean();

        res.json({ success: true, count: ledger.length, data: ledger });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create user account for customer portal access
// @route   POST /api/customers/:id/user
// @access  Private
export const createCustomerUser = async (req, res) => {
    try {
        const { password, email } = req.body;
        const customer = await findDocument(Customer, req.params.id, req.user);

        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const userEmail = email || customer.email;

        if (!userEmail) {
            return res.status(400).json({ success: false, message: 'Email address is required to create a user account' });
        }

        const existingUser = await User.findOne({ email: userEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        const userPassword = password || 'Customer@123';

        await User.create({
            name:       customer.displayName || customer.companyName,
            email:      userEmail,
            password:   userPassword,
            role:       'CUSTOMER',
            companyId:  req.user?.companyId || null,
            customerId: customer._id,
            isActive:   true,
        });

        res.status(201).json({
            success: true,
            message: 'Customer user account created successfully',
            data: { email: userEmail, password: userPassword },
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
