import express from 'express';
import {
    createCompany, getCompanies, getCompanyById, updateCompany, deleteCompany,
    createAdmin, getAdmins, toggleUserActive, getSystemStats,
    createSuperAdmin, getSuperAdmins, updateAdminPermissions,
    extendSubscription, toggleCompanyStatus, resetUserPassword, deleteUser,
    createAdminAndCompany, updateAdminAndCompany
} from '../controllers/superAdminController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require SUPER_ADMIN
router.use(protect, authorizeRoles('SUPER_ADMIN'));

// System stats
router.get('/stats', getSystemStats);

// Super Admin management
router.route('/super-admins')
    .get(getSuperAdmins)
    .post(createSuperAdmin);

// Company management
router.route('/companies')
    .get(getCompanies)
    .post(createCompany);

router.route('/companies/:id')
    .get(getCompanyById)
    .put(updateCompany)
    .delete(deleteCompany);

router.post('/companies/:id/extend', extendSubscription);
router.patch('/companies/:id/toggle-status', toggleCompanyStatus);

// Admin user management
router.route('/admins')
    .get(getAdmins)
    .post(createAdmin);

router.post('/admins/create-combined', createAdminAndCompany);
router.put('/admins/:id/update-combined', updateAdminAndCompany);

router.patch('/admins/:id/permissions', updateAdminPermissions);
router.patch('/users/:id/toggle', toggleUserActive);
router.post('/users/:id/reset-password', resetUserPassword);
router.delete('/users/:id', deleteUser);

export default router;
