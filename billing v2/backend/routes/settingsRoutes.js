import express from 'express';
import {
    getSettings,
    updateSettings,
    getCoAdmin,
    createCoAdmin,
    updateCoAdmin,
    deleteCoAdmin
} from '../controllers/settingsController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getSettings)
    .put(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateSettings);

router.route('/co-admin')
    .get(protect, authorizeRoles('ADMIN'), getCoAdmin)
    .post(protect, authorizeRoles('ADMIN'), createCoAdmin)
    .put(protect, authorizeRoles('ADMIN'), updateCoAdmin)
    .delete(protect, authorizeRoles('ADMIN'), deleteCoAdmin);

export default router;
