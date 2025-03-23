import express from 'express';
import {
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory
} from '../controllers/category.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
router.get('/', protect, getCategories);

// @route   POST /api/categories
// @desc    Create a new category
router.post('/', protect, createCategory);

// @route   PUT /api/categories/:id
// @desc    Update category
router.put('/:id', protect, updateCategory);

// @route   DELETE /api/categories/:id
// @desc    Delete category
router.delete('/:id', protect, deleteCategory);

export default router; 