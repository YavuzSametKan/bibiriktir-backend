import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Kategori adı zorunludur'],
        trim: true,
        unique: true
    }
}, {
    timestamps: true
});

const Category = mongoose.model('Category', categorySchema);
export default Category; 