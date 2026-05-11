import { jest } from '@jest/globals';

// Helper function to create a fully chainable mock
function createChainMock(resolveValue = []) {
  const chain = {};
  chain.from = jest.fn().mockReturnValue(chain);
  chain.leftJoin = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.set = jest.fn().mockReturnValue(chain);
  chain.returning = jest.fn().mockResolvedValue(resolveValue);
  chain.limit = jest.fn().mockResolvedValue(resolveValue);
  chain.values = jest.fn().mockReturnValue(chain);
  
  // Make the chain itself resolvable for when it's awaited
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

jest.unstable_mockModule('../../src/config/db/db.js', () => ({ db: mockDb }));
jest.unstable_mockModule('../../src/config/db/schema.js', () => ({
  carts: {
    id: 'id',
    userId: 'user_id',
    productId: 'product_id',
    qty: 'qty',
    negotiatedPrice: 'negotiated_price',
    negotiationStatus: 'negotiation_status',
    negotiationNote: 'negotiation_note',
    createdAt: 'created_at',
  },
  products: {
    id: 'id',
    title: 'title',
    price: 'price',
    quantity: 'quantity',
    imgUrl: 'img_url',
  },
  users: {
    id: 'id',
    name: 'name',
    email: 'email',
  },
}));
jest.unstable_mockModule('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
}));

const {
  getAllNegotiations,
  getUserNegotiations,
  submitNegotiation,
  approveNegotiation,
  rejectNegotiation,
  getNegotiationDetails,
} = await import('../../src/controllers/negotiation.controller.js');

describe('Negotiation Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      body: {},
      user: { id: 1, email: 'user@test.com', role: 'user' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getAllNegotiations', () => {
    it('should return all negotiations', async () => {
      const negotiations = [
        {
          id: 1,
          productId: 1,
          productTitle: 'Vintage Jacket',
          originalPrice: '100.00',
          negotiatedPrice: '80.00',
          qty: 1,
          negotiationStatus: 'pending',
          negotiationNote: 'Too expensive',
        },
      ];

      const mockChain = createChainMock(negotiations);
      mockDb.select.mockReturnValueOnce(mockChain);

      await getAllNegotiations(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 1,
        })
      );
    });

    it('should return empty array when no negotiations exist', async () => {
      const mockChain = createChainMock([]);
      mockDb.select.mockReturnValueOnce(mockChain);

      await getAllNegotiations(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
          count: 0,
        })
      );
    });
  });

  describe('getUserNegotiations', () => {
    it('should return user negotiations', async () => {
      const userNegotiations = [
        {
          id: 1,
          productId: 1,
          productTitle: 'Vintage Shirt',
          originalPrice: '50.00',
          negotiatedPrice: '40.00',
          qty: 2,
          negotiationStatus: 'pending',
          negotiationNote: 'Can you lower the price?',
        },
      ];

      const mockChain = createChainMock(userNegotiations);
      mockDb.select.mockReturnValueOnce(mockChain);

      await getUserNegotiations(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 1,
        })
      );
    });

    it('should return empty array for user with no negotiations', async () => {
      const mockChain = createChainMock([]);
      mockDb.select.mockReturnValueOnce(mockChain);

      await getUserNegotiations(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
          count: 0,
        })
      );
    });
  });

  describe('submitNegotiation', () => {
    it('should return 404 if cart item not found', async () => {
      req.body = {
        cartId: 999,
        negotiatedPrice: '30.00',
        negotiationNote: 'Too expensive',
      };

      const mockChain = createChainMock([]);
      mockDb.select.mockReturnValueOnce(mockChain);

      await submitNegotiation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('not found'),
        })
      );
    });

    it('should return 400 if negotiated price is not less than original', async () => {
      req.body = {
        cartId: 1,
        negotiatedPrice: '100.00',
        negotiationNote: 'Can we negotiate?',
      };

      // First select for cart item - return empty to simulate not found, but needs to check properly
      const mockChain1 = createChainMock([{ id: 1, productId: 1, userId: 1 }]);
      mockDb.select.mockReturnValueOnce(mockChain1);

      // Second select for product
      const mockChain2 = createChainMock([{ id: 1, price: '80.00' }]);
      mockDb.select.mockReturnValueOnce(mockChain2);

      await submitNegotiation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('must be less than'),
        })
      );
    });

    it('should submit negotiation successfully', async () => {
      req.body = {
        cartId: 1,
        negotiatedPrice: '40.00',
        negotiationNote: 'Is this your best price?',
      };

      // First select for cart item
      const mockChain1 = createChainMock([{ id: 1, productId: 1, userId: 1 }]);
      mockDb.select.mockReturnValueOnce(mockChain1);

      // Second select for product
      const mockChain2 = createChainMock([{ id: 1, price: '50.00' }]);
      mockDb.select.mockReturnValueOnce(mockChain2);

      // Update chain - return the updated object
      const updatedObj = {
        id: 1,
        userId: 1,
        productId: 1,
        negotiatedPrice: '40.00',
        negotiationStatus: 'pending',
        negotiationNote: 'Is this your best price?',
      };
      const mockChain3 = createChainMock([updatedObj]);
      mockDb.update.mockReturnValueOnce(mockChain3);

      await submitNegotiation(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('submitted successfully'),
        })
      );
    });
  });

  describe('approveNegotiation', () => {
    it('should return 404 if negotiation not found', async () => {
      req.params = { cartId: 999 };

      const mockChain = createChainMock([]);
      mockDb.select.mockReturnValueOnce(mockChain);

      await approveNegotiation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if negotiation is not pending', async () => {
      req.params = { cartId: 1 };

      const mockChain = createChainMock([
        { id: 1, negotiationStatus: 'accepted' },
      ]);
      mockDb.select.mockReturnValueOnce(mockChain);

      await approveNegotiation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Only pending'),
        })
      );
    });

    it('should approve negotiation successfully', async () => {
      req.params = { cartId: 1 };

      const mockChain1 = createChainMock([
        { id: 1, negotiationStatus: 'pending' },
      ]);
      mockDb.select.mockReturnValueOnce(mockChain1);

      const approvedObj = {
        id: 1,
        negotiationStatus: 'accepted',
        negotiatedPrice: '40.00',
      };
      const mockChain2 = createChainMock([approvedObj]);
      mockDb.update.mockReturnValueOnce(mockChain2);

      await approveNegotiation(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('approved'),
        })
      );
    });
  });

  describe('rejectNegotiation', () => {
    it('should return 404 if negotiation not found', async () => {
      req.params = { cartId: 999 };
      req.body = { adminNote: 'Price too low' };

      const mockChain = createChainMock([]);
      mockDb.select.mockReturnValueOnce(mockChain);

      await rejectNegotiation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if negotiation is not pending', async () => {
      req.params = { cartId: 1 };
      req.body = { adminNote: 'Already approved' };

      const mockChain = createChainMock([
        { id: 1, negotiationStatus: 'rejected' },
      ]);
      mockDb.select.mockReturnValueOnce(mockChain);

      await rejectNegotiation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject negotiation with admin note', async () => {
      req.params = { cartId: 1 };
      req.body = { adminNote: 'Price is firm' };

      const mockChain1 = createChainMock([
        {
          id: 1,
          negotiationStatus: 'pending',
          negotiationNote: 'User note',
        },
      ]);
      mockDb.select.mockReturnValueOnce(mockChain1);

      const rejectedObj = {
        id: 1,
        negotiationStatus: 'rejected',
        negotiationNote: 'Price is firm',
      };
      const mockChain2 = createChainMock([rejectedObj]);
      mockDb.update.mockReturnValueOnce(mockChain2);

      await rejectNegotiation(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('rejected'),
        })
      );
    });
  });

  describe('getNegotiationDetails', () => {
    it('should return 404 if negotiation not found', async () => {
      req.params = { cartId: 999 };

      const mockChain = createChainMock([]);
      mockDb.select.mockReturnValueOnce(mockChain);

      await getNegotiationDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return negotiation details', async () => {
      req.params = { cartId: 1 };
      const negotiationDetail = {
        id: 1,
        productId: 1,
        productTitle: 'Vintage Jacket',
        originalPrice: '100.00',
        negotiatedPrice: '75.00',
        qty: 1,
        negotiationStatus: 'pending',
        negotiationNote: 'Is this negotiable?',
        userId: 2,
        userName: 'John Doe',
        userEmail: 'john@test.com',
        createdAt: '2026-05-11T10:00:00',
      };

      const mockChain = createChainMock([negotiationDetail]);
      mockDb.select.mockReturnValueOnce(mockChain);

      await getNegotiationDetails(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: negotiationDetail,
        })
      );
    });
  });
});
