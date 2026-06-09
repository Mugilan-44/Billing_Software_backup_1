import express from 'express';
import { 
    getCreditNotes, 
    createCreditNote, 
    deleteCreditNote, 
    getCreditNoteById, 
    downloadCreditNotePdf, 
    sendCreditNote,
    updateCreditNoteStatus
} from '../controllers/creditNoteController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), getCreditNotes)
    .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), createCreditNote);

router.route('/:id')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), getCreditNoteById)
    .delete(authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteCreditNote);

router.route('/:id/download')
    .get(authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CUSTOMER'), downloadCreditNotePdf);

router.route('/:id/send')
    .post(authorizeRoles('SUPER_ADMIN', 'ADMIN'), sendCreditNote);

router.route('/:id/status')
    .put(authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateCreditNoteStatus);

export default router;
