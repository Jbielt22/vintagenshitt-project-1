import { db } from '../config/db/db.js';
import {
  orders,
  orderItems,
  payments,
  carts,
  products,
} from '../config/db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { asyncHandler } from '../middlewares/errorHandler.js';
import snap from '../config/midtrans.js';
import { createPayPalOrder } from '../config/paypal.js';

/**
 * POST /api/orders/checkout
 * User: Create order from cart and initiate payment
 */
export const checkout = asyncHandler(async (req, res) => {
  const { paymentMethod, shippingAddress, currency } = req.body;
  const userId = req.user.id;

  // 1. Fetch user's cart items with product info
  const cartItems = await db
    .select({
      cartId: carts.id,
      productId: carts.productId,
      qty: carts.qty,
      productTitle: products.title,
      productPrice: products.price,
      productStock: products.quantity,
    })
    .from(carts)
    .leftJoin(products, eq(carts.productId, products.id))
    .where(eq(carts.userId, userId));

  if (cartItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Your cart is empty.',
    });
  }

  // 2. Validate stock for each item
  for (const item of cartItems) {
    if (!item.productPrice) {
      return res.status(400).json({
        success: false,
        message: `Product with ID ${item.productId} no longer exists.`,
      });
    }
    if (item.qty > item.productStock) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for "${item.productTitle}". Available: ${item.productStock}, requested: ${item.qty}.`,
      });
    }
  }

  // 3. Calculate total
  const totalAmount = cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.productPrice) * item.qty;
  }, 0);

  // 4. Create order
  const [order] = await db
    .insert(orders)
    .values({
      userId,
      totalAmount: String(totalAmount.toFixed(2)),
      status: 'pending',
      shippingAddress,
    })
    .returning();

  // 5. Create order items (snapshot price at purchase)
  const orderItemValues = cartItems.map((item) => ({
    orderId: order.id,
    productId: item.productId,
    priceAtPurchase: String(item.productPrice),
    quantity: item.qty,
  }));

  await db.insert(orderItems).values(orderItemValues);

  // 6. Create payment record
  const [payment] = await db
    .insert(payments)
    .values({
      orderId: order.id,
      userId,
      paymentStatus: 'pending',
      amount: String(totalAmount.toFixed(2)),
      paymentMethod,
    })
    .returning();

  // 7. Deduct product quantities
  for (const item of cartItems) {
    await db
      .update(products)
      .set({ quantity: sql`${products.quantity} - ${item.qty}` })
      .where(eq(products.id, item.productId));
  }

  // 8. Clear user's cart
  await db.delete(carts).where(eq(carts.userId, userId));

  // 9. Initiate payment gateway
  let paymentData = {};

  if (paymentMethod === 'qris') {
    // Midtrans Snap
    const midtransParam = {
      transaction_details: {
        order_id: `ORDER-${order.id}-${Date.now()}`,
        gross_amount: Math.round(totalAmount),
      },
      customer_details: {
        email: req.user.email,
      },
      item_details: cartItems.map((item) => ({
        id: String(item.productId),
        name: item.productTitle,
        price: Math.round(parseFloat(item.productPrice)),
        quantity: item.qty,
      })),
      enabled_payments: ['other_qris'],
    };

    const transaction = await snap.createTransaction(midtransParam);

    // Store the Midtrans order ID as transactionId
    await db
      .update(payments)
      .set({ transactionId: midtransParam.transaction_details.order_id })
      .where(eq(payments.id, payment.id));

    paymentData = {
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
      midtransOrderId: midtransParam.transaction_details.order_id,
    };
  } else if (paymentMethod === 'paypal') {
    // PayPal
    const paypalCurrency = currency || 'USD';
    const paypalResult = await createPayPalOrder(
      totalAmount.toFixed(2),
      paypalCurrency,
      order.id
    );

    // Store PayPal order ID as transactionId
    await db
      .update(payments)
      .set({ transactionId: paypalResult.paypalOrderId })
      .where(eq(payments.id, payment.id));

    paymentData = {
      paypalOrderId: paypalResult.paypalOrderId,
      approveUrl: paypalResult.approveUrl,
    };
  }

  res.status(201).json({
    success: true,
    message: 'Order created. Please complete payment.',
    data: {
      order,
      payment: { ...payment, ...paymentData },
    },
  });
});

/**
 * GET /api/orders
 * User: Get own orders / Admin: Get all orders (paginated, filterable)
 */
export const getAllOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { status } = req.query;
  const isAdmin = req.user.role === 'admin';

  const conditions = [];
  if (!isAdmin) {
    conditions.push(eq(orders.userId, req.user.id));
  }
  if (status) {
    conditions.push(eq(orders.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [allOrders, countResult] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(orders)
      .where(whereClause),
  ]);

  const total = countResult[0].count;

  res.json({
    success: true,
    data: allOrders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/orders/:id
 * User: Get own order detail / Admin: Get any order detail (with items, payment)
 */
export const getOrderById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const isAdmin = req.user.role === 'admin';

  const conditions = [eq(orders.id, id)];
  if (!isAdmin) {
    conditions.push(eq(orders.userId, req.user.id));
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .limit(1);

  if (!order) {
    return res
      .status(404)
      .json({ success: false, message: 'Order not found.' });
  }

  // Fetch order items with product info
  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productTitle: products.title,
      priceAtPurchase: orderItems.priceAtPurchase,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, id));

  // Fetch payment info
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, id))
    .limit(1);

  res.json({
    success: true,
    data: { order, items, payment },
  });
});

/**
 * PUT /api/orders/:id/status
 * Admin: Update order status
 */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;

  const validStatuses = [
    'pending',
    'processing',
    'shipped',
    'completed',
    'cancelled',
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  const [updated] = await db
    .update(orders)
    .set({ status, updatedAt: sql`NOW()` })
    .where(eq(orders.id, id))
    .returning();

  if (!updated) {
    return res
      .status(404)
      .json({ success: false, message: 'Order not found.' });
  }

  res.json({ success: true, message: 'Order status updated.', data: updated });
});

/**
 * PUT /api/orders/:id/cancel
 * User: Cancel own pending order
 */
export const cancelOrder = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Only cancel own pending orders
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, req.user.id)))
    .limit(1);

  if (!order) {
    return res
      .status(404)
      .json({ success: false, message: 'Order not found.' });
  }

  if (order.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel order with status "${order.status}". Only pending orders can be cancelled.`,
    });
  }

  // Restore product stock
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));

  for (const item of items) {
    await db
      .update(products)
      .set({ quantity: sql`${products.quantity} + ${item.quantity}` })
      .where(eq(products.id, item.productId));
  }

  // Update order status
  const [updated] = await db
    .update(orders)
    .set({ status: 'cancelled', updatedAt: sql`NOW()` })
    .where(eq(orders.id, id))
    .returning();

  // Update payment status
  await db
    .update(payments)
    .set({ paymentStatus: 'failed' })
    .where(eq(payments.orderId, id));

  res.json({
    success: true,
    message: 'Order cancelled. Stock restored.',
    data: updated,
  });
});
