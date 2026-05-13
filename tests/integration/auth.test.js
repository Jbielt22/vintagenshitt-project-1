import { jest } from '@jest/globals';

// Mock all external dependencies before importing app
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
const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = jest.fn().mockReturnValue({ values: mockValues });

jest.unstable_mockModule('../../src/config/db/db.js', () => ({
  db: { select: mockSelect, insert: mockInsert },
}));

jest.unstable_mockModule('../../src/config/midtrans.js', () => ({
  default: {
    createTransaction: jest
      .fn()
      .mockResolvedValue({ token: 'test', redirect_url: 'http://test' }),
  },
}));

jest.unstable_mockModule('../../src/config/paypal.js', () => ({
  createPayPalOrder: jest.fn(),
  capturePayPalOrder: jest.fn(),
  verifyWebhookSignature: jest.fn(),
  getAccessToken: jest.fn(),
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../../src/server.js');
const { db } = await import('../../src/config/db/db.js');

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 201 for valid registration', async () => {
      mockWhere.mockReturnValueOnce(createChainableWhere([])); // no existing user
      mockReturning.mockResolvedValue([
        {
          id: 1,
          email: 'new@test.com',
          name: 'New User',
          role: 'user',
        },
      ]);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@test.com', password: '123456', name: 'New User' });

      if (res.status === 500) {
        console.error('500 Error body:', res.body);
      }
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing fields', async () => {
      const res = await request(app).post('/api/auth/login').send({});

      expect(res.status).toBe(400);
    });

    it('should return 401 for invalid credentials', async () => {
      mockLimit.mockResolvedValueOnce([]); // user not found

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nope@test.com', password: '123456' });

      expect(res.status).toBe(401);
    });
  });

  describe('Protected Routes', () => {
    it('should return 401 for unauthenticated access to /api/carts', async () => {
      const res = await request(app).get('/api/carts');

      expect(res.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const res = await request(app)
        .get('/api/carts')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });
});
