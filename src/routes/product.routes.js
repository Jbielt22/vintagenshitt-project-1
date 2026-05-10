import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { validateProduct } from '../middlewares/validate.js';

const router = Router();

// Public
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Admin only
router.post('/', authenticate, requireAdmin, validateProduct, createProduct);
router.put('/:id', authenticate, requireAdmin, updateProduct);
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

export default router;
