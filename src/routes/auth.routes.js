import express from 'express';
import { register, login, logout, getProfile, checkAuth } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/profile', protect, getProfile);
router.get('/check-auth', protect, checkAuth);

export default router; 