import Category from '../models/Category.js';

// @desc    Yeni kategori oluştur
// @route   POST /api/categories
// @access  Private
export const createCategory = async (req, res) => {
    try {
        const { name } = req.body;

        // Kategori adı kontrolü
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Kategori adı zorunludur'
            });
        }

        // Aynı isimde kategori var mı kontrolü
        const existingCategory = await Category.findOne({ name: name.trim() });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                error: 'Bu isimde bir kategori zaten mevcut'
            });
        }

        const category = await Category.create({
            name: name.trim()
        });

        res.status(201).json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Tüm kategorileri getir
// @route   GET /api/categories
// @access  Private
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Kategori güncelle
// @route   PUT /api/categories/:id
// @access  Private
export const updateCategory = async (req, res) => {
    try {
        const { name } = req.body;

        // Kategori adı kontrolü
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Kategori adı zorunludur'
            });
        }

        // Aynı isimde başka kategori var mı kontrolü
        const existingCategory = await Category.findOne({
            name: name.trim(),
            _id: { $ne: req.params.id }
        });
        
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                error: 'Bu isimde bir kategori zaten mevcut'
            });
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name: name.trim() },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Kategori bulunamadı'
            });
        }

        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Kategori sil
// @route   DELETE /api/categories/:id
// @access  Private
export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Kategori bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Kategori başarıyla silindi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 