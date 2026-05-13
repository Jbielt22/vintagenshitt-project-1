import { Router } from 'express';
import {
  getItemsByOrderId,
  getOrderItemById,
} from '../controllers/orderItem.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/order/:orderId', getItemsByOrderId);
router.get('/:id', getOrderItemById);

export default router;
