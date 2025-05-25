import express from 'express';
import authRoutes from './auth.routes.js';
import transactionRoutes from './transaction.routes.js';
import goalRoutes from './goal.routes.js';
import monthlyReviewRoutes from './monthlyReview.routes.js';
import statisticsRoutes from './statistics.routes.js';
import passwordRoutes from './password.routes.js';
import userRoutes from './user.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/goals', goalRoutes);
router.use('/monthly-review', monthlyReviewRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/update-password', passwordRoutes);

export default router; 