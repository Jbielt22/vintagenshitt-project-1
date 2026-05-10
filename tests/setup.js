/**
 * Global test setup — provides common mocks and helpers.
 * All tests mock the db module to avoid hitting a real database.
 */

// Mock db helper: creates a chainable query builder mock
export function createMockQueryBuilder(returnValue = []) {
  const builder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnValue(returnValue),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnValue(returnValue),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };
  return builder;
}

// Create a mock response object
export function createMockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

// Create a mock request object
export function createMockReq(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { id: 1, email: 'test@test.com', role: 'user' },
    ...overrides,
  };
}

// Create a mock next function
export function createMockNext() {
  return jest.fn();
}
