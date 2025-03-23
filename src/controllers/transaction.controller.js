import Transaction from '../models/Transaction.js';
import moment from 'moment-timezone';

// Set default timezone for moment
moment.tz.setDefault('Europe/Istanbul');

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
export const createTransaction = async (req, res) => {
    try {
        const {
            type,
            amount,
            categoryId,
            accountType,
            description,
            date,
            attachments
        } = req.body;

        // Required field validations
        if (!type || !['income', 'expense'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid transaction type (income/expense)'
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid amount'
            });
        }

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                error: 'Category is required'
            });
        }

        if (!accountType || !['cash', 'bank', 'credit-card'].includes(accountType)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid account type (cash/bank/credit-card)'
            });
        }

        // Parse and format date if provided, otherwise use current time
        let transactionDate;
        if (date) {
            // Expecting date in format: DD.MM.YYYY-HH:mm
            transactionDate = moment(date, 'DD.MM.YYYY-HH:mm').toDate();
        } else {
            transactionDate = moment().toDate();
        }

        const transaction = await Transaction.create({
            user: req.user._id,
            type,
            amount,
            category: categoryId,
            accountType,
            description,
            date: transactionDate,
            attachments: attachments || []
        });

        await transaction.populate('category', 'name');

        // Format the date in response
        const formattedTransaction = {
            ...transaction.toObject(),
            date: moment(transaction.date).format('DD.MM.YYYY-HH:mm')
        };

        res.status(201).json({
            success: true,
            data: formattedTransaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req, res) => {
    try {
        const {
            type,
            startDate,
            endDate,
            categoryId,
            accountType,
            sort = '-date'
        } = req.query;

        const query = { user: req.user._id };

        // Filters
        if (type && ['income', 'expense'].includes(type)) {
            query.type = type;
        }

        if (startDate && endDate) {
            query.date = {
                $gte: moment(startDate, 'DD.MM.YYYY-HH:mm').toDate(),
                $lte: moment(endDate, 'DD.MM.YYYY-HH:mm').toDate()
            };
        }

        if (categoryId) {
            query.category = categoryId;
        }

        if (accountType && ['cash', 'bank', 'credit-card'].includes(accountType)) {
            query.accountType = accountType;
        }

        const transactions = await Transaction.find(query)
            .populate('category', 'name')
            .sort(sort);

        // Format dates in response
        const formattedTransactions = transactions.map(transaction => ({
            ...transaction.toObject(),
            date: moment(transaction.date).format('DD.MM.YYYY-HH:mm')
        }));

        res.json({
            success: true,
            count: transactions.length,
            data: formattedTransactions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
export const getTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('category', 'name');

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        // Format date in response
        const formattedTransaction = {
            ...transaction.toObject(),
            date: moment(transaction.date).format('DD.MM.YYYY-HH:mm')
        };

        res.json({
            success: true,
            data: formattedTransaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
export const updateTransaction = async (req, res) => {
    try {
        const {
            type,
            amount,
            categoryId,
            accountType,
            description,
            date,
            attachments
        } = req.body;

        const transaction = await Transaction.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        // Field updates
        if (type && ['income', 'expense'].includes(type)) transaction.type = type;
        if (amount && amount > 0) transaction.amount = amount;
        if (categoryId) transaction.category = categoryId;
        if (accountType && ['cash', 'bank', 'credit-card'].includes(accountType)) {
            transaction.accountType = accountType;
        }
        if (description !== undefined) transaction.description = description;
        if (date) {
            transaction.date = moment(date, 'DD.MM.YYYY-HH:mm').toDate();
        }
        if (attachments) transaction.attachments = attachments;

        await transaction.save();
        await transaction.populate('category', 'name');

        // Format date in response
        const formattedTransaction = {
            ...transaction.toObject(),
            date: moment(transaction.date).format('DD.MM.YYYY-HH:mm')
        };

        res.json({
            success: true,
            data: formattedTransaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
export const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        res.json({
            success: true,
            message: 'Transaction deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 