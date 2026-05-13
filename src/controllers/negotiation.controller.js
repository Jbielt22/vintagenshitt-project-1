import { db } from '../config/db/db.js';
import { carts, products, users } from '../config/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { asyncHandler } from '../middlewares/errorHandler.js';

/**
 * GET /api/negotiations
 * Admin: Get all negotiations
 */
export const getAllNegotiations = asyncHandler(async (req, res) => {
  const negotiations = await db
    .select({
      id: carts.id,
      productId: carts.productId,
      productTitle: products.title,
      originalPrice: products.price,
      negotiatedPrice: carts.negotiatedPrice,
      qty: carts.qty,
      negotiationStatus: carts.negotiationStatus,
      negotiationNote: carts.negotiationNote,
      userId: carts.userId,
      userName: users.name,
      userEmail: users.email,
      createdAt: carts.createdAt,
    })
    .from(carts)
    .leftJoin(products, eq(carts.productId, products.id))
    .leftJoin(users, eq(carts.userId, users.id))
    .where(
      and(
        eq(carts.negotiationStatus, 'pending'),
        eq(carts.negotiationStatus, 'accepted'),
        eq(carts.negotiationStatus, 'rejected')
      )
    );

  res.json({
    success: true,
    data: negotiations,
    count: negotiations.length,
  });
});

/**
 * GET /api/negotiations/user/:userId
 * User: Get their own negotiations
 */
export const getUserNegotiations = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const negotiations = await db
    .select({
      id: carts.id,
      productId: carts.productId,
      productTitle: products.title,
      originalPrice: products.price,
      negotiatedPrice: carts.negotiatedPrice,
      qty: carts.qty,
      negotiationStatus: carts.negotiationStatus,
      negotiationNote: carts.negotiationNote,
      createdAt: carts.createdAt,
    })
    .from(carts)
    .leftJoin(products, eq(carts.productId, products.id))
    .where(
      and(
        eq(carts.userId, userId),
        eq(carts.negotiationStatus, 'pending')
      )
    );

  res.json({
    success: true,
    data: negotiations,
    count: negotiations.length,
  });
});

/**
 * POST /api/negotiations
 * User: Submit a negotiation
 */
export const submitNegotiation = asyncHandler(async (req, res) => {
  const { cartId, negotiatedPrice, negotiationNote } = req.body;
  const userId = req.user.id;

  // Verify cart item exists and belongs to user
  const [cartItem] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.id, cartId), eq(carts.userId, userId)));

  if (!cartItem) {
    return res.status(404).json({
      success: false,
      message: 'Cart item not found or does not belong to user.',
    });
  }

  // Verify negotiated price is less than original price
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, cartItem.productId));

  if (parseFloat(negotiatedPrice) >= parseFloat(product.price)) {
    return res.status(400).json({
      success: false,
      message:
        'Negotiated price must be less than the original product price.',
    });
  }

  // Update cart item with negotiation details
  const [updated] = await db
    .update(carts)
    .set({
      negotiatedPrice: negotiatedPrice.toString(),
      negotiationStatus: 'pending',
      negotiationNote: negotiationNote || '',
    })
    .where(eq(carts.id, cartId))
    .returning();

  res.status(201).json({
    success: true,
    message: 'Negotiation submitted successfully.',
    data: updated,
  });
});

/**
 * PATCH /api/negotiations/:cartId/approve
 * Admin: Approve a negotiation
 */
export const approveNegotiation = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  // Verify negotiation exists
  const [negotiation] = await db
    .select()
    .from(carts)
    .where(eq(carts.id, parseInt(cartId)));

  if (!negotiation) {
    return res.status(404).json({
      success: false,
      message: 'Negotiation not found.',
    });
  }

  if (negotiation.negotiationStatus !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Only pending negotiations can be approved.',
    });
  }

  // Update negotiation status
  const [updated] = await db
    .update(carts)
    .set({
      negotiationStatus: 'accepted',
    })
    .where(eq(carts.id, parseInt(cartId)))
    .returning();

  res.json({
    success: true,
    message: 'Negotiation approved successfully.',
    data: updated,
  });
});

/**
 * PATCH /api/negotiations/:cartId/reject
 * Admin: Reject a negotiation
 */
export const rejectNegotiation = asyncHandler(async (req, res) => {
  const { cartId } = req.params;
  const { adminNote } = req.body;

  // Verify negotiation exists
  const [negotiation] = await db
    .select()
    .from(carts)
    .where(eq(carts.id, parseInt(cartId)));

  if (!negotiation) {
    return res.status(404).json({
      success: false,
      message: 'Negotiation not found.',
    });
  }

  if (negotiation.negotiationStatus !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Only pending negotiations can be rejected.',
    });
  }

  // Update negotiation status
  const [updated] = await db
    .update(carts)
    .set({
      negotiationStatus: 'rejected',
      negotiationNote: adminNote || negotiation.negotiationNote,
    })
    .where(eq(carts.id, parseInt(cartId)))
    .returning();

  res.json({
    success: true,
    message: 'Negotiation rejected.',
    data: updated,
  });
});

/**
 * GET /api/negotiations/:cartId
 * Get negotiation details by cart ID
 */
export const getNegotiationDetails = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  const [negotiation] = await db
    .select({
      id: carts.id,
      productId: carts.productId,
      productTitle: products.title,
      originalPrice: products.price,
      negotiatedPrice: carts.negotiatedPrice,
      qty: carts.qty,
      negotiationStatus: carts.negotiationStatus,
      negotiationNote: carts.negotiationNote,
      userId: carts.userId,
      userName: users.name,
      userEmail: users.email,
      createdAt: carts.createdAt,
    })
    .from(carts)
    .leftJoin(products, eq(carts.productId, products.id))
    .leftJoin(users, eq(carts.userId, users.id))
    .where(eq(carts.id, parseInt(cartId)));

  if (!negotiation) {
    return res.status(404).json({
      success: false,
      message: 'Negotiation not found.',
    });
  }

  res.json({
    success: true,
    data: negotiation,
  });
});
