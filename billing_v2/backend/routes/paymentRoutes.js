import express from 'express';
import { recordPayment, getPayments, deletePayment, updatePayment, getPaymentById } from '../controllers/paymentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), getPayments)
  .post(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), recordPayment);

router.route('/:id')
  .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getPaymentById)
  .put(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updatePayment)
  .delete(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deletePayment);

export default router;
