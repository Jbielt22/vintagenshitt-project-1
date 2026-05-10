import { Router } from 'express';
import {
  getAllUsers,
  getProfile,
  getUserById,
  updateProfile,
  updateUser,
  deleteUser,
} from '../controllers/user.controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// User profile routes (must be before /:id to avoid conflict)
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

// Admin routes
router.get('/', authenticate, requireAdmin, getAllUsers);
router.get('/:id', authenticate, requireAdmin, getUserById);
router.put('/:id', authenticate, requireAdmin, updateUser);
router.delete('/:id', authenticate, requireAdmin, deleteUser);

export default router;
