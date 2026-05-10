import { jest } from '@jest/globals';

const mockReturning = jest.fn().mockResolvedValue([]);
const mockLimit = jest.fn().mockResolvedValue([]);
const mockOffset = jest.fn().mockReturnValue(mockLimit);
const mockOrderBy = jest.fn().mockReturnValue({
  limit: jest.fn().mockReturnValue({ offset: mockOffset }),
});
const mockWhere = jest.fn().mockReturnValue({
  limit: mockLimit,
  returning: mockReturning,
  orderBy: mockOrderBy,
});
const mockFrom = jest
  .fn()
  .mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = jest.fn().mockReturnValue({ values: mockValues });
const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });

const mockDb = { select: mockSelect, insert: mockInsert, update: mockUpdate };

jest.unstable_mockModule('../../src/config/db/db.js', () => ({ db: mockDb }));
jest.unstable_mockModule('../../src/config/db/schema.js', () => ({
  shippings: {
    id: 'id',
    orderId: 'order_id',
    userId: 'user_id',
    deliveryStatus: 'delivery_status',
  },
  orders: { id: 'id', userId: 'user_id', status: 'status' },
}));
jest.unstable_mockModule('drizzle-orm', () => ({
  eq: jest.fn(),
  desc: jest.fn(),
  sql: jest.fn(),
  and: jest.fn(),
}));

const {
  getShippingByOrderId,
  createShipping,
  updateShipping,
  updateDeliveryStatus,
} = await import('../../src/controllers/shipping.controller.js');

describe('Shipping Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, query: {}, body: {}, user: { id: 1, role: 'admin' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getShippingByOrderId', () => {
    it('should return shipping for admin', async () => {
      req.params.orderId = '1';
      mockLimit.mockResolvedValueOnce([{ id: 1, orderId: 1, courier: 'JNE' }]);

      await getShippingByOrderId(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ courier: 'JNE' }),
        })
      );
    });

    it('should return 404 if not found', async () => {
      req.params.orderId = '999';
      mockLimit.mockResolvedValueOnce([]);

      await getShippingByOrderId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should check ownership for non-admin', async () => {
      req.user.role = 'user';
      req.params.orderId = '1';
      mockLimit.mockResolvedValueOnce([{ userId: 999 }]); // order belongs to different user

      await getShippingByOrderId(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('createShipping', () => {
    it('should return 404 if order not found', async () => {
      req.body = { orderId: 999, courier: 'JNE' };
      mockLimit.mockResolvedValueOnce([]); // order not found

      await createShipping(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 409 if shipping already exists', async () => {
      req.body = { orderId: 1, courier: 'JNE' };
      mockLimit
        .mockResolvedValueOnce([{ id: 1, userId: 1 }]) // order found
        .mockResolvedValueOnce([{ id: 1 }]); // shipping already exists

      await createShipping(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should create shipping successfully', async () => {
      req.body = { orderId: 1, courier: 'JNE', trackingNumber: 'TRK123' };
      mockLimit
        .mockResolvedValueOnce([{ id: 1, userId: 1 }]) // order found
        .mockResolvedValueOnce([]); // no existing shipping
      mockReturning.mockResolvedValueOnce([
        { id: 1, orderId: 1, courier: 'JNE' },
      ]);

      await createShipping(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should reject invalid status', async () => {
      req.params.id = '1';
      req.body = { deliveryStatus: 'flying' };

      await updateDeliveryStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should update status', async () => {
      req.params.id = '1';
      req.body = { deliveryStatus: 'shipping' };
      mockReturning.mockResolvedValueOnce([
        { id: 1, deliveryStatus: 'shipping', orderId: 1 },
      ]);

      await updateDeliveryStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 404 if not found', async () => {
      req.params.id = '999';
      req.body = { deliveryStatus: 'shipping' };
      mockReturning.mockResolvedValueOnce([]);

      await updateDeliveryStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
