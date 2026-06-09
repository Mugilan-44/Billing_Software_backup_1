import express from 'express';
import {
    getPurchaseBills, getPurchaseBillById, createPurchaseBill, updatePurchaseBillStatus, payPurchaseBill, deletePurchaseBill, updatePurchaseBill,
    downloadPurchaseBillPdf, sendPurchaseBill
} from '../controllers/purchaseBillController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getPurchaseBills)
    .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), createPurchaseBill);

router.route('/:id')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getPurchaseBillById)
    .put(authorizeRoles('SUPER_ADMIN', 'ADMIN'), updatePurchaseBill)
    .delete(authorizeRoles('SUPER_ADMIN', 'ADMIN'), deletePurchaseBill);

router.route('/:id/download')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), downloadPurchaseBillPdf);

router.route('/:id/send')
    .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), sendPurchaseBill);

router.route('/:id/status')
    .put(authorizeRoles('SUPER_ADMIN', 'ADMIN'), updatePurchaseBillStatus);

router.route('/:id/pay')
    .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), payPurchaseBill);

export default router;
