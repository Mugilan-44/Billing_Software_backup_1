import express from 'express';
import {
    getCustomers, getCustomerById, createCustomer, updateCustomer,
    deleteCustomer, getCustomerLedger, createCustomerUser
} from '../controllers/customerController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getCustomers)
    .post(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createCustomer);

router.route('/:id')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), getCustomerById)
    .put(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateCustomer)
    .delete(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteCustomer);

router.route('/:id/user')
    .post(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createCustomerUser);

router.route('/:id/ledger')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), getCustomerLedger);

export default router;
