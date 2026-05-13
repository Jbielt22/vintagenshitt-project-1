import { db } from '../config/db/db.js';
import { shippings, orders } from '../config/db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { asyncHandler } from '../middlewares/errorHandler.js';

/**
 * GET /api/shippings
 * Admin: List all shippings (paginated)
 */
export const getAllShippings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { status } = req.query;

  const conditions = [];
  if (status) conditions.push(eq(shippings.deliveryStatus, status));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [all, countResult] = await Promise.all([
    db
      .select()
      .from(shippings)
      .where(whereClause)
      .orderBy(desc(shippings.shippedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(shippings)
      .where(whereClause),
  ]);

  res.json({
    success: true,
    data: all,
    pagination: {
      page,
      limit,
      total: countResult[0].count,
      totalPages: Math.ceil(countResult[0].count / limit),
    },
  });
});

/**
 * GET /api/shippings/order/:orderId
 * User/Admin: Get shipping for an order
 */
export const getShippingByOrderId = asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const isAdmin = req.user.role === 'admin';

  if (!isAdmin) {
    const [order] = await db
      .select({ userId: orders.userId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: 'Order not found.' });
    if (order.userId !== req.user.id)
      return res
        .status(403)
        .json({ success: false, message: 'Access denied.' });
  }

  const [shipping] = await db
    .select()
    .from(shippings)
    .where(eq(shippings.orderId, orderId))
    .limit(1);
  if (!shipping)
    return res
      .status(404)
      .json({ success: false, message: 'Shipping not found.' });

  res.json({ success: true, data: shipping });
});

/**
 * POST /api/shippings
 * Admin: Create shipping record
 */
export const createShipping = asyncHandler(async (req, res) => {
  const { orderId, courier, trackingNumber } = req.body;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order)
    return res
      .status(404)
      .json({ success: false, message: 'Order not found.' });

  const [existing] = await db
    .select({ id: shippings.id })
    .from(shippings)
    .where(eq(shippings.orderId, orderId))
    .limit(1);
  if (existing)
    return res.status(409).json({
      success: false,
      message: 'Shipping record already exists for this order.',
    });

  const [newShipping] = await db
    .insert(shippings)
    .values({
      orderId,
      userId: order.userId,
      courier,
      trackingNumber: trackingNumber || null,
      deliveryStatus: 'pending',
    })
    .returning();

  await db
    .update(orders)
    .set({ status: 'shipped', updatedAt: sql`NOW()` })
    .where(eq(orders.id, orderId));

  res
    .status(201)
    .json({ success: true, message: 'Shipping created.', data: newShipping });
});

/**
 * PUT /api/shippings/:id
 * Admin: Update shipping info
 */
export const updateShipping = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { courier, trackingNumber, deliveryStatus } = req.body;

  const updateData = {
    ...(courier !== undefined && { courier }),
    ...(trackingNumber !== undefined && { trackingNumber }),
    ...(deliveryStatus !== undefined && { deliveryStatus }),
  };

  if (deliveryStatus === 'shipping') updateData.shippedAt = sql`NOW()`;
  if (deliveryStatus === 'arrived') {
    const [ship] = await db
      .select({ orderId: shippings.orderId })
      .from(shippings)
      .where(eq(shippings.id, id))
      .limit(1);
    if (ship)
      await db
        .update(orders)
        .set({ status: 'completed', updatedAt: sql`NOW()` })
        .where(eq(orders.id, ship.orderId));
  }

  const [updated] = await db
    .update(shippings)
    .set(updateData)
    .where(eq(shippings.id, id))
    .returning();
  if (!updated)
    return res
      .status(404)
      .json({ success: false, message: 'Shipping not found.' });

  res.json({ success: true, message: 'Shipping updated.', data: updated });
});

/**
 * PUT /api/shippings/:id/status
 * Admin: Update delivery status only
 */
export const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { deliveryStatus } = req.body;

  const valid = [
    'pending',
    'shipping',
    'out_for_delivery',
    'arrived',
    'returned',
  ];
  if (!valid.includes(deliveryStatus))
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be: ${valid.join(', ')}`,
    });

  const updateData = { deliveryStatus };
  if (deliveryStatus === 'shipping') updateData.shippedAt = sql`NOW()`;

  const [updated] = await db
    .update(shippings)
    .set(updateData)
    .where(eq(shippings.id, id))
    .returning();
  if (!updated)
    return res
      .status(404)
      .json({ success: false, message: 'Shipping not found.' });

  if (deliveryStatus === 'arrived') {
    await db
      .update(orders)
      .set({ status: 'completed', updatedAt: sql`NOW()` })
      .where(eq(orders.id, updated.orderId));
  }

  res.json({
    success: true,
    message: 'Delivery status updated.',
    data: updated,
  });
});
