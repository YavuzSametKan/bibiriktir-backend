import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: [true, 'İşlem tipi zorunludur'],
        enum: ['income', 'expense'],
        lowercase: true
    },
    amount: {
        type: Number,
        required: [true, 'Tutar zorunludur'],
        min: [0, 'Tutar 0\'dan küçük olamaz']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Kategori zorunludur']
    },
    accountType: {
        type: String,
        required: [true, 'Hesap tipi zorunludur'],
        enum: ['cash', 'bank', 'credit-card'],
        lowercase: true
    },
    description: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        required: [true, 'Tarih zorunludur']
    },
    attachment: {
        filename: String,
        originalname: String,
        mimetype: String,
        size: Number,
        url: String
    }
}, {
    timestamps: true
});

// Indexes
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ accountType: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction; 