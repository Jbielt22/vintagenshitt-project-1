import { Router } from 'express';
import {
  checkout,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} from '../controllers/order.controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { validateCheckout } from '../middlewares/validate.js';

const router = Router();

router.use(authenticate);

router.post('/checkout', validateCheckout, checkout);
router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', requireAdmin, updateOrderStatus);
router.put('/:id/cancel', cancelOrder);

export default router;
