import express from 'express';
import {
    createCompany, getCompanies, getCompanyById, updateCompany, deleteCompany,
    createAdmin, getAdmins, toggleUserActive, getSystemStats,
    createSuperAdmin, getSuperAdmins, updateAdminPermissions
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

// Admin user management
router.route('/admins')
    .get(getAdmins)
    .post(createAdmin);

router.patch('/admins/:id/permissions', updateAdminPermissions);
router.patch('/users/:id/toggle', toggleUserActive);

export default router;
