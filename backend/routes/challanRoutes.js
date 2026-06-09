import express from 'express';
import {
    createChallan, getChallans, getChallanById, updateChallanStatus, updateChallan, deleteChallan,
    downloadChallanPdf, sendChallan
} from '../controllers/challanController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getChallans)
    .post(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createChallan);

router.route('/:id')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getChallanById)
    .put(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateChallan)
    .delete(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteChallan);

router.route('/:id/download')
    .get(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), downloadChallanPdf);

router.route('/:id/send')
    .post(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), sendChallan);

router.route('/:id/status')
    .put(protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateChallanStatus);

export default router;
