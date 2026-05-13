import { jest } from '@jest/globals';
import crypto from 'crypto';

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
const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });

jest.unstable_mockModule('../../src/config/db/db.js', () => ({
  db: { select: mockSelect, update: mockUpdate },
}));

const mockCapturePayPal = jest.fn();
const mockVerifyWebhook = jest.fn();
jest.unstable_mockModule('../../src/config/paypal.js', () => ({
  capturePayPalOrder: mockCapturePayPal,
  verifyWebhookSignature: mockVerifyWebhook,
  getAccessToken: jest.fn(),
  createPayPalOrder: jest.fn(),
}));

jest.unstable_mockModule('../../src/config/midtrans.js', () => ({
  default: { createTransaction: jest.fn() },
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../../src/server.js');
const { db } = await import('../../src/config/db/db.js');

describe('Payment Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MIDTRANS_SERVER_KEY = 'test-server-key';
  });

  describe('POST /api/payments/midtrans/notification', () => {
    it('should reject invalid Midtrans signature', async () => {
      const res = await request(app)
        .post('/api/payments/midtrans/notification')
        .send({
          order_id: 'ORDER-1',
          status_code: '200',
          gross_amount: '100000.00',
          signature_key: 'invalid',
          transaction_status: 'settlement',
        });

      expect(res.status).toBe(403);
    });

    it('should accept valid Midtrans notification', async () => {
      const orderId = 'ORDER-1';
      const statusCode = '200';
      const grossAmount = '100000.00';
      const serverKey = 'test-server-key';
      const sig = crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest('hex');

      mockLimit.mockResolvedValue([
        { id: 1, orderId: 1, transactionId: orderId },
      ]);

      const res = await request(app)
        .post('/api/payments/midtrans/notification')
        .send({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: sig,
          transaction_status: 'settlement',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/payments/paypal/webhook', () => {
    it('should reject invalid PayPal webhook', async () => {
      mockVerifyWebhook.mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/api/payments/paypal/webhook')
        .send({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {} });

      expect(res.status).toBe(403);
    });

    it('should accept valid PayPal webhook', async () => {
      mockVerifyWebhook.mockResolvedValueOnce(true);
      mockLimit.mockResolvedValueOnce([
        { id: 1, orderId: 1, paymentStatus: 'pending' },
      ]);

      const res = await request(app)
        .post('/api/payments/paypal/webhook')
        .send({
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: {
            supplementary_data: { related_ids: { order_id: 'PP-1' } },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
