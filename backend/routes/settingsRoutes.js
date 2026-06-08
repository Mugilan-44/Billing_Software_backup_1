import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getSettings)
    .put(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateSettings);

export default router;
