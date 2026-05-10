import { db } from '../config/db/db.js';
import { users } from '../config/db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { asyncHandler } from '../middlewares/errorHandler.js';

/**
 * GET /api/users
 * Admin: List all users (paginated)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const [allUsers, countResult] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        country: users.country,
        province: users.province,
        city: users.city,
        address: users.address,
        postalCode: users.postalCode,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql`count(*)`.mapWith(Number) }).from(users),
  ]);

  const total = countResult[0].count;

  res.json({
    success: true,
    data: allUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * GET /api/users/profile
 * User: Get own profile
 */
export const getProfile = asyncHandler(async (req, res) => {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      country: users.country,
      province: users.province,
      city: users.city,
      address: users.address,
      postalCode: users.postalCode,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  res.json({ success: true, data: user });
});

/**
 * GET /api/users/:id
 * Admin: Get user by ID
 */
export const getUserById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      country: users.country,
      province: users.province,
      city: users.city,
      address: users.address,
      postalCode: users.postalCode,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  res.json({ success: true, data: user });
});

/**
 * PUT /api/users/profile
 * User: Update own profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, country, province, city, address, postalCode } = req.body;

  const [updated] = await db
    .update(users)
    .set({
      ...(name !== undefined && { name }),
      ...(country !== undefined && { country }),
      ...(province !== undefined && { province }),
      ...(city !== undefined && { city }),
      ...(address !== undefined && { address }),
      ...(postalCode !== undefined && { postalCode }),
      updatedAt: sql`NOW()`,
    })
    .where(eq(users.id, req.user.id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      country: users.country,
      province: users.province,
      city: users.city,
      address: users.address,
      postalCode: users.postalCode,
      updatedAt: users.updatedAt,
    });

  if (!updated) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  res.json({ success: true, message: 'Profile updated.', data: updated });
});

/**
 * PUT /api/users/:id
 * Admin: Update any user (including role)
 */
export const updateUser = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, role, country, province, city, address, postalCode } = req.body;

  const [updated] = await db
    .update(users)
    .set({
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(country !== undefined && { country }),
      ...(province !== undefined && { province }),
      ...(city !== undefined && { city }),
      ...(address !== undefined && { address }),
      ...(postalCode !== undefined && { postalCode }),
      updatedAt: sql`NOW()`,
    })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });

  if (!updated) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  res.json({ success: true, message: 'User updated.', data: updated });
});

/**
 * DELETE /api/users/:id
 * Admin: Delete user
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning({ id: users.id });

  if (!deleted) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  res.json({ success: true, message: 'User deleted.' });
});
