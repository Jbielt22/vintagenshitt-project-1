import { Router } from 'express';
import {
  getPaymentByOrderId,
  getAllPayments,
  getPaymentById,
  midtransNotification,
  capturePayPal,
  paypalWebhook,
} from '../controllers/payment.controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// Public webhook endpoints (signature-verified inside controller)
router.post('/midtrans/notification', midtransNotification);
router.post('/paypal/webhook', paypalWebhook);

// Authenticated
router.post('/paypal/capture/:paypalOrderId', authenticate, capturePayPal);
router.get('/order/:orderId', authenticate, getPaymentByOrderId);

// Admin only
router.get('/', authenticate, requireAdmin, getAllPayments);
router.get('/:id', authenticate, requireAdmin, getPaymentById);

export default router;
