import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock all external deps
const mockReturning = jest.fn().mockResolvedValue([]);
const mockLimit = jest.fn().mockResolvedValue([]);
const createChainableWhere = (resolveValue) => ({
  limit: mockLimit,
  returning: mockReturning,
  then: function (resolve) {
    resolve(resolveValue);
  },
});
const mockWhere = jest.fn().mockReturnValue(createChainableWhere([]));
const mockLeftJoin = jest.fn().mockReturnValue({ where: mockWhere });
const mockFrom = jest
  .fn()
  .mockReturnValue({ where: mockWhere, leftJoin: mockLeftJoin });
const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = jest.fn().mockReturnValue({ values: mockValues });
const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });
const mockDeleteFn = jest
  .fn()
  .mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });

jest.unstable_mockModule('../../src/config/db/db.js', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDeleteFn,
  },
}));

const mockCreateSnap = jest.fn().mockResolvedValue({
  token: 'snap-123',
  redirect_url: 'https://snap.midtrans.com',
});
jest.unstable_mockModule('../../src/config/midtrans.js', () => ({
  default: { createTransaction: mockCreateSnap },
}));

const mockCreatePayPal = jest.fn().mockResolvedValue({
  paypalOrderId: 'PP-123',
  approveUrl: 'https://paypal.com/approve',
});
jest.unstable_mockModule('../../src/config/paypal.js', () => ({
  createPayPalOrder: mockCreatePayPal,
  capturePayPalOrder: jest.fn(),
  verifyWebhookSignature: jest.fn(),
  getAccessToken: jest.fn(),
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../../src/server.js');
const { db } = await import('../../src/config/db/db.js');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const userToken = jwt.sign(
  { id: 1, email: 'user@test.com', role: 'user' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Order Checkout Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/orders/checkout', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/orders/checkout')
        .send({ paymentMethod: 'qris', shippingAddress: '123 Street' });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid payment method', async () => {
      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ paymentMethod: 'bitcoin', shippingAddress: '123 Street' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing shipping address', async () => {
      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ paymentMethod: 'qris' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if cart is empty', async () => {
      mockWhere.mockReturnValueOnce(createChainableWhere([])); // empty cart
      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ paymentMethod: 'qris', shippingAddress: '123 Vintage Street' });

      if (res.status === 500) {
        console.error('500 Error body:', res.body);
      }
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Your cart is empty.');
    });
  });
});
