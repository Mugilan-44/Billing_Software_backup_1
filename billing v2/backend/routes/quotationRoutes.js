import express from 'express';
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotationStatus,
  deleteQuotation,
  convertToSalesOrder,
  updateQuotation,
  downloadQuotationPdf,
  sendQuotation,
} from '../controllers/quotationController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getQuotations)
  .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), createQuotation);

router.route('/:id')
  .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getQuotationById)
  .put(authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateQuotation)
  .delete(authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteQuotation);

router.route('/:id/download')
  .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), downloadQuotationPdf);

router.route('/:id/send')
  .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), sendQuotation);

router.route('/:id/status')
  .put(authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateQuotationStatus);

// ── New: convert quotation to sales order ────────────────────────────────────
router.post('/:id/convert-to-order', authorizeRoles('SUPER_ADMIN', 'ADMIN'), convertToSalesOrder);

export default router;
