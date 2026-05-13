import { jest } from '@jest/globals';

const {
  validateBody,
  validateRegister,
  validateLogin,
  validateCheckout,
  validateCartItem,
} = await import('../../../src/middlewares/validate.js');

describe('Validate Middleware', () => {
  let res, next;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('validateBody factory', () => {
    const validator = validateBody({
      name: { required: true, type: 'string', minLength: 2, maxLength: 50 },
      age: { required: false, type: 'number', min: 0 },
      role: { required: true, type: 'string', enum: ['admin', 'user'] },
    });

    it('should call next when all validations pass', () => {
      const req = { body: { name: 'John', age: 25, role: 'user' } };
      validator(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 when required field is missing', () => {
      const req = { body: { age: 25, role: 'user' } };
      validator(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining(['name is required.']),
        })
      );
    });

    it('should return 400 when type is wrong', () => {
      const req = { body: { name: 'John', age: 'not-a-number', role: 'user' } };
      validator(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining(['age must be of type number.']),
        })
      );
    });

    it('should return 400 when string is too short', () => {
      const req = { body: { name: 'J', role: 'user' } };
      validator(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when enum value is invalid', () => {
      const req = { body: { name: 'John', role: 'superadmin' } };
      validator(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining(['role must be one of: admin, user.']),
        })
      );
    });

    it('should skip optional fields when not provided', () => {
      const req = { body: { name: 'John', role: 'admin' } };
      validator(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 when number is below min', () => {
      const req = { body: { name: 'John', age: -1, role: 'user' } };
      validator(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateRegister', () => {
    it('should pass with valid data', () => {
      const req = {
        body: { email: 'a@b.com', password: '123456', name: 'Test' },
      };
      validateRegister(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail with short password', () => {
      const req = { body: { email: 'a@b.com', password: '123', name: 'Test' } };
      validateRegister(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateLogin', () => {
    it('should pass with email and password', () => {
      const req = { body: { email: 'a@b.com', password: 'test' } };
      validateLogin(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail without email', () => {
      const req = { body: { password: 'test' } };
      validateLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateCheckout', () => {
    it('should pass with valid payment method and address', () => {
      const req = {
        body: { paymentMethod: 'qris', shippingAddress: '123 Street' },
      };
      validateCheckout(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail with invalid payment method', () => {
      const req = {
        body: { paymentMethod: 'bitcoin', shippingAddress: '123 Street' },
      };
      validateCheckout(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateCartItem', () => {
    it('should pass with valid productId and qty', () => {
      const req = { body: { productId: 1, qty: 2 } };
      validateCartItem(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail with missing productId', () => {
      const req = { body: { qty: 2 } };
      validateCartItem(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
