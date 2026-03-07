import express from 'express';
import {
    getItems, getItemById, createItem, updateItem, deleteItem
} from '../controllers/itemController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getItems)
    .post(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createItem);

router.route('/:id')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getItemById)
    .put(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateItem)
    .delete(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteItem);

export default router;
