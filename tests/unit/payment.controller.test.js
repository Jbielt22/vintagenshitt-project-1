import { jest } from '@jest/globals';
import crypto from 'crypto';

// Build a proper chainable mock
const mockReturning = jest.fn().mockResolvedValue([]);
const mockLimit = jest.fn().mockResolvedValue([]);
const mockOffset = jest.fn().mockReturnValue(mockLimit);
const mockLimitChain = jest.fn().mockReturnValue({ offset: mockOffset });
const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimitChain });
const mockWhere = jest.fn().mockReturnValue({
  limit: mockLimit,
  returning: mockReturning,
  orderBy: mockOrderBy,
});
const mockFrom = jest
  .fn()
  .mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

// Update mock: set → where → returning (fully chainable)
const mockUpdateWhere = jest.fn().mockReturnValue({ returning: mockReturning });
const mockUpdateSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = jest.fn().mockReturnValue({ set: mockUpdateSet });

const mockDb = { select: mockSelect, update: mockUpdate };

jest.unstable_mockModule('../../src/config/db/db.js', () => ({ db: mockDb }));
jest.unstable_mockModule('../../src/config/db/schema.js', () => ({
  payments: {
    id: 'id',
    orderId: 'order_id',
    userId: 'user_id',
    paymentStatus: 'status',
    transactionId: 'transaction_id',
    paymentMethod: 'payment_method',
    createdAt: 'created_at',
  },
  orders: { id: 'id', userId: 'user_id', status: 'status' },
}));
jest.unstable_mockModule('drizzle-orm', () => ({
  eq: jest.fn(),
  desc: jest.fn(),
  sql: jest.fn(() => 'NOW()'),
  and: jest.fn(),
}));

const mockCapturePayPal = jest.fn();
const mockVerifyWebhook = jest.fn();
jest.unstable_mockModule('../../src/config/paypal.js', () => ({
  capturePayPalOrder: mockCapturePayPal,
  verifyWebhookSignature: mockVerifyWebhook,
}));

const {
  midtransNotification,
  capturePayPal,
  paypalWebhook,
  getPaymentByOrderId,
  getPaymentById,
} = await import('../../src/controllers/payment.controller.js');

describe('Payment Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup default mock returns after clearAllMocks
    mockLimit.mockResolvedValue([]);
    mockReturning.mockResolvedValue([]);
    mockWhere.mockReturnValue({
      limit: mockLimit,
      returning: mockReturning,
      orderBy: mockOrderBy,
    });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockSelect.mockReturnValue({ from: mockFrom });
    mockUpdateWhere.mockReturnValue({ returning: mockReturning });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });

    process.env.MIDTRANS_SERVER_KEY = 'test-server-key';
    req = {
      params: {},
      query: {},
      body: {},
      headers: {},
      user: { id: 1, role: 'user' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('midtransNotification', () => {
    it('should reject invalid signature', async () => {
      req.body = {
        order_id: 'ORDER-1',
        status_code: '200',
        gross_amount: '100000.00',
        signature_key: 'wrong-signature',
        transaction_status: 'settlement',
      };

      await midtransNotification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should process valid notification and update status', async () => {
      const orderId = 'ORDER-1';
      const statusCode = '200';
      const grossAmount = '100000.00';
      const serverKey = 'test-server-key';
      const validSig = crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest('hex');

      req.body = {
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: validSig,
        transaction_status: 'settlement',
      };

      mockLimit.mockResolvedValueOnce([
        { id: 1, orderId: 10, transactionId: orderId },
      ]);

      await midtransNotification(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Notification processed.',
        })
      );
    });

    it('should return 404 if payment not found', async () => {
      const orderId = 'ORDER-999';
      const statusCode = '200';
      const grossAmount = '100.00';
      const serverKey = 'test-server-key';
      const validSig = crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest('hex');

      req.body = {
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: validSig,
        transaction_status: 'settlement',
      };

      mockLimit.mockResolvedValueOnce([]);

      await midtransNotification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('capturePayPal', () => {
    it('should return 404 if payment not found', async () => {
      req.params.paypalOrderId = 'PAY-999';
      mockLimit.mockResolvedValueOnce([]);

      await capturePayPal(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if user does not own payment', async () => {
      req.params.paypalOrderId = 'PAY-1';
      mockLimit.mockResolvedValueOnce([
        { id: 1, userId: 999, paymentStatus: 'pending' },
      ]);

      await capturePayPal(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if already paid', async () => {
      req.params.paypalOrderId = 'PAY-1';
      mockLimit.mockResolvedValueOnce([
        { id: 1, userId: 1, paymentStatus: 'paid' },
      ]);

      await capturePayPal(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should capture successfully', async () => {
      req.params.paypalOrderId = 'PAY-1';
      mockLimit.mockResolvedValueOnce([
        { id: 1, userId: 1, orderId: 1, paymentStatus: 'pending' },
      ]);
      mockCapturePayPal.mockResolvedValueOnce({ status: 'COMPLETED' });

      await capturePayPal(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { paymentStatus: 'paid', orderStatus: 'processing' },
        })
      );
    });
  });

  describe('paypalWebhook', () => {
    it('should reject invalid webhook signature', async () => {
      mockVerifyWebhook.mockResolvedValueOnce(false);

      await paypalWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should process valid webhook', async () => {
      mockVerifyWebhook.mockResolvedValueOnce(true);
      req.body = {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          supplementary_data: { related_ids: { order_id: 'PAY-1' } },
        },
      };
      mockLimit.mockResolvedValueOnce([
        { id: 1, orderId: 1, paymentStatus: 'pending' },
      ]);

      await paypalWebhook(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('getPaymentByOrderId', () => {
    it('should return 404 if order not found (non-admin)', async () => {
      req.params.orderId = '999';
      mockLimit.mockResolvedValueOnce([]); // order not found

      await getPaymentByOrderId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getPaymentById', () => {
    it('should return payment', async () => {
      req.params.id = '1';
      mockLimit.mockResolvedValueOnce([{ id: 1, paymentStatus: 'paid' }]);

      await getPaymentById(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { id: 1, paymentStatus: 'paid' },
        })
      );
    });

    it('should return 404', async () => {
      req.params.id = '999';
      mockLimit.mockResolvedValueOnce([]);

      await getPaymentById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
