import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../controllers/cart.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validateCartItem } from '../middlewares/validate.js';

const router = Router();

router.use(authenticate);

router.get('/', getCart);
router.post('/', validateCartItem, addToCart);
router.put('/:id', updateCartItem);
router.delete('/', clearCart);
router.delete('/:id', removeCartItem);

export default router;
