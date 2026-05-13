import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db/db.js';
import { users } from '../config/db/schema.js';
import { eq } from 'drizzle-orm';
import { asyncHandler } from '../middlewares/errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

/**
 * POST /api/auth/register
 * Register a new user
 */
export const register = asyncHandler(async (req, res) => {
  const {
    email,
    password,
    name,
    country,
    province,
    city,
    address,
    postalCode,
  } = req.body;

  // Check if email already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered.',
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Insert user
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      password: hashedPassword,
      name,
      role: 'user',
      country,
      province,
      city,
      address,
      postalCode,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });

  // Generate token
  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    data: { user: newUser, token },
  });
});

/**
 * POST /api/auth/login
 * Login and return JWT
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // Generate token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    message: 'Login successful.',
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    },
  });
});
