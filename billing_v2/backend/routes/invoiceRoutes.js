import express from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  downloadInvoicePdf,
  streamInvoicePdf,
  updateInvoice,
  sendInvoice,
  cancelInvoice,
  deleteInvoice,
  updateInvoiceStatus,
} from '../controllers/invoiceController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), getInvoices)
  .post(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createInvoice);

router.route('/:id')
  .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), getInvoiceById)
  .put(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateInvoice)
  .delete(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteInvoice);

router.route('/:id/download')
  .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), downloadInvoicePdf);

router.route('/:id/pdf')
  .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), streamInvoicePdf);

// ── New endpoints ─────────────────────────────────────────────────────────────
router.put('/:id/send',    protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), sendInvoice);
router.put('/:id/cancel',  protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), cancelInvoice);
router.put('/:id/status',  protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateInvoiceStatus);

export default router;
