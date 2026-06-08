import express from 'express';
import {
    login,
    registerUser,
    getUserProfile,
    refreshToken,
    changePassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Unified login point
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Password settings & profiling
router.put('/change-password', protect, changePassword);
router.get('/profile', protect, getUserProfile);

// Initial registration (for seeding SUPER_ADMIN)
router.post('/register', registerUser);

export default router;
