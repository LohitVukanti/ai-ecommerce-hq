// ============================================================
// routes/ideas.js — Ideas / research intake API
// ============================================================
// Mounted at /api/ideas. Uses SQLite helpers from data/db.js.
// ============================================================

const express = require("express");
const router = express.Router();

const {
  getAllIdeas,
  getIdeaById,
  createIdea,
  updateIdea,
  deleteIdea,
  scoreIdea,
  convertIdeaToProduct
} = require("../data/db");

// ============================================================
// GET /api/ideas
// Optional query filters: sourcePlatform, decisionStatus, productType (substring match)
// ============================================================
router.get("/", (req, res) => {
  try {
    let ideas = getAllIdeas();
    const { sourcePlatform, decisionStatus, productType } = req.query;

    if (sourcePlatform && String(sourcePlatform).trim()) {
      const q = String(sourcePlatform).trim().toLowerCase();
      ideas = ideas.filter((i) => (i.sourcePlatform || "").toLowerCase().includes(q));
    }
    if (decisionStatus && String(decisionStatus).trim()) {
      const q = String(decisionStatus).trim();
      ideas = ideas.filter((i) => i.decisionStatus === q);
    }
    if (productType && String(productType).trim()) {
      const q = String(productType).trim().toLowerCase();
      ideas = ideas.filter((i) => (i.productType || "").toLowerCase().includes(q));
    }

    res.json({ success: true, data: ideas });
  } catch (error) {
    console.error("Error fetching ideas:", error);
    res.status(500).json({ success: false, message: "Failed to fetch ideas" });
  }
});

// ============================================================
// POST /api/ideas
// ============================================================
router.post("/", (req, res) => {
  try {
    const idea = createIdea(req.body || {});
    res.status(201).json({ success: true, data: idea });
  } catch (error) {
    console.error("Error creating idea:", error);
    const msg = error.message || "Failed to create idea";
    const status = msg.includes("required") ? 400 : 500;
    res.status(status).json({ success: false, message: msg });
  }
});

// ============================================================
// GET /api/ideas/:id
// ============================================================
router.get("/:id", (req, res) => {
  try {
    const idea = getIdeaById(req.params.id);
    if (!idea) {
      return res.status(404).json({ success: false, message: "Idea not found" });
    }
    res.json({ success: true, data: idea });
  } catch (error) {
    console.error("Error fetching idea:", error);
    res.status(500).json({ success: false, message: "Failed to fetch idea" });
  }
});

// ============================================================
// PUT /api/ideas/:id
// ============================================================
router.put("/:id", (req, res) => {
  try {
    const existing = getIdeaById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Idea not found" });
    }
    if (existing.convertedProductId) {
      return res.status(400).json({
        success: false,
        message: "Cannot edit an idea that was already converted to a product"
      });
    }

    const body = { ...(req.body || {}) };
    delete body.id;
    delete body.createdAt;

    const updated = updateIdea(req.params.id, body);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating idea:", error);
    res.status(500).json({ success: false, message: "Failed to update idea" });
  }
});

// ============================================================
// DELETE /api/ideas/:id
// ============================================================
router.delete("/:id", (req, res) => {
  try {
    const ok = deleteIdea(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Idea not found" });
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    console.error("Error deleting idea:", error);
    res.status(500).json({ success: false, message: "Failed to delete idea" });
  }
});

// ============================================================
// POST /api/ideas/:id/score
// Rule-based opportunity scoring (no external AI).
// ============================================================
router.post("/:id/score", (req, res) => {
  try {
    const updated = scoreIdea(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Idea not found" });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error scoring idea:", error);
    res.status(500).json({ success: false, message: "Failed to score idea" });
  }
});

// ============================================================
// POST /api/ideas/:id/convert-to-product
// Creates a row in the existing products table from this idea.
// ============================================================
router.post("/:id/convert-to-product", (req, res) => {
  try {
    const result = convertIdeaToProduct(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Idea not found" });
    }
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error converting idea:", error);
    if (error.code === "ALREADY_CONVERTED") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Failed to convert idea to product" });
  }
});

module.exports = router;
