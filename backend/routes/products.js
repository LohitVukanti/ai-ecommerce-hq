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
// NEW: Digital product generator — no AI API required, fully template-based
const { generateDigitalProduct }    = require("../services/digitalProductService");
const {
  generatePodConcepts,
  generatePodConceptsAsync,
  buildPodListingFromConcept,
  buildPodListingFromConceptAsync,
  buildPodPrepFromConcept
} = require("../services/podConceptService");
const {
  buildDesignPackage,
  buildDesignPackageAsync
} = require("../services/designPackageService");
const { buildPrintifyPreview } = require("../services/printifyPreviewService");
const { buildArtworkPrep } = require("../services/artworkPrepService");
const {
  ARTWORK_DIR,
  ALLOWED_MIME_TYPES,
  ALLOWED_TYPES: ARTWORK_ALLOWED_TYPES,
  MAX_UPLOAD_BYTES,
  addItem,
  updateItemStatus,
  setPrimary,
  removeItem,
  deriveArtworkStatus,
  stripPrepKeepItems,
  buildNewItem,
  tryDeleteFile,
  getItems,
  resolveDiskPath: resolveArtworkDiskPath
} = require("../services/artworkAssetService");

// Integration services (mock-safe by default; live mode opt-in via env flags)
const imageGenService = require("../services/integrations/imageGenerationService");
const printifyIntegration = require("../services/integrations/printifyIntegrationService");
const etsyIntegration = require("../services/integrations/etsyIntegrationService");

// ---- Multer setup for artwork uploads ----
// We accept ONE file per request under field name `file`. The file is
// first written to a multer-generated temp name inside ARTWORK_DIR,
// then renamed by buildNewItem() to `<productId>_<assetId>_<orig>`
// for stable URLs and easy cleanup.
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const artworkUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(ARTWORK_DIR)) fs.mkdirSync(ARTWORK_DIR, { recursive: true });
      cb(null, ARTWORK_DIR);
    },
    filename: (_req, file, cb) => {
      // Temporary collision-proof name; renamed by buildNewItem().
      cb(null, `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${path.basename(file.originalname || "asset")}`);
    }
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has((file.mimetype || "").toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Use PNG, JPEG, WEBP, GIF, or SVG.`));
    }
  }
});

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
router.post("/:id/generate-concepts", async (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const { concepts } = await generatePodConceptsAsync(product);
    const carriedArtwork = stripPrepKeepItems(product.artworkAssets);
    const updatedProduct = updateProduct(req.params.id, {
      generatedConcepts: concepts,
      selectedConceptId: null,
      listingData: null,
      podPrep: null,
      designPackage: null,
      printifyPreview: null,
      artworkStatus: deriveArtworkStatus(carriedArtwork),
      artworkAssets: carriedArtwork
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
    let printifyPreview = product.printifyPreview;
    let artworkAssets = product.artworkAssets;
    if (product.podPrep && product.podPrep.selectedConceptId !== conceptId) {
      podPrep = null;
      designPackage = null;
      printifyPreview = null;
      artworkAssets = stripPrepKeepItems(artworkAssets);
    }

    const updatedProduct = updateProduct(req.params.id, {
      generatedConcepts: next,
      selectedConceptId: conceptId,
      podPrep,
      designPackage,
      printifyPreview,
      artworkStatus: deriveArtworkStatus(artworkAssets),
      artworkAssets
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
    let printifyPreview = product.printifyPreview;
    let artworkAssets = product.artworkAssets;
    if (selectedConceptId === conceptId) {
      selectedConceptId = null;
      podPrep = null;
      designPackage = null;
      printifyPreview = null;
      artworkAssets = stripPrepKeepItems(artworkAssets);
    }

    const updatedProduct = updateProduct(req.params.id, {
      generatedConcepts: next,
      selectedConceptId,
      podPrep,
      designPackage,
      printifyPreview,
      artworkStatus: deriveArtworkStatus(artworkAssets),
      artworkAssets
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
router.post("/:id/generate-listing", async (req, res) => {
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

    const listingData = await buildPodListingFromConceptAsync(product, concept);
    const carriedArtwork = stripPrepKeepItems(product.artworkAssets);
    const updatedProduct = updateProduct(req.params.id, {
      listingData,
      designPackage: null,
      printifyPreview: null,
      artworkStatus: deriveArtworkStatus(carriedArtwork),
      artworkAssets: carriedArtwork
    });

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
    const carriedArtwork = stripPrepKeepItems(product.artworkAssets);
    const updatedProduct = updateProduct(req.params.id, {
      podPrep,
      designPackage: null,
      printifyPreview: null,
      artworkStatus: deriveArtworkStatus(carriedArtwork),
      artworkAssets: carriedArtwork
    });

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
router.post("/:id/generate-design-package", async (req, res) => {
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

    const designPackage = await buildDesignPackageAsync(product, concept, listingData, podPrep);
    const carriedArtwork = stripPrepKeepItems(product.artworkAssets);
    const updatedProduct = updateProduct(req.params.id, {
      designPackage,
      printifyPreview: null,
      artworkStatus: deriveArtworkStatus(carriedArtwork),
      artworkAssets: carriedArtwork
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error generating design package:", error);
    res.status(500).json({ success: false, message: "Failed to generate design package" });
  }
});

// ============================================================
// POST /api/products/:id/generate-printify-preview
// Pure template (no Printify API, no OpenAI). Requires selected
// concept + POD prep + listing. designPackage is optional but
// improves the payload preview.
// ============================================================
router.post("/:id/generate-printify-preview", (req, res) => {
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
          "Select a concept first. Then generate POD listing and POD prep before previewing the Printify draft."
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

    const podPrep = product.podPrep;
    if (!podPrep || typeof podPrep !== "object" || !podPrep.id) {
      return res.status(400).json({
        success: false,
        message:
          "Generate POD prep first — the Printify preview uses its cost, retail, placement, and risk fields."
      });
    }

    if (podPrep.selectedConceptId && podPrep.selectedConceptId !== selectedId) {
      return res.status(400).json({
        success: false,
        message: "POD prep is for a different concept. Regenerate POD prep for your current selection."
      });
    }

    const listingData = product.listingData;
    if (!listingData || typeof listingData !== "object" || !listingData.etsyTitle) {
      return res.status(400).json({
        success: false,
        message:
          "Generate POD listing first — the Printify payload uses listing title, tags, and description."
      });
    }

    if (listingData.fromConceptId && listingData.fromConceptId !== selectedId) {
      return res.status(400).json({
        success: false,
        message: "Listing was built for a different concept. Regenerate listing for the selected concept."
      });
    }

    const designPackage =
      product.designPackage &&
      product.designPackage.selectedConceptId === selectedId
        ? product.designPackage
        : null;

    const printifyPreview = buildPrintifyPreview(
      product,
      concept,
      podPrep,
      listingData,
      designPackage
    );
    const carriedArtwork = stripPrepKeepItems(product.artworkAssets);
    const updatedProduct = updateProduct(req.params.id, {
      printifyPreview,
      artworkStatus: deriveArtworkStatus(carriedArtwork),
      artworkAssets: carriedArtwork
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error generating Printify preview:", error);
    res.status(500).json({ success: false, message: "Failed to generate Printify preview" });
  }
});

// ============================================================
// POST /api/products/:id/prepare-artwork
// Pure template (no image APIs, no OpenAI). Builds an artwork
// brief + negative prompt + canvas / file specs from the
// selected concept and POD prep. Listing / design package /
// Printify preview enrich the output when present.
// ============================================================
router.post("/:id/prepare-artwork", (req, res) => {
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
          "Select a concept first. Then generate POD prep before preparing artwork."
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

    const podPrep = product.podPrep;
    if (!podPrep || typeof podPrep !== "object" || !podPrep.id) {
      return res.status(400).json({
        success: false,
        message:
          "Generate POD prep first — the artwork brief uses its placement, color, and print-area fields."
      });
    }

    if (podPrep.selectedConceptId && podPrep.selectedConceptId !== selectedId) {
      return res.status(400).json({
        success: false,
        message: "POD prep is for a different concept. Regenerate POD prep for your current selection."
      });
    }

    // Optional enrichers — only use when they belong to the same selected concept.
    const listingData =
      product.listingData &&
      (!product.listingData.fromConceptId || product.listingData.fromConceptId === selectedId)
        ? product.listingData
        : null;

    const designPackage =
      product.designPackage && product.designPackage.selectedConceptId === selectedId
        ? product.designPackage
        : null;

    // Printify preview uses `sourceConceptId` (see printifyPreviewService.js).
    const printifyPreview =
      product.printifyPreview && product.printifyPreview.sourceConceptId === selectedId
        ? product.printifyPreview
        : null;

    const newPrep = buildArtworkPrep(
      product,
      concept,
      podPrep,
      listingData,
      designPackage,
      printifyPreview
    );

    // Merge new prep on top of existing artwork — preserves uploaded items.
    const existingItems = getItems(product.artworkAssets);
    const artworkAssets = { ...newPrep, items: existingItems };

    const updatedProduct = updateProduct(req.params.id, {
      artworkStatus: deriveArtworkStatus(artworkAssets),
      artworkAssets
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error preparing artwork:", error);
    res.status(500).json({ success: false, message: "Failed to prepare artwork" });
  }
});

// ============================================================
// POST /api/products/:id/upload-artwork  (multipart)
// Form fields:
//   file        — REQUIRED. PNG / JPEG / WEBP / GIF / SVG. Max 20 MB.
//   type        — optional: "uploaded" (default) | "manual" | "generated" | "mockup"
//   isPrimary   — optional: "true" to flag this asset as the primary
// No image-generation API is used; this just stores the file locally.
// ============================================================
router.post(
  "/:id/upload-artwork",
  // Wrap multer so we can translate its errors into JSON 400s.
  (req, res, next) => {
    artworkUpload.single("file")(req, res, (err) => {
      if (err) {
        const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({
          success: false,
          message: err.message || "Upload failed"
        });
      }
      next();
    });
  },
  (req, res) => {
    const productId = req.params.id;
    const product = getProductById(productId);

    if (!product) {
      // Clean the partial upload to avoid orphan files.
      if (req.file && req.file.path) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Send a multipart/form-data request with a 'file' field."
      });
    }

    try {
      const requestedType = (req.body && req.body.type) || "uploaded";
      const requestedPrimary =
        (req.body && (req.body.isPrimary === "true" || req.body.isPrimary === true)) === true;

      const newItem = buildNewItem({
        productId,
        type: ARTWORK_ALLOWED_TYPES.has(requestedType) ? requestedType : "uploaded",
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        diskPath: req.file.path,
        sourceConceptId: product.selectedConceptId || null,
        requestedPrimary
      });

      const nextArtwork = addItem(product.artworkAssets, newItem);
      const updatedProduct = updateProduct(productId, {
        artworkStatus: deriveArtworkStatus(nextArtwork),
        artworkAssets: nextArtwork
      });

      res.json({ success: true, data: updatedProduct });
    } catch (error) {
      console.error("Error storing artwork upload:", error);
      // Best-effort: remove the partial file if rename or DB write failed.
      if (req.file && req.file.path) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      res.status(500).json({ success: false, message: "Failed to save uploaded artwork" });
    }
  }
);

// ============================================================
// POST /api/products/:id/artwork/:assetId/approve
// POST /api/products/:id/artwork/:assetId/reject
// (status enum: "draft" | "approved" | "rejected")
// ============================================================
function applyArtworkStatusRoute(targetStatus) {
  return (req, res) => {
    try {
      const product = getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const nextArtwork = updateItemStatus(product.artworkAssets, req.params.assetId, targetStatus);
      if (!nextArtwork) {
        return res.status(404).json({ success: false, message: "Artwork asset not found" });
      }

      const updatedProduct = updateProduct(req.params.id, {
        artworkStatus: deriveArtworkStatus(nextArtwork),
        artworkAssets: nextArtwork
      });
      res.json({ success: true, data: updatedProduct });
    } catch (error) {
      console.error(`Error setting artwork status to ${targetStatus}:`, error);
      res.status(500).json({ success: false, message: `Failed to ${targetStatus} artwork` });
    }
  };
}

router.post("/:id/artwork/:assetId/approve", applyArtworkStatusRoute("approved"));
router.post("/:id/artwork/:assetId/reject", applyArtworkStatusRoute("rejected"));

// ============================================================
// POST /api/products/:id/artwork/:assetId/set-primary
// Promotes an asset to the primary artwork (demotes the rest).
// ============================================================
router.post("/:id/artwork/:assetId/set-primary", (req, res) => {
  try {
    const product = getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const nextArtwork = setPrimary(product.artworkAssets, req.params.assetId);
    if (!nextArtwork) {
      return res.status(404).json({ success: false, message: "Artwork asset not found" });
    }

    const updatedProduct = updateProduct(req.params.id, {
      artworkStatus: deriveArtworkStatus(nextArtwork),
      artworkAssets: nextArtwork
    });
    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error setting primary artwork:", error);
    res.status(500).json({ success: false, message: "Failed to set primary artwork" });
  }
});

// ============================================================
// DELETE /api/products/:id/artwork/:assetId
// Removes the record AND the underlying file on disk.
// ============================================================
router.delete("/:id/artwork/:assetId", (req, res) => {
  try {
    const product = getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const result = removeItem(product.artworkAssets, req.params.assetId);
    if (!result) {
      return res.status(404).json({ success: false, message: "Artwork asset not found" });
    }

    // Delete the file from disk *before* updating the DB so a partial
    // failure leaves the DB record pointing to a file that still exists.
    tryDeleteFile(result.removed);

    const updatedProduct = updateProduct(req.params.id, {
      artworkStatus: deriveArtworkStatus(result.next),
      artworkAssets: result.next
    });
    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error deleting artwork asset:", error);
    res.status(500).json({ success: false, message: "Failed to delete artwork asset" });
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
// Always creates a simulated Etsy draft (mock) via the integration
// layer — never calls the live Etsy API, even when configured.
// Use create-real-etsy-draft for live mode when ENABLE_REAL_ETSY=true.
// ============================================================
router.post("/:id/create-etsy-draft", async (req, res) => {
  try {
    const product = getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Product must be approved before creating an Etsy draft"
      });
    }

    if (!product.aiData) {
      return res.status(400).json({
        success: false,
        message: "AI content must be generated before creating an Etsy draft"
      });
    }

    console.log(`🛍️  Creating simulated Etsy draft (mock) for: "${product.title}"`);

    const etsyDraft = await etsyIntegration.createDraftListing({
      product,
      listingData: product.listingData,
      aiData: product.aiData,
      printifyProduct: product.printifyProduct,
      forceMock: true
    });

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
// POST /api/products/:id/generate-artwork-image
// Generates an artwork image using the prepared brief and adds
// it to artworkAssets.items[] as type="generated".
//
// Requires:
//   - artworkAssets.artworkPrompt present (run prepare-artwork first)
//
// Mode behavior:
//   - mock (default): writes a deterministic SVG placeholder; never fails.
//   - live (ENABLE_REAL_IMAGE_GENERATION=true + OPENAI_API_KEY): calls
//     the configured image provider and writes the returned PNG.
//
// Either way the new asset starts as status="draft" and shows up
// alongside any uploaded items — approve / reject / set-primary
// via the existing artwork asset routes.
// ============================================================
const fsForImageGen = require("fs");
const pathForImageGen = require("path");

router.post("/:id/generate-artwork-image", async (req, res) => {
  try {
    const product = getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const artworkAssets = product.artworkAssets;
    if (!artworkAssets || !artworkAssets.artworkPrompt) {
      return res.status(400).json({
        success: false,
        message:
          "Prepare the artwork brief first. Run POST /api/products/:id/prepare-artwork before generating an image."
      });
    }

    const mode = imageGenService.getMode();
    console.log(`🎨 Generating artwork image (${mode}) for product ${req.params.id}`);

    let imgResult;
    try {
      imgResult = await imageGenService.generateArtworkImage({
        prompt: artworkAssets.artworkPrompt,
        negativePrompt: artworkAssets.negativePrompt || "",
        recommendedCanvasSize: artworkAssets.recommendedCanvasSize || "",
        transparentBackground: Boolean(artworkAssets.transparentBackgroundRequired),
        productId: req.params.id
      });
    } catch (genErr) {
      // Live-mode failure surfaces as 502 — mock mode never throws.
      console.error("Image generation failed:", genErr.message);
      return res.status(502).json({
        success: false,
        message: `Image generation failed: ${genErr.message}. ` +
          `Set ENABLE_REAL_IMAGE_GENERATION=false to use the mock placeholder.`
      });
    }

    // Write the buffer to a temp path inside ARTWORK_DIR, then let
    // buildNewItem rename it into the canonical <productId>_<assetId>_<orig>
    // form. We use a unique temp name so multiple parallel requests
    // don't collide.
    if (!fsForImageGen.existsSync(ARTWORK_DIR)) {
      fsForImageGen.mkdirSync(ARTWORK_DIR, { recursive: true });
    }
    const tempName = `imggen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${imgResult.originalFileName || "artwork.png"}`;
    const tempPath = pathForImageGen.join(ARTWORK_DIR, tempName);
    fsForImageGen.writeFileSync(tempPath, imgResult.buffer);

    let newItem;
    try {
      newItem = buildNewItem({
        productId: req.params.id,
        type: "generated",
        fileName: imgResult.originalFileName || "artwork.png",
        mimeType: imgResult.mimeType,
        sizeBytes: imgResult.buffer.length,
        diskPath: tempPath,
        sourceConceptId: product.selectedConceptId || null,
        requestedPrimary: false
      });
    } catch (e) {
      // Best-effort cleanup if we wrote the temp file but can't register it.
      try { fsForImageGen.unlinkSync(tempPath); } catch (_) {}
      throw e;
    }

    // SVG dimensions aren't readable by image-size; patch them in from the
    // provider when available so the UI can show width/height.
    if ((newItem.width == null || newItem.height == null) && imgResult.dimensions) {
      newItem.width = imgResult.dimensions.width || newItem.width;
      newItem.height = imgResult.dimensions.height || newItem.height;
    }
    // Attach provider provenance.
    newItem.providerMeta = imgResult.providerMeta || null;
    newItem.generationMode = imgResult.mode || mode;

    const nextArtwork = addItem(artworkAssets, newItem);
    const updatedProduct = updateProduct(req.params.id, {
      artworkStatus: deriveArtworkStatus(nextArtwork),
      artworkAssets: nextArtwork
    });

    res.json({
      success: true,
      data: updatedProduct,
      meta: {
        mode: imgResult.mode || mode,
        provider: (imgResult.providerMeta && imgResult.providerMeta.provider) || null,
        assetId: newItem.id
      }
    });
  } catch (error) {
    console.error("Error generating artwork image:", error);
    res.status(500).json({ success: false, message: "Failed to generate artwork image" });
  }
});

// ============================================================
// POST /api/products/:id/create-printify-product
// Creates a real Printify product DRAFT — or, in preview/mock
// mode, stores a deterministic stub keyed off printifyPreview.
//
// Requires:
//   - product.printifyPreview present (run generate-printify-preview first)
//
// Live-mode (ENABLE_REAL_PRINTIFY=true + PRINTIFY_API_TOKEN + PRINTIFY_SHOP_ID)
// additionally requires:
//   - an approved primary artwork item on the product
//
// NEVER auto-publishes — every call creates a draft only.
// ============================================================
router.post("/:id/create-printify-product", async (req, res) => {
  try {
    const product = getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const preview = product.printifyPreview;
    if (!preview || !preview.apiPayloadPreview) {
      return res.status(400).json({
        success: false,
        message:
          "Generate the Printify Preview first — POST /api/products/:id/generate-printify-preview."
      });
    }

    const mode = printifyIntegration.getMode();
    let primaryArtworkAbsolutePath = null;
    let primaryArtworkOriginalName = null;

    if (mode === "live") {
      // Live mode: require an APPROVED primary artwork item.
      const items = getItems(product.artworkAssets);
      const primary = items.find((it) => it.isPrimary === true);
      if (!primary) {
        return res.status(400).json({
          success: false,
          message: "Live Printify requires a primary artwork. Mark one item as primary first."
        });
      }
      if (primary.status !== "approved") {
        return res.status(400).json({
          success: false,
          message: "Live Printify requires the primary artwork to be APPROVED. Approve it first."
        });
      }
      const diskPath = resolveArtworkDiskPath(primary);
      if (!diskPath) {
        return res.status(400).json({
          success: false,
          message: "Could not resolve primary artwork file on disk."
        });
      }
      primaryArtworkAbsolutePath = diskPath;
      primaryArtworkOriginalName = primary.originalFileName || primary.fileName;
    }

    console.log(`🛍️  Creating Printify product (${mode}) for product ${req.params.id}`);
    const printifyProduct = await printifyIntegration.createProductDraft({
      apiPayload: preview.apiPayloadPreview,
      primaryArtworkAbsolutePath,
      primaryArtworkOriginalName
    });

    const updatedProduct = updateProduct(req.params.id, { printifyProduct });
    res.json({ success: true, data: updatedProduct, meta: { mode } });
  } catch (error) {
    console.error("Error creating Printify product:", error);
    res.status(502).json({
      success: false,
      message: `Failed to create Printify product: ${error.message}`
    });
  }
});

// ============================================================
// POST /api/products/:id/create-real-etsy-draft
// Creates a real Etsy DRAFT listing if live mode is on AND the
// account is OAuth-authorized. Otherwise delegates to the existing
// Etsy draft simulator so the surface remains useful in mock mode.
//
// Requires (both modes):
//   - product.aiData (existing constraint, matches /create-etsy-draft)
//
// NEVER auto-publishes — state="draft".
// ============================================================
router.post("/:id/create-real-etsy-draft", async (req, res) => {
  try {
    const product = getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (!product.aiData) {
      return res.status(400).json({
        success: false,
        message:
          "Generate AI content first (POST /api/products/:id/generate-ai) — Etsy listings need title/tags/description/price."
      });
    }

    const mode = etsyIntegration.getMode();
    console.log(`🛒 Creating Etsy draft (${mode}) for product ${req.params.id}`);

    const etsyDraft = await etsyIntegration.createDraftListing({
      product,
      listingData: product.listingData,
      aiData: product.aiData,
      printifyProduct: product.printifyProduct
    });

    // Mirror /create-etsy-draft behavior so this route is interchangeable:
    // we move status to "etsy_draft_created" and overwrite etsyDraft.
    const updatedProduct = updateProduct(req.params.id, {
      etsyDraft,
      status: "etsy_draft_created"
    });

    res.json({ success: true, data: updatedProduct, meta: { mode } });
  } catch (error) {
    console.error("Error creating real Etsy draft:", error);
    res.status(502).json({
      success: false,
      message: `Failed to create Etsy draft: ${error.message}`
    });
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

    // Best-effort cascade cleanup: delete any uploaded artwork files from
    // disk so we don't orphan them. The DB record goes away in the next step.
    const items = getItems(product.artworkAssets);
    for (const item of items) {
      tryDeleteFile(item);
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
