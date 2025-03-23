import express from 'express';
import {
    createTransaction,
    getTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction
} from '../controllers/transaction.controller.js';

const router = express.Router();

router.route('/')
    .get(getTransactions)
    .post(createTransaction);

router.route('/:id')
    .get(getTransaction)
    .put(updateTransaction)
    .delete(deleteTransaction);

export default router; 