import express from 'express';
import authRoutes from './auth.routes.js';
import transactionRoutes from './transaction.routes.js';
import goalRoutes from './goal.routes.js';
import monthlyReviewRoutes from './monthlyReview.routes.js';
import statisticsRoutes from './statistics.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/goals', goalRoutes);
router.use('/monthly-review', monthlyReviewRoutes);
router.use('/statistics', statisticsRoutes);

export default router; 