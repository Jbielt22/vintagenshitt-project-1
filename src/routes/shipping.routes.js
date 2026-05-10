import { Router } from 'express';
import {
  getAllShippings,
  getShippingByOrderId,
  createShipping,
  updateShipping,
  updateDeliveryStatus,
} from '../controllers/shipping.controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import {
  validateShipping,
  validateShippingUpdate,
} from '../middlewares/validate.js';

const router = Router();

router.use(authenticate);

router.get('/', requireAdmin, getAllShippings);
router.get('/order/:orderId', getShippingByOrderId);
router.post('/', requireAdmin, validateShipping, createShipping);
router.put('/:id', requireAdmin, updateShipping);
router.put(
  '/:id/status',
  requireAdmin,
  validateShippingUpdate,
  updateDeliveryStatus
);

export default router;
