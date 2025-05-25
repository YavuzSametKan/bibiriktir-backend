import express from 'express';
import { updateProfile, getProfile } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Tüm route'lar için authentication gerekli
router.use(protect);

// @route   GET /api/users/profile
// @desc    Kullanıcı bilgilerini getir
router.get('/profile', getProfile);

// @route   PUT /api/users/profile
// @desc    Kullanıcı bilgilerini güncelle
router.put('/profile', updateProfile);

export default router; 