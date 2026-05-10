import { db } from '../config/db/db.js';
import { carts, products } from '../config/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { asyncHandler } from '../middlewares/errorHandler.js';

/**
 * GET /api/carts
 * User: Get all cart items with product details
 */
export const getCart = asyncHandler(async (req, res) => {
  const cartItems = await db
    .select({
      id: carts.id,
      productId: carts.productId,
      productTitle: products.title,
      productPrice: products.price,
      productImgUrl: products.imgUrl,
      productStock: products.quantity,
      qty: carts.qty,
      createdAt: carts.createdAt,
    })
    .from(carts)
    .leftJoin(products, eq(carts.productId, products.id))
    .where(eq(carts.userId, req.user.id));

  // Calculate total
  const total = cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.productPrice) * item.qty;
  }, 0);

  res.json({
    success: true,
    data: {
      items: cartItems,
      total: total.toFixed(2),
      itemCount: cartItems.length,
    },
  });
});

/**
 * POST /api/carts
 * User: Add item to cart
 */
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, qty } = req.body;

  // Check product exists and has stock
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return res
      .status(404)
      .json({ success: false, message: 'Product not found.' });
  }

  if (product.quantity < qty) {
    return res.status(400).json({
      success: false,
      message: `Insufficient stock. Only ${product.quantity} available.`,
    });
  }

  // Check if item already in cart
  const [existingItem] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.userId, req.user.id), eq(carts.productId, productId)))
    .limit(1);

  if (existingItem) {
    // Update quantity
    const newQty = existingItem.qty + qty;
    if (newQty > product.quantity) {
      return res.status(400).json({
        success: false,
        message: `Cannot add more. Only ${product.quantity} available. You already have ${existingItem.qty} in cart.`,
      });
    }

    const [updated] = await db
      .update(carts)
      .set({ qty: newQty })
      .where(eq(carts.id, existingItem.id))
      .returning();

    return res.json({
      success: true,
      message: 'Cart item quantity updated.',
      data: updated,
    });
  }

  // Insert new cart item
  const [newItem] = await db
    .insert(carts)
    .values({
      userId: req.user.id,
      productId,
      qty,
    })
    .returning();

  res.status(201).json({
    success: true,
    message: 'Item added to cart.',
    data: newItem,
  });
});

/**
 * PUT /api/carts/:id
 * User: Update cart item quantity
 */
export const updateCartItem = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { qty } = req.body;

  if (!qty || qty < 1) {
    return res
      .status(400)
      .json({ success: false, message: 'Quantity must be at least 1.' });
  }

  // Verify ownership
  const [cartItem] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.id, id), eq(carts.userId, req.user.id)))
    .limit(1);

  if (!cartItem) {
    return res
      .status(404)
      .json({ success: false, message: 'Cart item not found.' });
  }

  // Check stock
  const [product] = await db
    .select({ quantity: products.quantity })
    .from(products)
    .where(eq(products.id, cartItem.productId))
    .limit(1);

  if (product && qty > product.quantity) {
    return res.status(400).json({
      success: false,
      message: `Insufficient stock. Only ${product.quantity} available.`,
    });
  }

  const [updated] = await db
    .update(carts)
    .set({ qty })
    .where(eq(carts.id, id))
    .returning();

  res.json({ success: true, message: 'Cart item updated.', data: updated });
});

/**
 * DELETE /api/carts/:id
 * User: Remove single item from cart
 */
export const removeCartItem = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const [deleted] = await db
    .delete(carts)
    .where(and(eq(carts.id, id), eq(carts.userId, req.user.id)))
    .returning({ id: carts.id });

  if (!deleted) {
    return res
      .status(404)
      .json({ success: false, message: 'Cart item not found.' });
  }

  res.json({ success: true, message: 'Item removed from cart.' });
});

/**
 * DELETE /api/carts
 * User: Clear entire cart
 */
export const clearCart = asyncHandler(async (req, res) => {
  await db.delete(carts).where(eq(carts.userId, req.user.id));

  res.json({ success: true, message: 'Cart cleared.' });
});
