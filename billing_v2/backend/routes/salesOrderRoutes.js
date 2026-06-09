import express from 'express';
import {
    getSalesOrders, getSalesOrderById, createSalesOrder, updateSalesOrderStatus, deleteSalesOrder, updateSalesOrder,
    downloadSalesOrderPdf, sendSalesOrder
} from '../controllers/salesOrderController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getSalesOrders)
    .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), createSalesOrder);

router.route('/:id')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), getSalesOrderById)
    .put(authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateSalesOrder)
    .delete(authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteSalesOrder);

router.route('/:id/download')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN'), downloadSalesOrderPdf);

router.route('/:id/send')
    .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), sendSalesOrder);

router.route('/:id/status')
    .put(authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateSalesOrderStatus);

export default router;
