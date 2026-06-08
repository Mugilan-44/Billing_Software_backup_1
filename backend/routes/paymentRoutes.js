import express from 'express';
import { recordPayment, getPayments } from '../controllers/paymentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), getPayments)
    .post(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), recordPayment);

export default router;
