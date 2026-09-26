// Central error handler. Every route wraps its logic in a try/catch (or uses
// the asyncHandler helper below) and calls next(err) — this is the only
// place that turns an internal error into an HTTP response, which keeps
// error shape consistent across the whole API.

const STATUS_BY_CODE = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  INVALID_TRANSITION: 409,
  CAPACITY_EXCEEDED: 409,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
};

function errorHandler(err, req, res, next) {
  const status = STATUS_BY_CODE[err.code] || err.status || 500;
  if (status === 500) {
    // eslint-disable-next-line no-console
    console.error("Unhandled error:", err);
  }
  res.status(status).json({ error: err.message || "Internal server error" });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
