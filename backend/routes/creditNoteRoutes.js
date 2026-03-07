import express from 'express';
import { getCreditNotes, createCreditNote, deleteCreditNote } from '../controllers/creditNoteController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), getCreditNotes)
    .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), createCreditNote);

router.route('/:id')
    .delete(authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteCreditNote);

export default router;
