import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Kategori adı zorunludur'],
        trim: true,
        minlength: [2, 'Kategori adı en az 2 karakter olmalıdır'],
        maxlength: [50, 'Kategori adı en fazla 50 karakter olmalıdır']
    },
    type: {
        type: String,
        required: [true, 'Kategori tipi zorunludur'],
        enum: ['expense', 'income'],
        lowercase: true
    }
}, {
    timestamps: true
});

// Önce tüm indexleri kaldır
categorySchema.indexes().forEach(index => {
    categorySchema.index(index[0], { unique: false });
});

// Yeni compound index oluştur
categorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);
export default Category; 