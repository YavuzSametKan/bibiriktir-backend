import mongoose from 'mongoose';

const contributionSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: [true, 'Katkı miktarı zorunludur'],
        min: [0, 'Katkı miktarı 0\'dan küçük olamaz']
    },
    date: {
        type: Date,
        required: [true, 'Katkı tarihi zorunludur'],
        default: Date.now
    },
    note: {
        type: String,
        trim: true
    }
}, { timestamps: true });

const goalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Kullanıcı ID zorunludur']
    },
    title: {
        type: String,
        required: [true, 'Hedef başlığı zorunludur'],
        trim: true
    },
    targetAmount: {
        type: Number,
        required: [true, 'Hedef miktarı zorunludur'],
        min: [0, 'Hedef miktarı 0\'dan küçük olamaz']
    },
    currentAmount: {
        type: Number,
        default: 0,
        min: [0, 'Mevcut miktar 0\'dan küçük olamaz']
    },
    deadline: {
        type: Date,
        required: [true, 'Son tarih zorunludur']
    },
    contributions: [contributionSchema]
}, { timestamps: true });

// Katkılar değiştiğinde currentAmount'u otomatik güncelle
goalSchema.pre('save', function(next) {
    if (this.isModified('contributions')) {
        this.currentAmount = this.contributions.reduce((total, contribution) => total + contribution.amount, 0);
    }
    next();
});

// Katkı eklendiğinde veya güncellendiğinde currentAmount'u güncelle
goalSchema.pre('findOneAndUpdate', async function(next) {
    try {
        const update = this.getUpdate();
        if (update.$push || update.$set || update.$pull) {
            const doc = await this.model.findOne(this.getQuery());
            if (doc) {
                const newCurrentAmount = doc.contributions.reduce((total, contribution) => total + contribution.amount, 0);
                this.set({ currentAmount: newCurrentAmount });
            }
        }
        next();
    } catch (error) {
        next(error);
    }
});

const Goal = mongoose.model('Goal', goalSchema);

export default Goal; 