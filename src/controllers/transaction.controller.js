import Transaction from '../models/Transaction.js';
import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set default timezone for moment
moment.tz.setDefault('Europe/Istanbul');

// Uploads dizini yolunu al
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');

// Eski dosyayı silme yardımcı fonksiyonu
const deleteFile = (filename) => {
    if (!filename) return;
    
    const filePath = path.join(uploadDir, filename);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Dosya başarıyla silindi:', filename);
        } else {
            console.log('Silinecek dosya bulunamadı:', filename);
        }
    } catch (error) {
        console.error('Dosya silinirken hata oluştu:', error);
    }
};

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
            date
        } = req.body;

        // Validasyonlar
        if (!type || !['income', 'expense'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Geçerli bir işlem tipi girin (income/expense)'
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Geçerli bir tutar girin'
            });
        }

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                error: 'Kategori zorunludur'
            });
        }

        if (!accountType || !['cash', 'bank', 'credit-card'].includes(accountType)) {
            return res.status(400).json({
                success: false,
                error: 'Geçerli bir hesap tipi girin (cash/bank/credit-card)'
            });
        }

        // Tarih işleme
        let transactionDate;
        if (date) {
            transactionDate = moment(date, 'DD.MM.YYYY-HH:mm').toDate();
        } else {
            transactionDate = moment().toDate();
        }

        // Dosya bilgilerini hazırla
        let attachment = null;
        if (req.file) {
            attachment = {
                filename: req.file.filename,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
            };
        }

        const transaction = await Transaction.create({
            user: req.user._id,
            type,
            amount,
            category: categoryId,
            accountType,
            description,
            date: transactionDate,
            attachment
        });

        await transaction.populate('category', 'name');

        // Tarihi formatla
        const formattedTransaction = {
            ...transaction.toObject(),
            date: moment(transaction.date).format('DD.MM.YYYY-HH:mm')
        };

        res.status(201).json({
            success: true,
            data: formattedTransaction
        });
    } catch (error) {
        // Hata durumunda yüklenen dosyayı sil
        if (req.file) {
            deleteFile(req.file.filename);
        }
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Tüm işlemleri getir
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

        // Tarihleri formatla
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

// @desc    İşlem detayını getir
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

        // Tarihi formatla
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

// @desc    İşlem güncelle
// @route   PUT /api/transactions/:id
// @access  Private
export const updateTransaction = async (req, res) => {
    try {
        console.log('=== Güncelleme Başladı ===');
        console.log('Request:', {
            body: req.body,
            file: req.file,
            params: req.params
        });

        const {
            type,
            amount,
            categoryId,
            accountType,
            description,
            date,
            removeAttachment
        } = req.body;

        // İşlemi bul
        const transaction = await Transaction.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!transaction) {
            console.log('İşlem bulunamadı:', req.params.id);
            // Yeni dosya yüklendiyse sil
            if (req.file) {
                deleteFile(req.file.filename);
            }
            return res.status(404).json({
                success: false,
                error: 'İşlem bulunamadı'
            });
        }

        console.log('Mevcut işlem:', transaction);

        // Güncelleme objesi oluştur
        const updateData = {};

        // Alan güncellemeleri
        if (type && ['income', 'expense'].includes(type)) updateData.type = type;
        if (amount && amount > 0) updateData.amount = amount;
        if (categoryId) updateData.category = categoryId;
        if (accountType && ['cash', 'bank', 'credit-card'].includes(accountType)) {
            updateData.accountType = accountType;
        }
        if (description !== undefined) updateData.description = description;
        if (date) {
            updateData.date = moment(date, 'DD.MM.YYYY-HH:mm').toDate();
        }

        // Ek dosya işlemleri
        if (removeAttachment === 'true') {
            console.log('Ek kaldırma işlemi başladı');
            // Eski dosyayı sil
            if (transaction.attachment) {
                console.log('Eski dosya siliniyor:', transaction.attachment);
                deleteFile(transaction.attachment.filename);
            }
            // Ek bilgisini null yap
            updateData.attachment = null;
        } else if (req.file) {
            console.log('Yeni ek yükleme işlemi başladı');
            // Eski dosyayı sil (eğer varsa)
            if (transaction.attachment && transaction.attachment.filename) {
                console.log('Eski dosya siliniyor:', transaction.attachment);
                deleteFile(transaction.attachment.filename);
            }
            
            // Yeni ek bilgilerini kaydet
            const attachmentData = {
                filename: req.file.filename,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
            };
            console.log('Yeni dosya bilgileri:', attachmentData);
            updateData.attachment = attachmentData;
        }

        console.log('Güncelleme verisi:', updateData);

        // İşlemi güncelle
        let updatedTransaction;
        try {
            updatedTransaction = await Transaction.findOneAndUpdate(
                { _id: req.params.id, user: req.user._id },
                updateData,
                { new: true, runValidators: true }
            ).populate('category', 'name');

            if (!updatedTransaction) {
                throw new Error('İşlem güncellenemedi');
            }
        } catch (error) {
            console.error('Güncelleme hatası:', error);
            // Yeni dosya yüklendiyse sil
            if (req.file) {
                deleteFile(req.file.filename);
            }
            throw error;
        }

        console.log('Güncellenmiş işlem:', updatedTransaction);

        // Tarihi formatla
        const formattedTransaction = {
            ...updatedTransaction.toObject(),
            date: moment(updatedTransaction.date).format('DD.MM.YYYY-HH:mm')
        };

        console.log('=== Güncelleme Tamamlandı ===');
        res.json({
            success: true,
            data: formattedTransaction
        });
    } catch (error) {
        console.error('Güncelleme hatası:', error);
        // Hata durumunda yüklenen dosyayı sil
        if (req.file) {
            deleteFile(req.file.filename);
        }
        
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

// @desc    Açıklama önerilerini getir
// @route   GET /api/transactions/description-suggestions
// @access  Private
export const getDescriptionSuggestions = async (req, res) => {
    try {
        const { query, categoryId, type } = req.query;

        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Arama sorgusu en az 2 karakter olmalıdır'
            });
        }

        const matchStage = {
            user: req.user._id,
            description: { $regex: query, $options: 'i' }
        };

        if (categoryId) {
            matchStage.category = categoryId;
        }

        if (type) {
            matchStage.type = type;
        }

        const suggestions = await Transaction.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$description',
                    usageCount: { $sum: 1 },
                    lastUsed: { $max: '$date' }
                }
            },
            {
                $project: {
                    _id: 0,
                    description: '$_id',
                    usageCount: 1,
                    lastUsed: 1
                }
            },
            { $sort: { usageCount: -1, lastUsed: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 