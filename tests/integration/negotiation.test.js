import { jest } from '@jest/globals';

// Mock all external dependencies before importing app
const mockReturning = jest.fn().mockResolvedValue([]);
const mockLimit = jest.fn().mockResolvedValue([]);

function createChainMock(resolveValue = []) {
  const chain = {};
  chain.from = jest.fn().mockReturnValue(chain);
  chain.leftJoin = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.set = jest.fn().mockReturnValue(chain);
  chain.returning = jest.fn().mockResolvedValue(resolveValue);
  chain.limit = jest.fn().mockResolvedValue(resolveValue);
  chain.values = jest.fn().mockReturnValue(chain);
  chain.then = function(resolve) {
    resolve(resolveValue);
  };
  return chain;
}

const mockDb = {
  select: jest.fn().mockImplementation(() => createChainMock([])),
  insert: jest.fn().mockImplementation(() => createChainMock([])),
  update: jest.fn().mockImplementation(() => createChainMock([])),
  delete: jest.fn().mockImplementation(() => createChainMock([])),
};

jest.unstable_mockModule('../../src/config/db/db.js', () => ({
  db: mockDb,
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
const jwt = await import('jsonwebtoken');

// Generate a valid test token
function generateTestToken(role = 'user') {
  const secret = process.env.JWT_SECRET || 'fallback-secret-change-me';
  return jwt.default.sign(
    { id: 1, email: 'test@test.com', role },
    secret,
    { expiresIn: '1h' }
  );
}

describe('Negotiation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/negotiations - Submit Negotiation', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/negotiations')
        .send({
          cartId: 1,
          negotiatedPrice: '40.00',
          negotiationNote: 'Can you lower?',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 if cart item not found', async () => {
      const token = generateTestToken('user');
      const mockChain = createChainMock([]);
      mockDb.select.mockReturnValueOnce(mockChain);

      const res = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cartId: 999,
          negotiatedPrice: '40.00',
          negotiationNote: 'Too expensive',
        });

      expect(res.status).toBe(404);
    });

    it('should return 400 if negotiated price not less than original', async () => {
      const token = generateTestToken('user');
      const mockChain1 = createChainMock([{ id: 1, productId: 1, userId: 1 }]);
      mockDb.select.mockReturnValueOnce(mockChain1);

      const mockChain2 = createChainMock([{ id: 1, price: '50.00' }]);
      mockDb.select.mockReturnValueOnce(mockChain2);

      const res = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cartId: 1,
          negotiatedPrice: '60.00',
          negotiationNote: 'Is this okay?',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('must be less than');
    });

    it('should submit negotiation successfully', async () => {
      const token = generateTestToken('user');
      const mockChain1 = createChainMock([{ id: 1, productId: 1, userId: 1 }]);
      mockDb.select.mockReturnValueOnce(mockChain1);

      const mockChain2 = createChainMock([{ id: 1, price: '100.00' }]);
      mockDb.select.mockReturnValueOnce(mockChain2);

      const mockChain3 = createChainMock([
        {
          id: 1,
          userId: 1,
          productId: 1,
          negotiatedPrice: '80.00',
          negotiationStatus: 'pending',
          negotiationNote: 'Can you do 80?',
        },
      ]);
      mockDb.update.mockReturnValueOnce(mockChain3);

      const res = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cartId: 1,
          negotiatedPrice: '80.00',
          negotiationNote: 'Can you do 80?',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('submitted successfully');
    });
  });

  describe('GET /api/negotiations - Get All Negotiations (Admin Only)', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/negotiations');

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin user', async () => {
      const token = generateTestToken('user');
      const res = await request(app)
        .get('/api/negotiations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Admin');
    });

    it('should return all negotiations for admin', async () => {
      const token = generateTestToken('admin');
      const negotiations = [
        {
          id: 1,
          productId: 1,
          productTitle: 'Vintage Jacket',
          originalPrice: '100.00',
          negotiatedPrice: '80.00',
          negotiationStatus: 'pending',
        },
      ];
      const mockChain = createChainMock(negotiations);
      mockDb.select.mockReturnValueOnce(mockChain);

      const res = await request(app)
        .get('/api/negotiations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/negotiations/user/:userId - Get User Negotiations', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/negotiations/user/1');

      expect(res.status).toBe(401);
    });

    it('should return user negotiations', async () => {
      const token = generateTestToken('user');
      const negotiations = [
        {
          id: 1,
          productId: 1,
          productTitle: 'Vintage Shirt',
          originalPrice: '50.00',
          negotiatedPrice: '40.00',
          negotiationStatus: 'pending',
        },
      ];
      const mockChain = createChainMock(negotiations);
      mockDb.select.mockReturnValueOnce(mockChain);

      const res = await request(app)
        .get('/api/negotiations/user/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PATCH /api/negotiations/:cartId/approve - Approve Negotiation (Admin Only)', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).patch('/api/negotiations/1/approve');

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin user', async () => {
      const token = generateTestToken('user');
      const res = await request(app)
        .patch('/api/negotiations/1/approve')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 if negotiation not found', async () => {
      const token = generateTestToken('admin');
      const mockChain = createChainMock([]);
      mockDb.select.mockReturnValueOnce(mockChain);

      const res = await request(app)
        .patch('/api/negotiations/999/approve')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should approve negotiation successfully', async () => {
      const token = generateTestToken('admin');
      const mockChain1 = createChainMock([
        { id: 1, negotiationStatus: 'pending' },
      ]);
      mockDb.select.mockReturnValueOnce(mockChain1);

      const mockChain2 = createChainMock([
        {
          id: 1,
          negotiationStatus: 'accepted',
          negotiatedPrice: '80.00',
        },
      ]);
      mockDb.update.mockReturnValueOnce(mockChain2);

      const res = await request(app)
        .patch('/api/negotiations/1/approve')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('approved');
    });
  });

  describe('PATCH /api/negotiations/:cartId/reject - Reject Negotiation (Admin Only)', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .patch('/api/negotiations/1/reject')
        .send({ adminNote: 'Price too low' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin user', async () => {
      const token = generateTestToken('user');
      const res = await request(app)
        .patch('/api/negotiations/1/reject')
        .set('Authorization', `Bearer ${token}`)
        .send({ adminNote: 'Price too low' });

      expect(res.status).toBe(403);
    });

    it('should return 404 if negotiation not found', async () => {
      const token = generateTestToken('admin');
      const mockChain = createChainMock([]);
      mockDb.select.mockReturnValueOnce(mockChain);

      const res = await request(app)
        .patch('/api/negotiations/999/reject')
        .set('Authorization', `Bearer ${token}`)
        .send({ adminNote: 'Not found' });

      expect(res.status).toBe(404);
    });

    it('should reject negotiation successfully', async () => {
      const token = generateTestToken('admin');
      const mockChain1 = createChainMock([
        {
          id: 1,
          negotiationStatus: 'pending',
          negotiationNote: 'User note',
        },
      ]);
      mockDb.select.mockReturnValueOnce(mockChain1);

      const mockChain2 = createChainMock([
        {
          id: 1,
          negotiationStatus: 'rejected',
          negotiationNote: 'Price is firm',
        },
      ]);
      mockDb.update.mockReturnValueOnce(mockChain2);

      const res = await request(app)
        .patch('/api/negotiations/1/reject')
        .set('Authorization', `Bearer ${token}`)
        .send({ adminNote: 'Price is firm' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('rejected');
    });
  });

  describe('GET /api/negotiations/:cartId - Get Negotiation Details', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/negotiations/1');

      expect(res.status).toBe(401);
    });

    it('should return 404 if negotiation not found', async () => {
      const token = generateTestToken('user');
      const mockChain = createChainMock([]);
      mockDb.select.mockReturnValueOnce(mockChain);

      const res = await request(app)
        .get('/api/negotiations/999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return negotiation details', async () => {
      const token = generateTestToken('user');
      const details = {
        id: 1,
        productId: 1,
        productTitle: 'Vintage Jacket',
        originalPrice: '100.00',
        negotiatedPrice: '80.00',
        qty: 1,
        negotiationStatus: 'pending',
        negotiationNote: 'Is this okay?',
        userId: 2,
        userName: 'John Doe',
        userEmail: 'john@test.com',
        createdAt: '2026-05-11T10:00:00',
      };
      const mockChain = createChainMock([details]);
      mockDb.select.mockReturnValueOnce(mockChain);

      const res = await request(app)
        .get('/api/negotiations/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(details);
    });
  });
});
