// ============================================================
// routes/trends.js — Trend Scanner intake API
// ============================================================
// Mounted at /api/trends. Uses SQLite helpers from data/db.js.
// Manual/assisted entry today; later swap convert-to-idea to use
// upstream trend providers without changing this contract.
// ============================================================

const express = require("express");
const router = express.Router();

const {
  getAllTrendScans,
  getTrendScanById,
  createTrendScan,
  updateTrendScan,
  deleteTrendScan,
  convertTrendScanToIdea
} = require("../data/db");

// ============================================================
// GET /api/trends
// Optional query filters: sourcePlatform, productType (substring match)
// ============================================================
router.get("/", (req, res) => {
  try {
    let scans = getAllTrendScans();
    const { sourcePlatform, productType } = req.query;

    if (sourcePlatform && String(sourcePlatform).trim()) {
      const q = String(sourcePlatform).trim().toLowerCase();
      scans = scans.filter((s) => (s.sourcePlatform || "").toLowerCase().includes(q));
    }
    if (productType && String(productType).trim()) {
      const q = String(productType).trim().toLowerCase();
      scans = scans.filter((s) => (s.productType || "").toLowerCase().includes(q));
    }

    res.json({ success: true, data: scans });
  } catch (error) {
    console.error("Error fetching trend scans:", error);
    res.status(500).json({ success: false, message: "Failed to fetch trend scans" });
  }
});

// ============================================================
// POST /api/trends
// ============================================================
router.post("/", (req, res) => {
  try {
    const scan = createTrendScan(req.body || {});
    res.status(201).json({ success: true, data: scan });
  } catch (error) {
    console.error("Error creating trend scan:", error);
    const msg = error.message || "Failed to create trend scan";
    const status = msg.includes("required") ? 400 : 500;
    res.status(status).json({ success: false, message: msg });
  }
});

// ============================================================
// GET /api/trends/:id
// ============================================================
router.get("/:id", (req, res) => {
  try {
    const scan = getTrendScanById(req.params.id);
    if (!scan) {
      return res.status(404).json({ success: false, message: "Trend scan not found" });
    }
    res.json({ success: true, data: scan });
  } catch (error) {
    console.error("Error fetching trend scan:", error);
    res.status(500).json({ success: false, message: "Failed to fetch trend scan" });
  }
});

// ============================================================
// PUT /api/trends/:id
// ============================================================
router.put("/:id", (req, res) => {
  try {
    const existing = getTrendScanById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Trend scan not found" });
    }
    if (existing.convertedIdeaId) {
      return res.status(400).json({
        success: false,
        message: "Cannot edit a trend scan that was already converted to an idea"
      });
    }

    const body = { ...(req.body || {}) };
    delete body.id;
    delete body.createdAt;
    delete body.convertedIdeaId;

    const updated = updateTrendScan(req.params.id, body);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating trend scan:", error);
    res.status(500).json({ success: false, message: "Failed to update trend scan" });
  }
});

// ============================================================
// DELETE /api/trends/:id
// ============================================================
router.delete("/:id", (req, res) => {
  try {
    const ok = deleteTrendScan(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Trend scan not found" });
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    console.error("Error deleting trend scan:", error);
    res.status(500).json({ success: false, message: "Failed to delete trend scan" });
  }
});

// ============================================================
// POST /api/trends/:id/convert-to-idea
// Creates a row in the existing ideas table from this trend scan.
// ============================================================
router.post("/:id/convert-to-idea", (req, res) => {
  try {
    const result = convertTrendScanToIdea(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Trend scan not found" });
    }
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error converting trend scan:", error);
    if (error.code === "ALREADY_CONVERTED") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Failed to convert trend scan to idea" });
  }
});

module.exports = router;
