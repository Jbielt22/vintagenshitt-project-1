import { jest } from '@jest/globals';

const mockReturning = jest.fn().mockResolvedValue([]);
const mockLimit = jest.fn().mockResolvedValue([]);
const mockOffset = jest.fn().mockReturnValue(mockLimit);
const mockOrderBy = jest.fn().mockReturnValue({
  limit: jest.fn().mockReturnValue({ offset: mockOffset }),
});
const mockWhere = jest
  .fn()
  .mockReturnValue({ limit: mockLimit, returning: mockReturning });
const mockLeftJoin = jest.fn().mockReturnValue({
  where: jest.fn().mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit }),
  orderBy: mockOrderBy,
});
const mockFrom = jest
  .fn()
  .mockReturnValue({ leftJoin: mockLeftJoin, where: mockWhere });
const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = jest.fn().mockReturnValue({ values: mockValues });
const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });
const mockDeleteFn = jest.fn().mockReturnValue({ where: mockWhere });

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDeleteFn,
};

jest.unstable_mockModule('../../src/config/db/db.js', () => ({ db: mockDb }));
jest.unstable_mockModule('../../src/config/db/schema.js', () => ({
  products: {
    id: 'id',
    title: 'title',
    price: 'price',
    quantity: 'quantity',
    categoryId: 'category_id',
    imgUrl: 'img_url',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  categories: { id: 'id', name: 'name' },
}));
jest.unstable_mockModule('drizzle-orm', () => ({
  eq: jest.fn(),
  desc: jest.fn(),
  sql: jest.fn(),
  ilike: jest.fn(),
  and: jest.fn(),
}));

const { getProductById, createProduct, deleteProduct } =
  await import('../../src/controllers/product.controller.js');

describe('Product Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, query: {}, body: {}, user: { id: 1, role: 'admin' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getProductById', () => {
    it('should return product with category', async () => {
      req.params.id = '1';
      const product = {
        id: 1,
        title: 'Vintage Jacket',
        price: '150.00',
        categoryName: 'Outerwear',
      };
      mockLimit.mockResolvedValueOnce([product]);

      await getProductById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: product,
        })
      );
    });

    it('should return 404 if not found', async () => {
      req.params.id = '999';
      mockLimit.mockResolvedValueOnce([]);

      await getProductById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createProduct', () => {
    it('should create product', async () => {
      req.body = {
        title: 'New Jacket',
        price: 200,
        quantity: 5,
        categoryId: 1,
      };
      mockReturning.mockResolvedValueOnce([
        { id: 1, title: 'New Jacket', price: '200' },
      ]);

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('deleteProduct', () => {
    it('should delete product', async () => {
      req.params.id = '1';
      mockReturning.mockResolvedValueOnce([{ id: 1 }]);

      await deleteProduct(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 404', async () => {
      req.params.id = '999';
      mockReturning.mockResolvedValueOnce([]);

      await deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
