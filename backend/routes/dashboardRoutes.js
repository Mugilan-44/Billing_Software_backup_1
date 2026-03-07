import express from 'express';
import { getDashboardSummary, getChartData } from '../controllers/dashboardController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/summary', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getDashboardSummary);
router.get('/chart', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getChartData);

export default router;
