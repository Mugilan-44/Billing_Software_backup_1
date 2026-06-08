import express from 'express';
import {
    login,
    registerUser,
    getUserProfile,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Unified login point
router.post('/login', login);

// Initial registration (for seeding SUPER_ADMIN)
router.post('/register', registerUser);

// Protected profile
router.get('/profile', protect, getUserProfile);

export default router;
