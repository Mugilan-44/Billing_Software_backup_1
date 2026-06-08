import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import User from '../models/User.js';

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        } else if (req.user.role === 'CUSTOMER') {
            query._id = req.user.customerId;
        }
        const customers = await Customer.find(query);
        res.json({ success: true, data: customers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
export const getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
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
        const payload = { ...req.body };
        if (req.user.role === 'ADMIN') {
            payload.companyId = req.user.companyId;
            payload.branchId = req.user.branchId;
        }
        const customer = await Customer.create(payload);
        // Initialize standard outstanding with opening balance
        customer.outstandingBalance = customer.openingBalance || 0;
        await customer.save();

        res.status(201).json({ success: true, data: customer });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
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
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        await customer.deleteOne();
        res.json({ success: true, message: 'Customer removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get customer ledger
// @route   GET /api/customers/:id/ledger
// @access  Private
export const getCustomerLedger = async (req, res) => {
    try {
        const ledger = await LedgerEntry.find({ customerId: req.params.id })
            .sort({ date: 1, createdAt: 1 });

        res.json({ success: true, count: ledger.length, data: ledger });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create user account for customer
// @route   POST /api/customers/:id/user
// @access  Private
export const createCustomerUser = async (req, res) => {
    try {
        const { password, email } = req.body;
        const customer = await Customer.findById(req.params.id);

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

        const user = await User.create({
            name: customer.displayName || customer.companyName,
            email: userEmail,
            password: userPassword,
            role: 'CUSTOMER',
            companyId: req.user?.companyId || null, // Inherit if created by Admin
            customerId: customer._id,
            isActive: true,
        });

        res.status(201).json({
            success: true,
            message: 'Customer user account created successfully',
            data: { email: userEmail, password: userPassword }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
