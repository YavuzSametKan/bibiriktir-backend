import Transaction from '../models/Transaction.js';

// @desc    Yeni işlem oluştur
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

        // Zorunlu alan kontrolleri
        if (!type || !['gelir', 'gider'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Geçerli bir işlem tipi girilmelidir (gelir/gider)'
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Geçerli bir tutar girilmelidir'
            });
        }

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                error: 'Kategori seçilmelidir'
            });
        }

        if (!accountType || !['nakit', 'banka', 'kredi-karti'].includes(accountType)) {
            return res.status(400).json({
                success: false,
                error: 'Geçerli bir hesap türü seçilmelidir (nakit/banka/kredi-karti)'
            });
        }

        const transaction = await Transaction.create({
            user: req.user._id,
            type,
            amount,
            category: categoryId,
            accountType,
            description,
            date: date || new Date(),
            attachments: attachments || []
        });

        await transaction.populate('category', 'name');

        res.status(201).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    İşlemleri listele
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

        // Filtreler
        if (type && ['gelir', 'gider'].includes(type)) {
            query.type = type;
        }

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (categoryId) {
            query.category = categoryId;
        }

        if (accountType && ['nakit', 'banka', 'kredi-karti'].includes(accountType)) {
            query.accountType = accountType;
        }

        const transactions = await Transaction.find(query)
            .populate('category', 'name')
            .sort(sort);

        res.json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    İşlem detayı getir
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
                error: 'İşlem bulunamadı'
            });
        }

        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    İşlem güncelle
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
                error: 'İşlem bulunamadı'
            });
        }

        // Alan güncellemeleri
        if (type && ['gelir', 'gider'].includes(type)) transaction.type = type;
        if (amount && amount > 0) transaction.amount = amount;
        if (categoryId) transaction.category = categoryId;
        if (accountType && ['nakit', 'banka', 'kredi-karti'].includes(accountType)) {
            transaction.accountType = accountType;
        }
        if (description !== undefined) transaction.description = description;
        if (date) transaction.date = date;
        if (attachments) transaction.attachments = attachments;

        await transaction.save();
        await transaction.populate('category', 'name');

        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    İşlem sil
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
                error: 'İşlem bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'İşlem başarıyla silindi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 