import express from 'express';
import {
    getSalesOrders, getSalesOrderById, createSalesOrder, updateSalesOrderStatus, deleteSalesOrder
} from '../controllers/salesOrderController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getSalesOrders)
    .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), createSalesOrder);

router.route('/:id')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getSalesOrderById)
    .delete(authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteSalesOrder);

router.route('/:id/status')
    .put(authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateSalesOrderStatus);

export default router;
