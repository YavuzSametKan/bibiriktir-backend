import mongoose from 'mongoose';

const periodSchema = new mongoose.Schema({
    start: {
        type: Date,
        required: true
    },
    end: {
        type: Date,
        required: true
    },
    month: {
        type: String,
        required: true
    }
});

const monthDataSchema = new mongoose.Schema({
    period: {
        type: periodSchema,
        required: true
    },
    averageTransactionPerDay: Number,
    transactionCount: Number,
    activeGoalCount: Number,
    completedGoalCount: Number,
    activeGoalsAverageProgress: Number,
    totalIncome: Number,
    totalExpense: Number,
    netBalance: Number,
    savingRate: Number,
    goalsContributionAmount: Number,
    expensesByCategory: Object,
    incomeBySource: Object
});

const monthlyReviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: {
        type: Date,
        required: true
    },
    currentMonthData: {
        type: monthDataSchema,
        required: true
    },
    previousMonthData: {
        type: monthDataSchema,
        required: true
    },
    analysisText: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Kullanıcı ve ay için unique index oluştur
monthlyReviewSchema.index({ user: 1, month: 1 }, { unique: true });

const MonthlyReview = mongoose.model('MonthlyReview', monthlyReviewSchema);
export default MonthlyReview; 