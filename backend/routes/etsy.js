// ============================================================
// routes/etsy.js — Etsy OAuth v3 (PKCE) endpoints
// ============================================================
// Routes:
//   GET /api/etsy/status         → public health (no secrets)
//   GET /api/etsy/auth/start     → 302 to Etsy OAuth consent
//   GET /api/etsy/auth/callback  → token exchange + persist + UI redirect
//
// The callback redirects the user's browser back to the frontend
// (CLIENT_ORIGIN, falling back to "/") with a query flag the
// Integrations page can pick up to refresh status.
// ============================================================

const express = require("express");
const router = express.Router();
const etsy = require("../services/integrations/etsyIntegrationService");

// GET /api/etsy/status
router.get("/status", (_req, res) => {
  res.json({ success: true, data: etsy.getHealthReport() });
});

// GET /api/etsy/auth/start
router.get("/auth/start", (req, res) => {
  try {
    const { url } = etsy.buildAuthStartUrl();
    res.redirect(302, url);
  } catch (e) {
    console.error("Etsy OAuth start failed:", e.message);
    res.status(400).send(
      `<html><body style="font-family:system-ui;padding:32px;background:#0d1117;color:#e6edf3;">` +
      `<h2>Etsy connection not configured</h2><p>${e.message}</p>` +
      `</body></html>`
    );
  }
});

// GET /api/etsy/auth/callback?code=...&state=...
router.get("/auth/callback", async (req, res) => {
  const { code, state, error: errParam, error_description } = req.query;
  const clientOrigin = (process.env.CLIENT_ORIGIN || "").split(",")[0].trim();
  const redirectBase = clientOrigin || "/";

  if (errParam) {
    return res.redirect(
      302,
      `${redirectBase}?etsy_oauth=error&reason=${encodeURIComponent(error_description || errParam)}`
    );
  }
  if (!code || !state) {
    return res.redirect(302, `${redirectBase}?etsy_oauth=error&reason=missing_code_or_state`);
  }

  try {
    await etsy.exchangeCodeForToken(code, state);
    return res.redirect(302, `${redirectBase}?etsy_oauth=success`);
  } catch (e) {
    console.error("Etsy OAuth callback failed:", e.message);
    return res.redirect(
      302,
      `${redirectBase}?etsy_oauth=error&reason=${encodeURIComponent(e.message)}`
    );
  }
});

module.exports = router;
