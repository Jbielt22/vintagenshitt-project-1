import { db } from '../config/db/db.js';
import { products, categories } from '../config/db/schema.js';
import { eq, desc, sql, ilike, and } from 'drizzle-orm';
import { asyncHandler } from '../middlewares/errorHandler.js';

/**
 * GET /api/products
 * Public: List products (filter by category, search by title, paginated)
 */
export const getAllProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { categoryId, search } = req.query;

  // Build conditions
  const conditions = [];
  if (categoryId) {
    conditions.push(eq(products.categoryId, parseInt(categoryId)));
  }
  if (search) {
    conditions.push(ilike(products.title, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [allProducts, countResult] = await Promise.all([
    db
      .select({
        id: products.id,
        imgUrl: products.imgUrl,
        title: products.title,
        categoryId: products.categoryId,
        categoryName: categories.name,
        price: products.price,
        quantity: products.quantity,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(products)
      .where(whereClause),
  ]);

  const total = countResult[0].count;

  res.json({
    success: true,
    data: allProducts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * GET /api/products/:id
 * Public: Get product detail
 */
export const getProductById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const [product] = await db
    .select({
      id: products.id,
      imgUrl: products.imgUrl,
      title: products.title,
      categoryId: products.categoryId,
      categoryName: categories.name,
      price: products.price,
      quantity: products.quantity,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .limit(1);

  if (!product) {
    return res
      .status(404)
      .json({ success: false, message: 'Product not found.' });
  }

  res.json({ success: true, data: product });
});

/**
 * POST /api/products
 * Admin: Create product
 */
export const createProduct = asyncHandler(async (req, res) => {
  const { title, price, quantity, categoryId, imgUrl } = req.body;

  const [newProduct] = await db
    .insert(products)
    .values({
      title,
      price: String(price),
      quantity: quantity || 0,
      categoryId: categoryId || null,
      imgUrl: imgUrl || null,
    })
    .returning();

  res.status(201).json({
    success: true,
    message: 'Product created.',
    data: newProduct,
  });
});

/**
 * PUT /api/products/:id
 * Admin: Update product
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, price, quantity, categoryId, imgUrl } = req.body;

  const [updated] = await db
    .update(products)
    .set({
      ...(title !== undefined && { title }),
      ...(price !== undefined && { price: String(price) }),
      ...(quantity !== undefined && { quantity }),
      ...(categoryId !== undefined && { categoryId }),
      ...(imgUrl !== undefined && { imgUrl }),
      updatedAt: sql`NOW()`,
    })
    .where(eq(products.id, id))
    .returning();

  if (!updated) {
    return res
      .status(404)
      .json({ success: false, message: 'Product not found.' });
  }

  res.json({ success: true, message: 'Product updated.', data: updated });
});

/**
 * DELETE /api/products/:id
 * Admin: Delete product
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const [deleted] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id });

  if (!deleted) {
    return res
      .status(404)
      .json({ success: false, message: 'Product not found.' });
  }

  res.json({ success: true, message: 'Product deleted.' });
});
