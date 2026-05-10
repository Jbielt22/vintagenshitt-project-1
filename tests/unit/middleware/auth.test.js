import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

// Must mock before importing
const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

const { authenticate, requireAdmin, requireUser } =
  await import('../../../src/middlewares/auth.js');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('authenticate', () => {
    it('should return 401 if no authorization header', () => {
      authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if header does not start with Bearer', () => {
      req.headers.authorization = 'Basic abc123';
      authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
      req.headers.authorization = 'Bearer invalidtoken';
      authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid or expired token.' })
      );
    });

    it('should attach user to req and call next on valid token', () => {
      const payload = { id: 1, email: 'test@test.com', role: 'user' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticate(req, res, next);

      expect(req.user).toEqual(expect.objectContaining(payload));
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should return 403 if user is not admin', () => {
      req.user = { id: 1, role: 'user' };
      requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user is admin', () => {
      req.user = { id: 1, role: 'admin' };
      requireAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if no user on req', () => {
      requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireUser', () => {
    it('should return 403 if user is admin', () => {
      req.user = { id: 1, role: 'admin' };
      requireUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should call next if user is user role', () => {
      req.user = { id: 1, role: 'user' };
      requireUser(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
