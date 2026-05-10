import { jest } from '@jest/globals';

// Mock db
const mockSelectReturn = [];
const mockLimit = jest.fn().mockResolvedValue(mockSelectReturn);
const mockOffset = jest.fn().mockReturnValue({ limit: mockLimit });
const mockOrderBy = jest
  .fn()
  .mockReturnValue({ limit: mockLimit, offset: mockOffset });
const mockWhere = jest
  .fn()
  .mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy });
const mockFrom = jest
  .fn()
  .mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

const mockReturning = jest.fn().mockResolvedValue([]);
const mockSet = jest.fn().mockReturnValue({
  where: jest.fn().mockReturnValue({ returning: mockReturning }),
});
const mockDeleteWhere = jest.fn().mockReturnValue({ returning: mockReturning });

const mockDb = {
  select: mockSelect,
  update: jest.fn().mockReturnValue({ set: mockSet }),
  delete: jest.fn().mockReturnValue({ where: mockDeleteWhere }),
};

jest.unstable_mockModule('../../src/config/db/db.js', () => ({ db: mockDb }));
jest.unstable_mockModule('../../src/config/db/schema.js', () => ({
  users: {
    id: 'id',
    email: 'email',
    name: 'name',
    role: 'role',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));
jest.unstable_mockModule('drizzle-orm', () => ({
  eq: jest.fn(),
  desc: jest.fn(),
  sql: jest.fn(),
}));

const { getProfile, getUserById, deleteUser } =
  await import('../../src/controllers/user.controller.js');

describe('User Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      query: {},
      user: { id: 1, email: 'test@test.com', role: 'user' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const userData = { id: 1, email: 'test@test.com', name: 'Test' };
      mockLimit.mockResolvedValueOnce([userData]);

      await getProfile(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: userData,
        })
      );
    });

    it('should return 404 if user not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      req.params.id = '5';
      const userData = { id: 5, email: 'other@test.com', name: 'Other' };
      mockLimit.mockResolvedValueOnce([userData]);

      await getUserById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: userData,
        })
      );
    });

    it('should return 404 if user not found', async () => {
      req.params.id = '999';
      mockLimit.mockResolvedValueOnce([]);

      await getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteUser', () => {
    it('should delete user and return success', async () => {
      req.params.id = '5';
      mockReturning.mockResolvedValueOnce([{ id: 5 }]);

      await deleteUser(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User deleted.',
        })
      );
    });

    it('should return 404 if user not found', async () => {
      req.params.id = '999';
      mockReturning.mockResolvedValueOnce([]);

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
