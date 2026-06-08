import express from 'express';
import {
    getVendors, getVendorById, createVendor, updateVendor, deleteVendor
} from '../controllers/vendorController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getVendors)
    .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), createVendor);

router.route('/:id')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getVendorById)
    .put(authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateVendor)
    .delete(authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteVendor);

export default router;
