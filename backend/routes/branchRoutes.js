import express from 'express';
import {
    createBranch,
    getBranches,
    updateBranch,
    deleteBranch
} from '../controllers/branchController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, authorize('SUPER_ADMIN'), createBranch)
    .get(protect, authorize('SUPER_ADMIN', 'ADMIN'), getBranches);

router.route('/:id')
    .put(protect, authorize('SUPER_ADMIN'), updateBranch)
    .delete(protect, authorize('SUPER_ADMIN'), deleteBranch);

export default router;
