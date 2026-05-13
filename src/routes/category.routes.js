import { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { validateCategory } from '../middlewares/validate.js';

const router = Router();

// Public
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Admin only
router.post('/', authenticate, requireAdmin, validateCategory, createCategory);
router.put('/:id', authenticate, requireAdmin, updateCategory);
router.delete('/:id', authenticate, requireAdmin, deleteCategory);

export default router;
