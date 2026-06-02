import express from 'express';
import {
    createExpense, getExpenses, deleteExpense, getVehicleAggregations, getExpense, updateExpense
} from '../controllers/expenseController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getExpenses)
    .post(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createExpense);

router.route('/vehicle-aggregations')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getVehicleAggregations);

router.route('/:id')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getExpense)
    .put(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateExpense)
    .delete(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteExpense);

export default router;
