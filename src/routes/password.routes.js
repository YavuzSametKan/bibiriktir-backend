import express from 'express';
import { startPasswordUpdate, verifyAndUpdatePassword } from '../controllers/password.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiter store'u oluştur
const limiterStore = new Map();

// Rate limiter ayarları
const passwordUpdateLimiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 dakika
  max: 5, // 5 deneme
  message: {
    success: false,
    message: 'Çok fazla deneme yaptınız. Lütfen 3 dakika sonra tekrar deneyin.'
  },
  // Özel store kullan
  store: {
    increment: (key) => {
      const now = Date.now();
      const windowMs = 3 * 60 * 1000;
      const record = limiterStore.get(key) || { count: 0, resetTime: now + windowMs };
      
      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
      } else {
        record.count += 1;
      }
      
      limiterStore.set(key, record);
      return Promise.resolve(record.count);
    },
    decrement: (key) => {
      const record = limiterStore.get(key);
      if (record) {
        record.count = Math.max(0, record.count - 1);
        limiterStore.set(key, record);
      }
      return Promise.resolve();
    },
    resetKey: (key) => {
      limiterStore.delete(key);
      return Promise.resolve();
    }
  }
});

// Şifre güncelleme sürecini başlat
router.post('/start', protect, passwordUpdateLimiter, startPasswordUpdate);

// Doğrulama kodunu kontrol et ve şifreyi güncelle
router.post('/verify', protect, passwordUpdateLimiter, async (req, res, next) => {
  try {
    await verifyAndUpdatePassword(req, res);
    // Şifre başarıyla değiştirildiyse rate limit'i sıfırla
    if (res.statusCode === 200) {
      const key = req.ip;
      await passwordUpdateLimiter.store.resetKey(key);
    }
  } catch (error) {
    next(error);
  }
});

export default router; 