import express from 'express';
import {
    createTransaction,
    getTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction
} from '../controllers/transaction.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   GET /api/transactions
// @desc    Get all transactions
router.get('/', protect, getTransactions);

// @route   POST /api/transactions
// @desc    Create a new transaction
router.post('/', protect, createTransaction);

// @route   GET /api/transactions/:id
// @desc    Get transaction by ID
router.get('/:id', protect, getTransaction);

// @route   PUT /api/transactions/:id
// @desc    Update transaction
router.put('/:id', protect, updateTransaction);

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
router.delete('/:id', protect, deleteTransaction);

export default router; 