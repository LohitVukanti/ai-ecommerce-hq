// ============================================================
// routes/integrations.js — Integration health + status endpoints
// ============================================================
// Exposes a single read-only endpoint the frontend uses to render
// the Integrations page. NEVER returns secret values.
// ============================================================

const express = require("express");
const router = express.Router();
const { getHealthReport } = require("../services/integrations/integrationHealthService");

// GET /api/integrations/status
router.get("/status", (_req, res) => {
  try {
    res.json({ success: true, data: getHealthReport() });
  } catch (error) {
    console.error("Error building integration status:", error);
    res.status(500).json({ success: false, message: "Failed to build integration status" });
  }
});

module.exports = router;
