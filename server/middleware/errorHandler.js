
function errorHandler(err, req, res, next) {
  // If the response has already started, let Express
  // handle the error using its default behavior.
  if (res.headersSent) {
    return next(err);
  }

  // Log unexpected server errors for debugging.
  if (!err.status && !err.statusCode) {
    console.error(err);
  }

  // Handle invalid JSON sent in a request body.
  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    'body' in err
  ) {
    return res.status(400).json({
      message: 'Invalid JSON in request body.',
    });
  }

  // Handle invalid MongoDB document IDs.
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid resource ID.',
    });
  }

  // Handle duplicate values, such as an existing SKU.
  if (err.code === 11000) {
    return res.status(409).json({
      message: 'A record with that value already exists.',
    });
  }

  // Handle Mongoose schema validation errors.
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: err.message,
    });
  }

  // Use the status supplied by our service when valid.
  const status = err.status || err.statusCode || 500;

  const safeStatus =
    Number.isInteger(status) &&
    status >= 400 &&
    status <= 599
      ? status
      : 500;

  return res.status(safeStatus).json({
    message:
      safeStatus === 500
        ? 'Internal server error.'
        : err.message,
  });
}

module.exports = errorHandler;
