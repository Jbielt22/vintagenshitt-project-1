import { jest } from '@jest/globals';

const mockReturning = jest.fn().mockResolvedValue([]);
const mockLimit = jest.fn().mockResolvedValue([]);
const mockOrderBy = jest.fn().mockReturnValue(mockLimit);
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
const mockDeleteFn = jest.fn().mockReturnValue({ where: mockWhere });

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDeleteFn,
};

jest.unstable_mockModule('../../src/config/db/db.js', () => ({ db: mockDb }));
jest.unstable_mockModule('../../src/config/db/schema.js', () => ({
  categories: {
    id: 'id',
    name: 'name',
    status: 'status',
    createdAt: 'created_at',
  },
}));
jest.unstable_mockModule('drizzle-orm', () => ({
  eq: jest.fn(),
  desc: jest.fn(),
  sql: jest.fn(),
}));

const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = await import('../../src/controllers/category.controller.js');

describe('Category Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, query: {}, body: {}, user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getAllCategories', () => {
    it('should return all categories', async () => {
      const cats = [
        { id: 1, name: 'Tops' },
        { id: 2, name: 'Bottoms' },
      ];
      // For non-admin, the second select call (with where) should return data
      mockOrderBy.mockResolvedValueOnce(cats);

      await getAllCategories(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('getCategoryById', () => {
    it('should return category by ID', async () => {
      req.params.id = '1';
      mockLimit.mockResolvedValueOnce([{ id: 1, name: 'Tops' }]);

      await getCategoryById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { id: 1, name: 'Tops' },
        })
      );
    });

    it('should return 404 if not found', async () => {
      req.params.id = '999';
      mockLimit.mockResolvedValueOnce([]);

      await getCategoryById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createCategory', () => {
    it('should create and return category', async () => {
      req.body = { name: 'Accessories', description: 'Cool stuff' };
      mockReturning.mockResolvedValueOnce([
        { id: 3, name: 'Accessories', status: 'active' },
      ]);

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('updateCategory', () => {
    it('should update and return category', async () => {
      req.params.id = '1';
      req.body = { name: 'Updated Tops' };
      mockReturning.mockResolvedValueOnce([{ id: 1, name: 'Updated Tops' }]);

      await updateCategory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 404 if not found', async () => {
      req.params.id = '999';
      req.body = { name: 'Nope' };
      mockReturning.mockResolvedValueOnce([]);

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteCategory', () => {
    it('should delete and return success', async () => {
      req.params.id = '1';
      mockReturning.mockResolvedValueOnce([{ id: 1 }]);

      await deleteCategory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Category deleted.' })
      );
    });

    it('should return 404 if not found', async () => {
      req.params.id = '999';
      mockReturning.mockResolvedValueOnce([]);

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
