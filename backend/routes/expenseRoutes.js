import express from 'express';
import {
    createExpense, getExpenses, deleteExpense, getVehicleAggregations
} from '../controllers/expenseController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getExpenses)
    .post(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createExpense);

router.route('/vehicle-aggregations')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getVehicleAggregations);

router.route('/:id')
    .delete(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteExpense);

export default router;
