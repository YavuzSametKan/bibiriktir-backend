import express from 'express';
import { getMonthlyReview, getAllMonthlyReviews } from '../controllers/monthlyReview.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', protect, getMonthlyReview);
router.get('/all', protect, getAllMonthlyReviews);

export default router; 