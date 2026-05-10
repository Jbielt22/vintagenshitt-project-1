import crypto from 'crypto';
import { db } from '../config/db/db.js';
import { payments, orders } from '../config/db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { asyncHandler } from '../middlewares/errorHandler.js';
import {
  capturePayPalOrder,
  verifyWebhookSignature,
} from '../config/paypal.js';

/**
 * GET /api/payments/order/:orderId
 * User/Admin: Get payment for a specific order
 */
export const getPaymentByOrderId = asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const isAdmin = req.user.role === 'admin';

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

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .limit(1);

  if (!payment) {
    return res
      .status(404)
      .json({ success: false, message: 'Payment not found.' });
  }

  res.json({ success: true, data: payment });
});

/**
 * GET /api/payments
 * Admin: List all payments (paginated, filterable)
 */
export const getAllPayments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { status, method } = req.query;

  const conditions = [];
  if (status) conditions.push(eq(payments.paymentStatus, status));
  if (method) conditions.push(eq(payments.paymentMethod, method));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [allPayments, countResult] = await Promise.all([
    db
      .select()
      .from(payments)
      .where(whereClause)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(payments)
      .where(whereClause),
  ]);

  const total = countResult[0].count;
  res.json({
    success: true,
    data: allPayments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/payments/:id
 * Admin: Get payment detail by ID
 */
export const getPaymentById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);

  if (!payment) {
    return res
      .status(404)
      .json({ success: false, message: 'Payment not found.' });
  }
  res.json({ success: true, data: payment });
});

/**
 * POST /api/payments/midtrans/notification
 * Midtrans webhook handler (signature verified)
 */
export const midtransNotification = asyncHandler(async (req, res) => {
  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    fraud_status,
  } = req.body;

  // Verify signature
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const expectedSig = crypto
    .createHash('sha512')
    .update(order_id + status_code + gross_amount + serverKey)
    .digest('hex');

  if (signature_key !== expectedSig) {
    return res
      .status(403)
      .json({ success: false, message: 'Invalid signature.' });
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.transactionId, order_id))
    .limit(1);

  if (!payment) {
    return res
      .status(404)
      .json({ success: false, message: 'Payment not found.' });
  }

  let paymentStatus = 'pending';
  let orderStatus = 'pending';

  if (transaction_status === 'capture' || transaction_status === 'settlement') {
    if (fraud_status === 'accept' || !fraud_status) {
      paymentStatus = 'paid';
      orderStatus = 'processing';
    } else {
      paymentStatus = 'failed';
      orderStatus = 'cancelled';
    }
  } else if (transaction_status === 'pending') {
    paymentStatus = 'pending';
  } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
    paymentStatus = 'failed';
    orderStatus = 'cancelled';
  } else if (
    transaction_status === 'refund' ||
    transaction_status === 'partial_refund'
  ) {
    paymentStatus = 'refund';
    orderStatus = 'cancelled';
  }

  await db
    .update(payments)
    .set({ paymentStatus })
    .where(eq(payments.id, payment.id));
  await db
    .update(orders)
    .set({ status: orderStatus, updatedAt: sql`NOW()` })
    .where(eq(orders.id, payment.orderId));

  res.json({ success: true, message: 'Notification processed.' });
});

/**
 * POST /api/payments/paypal/capture/:paypalOrderId
 * User: Capture PayPal payment after approval
 */
export const capturePayPal = asyncHandler(async (req, res) => {
  const { paypalOrderId } = req.params;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.transactionId, paypalOrderId))
    .limit(1);

  if (!payment) {
    return res
      .status(404)
      .json({ success: false, message: 'Payment not found.' });
  }
  if (payment.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  if (payment.paymentStatus === 'paid') {
    return res
      .status(400)
      .json({ success: false, message: 'Payment already captured.' });
  }

  const captureResult = await capturePayPalOrder(paypalOrderId);

  if (captureResult.status === 'COMPLETED') {
    await db
      .update(payments)
      .set({ paymentStatus: 'paid' })
      .where(eq(payments.id, payment.id));
    await db
      .update(orders)
      .set({ status: 'processing', updatedAt: sql`NOW()` })
      .where(eq(orders.id, payment.orderId));
    res.json({
      success: true,
      message: 'Payment captured successfully.',
      data: { paymentStatus: 'paid', orderStatus: 'processing' },
    });
  } else {
    await db
      .update(payments)
      .set({ paymentStatus: 'failed' })
      .where(eq(payments.id, payment.id));
    res.status(400).json({
      success: false,
      message: `Payment capture failed. PayPal status: ${captureResult.status}`,
    });
  }
});

/**
 * POST /api/payments/paypal/webhook
 * PayPal webhook handler (signature verified)
 */
export const paypalWebhook = asyncHandler(async (req, res) => {
  const isValid = await verifyWebhookSignature(req.headers, req.body);
  if (!isValid) {
    return res
      .status(403)
      .json({ success: false, message: 'Invalid webhook signature.' });
  }

  const { event_type, resource } = req.body;

  if (event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const paypalOrderId = resource.supplementary_data?.related_ids?.order_id;
    if (paypalOrderId) {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.transactionId, paypalOrderId))
        .limit(1);
      if (payment && payment.paymentStatus !== 'paid') {
        await db
          .update(payments)
          .set({ paymentStatus: 'paid' })
          .where(eq(payments.id, payment.id));
        await db
          .update(orders)
          .set({ status: 'processing', updatedAt: sql`NOW()` })
          .where(eq(orders.id, payment.orderId));
      }
    }
  } else if (
    event_type === 'PAYMENT.CAPTURE.DENIED' ||
    event_type === 'PAYMENT.CAPTURE.REFUNDED'
  ) {
    const paypalOrderId = resource.supplementary_data?.related_ids?.order_id;
    if (paypalOrderId) {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.transactionId, paypalOrderId))
        .limit(1);
      if (payment) {
        const status =
          event_type === 'PAYMENT.CAPTURE.REFUNDED' ? 'refund' : 'failed';
        await db
          .update(payments)
          .set({ paymentStatus: status })
          .where(eq(payments.id, payment.id));
        await db
          .update(orders)
          .set({ status: 'cancelled', updatedAt: sql`NOW()` })
          .where(eq(orders.id, payment.orderId));
      }
    }
  }

  res.json({ success: true, message: 'Webhook received.' });
});
