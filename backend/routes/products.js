// ============================================================
// routes/products.js — Product API Routes
// ============================================================
// This file defines all the API endpoints for managing products.
// Each route handles a specific action (get, create, update, etc.)
//
// All routes are prefixed with /api/products (set in server.js)
// ============================================================

const express = require("express");
const router = express.Router();

// Import our database helper functions
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAnalyticsSummary
} = require("../data/db");

// Import our service files
const { generateProductContent } = require("../services/aiService");
const { createEtsyDraftListing } = require("../services/etsyService");

// ============================================================
// GET /api/products
// Returns all products (for the dashboard list/cards)
// ============================================================
router.get("/", (req, res) => {
  try {
    const products = getAllProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

// ============================================================
// POST /api/products
// Creates a new product idea
// Body: { title, description, category }
// ============================================================
router.post("/", (req, res) => {
  try {
    const { title, description, category } = req.body;

    // Validate required fields
    if (!title || title.trim() === "") {
      return res.status(400).json({ success: false, message: "Product title is required" });
    }

    const newProduct = createProduct({ title: title.trim(), description, category });
    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ success: false, message: "Failed to create product" });
  }
});

// ============================================================
// GET /api/products/analytics/summary
// Returns analytics summary for dashboard/reporting
// ============================================================
router.get("/analytics/summary", (req, res) => {
  try {
    const analytics = getAnalyticsSummary();
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error("Error fetching analytics summary:", error);
    res.status(500).json({ success: false, message: "Failed to fetch analytics summary" });
  }
});

// ============================================================
// GET /api/products/:id
// Returns a single product by ID (for the detail view)
// ============================================================
router.get("/:id", (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ success: false, message: "Failed to fetch product" });
  }
});

// ============================================================
// POST /api/products/:id/generate-ai
// Runs AI generation on a product and saves the results
// ============================================================
router.post("/:id/generate-ai", async (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    console.log(`🤖 Generating AI content for: "${product.title}"`);

    // Call our AI service (real or mock depending on API key)
    const aiData = await generateProductContent(product.title, product.description);

    // Determine new status based on what was generated
    // If we have a listing title + description, move to listing_generated
    // Otherwise just mark as researched
    const newStatus = aiData.etsyTitle ? "listing_generated" : "researched";

    // Save the AI data to our product
    const updatedProduct = updateProduct(req.params.id, {
      aiData,
      status: newStatus
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error generating AI content:", error);
    res.status(500).json({ success: false, message: "Failed to generate AI content" });
  }
});

// ============================================================
// POST /api/products/:id/approve
// Marks a product as approved and ready for Etsy
// ============================================================
router.post("/:id/approve", (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Can only approve products that have AI data
    if (!product.aiData) {
      return res.status(400).json({
        success: false,
        message: "Generate AI content first before approving"
      });
    }

    const updatedProduct = updateProduct(req.params.id, { status: "approved" });
    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error approving product:", error);
    res.status(500).json({ success: false, message: "Failed to approve product" });
  }
});

// ============================================================
// POST /api/products/:id/reject
// Marks a product as rejected
// ============================================================
router.post("/:id/reject", (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const updatedProduct = updateProduct(req.params.id, { status: "rejected" });
    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error rejecting product:", error);
    res.status(500).json({ success: false, message: "Failed to reject product" });
  }
});

// ============================================================
// POST /api/products/:id/create-etsy-draft
// Simulates (or actually creates) an Etsy draft listing
// ============================================================
router.post("/:id/create-etsy-draft", async (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Must be approved before creating an Etsy draft
    if (product.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Product must be approved before creating an Etsy draft"
      });
    }

    // Must have AI-generated listing data
    if (!product.aiData) {
      return res.status(400).json({
        success: false,
        message: "AI content must be generated before creating an Etsy draft"
      });
    }

    console.log(`🛍️  Creating Etsy draft for: "${product.title}"`);

    // Call our Etsy service (real or mock depending on credentials)
    const etsyDraft = await createEtsyDraftListing(product, product.aiData);

    // Save the Etsy draft info to our product
    const updatedProduct = updateProduct(req.params.id, {
      etsyDraft,
      status: "etsy_draft_created"
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error creating Etsy draft:", error);
    res.status(500).json({ success: false, message: "Failed to create Etsy draft" });
  }
});

// ============================================================
// DELETE /api/products/:id
// Deletes a product by ID
// ============================================================
router.delete("/:id", (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const deleted = deleteProduct(req.params.id);

    if (!deleted) {
      return res.status(500).json({ success: false, message: "Failed to delete product" });
    }

    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, message: "Failed to delete product" });
  }
});

module.exports = router;
