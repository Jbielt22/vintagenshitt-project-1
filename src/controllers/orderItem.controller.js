import { db } from '../config/db/db.js';
import { orderItems, orders, products } from '../config/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { asyncHandler } from '../middlewares/errorHandler.js';

/**
 * GET /api/order-items/order/:orderId
 * User/Admin: Get all items for an order
 */
export const getItemsByOrderId = asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const isAdmin = req.user.role === 'admin';

  // Verify order ownership (unless admin)
  if (!isAdmin) {
    const [order] = await db
      .select({ userId: orders.userId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Order not found.' });
    }
    if (order.userId !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied.' });
    }
  }

  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productTitle: products.title,
      productImgUrl: products.imgUrl,
      priceAtPurchase: orderItems.priceAtPurchase,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  const total = items.reduce((sum, item) => {
    return sum + parseFloat(item.priceAtPurchase) * item.quantity;
  }, 0);

  res.json({
    success: true,
    data: {
      items,
      total: total.toFixed(2),
      itemCount: items.length,
    },
  });
});

/**
 * GET /api/order-items/:id
 * User/Admin: Get single order item detail
 */
export const getOrderItemById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const isAdmin = req.user.role === 'admin';

  const [item] = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productTitle: products.title,
      productImgUrl: products.imgUrl,
      priceAtPurchase: orderItems.priceAtPurchase,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.id, id))
    .limit(1);

  if (!item) {
    return res
      .status(404)
      .json({ success: false, message: 'Order item not found.' });
  }

  // Verify ownership
  if (!isAdmin) {
    const [order] = await db
      .select({ userId: orders.userId })
      .from(orders)
      .where(eq(orders.id, item.orderId))
      .limit(1);

    if (!order || order.userId !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied.' });
    }
  }

  res.json({ success: true, data: item });
});
