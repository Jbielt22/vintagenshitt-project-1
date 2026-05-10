import { jest } from '@jest/globals';

const mockReturning = jest.fn().mockResolvedValue([]);
const mockLimit = jest.fn().mockResolvedValue([]);
const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
const mockLeftJoin = jest.fn().mockReturnValue({ where: mockWhere });
const mockFrom = jest
  .fn()
  .mockReturnValue({ leftJoin: mockLeftJoin, where: mockWhere });
const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

const mockDb = { select: mockSelect };

jest.unstable_mockModule('../../src/config/db/db.js', () => ({ db: mockDb }));
jest.unstable_mockModule('../../src/config/db/schema.js', () => ({
  orderItems: { id: 'id', orderId: 'order_id', productId: 'product_id' },
  orders: { id: 'id', userId: 'user_id' },
  products: { id: 'id', title: 'title', imgUrl: 'img_url' },
}));
jest.unstable_mockModule('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
}));

const { getItemsByOrderId, getOrderItemById } =
  await import('../../src/controllers/orderItem.controller.js');

describe('OrderItem Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, user: { id: 1, role: 'user' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getItemsByOrderId', () => {
    it('should return 404 if order not found (non-admin)', async () => {
      req.params.orderId = '999';
      mockLimit.mockResolvedValueOnce([]); // order not found

      await getItemsByOrderId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if user does not own the order', async () => {
      req.params.orderId = '1';
      mockLimit.mockResolvedValueOnce([{ userId: 999 }]); // different user

      await getItemsByOrderId(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return items for admin without ownership check', async () => {
      req.params.orderId = '1';
      req.user.role = 'admin';
      const items = [
        { id: 1, productTitle: 'Jacket', priceAtPurchase: '50', quantity: 2 },
      ];
      mockWhere.mockResolvedValueOnce(items);

      await getItemsByOrderId(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ itemCount: 1 }),
        })
      );
    });
  });

  describe('getOrderItemById', () => {
    it('should return 404 if item not found', async () => {
      req.params.id = '999';
      mockLimit.mockResolvedValueOnce([]); // not found

      await getOrderItemById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return item for owner', async () => {
      req.params.id = '1';
      const item = {
        id: 1,
        orderId: 1,
        productTitle: 'Jacket',
        priceAtPurchase: '50',
        quantity: 2,
      };
      mockLimit
        .mockResolvedValueOnce([item]) // item found
        .mockResolvedValueOnce([{ userId: 1 }]); // order ownership check

      await getOrderItemById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: item,
        })
      );
    });
  });
});
