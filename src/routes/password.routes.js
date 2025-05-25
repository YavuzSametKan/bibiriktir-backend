import express from 'express';
import { startPasswordUpdate, verifyAndUpdatePassword } from '../controllers/password.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiter ayarları
const passwordUpdateLimiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 dakika
  max: 5, // 5 deneme
  message: {
    success: false,
    message: 'Çok fazla deneme yaptınız. Lütfen 3 dakika sonra tekrar deneyin.'
  }
});

// Şifre güncelleme sürecini başlat
router.post('/start', protect, passwordUpdateLimiter, startPasswordUpdate);

// Doğrulama kodunu kontrol et ve şifreyi güncelle
router.post('/verify', protect, passwordUpdateLimiter, verifyAndUpdatePassword);

export default router; 