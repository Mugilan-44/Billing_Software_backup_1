import express from 'express';
import {
    getSalesReport, getGSTReport, getOutstandingAgingReport, getGstSummary
} from '../controllers/reportsController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/sales', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getSalesReport);
router.get('/gst', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getGSTReport);
router.get('/aging', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getOutstandingAgingReport);
router.get('/gst-summary', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getGstSummary);

export default router;
