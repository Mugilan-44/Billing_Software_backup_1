import express from 'express';
import {
    getQuotations, getQuotationById, createQuotation, updateQuotationStatus, deleteQuotation
} from '../controllers/quotationController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getQuotations)
    .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), createQuotation);

router.route('/:id')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getQuotationById)
    .delete(authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteQuotation);

router.route('/:id/status')
    .put(authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateQuotationStatus);

export default router;
