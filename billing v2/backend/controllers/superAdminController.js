import User from '../models/User.js';
import Company from '../models/Company.js';
import Subscription from '../models/Subscription.js';
import Customer from '../models/Customer.js';
import Branch from '../models/Branch.js';
import bcrypt from 'bcrypt';

// ─── Create Company & Subscription ──────────────────────────────────────────
// POST /api/super-admin/companies
export const createCompany = async (req, res) => {
    try {
        const {
            businessName,
            name,
            ownerName,
            email,
            phone,
            gstin,
            pan,
            address,
            street,
            city,
            state,
            zipCode,
            country,
            subscriptionMonths = 12,
            maxUsers = 10,
            plan = 'Premium',
            branchName,
            branchCode,
            branchAddress,
            branchPhone
        } = req.body;

        const finalName = businessName || name;
        if (!finalName) {
            return res.status(400).json({ success: false, message: 'Business name is required' });
        }

        // Construct nested address details
        const companyAddress = {
            street: street || address?.street || '',
            city: city || address?.city || '',
            state: state || address?.state || '',
            zipCode: zipCode || address?.zipCode || '',
            country: country || address?.country || 'India'
        };

        // Create the company record
        const company = await Company.create({
            businessName: finalName,
            ownerName,
            email,
            phone,
            gstin,
            gstNumber: gstin,
            pan,
            address: companyAddress,
            createdBy: req.user._id,
        });

        // Initialize Subscription
        const startDate = new Date();
        const expiryDate = new Date(Date.now() + subscriptionMonths * 30 * 24 * 60 * 60 * 1000);

        const subscription = await Subscription.create({
            companyId: company._id,
            plan,
            startDate,
            expiryDate,
            status: 'ACTIVE',
            maxUsers,
            createdBy: req.user._id
        });

        // Create Default Branch
        const finalBranchName = branchName || 'Main Branch';
        const finalBranchCode = branchCode || 'MAIN';

        const branch = await Branch.create({
            companyId: company._id,
            branchName: finalBranchName,
            branchCode: finalBranchCode.toUpperCase(),
            address: branchAddress || (companyAddress.street ? `${companyAddress.street}, ${companyAddress.city}` : ''),
            phone: branchPhone || phone || '',
            createdBy: req.user._id,
        });

        res.status(201).json({ success: true, company, subscription, branch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Get All Companies Sorted by Expiry Date ──────────────────────────────────
// GET /api/super-admin/companies
export const getCompanies = async (req, res) => {
    try {
        // Query subscriptions sorted by expiryDate ascending (nearest expiry first)
        const subscriptions = await Subscription.find({})
            .sort({ expiryDate: 1 })
            .populate('companyId')
            .lean();

        // Map data to match what front-end expects for companies listing
        const companiesList = subscriptions.map(sub => {
            if (!sub.companyId) return null;
            return {
                ...sub.companyId,
                name: sub.companyId.businessName, // Ensure compatibility with client filters
                subscriptionStatus: sub.status,
                subscriptionStartDate: sub.startDate,
                subscriptionEndDate: sub.expiryDate,
                maxUsers: sub.maxUsers,
                plan: sub.plan,
            };
        }).filter(Boolean);

        res.json({ success: true, count: companiesList.length, data: companiesList });
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

// ─── Create Admin User (for a company) ───────────────────────────────────────
// POST /api/super-admin/admins
export const createAdmin = async (req, res) => {
    try {
        const { name, email, password, companyId, branchId } = req.body;

        if (!name || !email || !password || !companyId) {
            return res.status(400).json({ success: false, message: 'Name, email, password, and companyId are required' });
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
            branchId: branchId || undefined,
            isActive: true,
            isPasswordResetRequired: true, // Forces password change on first login
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

// ─── Extend Company Subscription ─────────────────────────────────────────────
// POST /api/super-admin/companies/:id/extend
export const extendSubscription = async (req, res) => {
    try {
        const { months = 12 } = req.body;
        const subscription = await Subscription.findOne({ companyId: req.params.id });
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription record not found' });
        }

        // Calculate new expiry date from existing expiry date if it is in the future, or from today if already expired
        const baseDate = new Date(subscription.expiryDate) > new Date() ? new Date(subscription.expiryDate) : new Date();
        const newExpiry = new Date(baseDate.getTime() + months * 30 * 24 * 60 * 60 * 1000);

        subscription.expiryDate = newExpiry;
        subscription.status = 'ACTIVE';
        await subscription.save();

        res.json({ success: true, message: `Subscription extended successfully until ${newExpiry.toLocaleDateString()}`, subscription });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Suspend/Enable Company ──────────────────────────────────────────────────
// PATCH /api/super-admin/companies/:id/toggle-status
export const toggleCompanyStatus = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        company.isActive = !company.isActive;
        await company.save();

        // Sync subscription status too
        const subscription = await Subscription.findOne({ companyId: company._id });
        if (subscription) {
            subscription.status = company.isActive ? 'ACTIVE' : 'SUSPENDED';
            await subscription.save();
        }

        res.json({ success: true, message: `Company status updated to ${company.isActive ? 'Active' : 'Inactive'}`, company });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Reset Password for Client User ──────────────────────────────────────────
// POST /api/super-admin/users/:id/reset-password
export const resetUserPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.password = newPassword;
        user.isPasswordResetRequired = true; // force change password on login
        await user.save();

        res.json({ success: true, message: 'Password reset successfully' });
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
            .populate('companyId')
            .populate('branchId', 'branchName')
            .sort({ createdAt: -1 })
            .lean();

        const result = [];
        for (const admin of admins) {
            if (admin.companyId) {
                const sub = await Subscription.findOne({ companyId: admin.companyId._id }).lean();
                result.push({
                    ...admin,
                    subscription: sub ? {
                        plan: sub.plan,
                        status: sub.status,
                        startDate: sub.startDate,
                        expiryDate: sub.expiryDate,
                    } : null
                });
            } else {
                result.push({ ...admin, subscription: null });
            }
        }

        res.json({ success: true, count: result.length, data: result });
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

        if (permissions) user.permissions = permissions;
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

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
        }

        user.isActive = !user.isActive;
        await user.save({ validateBeforeSave: false });

        // If the user is an ADMIN, also sync the Company and Subscription status
        if (user.role === 'ADMIN' && user.companyId) {
            const company = await Company.findById(user.companyId);
            if (company) {
                company.isActive = user.isActive;
                await company.save();
            }
            const subscription = await Subscription.findOne({ companyId: user.companyId });
            if (subscription) {
                subscription.status = user.isActive ? 'ACTIVE' : 'SUSPENDED';
                await subscription.save();
            }
        }

        res.json({ success: true, data: { _id: user._id, isActive: user.isActive } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Delete User ─────────────────────────────────────────────────────────────
// DELETE /api/super-admin/users/:id
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        }

        // If they are an Admin, also delete their company, subscription, and branches
        if (user.role === 'ADMIN' && user.companyId) {
            await Subscription.deleteOne({ companyId: user.companyId });
            await Company.deleteOne({ _id: user.companyId });
            await Branch.deleteMany({ companyId: user.companyId });
        }

        await user.deleteOne();
        res.json({ success: true, message: 'User and all associated company data deleted successfully' });
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

        await Subscription.deleteOne({ companyId: company._id });
        await Branch.deleteMany({ companyId: company._id });
        await User.deleteMany({ companyId: company._id });
        await company.deleteOne();

        res.json({ success: true, message: 'Company deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Get System Stats ─────────────────────────────────────────────────────────
// GET /api/super-admin/stats
export const getSystemStats = async (req, res) => {
    try {
        const totalAdmins = await User.countDocuments({ role: 'ADMIN' });
        
        // Find subscriptions to determine active/deactive status
        const subscriptions = await Subscription.find({});
        const activeCompanyIds = new Set();
        const now = new Date();
        
        for (const sub of subscriptions) {
            if (sub.status === 'ACTIVE' && new Date(sub.expiryDate) > now) {
                activeCompanyIds.add(sub.companyId?.toString());
            }
        }
        
        const allAdmins = await User.find({ role: 'ADMIN' });
        let activeAdmins = 0;
        let deactiveAdmins = 0;
        
        for (const admin of allAdmins) {
            if (admin.isActive && admin.companyId && activeCompanyIds.has(admin.companyId.toString())) {
                activeAdmins++;
            } else {
                deactiveAdmins++;
            }
        }

        res.json({
            success: true,
            data: {
                totalAdmins,
                activeAdmins,
                deactiveAdmins
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Create Admin And Company Combined ──────────────────────────────────────────
// POST /api/super-admin/admins/create-combined
export const createAdminAndCompany = async (req, res) => {
    try {
        const {
            companyName,
            ownerName,
            phone,
            email, // business email
            street,
            city,
            state,
            zipCode,
            country = 'India',
            subscriptionMonths = 12,
            loginEmail,
            password
        } = req.body;

        if (!companyName) {
            return res.status(400).json({ success: false, message: 'Company Name is required' });
        }
        if (!ownerName) {
            return res.status(400).json({ success: false, message: 'Representative Name is required' });
        }
        if (!loginEmail || !password) {
            return res.status(400).json({ success: false, message: 'Account ID (Login Email) and Password are required' });
        }

        const existingUser = await User.findOne({ email: loginEmail.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists with this login email' });
        }

        // Construct address
        const companyAddress = {
            street: street || '',
            city: city || '',
            state: state || '',
            zipCode: zipCode || '',
            country: country || 'India'
        };

        // 1. Create Company
        const company = await Company.create({
            businessName: companyName,
            ownerName,
            email,
            phone,
            address: companyAddress,
            createdBy: req.user._id,
            isActive: true
        });

        // 2. Create Subscription
        const startDate = new Date();
        const expiryDate = new Date(Date.now() + subscriptionMonths * 30 * 24 * 60 * 60 * 1000);
        const subscription = await Subscription.create({
            companyId: company._id,
            plan: 'Premium',
            startDate,
            expiryDate,
            status: 'ACTIVE',
            maxUsers: 10,
            createdBy: req.user._id
        });

        // 3. Create Default Branch
        const branch = await Branch.create({
            companyId: company._id,
            branchName: 'Main Branch',
            branchCode: 'MAIN',
            address: companyAddress.street ? `${companyAddress.street}, ${companyAddress.city}` : '',
            phone: phone || '',
            createdBy: req.user._id,
        });

        // 4. Create Admin User
        const admin = await User.create({
            name: ownerName,
            email: loginEmail.toLowerCase(),
            password,
            role: 'ADMIN',
            companyId: company._id,
            branchId: branch._id,
            isActive: true,
            isPasswordResetRequired: false
        });

        res.status(201).json({
            success: true,
            message: 'Admin account and Company registered successfully',
            data: {
                company,
                subscription,
                admin: {
                    _id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                    companyId: admin.companyId,
                    branchId: admin.branchId
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Update Admin and Company Combined ──────────────────────────────────────────
// PUT /api/super-admin/admins/:id/update-combined
export const updateAdminAndCompany = async (req, res) => {
    try {
        const { id } = req.params; // admin user's ID
        const {
            companyName,
            ownerName,
            phone,
            email,
            street,
            city,
            state,
            zipCode,
            country,
            password,
            renewMonths
        } = req.body;

        const adminUser = await User.findById(id);
        if (!adminUser) {
            return res.status(404).json({ success: false, message: 'Admin user not found' });
        }

        // Update User info
        if (ownerName) adminUser.name = ownerName;
        if (password) {
            adminUser.password = password;
        }
        await adminUser.save();

        // Update Company info
        if (adminUser.companyId) {
            const company = await Company.findById(adminUser.companyId);
            if (company) {
                if (companyName) company.businessName = companyName;
                if (ownerName) company.ownerName = ownerName;
                if (phone) company.phone = phone;
                if (email) company.email = email;
                
                const currentAddress = company.address || {};
                if (street !== undefined || city !== undefined || state !== undefined || zipCode !== undefined || country !== undefined) {
                    company.address = {
                        street: street !== undefined ? street : currentAddress.street,
                        city: city !== undefined ? city : currentAddress.city,
                        state: state !== undefined ? state : currentAddress.state,
                        zipCode: zipCode !== undefined ? zipCode : currentAddress.zipCode,
                        country: country !== undefined ? country : currentAddress.country
                    };
                }
                await company.save();
            }

            // Renew subscription if requested
            if (renewMonths) {
                const subscription = await Subscription.findOne({ companyId: adminUser.companyId });
                if (subscription) {
                    const baseDate = new Date(subscription.expiryDate) > new Date() ? new Date(subscription.expiryDate) : new Date();
                    subscription.expiryDate = new Date(baseDate.getTime() + renewMonths * 30 * 24 * 60 * 60 * 1000);
                    subscription.status = 'ACTIVE';
                    await subscription.save();
                }
            }
        }

        res.json({ success: true, message: 'Admin user and company details updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
