const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle MongoDB validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(error => error.message)
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry',
      errors: Object.keys(err.keyPattern).map(key => `${key} already exists`)
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  // Handle custom errors
  if (err.custom) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    });
  }

  // Handle generic errors
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};

module.exports = errorHandler;
