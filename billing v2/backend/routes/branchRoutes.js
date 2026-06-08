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
    .post(authorize('SUPER_ADMIN'), createBranch)
    .get(authorize('SUPER_ADMIN', 'ADMIN'), getBranches);

router.route('/:id')
    .put(authorize('SUPER_ADMIN'), updateBranch)
    .delete(authorize('SUPER_ADMIN'), deleteBranch);

export default router;
