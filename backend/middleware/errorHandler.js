// ============================================================
// middleware/errorHandler.js — Global 404 + error handlers
// ============================================================

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, _next) {
  console.error(`[${req.method} ${req.originalUrl}]`, err);

  if (res.headersSent) return;

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  let message = err.message || "Internal server error";
  if (status >= 500 && isProd) {
    message = "Internal server error. Check server logs for details.";
  }

  res.status(status >= 400 && status < 600 ? status : 500).json({
    success: false,
    message
  });
}

module.exports = { notFoundHandler, errorHandler };
