import { jest } from '@jest/globals';

const mockReturning = jest.fn().mockResolvedValue([]);
const mockLimit = jest.fn().mockResolvedValue([]);
const mockOffset = jest.fn().mockReturnValue(mockLimit);
const mockLimitForChain = jest.fn().mockReturnValue({ offset: mockOffset });
const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimitForChain });

// Create an awaitable object that also has chaining methods
const createChainableWhere = (resolveValue) => ({
  limit: mockLimit,
  orderBy: mockOrderBy,
  returning: mockReturning,
  then: function (resolve) {
    resolve(resolveValue);
  },
});

const mockWhere = jest.fn().mockReturnValue(createChainableWhere([]));
const mockLeftJoin = jest.fn().mockReturnValue({ where: mockWhere });
const mockFrom = jest.fn().mockReturnValue({
  where: mockWhere,
  leftJoin: mockLeftJoin,
  orderBy: mockOrderBy,
});
const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = jest.fn().mockReturnValue({ values: mockValues });
const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });
const mockDeleteFn = jest
  .fn()
  .mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDeleteFn,
};

jest.unstable_mockModule('../../src/config/db/db.js', () => ({ db: mockDb }));
jest.unstable_mockModule('../../src/config/db/schema.js', () => ({
  orders: {
    id: 'id',
    userId: 'user_id',
    status: 'status',
    totalAmount: 'total_amount',
  },
  orderItems: {
    id: 'id',
    orderId: 'order_id',
    productId: 'product_id',
    priceAtPurchase: 'price',
    quantity: 'quantity',
  },
  payments: { id: 'id', orderId: 'order_id' },
  carts: { id: 'id', userId: 'user_id', productId: 'product_id', qty: 'qty' },
  products: { id: 'id', title: 'title', price: 'price', quantity: 'quantity' },
}));
jest.unstable_mockModule('drizzle-orm', () => {
  const sqlFn = jest.fn(() => ({ mapWith: jest.fn(() => 'count_col') }));
  // Support tagged template literal usage: sql`...`
  sqlFn.raw = jest.fn(() => 'raw');
  return { eq: jest.fn(), desc: jest.fn(), sql: sqlFn, and: jest.fn() };
});
jest.unstable_mockModule('../../src/config/midtrans.js', () => ({
  default: {
    createTransaction: jest.fn().mockResolvedValue({
      token: 'snap-token-123',
      redirect_url: 'https://snap.midtrans.com',
    }),
  },
}));
jest.unstable_mockModule('../../src/config/paypal.js', () => ({
  createPayPalOrder: jest.fn().mockResolvedValue({
    paypalOrderId: 'PAY-123',
    approveUrl: 'https://paypal.com/approve',
  }),
}));

const { checkout, getAllOrders, getOrderById, updateOrderStatus, cancelOrder } =
  await import('../../src/controllers/order.controller.js');

describe('Order Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      query: {},
      body: {},
      user: { id: 1, email: 'test@test.com', role: 'user' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('checkout', () => {
    it('should return 400 if cart is empty', async () => {
      req.body = { paymentMethod: 'qris', shippingAddress: '123 St' };
      mockWhere.mockResolvedValueOnce([]); // empty cart

      await checkout(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Your cart is empty.',
        })
      );
    });

    it('should return 400 if product stock insufficient', async () => {
      req.body = { paymentMethod: 'qris', shippingAddress: '123 St' };
      mockWhere.mockResolvedValueOnce([
        {
          cartId: 1,
          productId: 1,
          qty: 100,
          productTitle: 'Jacket',
          productPrice: '50',
          productStock: 5,
        },
      ]);

      await checkout(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Insufficient stock'),
        })
      );
    });

    it('should create order with QRIS and return snap token', async () => {
      req.body = { paymentMethod: 'qris', shippingAddress: '123 St' };
      // Cart items
      mockWhere.mockResolvedValueOnce([
        {
          cartId: 1,
          productId: 1,
          qty: 2,
          productTitle: 'Jacket',
          productPrice: '50.00',
          productStock: 10,
        },
      ]);
      // Insert order → returning()
      mockReturning.mockResolvedValueOnce([
        { id: 1, userId: 1, totalAmount: '100.00', status: 'pending' },
      ]);
      // Insert payment → returning() (order items insert doesn't call returning)
      mockReturning.mockResolvedValueOnce([
        { id: 1, orderId: 1, paymentStatus: 'pending', paymentMethod: 'qris' },
      ]);

      await checkout(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Order created. Please complete payment.',
        })
      );
    });
  });

  describe('getAllOrders', () => {
    it('should return paginated orders', async () => {
      const ordersData = [{ id: 1, status: 'pending' }];
      // First call: orders query (await offset)
      mockOffset.mockResolvedValueOnce(ordersData);
      // Second call: count query (await where)
      mockWhere
        .mockReturnValueOnce(createChainableWhere([]))
        .mockReturnValueOnce(createChainableWhere([{ count: 1 }]));

      await getAllOrders(req, res, next);

      if (next.mock.calls.length > 0) {
        console.error('Error passed to next:', next.mock.calls[0][0]);
      }
      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('getOrderById', () => {
    it('should return 404 if order not found', async () => {
      req.params.id = '999';
      mockLimit.mockResolvedValueOnce([]); // order not found

      await getOrderById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateOrderStatus', () => {
    it('should return 400 for invalid status', async () => {
      req.params.id = '1';
      req.body = { status: 'invalid_status' };

      await updateOrderStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should update order status', async () => {
      req.params.id = '1';
      req.body = { status: 'processing' };
      mockReturning.mockResolvedValueOnce([{ id: 1, status: 'processing' }]);

      await updateOrderStatus(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('cancelOrder', () => {
    it('should return 404 if order not found', async () => {
      req.params.id = '999';
      mockLimit.mockResolvedValueOnce([]); // not found

      await cancelOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if order is not pending', async () => {
      req.params.id = '1';
      mockLimit.mockResolvedValueOnce([
        { id: 1, userId: 1, status: 'shipped' },
      ]);

      await cancelOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Cannot cancel'),
        })
      );
    });
  });
});
