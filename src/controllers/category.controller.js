import { db } from '../config/db/db.js';
import { categories } from '../config/db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { asyncHandler } from '../middlewares/errorHandler.js';

/**
 * GET /api/categories
 * Public: List all categories (active only for public, all for admin)
 */
export const getAllCategories = asyncHandler(async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';

  let query = db.select().from(categories).orderBy(desc(categories.createdAt));

  if (!isAdmin) {
    query = db
      .select()
      .from(categories)
      .where(eq(categories.status, 'active'))
      .orderBy(desc(categories.createdAt));
  }

  const allCategories = await query;

  res.json({ success: true, data: allCategories });
});

/**
 * GET /api/categories/:id
 * Public: Get category by ID
 */
export const getCategoryById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (!category) {
    return res
      .status(404)
      .json({ success: false, message: 'Category not found.' });
  }

  res.json({ success: true, data: category });
});

/**
 * POST /api/categories
 * Admin: Create category
 */
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;

  const [newCategory] = await db
    .insert(categories)
    .values({
      name,
      description: description || null,
      status: status || 'active',
    })
    .returning();

  res.status(201).json({
    success: true,
    message: 'Category created.',
    data: newCategory,
  });
});

/**
 * PUT /api/categories/:id
 * Admin: Update category
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, status } = req.body;

  const [updated] = await db
    .update(categories)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
    })
    .where(eq(categories.id, id))
    .returning();

  if (!updated) {
    return res
      .status(404)
      .json({ success: false, message: 'Category not found.' });
  }

  res.json({ success: true, message: 'Category updated.', data: updated });
});

/**
 * DELETE /api/categories/:id
 * Admin: Delete category
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });

  if (!deleted) {
    return res
      .status(404)
      .json({ success: false, message: 'Category not found.' });
  }

  res.json({ success: true, message: 'Category deleted.' });
});
