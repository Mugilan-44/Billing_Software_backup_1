import express from 'express';
import {
    createChallan, getChallans, getChallanById, updateChallanStatus
} from '../controllers/challanController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getChallans)
    .post(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createChallan);

router.route('/:id')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getChallanById);

router.route('/:id/status')
    .put(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateChallanStatus);

export default router;
