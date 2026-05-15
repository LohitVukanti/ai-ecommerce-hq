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
const { generateProductContent }    = require("../services/aiService");
const { createEtsyDraftListing }    = require("../services/etsyService");
// NEW: Digital product generator — no AI API required, fully template-based
const { generateDigitalProduct }    = require("../services/digitalProductService");
const {
  generatePodConcepts,
  buildPodListingFromConcept,
  buildPodPrepFromConcept
} = require("../services/podConceptService");
const { buildDesignPackage } = require("../services/designPackageService");

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
// POST /api/products/:id/generate-digital-product
// ============================================================
// Generates a real downloadable CSV file for this product using
// a template matched to the product's title and category keywords.
//
// No OpenAI or paid API is used — all generation is local.
// The file is saved to backend/generated-products/ which is
// served statically by Express under /downloads/*.
//
// Metadata (filename, type, url, createdAt) is appended to
// product.generatedFiles in SQLite so it survives restarts.
//
// Multiple calls are supported — each generates a new file and
// appends a new entry to generatedFiles.
// ============================================================
router.post("/:id/generate-digital-product", async (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    console.log(`📄 Generating digital product CSV for: "${product.title}"`);

    // Generate the CSV and write it to disk.
    // generateDigitalProduct() returns metadata — it does NOT call any API.
    const fileMetadata = generateDigitalProduct(product);

    // Append the new file metadata to the product's existing generatedFiles array.
    // This preserves any previously generated files.
    const existingFiles = Array.isArray(product.generatedFiles) ? product.generatedFiles : [];
    const updatedFiles  = [...existingFiles, fileMetadata];

    // Persist the updated generatedFiles list to SQLite
    const updatedProduct = updateProduct(req.params.id, {
      generatedFiles: updatedFiles
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error generating digital product:", error);
    res.status(500).json({ success: false, message: "Failed to generate digital product" });
  }
});

// ============================================================
// POST /api/products/:id/generate-concepts
// POD design concepts (template-based; persists generatedConcepts)
// ============================================================
router.post("/:id/generate-concepts", (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const { concepts } = generatePodConcepts(product);
    const updatedProduct = updateProduct(req.params.id, {
      generatedConcepts: concepts,
      selectedConceptId: null,
      listingData: null,
      podPrep: null,
      designPackage: null
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error generating POD concepts:", error);
    res.status(500).json({ success: false, message: "Failed to generate design concepts" });
  }
});

// ============================================================
// POST /api/products/:id/select-concept
// Body: { conceptId: string }
// ============================================================
router.post("/:id/select-concept", (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const { conceptId } = req.body || {};
    const list = Array.isArray(product.generatedConcepts) ? product.generatedConcepts : [];
    const found = list.find((c) => c.id === conceptId);

    if (!conceptId || !found) {
      return res.status(400).json({ success: false, message: "Valid conceptId is required" });
    }

    if (found.conceptStatus === "rejected") {
      return res.status(400).json({ success: false, message: "Cannot select a rejected concept" });
    }

    const next = list.map((c) => {
      if (c.id === conceptId) return { ...c, conceptStatus: "selected" };
      if (c.conceptStatus === "rejected") return c;
      return { ...c, conceptStatus: "generated" };
    });

    let podPrep = product.podPrep;
    let designPackage = product.designPackage;
    if (product.podPrep && product.podPrep.selectedConceptId !== conceptId) {
      podPrep = null;
      designPackage = null;
    }

    const updatedProduct = updateProduct(req.params.id, {
      generatedConcepts: next,
      selectedConceptId: conceptId,
      podPrep,
      designPackage
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error selecting concept:", error);
    res.status(500).json({ success: false, message: "Failed to select concept" });
  }
});

// ============================================================
// POST /api/products/:id/reject-concept
// Body: { conceptId: string } — persists rejection on the concept card
// ============================================================
router.post("/:id/reject-concept", (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const { conceptId } = req.body || {};
    const list = Array.isArray(product.generatedConcepts) ? product.generatedConcepts : [];
    const found = list.find((c) => c.id === conceptId);

    if (!conceptId || !found) {
      return res.status(400).json({ success: false, message: "Valid conceptId is required" });
    }

    const next = list.map((c) =>
      c.id === conceptId ? { ...c, conceptStatus: "rejected" } : c
    );
    let selectedConceptId = product.selectedConceptId;
    let podPrep = product.podPrep;
    let designPackage = product.designPackage;
    if (selectedConceptId === conceptId) {
      selectedConceptId = null;
      podPrep = null;
      designPackage = null;
    }

    const updatedProduct = updateProduct(req.params.id, {
      generatedConcepts: next,
      selectedConceptId,
      podPrep,
      designPackage
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error rejecting concept:", error);
    res.status(500).json({ success: false, message: "Failed to reject concept" });
  }
});

// ============================================================
// POST /api/products/:id/generate-listing
// Optional body: { conceptId } — defaults to selectedConceptId
// Persists listingData from the chosen concept (separate from aiData)
// ============================================================
router.post("/:id/generate-listing", (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const list = Array.isArray(product.generatedConcepts) ? product.generatedConcepts : [];
    const bodyConceptId = req.body && req.body.conceptId;
    const targetId = bodyConceptId || product.selectedConceptId;
    const concept = list.find((c) => c.id === targetId);

    if (!concept) {
      return res.status(400).json({
        success: false,
        message: "Select a concept first, or pass conceptId in the request body"
      });
    }

    if (concept.conceptStatus === "rejected") {
      return res.status(400).json({ success: false, message: "Cannot build listing from a rejected concept" });
    }

    const listingData = buildPodListingFromConcept(product, concept);
    const updatedProduct = updateProduct(req.params.id, { listingData, designPackage: null });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error generating POD listing:", error);
    res.status(500).json({ success: false, message: "Failed to generate listing" });
  }
});

// ============================================================
// POST /api/products/:id/generate-pod-prep
// Printify-oriented prep (template) — requires a selected concept
// ============================================================
router.post("/:id/generate-pod-prep", (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const selectedId = product.selectedConceptId;
    if (!selectedId) {
      return res.status(400).json({
        success: false,
        message:
          "Select a concept first (use “Select” on a concept card), then generate POD prep for that direction."
      });
    }

    const list = Array.isArray(product.generatedConcepts) ? product.generatedConcepts : [];
    const concept = list.find((c) => c.id === selectedId);

    if (!concept) {
      return res.status(400).json({
        success: false,
        message:
          "Selected concept not found. Regenerate concepts or pick a valid concept, then try again."
      });
    }

    if (concept.conceptStatus === "rejected") {
      return res.status(400).json({
        success: false,
        message: "The selected concept is rejected. Select another concept before POD prep."
      });
    }

    const podPrep = buildPodPrepFromConcept(product, concept);
    const updatedProduct = updateProduct(req.params.id, { podPrep, designPackage: null });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error generating POD prep:", error);
    res.status(500).json({ success: false, message: "Failed to generate POD prep" });
  }
});

// ============================================================
// POST /api/products/:id/generate-design-package
// Template prompts + social + export spec — requires concept + listing + POD prep
// ============================================================
router.post("/:id/generate-design-package", (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const selectedId = product.selectedConceptId;
    if (!selectedId) {
      return res.status(400).json({
        success: false,
        message:
          "Select a concept first. Then generate POD listing and POD prep before creating a design package."
      });
    }

    const list = Array.isArray(product.generatedConcepts) ? product.generatedConcepts : [];
    const concept = list.find((c) => c.id === selectedId);

    if (!concept || concept.conceptStatus === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Selected concept is missing or rejected. Select a valid concept and try again."
      });
    }

    const listingData = product.listingData;
    if (!listingData || typeof listingData !== "object" || !listingData.etsyTitle) {
      return res.status(400).json({
        success: false,
        message:
          "Generate POD listing first (listing preview), then continue — the design package uses listing copy and tags."
      });
    }

    const podPrep = product.podPrep;
    if (!podPrep || typeof podPrep !== "object" || !podPrep.id) {
      return res.status(400).json({
        success: false,
        message:
          "Generate POD prep first — the design package aligns print areas, costs, and fulfillment notes with mockup prompts."
      });
    }

    if (podPrep.selectedConceptId && podPrep.selectedConceptId !== selectedId) {
      return res.status(400).json({
        success: false,
        message: "POD prep is for a different concept. Regenerate POD prep for your current selection."
      });
    }

    if (listingData.fromConceptId && listingData.fromConceptId !== selectedId) {
      return res.status(400).json({
        success: false,
        message: "Listing was built for a different concept. Regenerate listing for the selected concept."
      });
    }

    const designPackage = buildDesignPackage(product, concept, listingData, podPrep);
    const updatedProduct = updateProduct(req.params.id, { designPackage });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error generating design package:", error);
    res.status(500).json({ success: false, message: "Failed to generate design package" });
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
