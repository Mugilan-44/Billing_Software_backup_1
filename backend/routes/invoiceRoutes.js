import express from 'express';
import {
    createInvoice, getInvoices, getInvoiceById, downloadInvoicePdf, updateInvoice
} from '../controllers/invoiceController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), getInvoices)
    .post(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createInvoice);

router.route('/:id')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), getInvoiceById)
    .put(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateInvoice);

router.route('/:id/download')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), downloadInvoicePdf);

export default router;
