import express from 'express';
import {
    createTransaction,
    getTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction,
    getDescriptionSuggestions
} from '../controllers/transaction.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import upload, { handleUploadError } from '../middleware/upload.middleware.js';

const router = express.Router();

// Debug middleware
const debugMiddleware = (req, res, next) => {
    console.log('=== Debug Middleware ===');
    console.log('Request Method:', req.method);
    console.log('Request URL:', req.originalUrl);
    console.log('Request Headers:', {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length']
    });
    console.log('Request Body:', req.body);
    console.log('Request File:', req.file);
    console.log('=====================');
    next();
};

// @route   GET /api/transactions/description-suggestions
// @desc    Get description suggestions
router.get('/description-suggestions', protect, getDescriptionSuggestions);

// @route   GET /api/transactions
// @desc    Get all transactions
router.get('/', protect, getTransactions);

// @route   POST /api/transactions
// @desc    Create a new transaction
router.post('/', 
    protect, 
    upload.single('attachment'),
    handleUploadError,
    debugMiddleware,
    createTransaction
);

// @route   GET /api/transactions/:id
// @desc    Get transaction by ID
router.get('/:id', protect, getTransaction);

// @route   PUT /api/transactions/:id
// @desc    Update transaction
router.put('/:id', 
    protect, 
    upload.single('attachment'),
    handleUploadError,
    debugMiddleware,
    updateTransaction
);

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
router.delete('/:id', protect, deleteTransaction);

export default router; 