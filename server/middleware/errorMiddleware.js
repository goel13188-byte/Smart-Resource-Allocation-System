function errorMiddleware(err, req, res, next) {
  console.error('Server error:', err);

  const status = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';

  res.status(status).json({
    success: false,
    message,
  });
}

module.exports = errorMiddleware;
