import express from 'express';
import {
    createGoal,
    updateGoal,
    getGoals,
    getGoalById,
    addContribution,
    updateContribution,
    deleteContribution,
    deleteGoal,
    getGoalStatistics
} from '../controllers/goal.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Tüm route'lar için authentication gerekli
router.use(protect);

// Hedef oluştur
router.post('/', createGoal);

// Hedef güncelle
router.put('/:goalId', updateGoal);

// Hedefleri listele
router.get('/', getGoals);

// Hedef detayı
router.get('/:goalId', getGoalById);

// Hedefe katkı ekle
router.post('/:goalId/contributions', addContribution);

// Hedef katkısını güncelle
router.put('/:goalId/contributions/:contributionId', updateContribution);

// Hedef katkısını sil
router.delete('/:goalId/contributions/:contributionId', deleteContribution);

// Hedef sil
router.delete('/:goalId', deleteGoal);

// Hedef istatistikleri
router.get('/statistics', getGoalStatistics);

export default router; 