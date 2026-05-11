import { Router } from 'express';
import {
  getAllNegotiations,
  getUserNegotiations,
  submitNegotiation,
  approveNegotiation,
  rejectNegotiation,
  getNegotiationDetails,
} from '../controllers/negotiation.controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin routes - Get all negotiations
router.get('/', requireAdmin, getAllNegotiations);

// Admin routes - Approve negotiation
router.patch('/:cartId/approve', requireAdmin, approveNegotiation);

// Admin routes - Reject negotiation
router.patch('/:cartId/reject', requireAdmin, rejectNegotiation);

// User routes - Get their own negotiations
router.get('/user/:userId', getUserNegotiations);

// Get negotiation details by cart ID
router.get('/:cartId', getNegotiationDetails);

// User route - Submit negotiation
router.post('/', submitNegotiation);

export default router;
