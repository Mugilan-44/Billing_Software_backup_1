import express from 'express';
import { getDashboardSummary, getChartData, getActivityFeed, getTopSellingItems, globalSearch } from '../controllers/dashboardController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/summary', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getDashboardSummary);
router.get('/chart', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getChartData);
router.get('/activity', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getActivityFeed);
router.get('/top-selling', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getTopSellingItems);
router.get('/search', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), globalSearch);

export default router;
