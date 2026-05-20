// ============================================================
// middleware/apiSecretGate.js — Optional shared-secret protection
// ============================================================
// When API_SECRET is set on the backend, all /api/* routes (except
// health + Etsy OAuth callback) require X-Api-Key header.
// When unset, this middleware is a no-op — local dev unchanged.
// ============================================================

const PUBLIC_PATHS = new Set([
  "/api/health",
  "/api/etsy/auth/callback"
]);

function apiSecretGate(req, res, next) {
  const secret = (process.env.API_SECRET || "").trim();
  if (!secret) return next();

  const path = req.originalUrl.split("?")[0];
  if (PUBLIC_PATHS.has(path)) return next();

  const key =
    req.get("x-api-key") ||
    (req.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();

  if (key === secret) return next();

  return res.status(401).json({
    success: false,
    message: "Unauthorized — invalid or missing API key."
  });
}

module.exports = { apiSecretGate };
