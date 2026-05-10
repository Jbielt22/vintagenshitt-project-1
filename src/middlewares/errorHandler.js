/**
 * Global error handler middleware.
 * Must be registered after all routes.
 */
export function errorHandler(err, req, res, _next) {
  console.error('Unhandled Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Wraps an async route handler to catch errors and pass to next().
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}
