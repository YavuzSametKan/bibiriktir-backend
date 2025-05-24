import Category from '../models/Category.js';

// @desc    Kategori oluştur
// @route   POST /api/categories
// @access  Private
export const createCategory = async (req, res) => {
    try {
        const { name, type } = req.body;

        // Validasyonlar
        if (!name || !type) {
            return res.status(400).json({
                success: false,
                error: 'Kategori adı ve tipi zorunludur'
            });
        }

        if (!['expense', 'income'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz kategori tipi. Tip "expense" veya "income" olmalıdır'
            });
        }

        // Aynı isimde ve tipte kategori var mı kontrol et
        const existingCategory = await Category.findOne({
            user: req.user._id,
            name: name.toLowerCase(),
            type
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                error: 'Bu isimde ve tipte bir kategori zaten mevcut'
            });
        }

        const category = await Category.create({
            user: req.user._id,
            name: name.toLowerCase(),
            type
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
        const { type } = req.query;
        const query = { user: req.user._id };

        if (type && ['expense', 'income'].includes(type)) {
            query.type = type;
        }

        const categories = await Category.find(query).sort({ name: 1 });

        res.json({
            success: true,
            count: categories.length,
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
        const { name, type } = req.body;

        const category = await Category.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Kategori bulunamadı'
            });
        }

        if (name) category.name = name.toLowerCase();
        if (type && ['expense', 'income'].includes(type)) category.type = type;

        await category.save();

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
        const category = await Category.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

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