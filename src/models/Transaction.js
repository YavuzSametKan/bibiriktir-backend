import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: [true, 'Transaction type is required'],
        enum: ['income', 'expense'],
        lowercase: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be less than 0']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required']
    },
    accountType: {
        type: String,
        required: [true, 'Account type is required'],
        enum: ['cash', 'bank', 'credit-card'],
        lowercase: true
    },
    description: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        required: [true, 'Date is required']
    },
    attachments: [{
        url: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['image/jpeg', 'image/png', 'image/jpg'],
            required: true
        }
    }]
});

// Indexes
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ accountType: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction; 