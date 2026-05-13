import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import orderItemRoutes from './orderItem.routes.js';
import paymentRoutes from './payment.routes.js';
import shippingRoutes from './shipping.routes.js';
import negotiationRoutes from './negotiation.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/carts', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/order-items', orderItemRoutes);
router.use('/payments', paymentRoutes);
router.use('/shippings', shippingRoutes);
router.use('/negotiations', negotiationRoutes);

export default router;
