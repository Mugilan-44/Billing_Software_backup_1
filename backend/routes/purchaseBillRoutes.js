import express from 'express';
import {
    getPurchaseBills, getPurchaseBillById, createPurchaseBill, updatePurchaseBillStatus
} from '../controllers/purchaseBillController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getPurchaseBills)
    .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), createPurchaseBill);

router.route('/:id')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getPurchaseBillById);

router.route('/:id/status')
    .put(authorizeRoles('SUPER_ADMIN', 'ADMIN'), updatePurchaseBillStatus);

export default router;
