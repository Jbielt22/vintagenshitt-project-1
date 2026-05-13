import { jest } from '@jest/globals';

const mockReturning = jest.fn().mockResolvedValue([]);
const mockLimit = jest.fn().mockResolvedValue([]);
const mockWhere = jest
  .fn()
  .mockReturnValue({ limit: mockLimit, returning: mockReturning });
const mockLeftJoin = jest.fn().mockReturnValue({ where: mockWhere });
const mockFrom = jest
  .fn()
  .mockReturnValue({ leftJoin: mockLeftJoin, where: mockWhere });
const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = jest.fn().mockReturnValue({ values: mockValues });
const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });
const mockDeleteFn = jest.fn().mockReturnValue({
  where: jest.fn().mockReturnValue({ returning: mockReturning }),
});

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDeleteFn,
};

jest.unstable_mockModule('../../src/config/db/db.js', () => ({ db: mockDb }));
jest.unstable_mockModule('../../src/config/db/schema.js', () => ({
  carts: { id: 'id', userId: 'user_id', productId: 'product_id', qty: 'qty' },
  products: {
    id: 'id',
    title: 'title',
    price: 'price',
    quantity: 'quantity',
    imgUrl: 'img_url',
  },
}));
jest.unstable_mockModule('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
}));

const { getCart, addToCart, removeCartItem, clearCart } =
  await import('../../src/controllers/cart.controller.js');

describe('Cart Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      body: {},
      user: { id: 1, email: 'test@test.com', role: 'user' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getCart', () => {
    it('should return cart items with total', async () => {
      const items = [
        {
          id: 1,
          productId: 1,
          productPrice: '50.00',
          qty: 2,
          productTitle: 'Jacket',
        },
        {
          id: 2,
          productId: 2,
          productPrice: '30.00',
          qty: 1,
          productTitle: 'Shirt',
        },
      ];
      mockWhere.mockResolvedValueOnce(items);

      await getCart(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            items,
            total: '130.00',
            itemCount: 2,
          }),
        })
      );
    });

    it('should return empty cart', async () => {
      mockWhere.mockResolvedValueOnce([]);

      await getCart(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ itemCount: 0, total: '0.00' }),
        })
      );
    });
  });

  describe('addToCart', () => {
    it('should return 404 if product not found', async () => {
      req.body = { productId: 999, qty: 1 };
      mockLimit.mockResolvedValueOnce([]); // product not found

      await addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if insufficient stock', async () => {
      req.body = { productId: 1, qty: 100 };
      mockLimit.mockResolvedValueOnce([{ id: 1, quantity: 5 }]); // product with low stock

      await addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Insufficient stock'),
        })
      );
    });

    it('should add new item to cart', async () => {
      req.body = { productId: 1, qty: 2 };
      mockLimit
        .mockResolvedValueOnce([{ id: 1, quantity: 10 }]) // product found
        .mockResolvedValueOnce([]); // not in cart yet
      mockReturning.mockResolvedValueOnce([
        { id: 1, userId: 1, productId: 1, qty: 2 },
      ]);

      await addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('removeCartItem', () => {
    it('should return 404 if not found', async () => {
      req.params.id = '999';
      mockReturning.mockResolvedValueOnce([]);

      await removeCartItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should remove item', async () => {
      req.params.id = '1';
      mockReturning.mockResolvedValueOnce([{ id: 1 }]);

      await removeCartItem(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('clearCart', () => {
    it('should clear entire cart', async () => {
      await clearCart(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Cart cleared.',
        })
      );
    });
  });
});
