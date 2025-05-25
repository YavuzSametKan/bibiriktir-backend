import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
    getMonthlyStatistics,
    getCategoryStatistics,
    getTrendStatistics,
    getCustomStatistics,
    getPeriodStatistics,
    getStatistics
} from '../controllers/statistics.controller.js';

const router = express.Router();

// Tüm route'lar için authentication gerekli
router.use(protect);

// Tarih aralığı bazlı istatistikler
router.get('/period', getPeriodStatistics);

// Mevcut route'lar
router.get('/monthly', getMonthlyStatistics);
router.get('/categories', getCategoryStatistics);
router.get('/trends', getTrendStatistics);
router.get('/custom', getCustomStatistics);

router.get('/', getStatistics);

export default router; 