import { jest } from '@jest/globals';

// Mock dependencies
const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockInsert = jest.fn();
const mockValues = jest.fn();
const mockReturning = jest.fn();

const mockDb = {
  select: mockSelect.mockReturnValue({
    from: mockFrom.mockReturnValue({
      where: mockWhere.mockReturnValue({ limit: mockLimit }),
    }),
  }),
  insert: mockInsert.mockReturnValue({
    values: mockValues.mockReturnValue({ returning: mockReturning }),
  }),
};

jest.unstable_mockModule('../../src/config/db/db.js', () => ({ db: mockDb }));
jest.unstable_mockModule('../../src/config/db/schema.js', () => ({
  users: {
    id: 'id',
    email: 'email',
    name: 'name',
    password: 'password',
    role: 'role',
  },
}));
jest.unstable_mockModule('drizzle-orm', () => ({
  eq: jest.fn((a, b) => ({ field: a, value: b })),
}));

const bcrypt = await import('bcryptjs');
const jwt = await import('jsonwebtoken');
const { register, login } =
  await import('../../src/controllers/auth.controller.js');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('register', () => {
    it('should return 409 if email already exists', async () => {
      req.body = { email: 'test@test.com', password: '123456', name: 'Test' };
      mockLimit.mockResolvedValueOnce([{ id: 1 }]);

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Email already registered.',
        })
      );
    });

    it('should create user and return token on success', async () => {
      req.body = { email: 'new@test.com', password: '123456', name: 'New' };
      mockLimit.mockResolvedValueOnce([]); // no existing user
      mockReturning.mockResolvedValueOnce([
        { id: 1, email: 'new@test.com', name: 'New', role: 'user' },
      ]);

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({ email: 'new@test.com' }),
            token: expect.any(String),
          }),
        })
      );
    });
  });

  describe('login', () => {
    it('should return 401 if user not found', async () => {
      req.body = { email: 'noone@test.com', password: '123456' };
      mockLimit.mockResolvedValueOnce([]);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid email or password.',
        })
      );
    });

    it('should return 401 if password is wrong', async () => {
      const hashedPw = await bcrypt.default.hash('correct', 10);
      req.body = { email: 'test@test.com', password: 'wrong' };
      mockLimit.mockResolvedValueOnce([
        { id: 1, email: 'test@test.com', password: hashedPw, role: 'user' },
      ]);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return token on valid credentials', async () => {
      const hashedPw = await bcrypt.default.hash('correct', 10);
      req.body = { email: 'test@test.com', password: 'correct' };
      mockLimit.mockResolvedValueOnce([
        {
          id: 1,
          email: 'test@test.com',
          name: 'Test',
          password: hashedPw,
          role: 'user',
        },
      ]);

      await login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.any(String),
          }),
        })
      );
    });
  });
});
