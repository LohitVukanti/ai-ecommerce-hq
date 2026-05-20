// ============================================================
// services/api.js — Frontend API Service
// ============================================================
// All API calls to our backend live here.
// This keeps API logic in one place — easy to update later.
// ============================================================

// Base URL for API requests:
// - Local dev: default "/api" (Vite proxy → backend)
// - Production (Vercel etc.): set VITE_API_BASE_URL to your Render API root, e.g. https://your-api.onrender.com/api
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

/**
 * Resolve a backend-relative URL (e.g. /downloads/...) for production when the API lives on another origin.
 */
export function resolveDownloadUrl(urlPath) {
  if (!urlPath || /^https?:\/\//i.test(urlPath)) return urlPath;
  const raw = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (!raw || raw === "/api") return urlPath;
  const origin = raw.replace(/\/api\/?$/i, "").replace(/\/$/, "");
  if (!origin) return urlPath;
  const path = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
  return `${origin}${path}`;
}

/**
 * Helper function to make API requests.
 * Handles errors consistently.
 */
const request = async (method, path, body = null) => {
  const options = {
    method,
    headers: { "Content-Type": "application/json" }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_BASE_URL}${urlPath}`, options);
  const data = await response.json();

  // If the backend returned an error, throw it so callers can handle it
  if (!response.ok || !data.success) {
    throw new Error(data.message || "An API error occurred");
  }

  return data.data; // Return just the data payload
};

// ---- Product API Methods ----

/** Fetch all products */
export const fetchProducts = () => request("GET", "/products");

/** Fetch one product by ID */
export const fetchProduct = (id) => request("GET", `/products/${id}`);

/** Create a new product */
export const createProduct = (productData) => request("POST", "/products", productData);

/** Trigger AI generation for a product */
export const generateAI = (id) => request("POST", `/products/${id}/generate-ai`);

/** Approve a product */
export const approveProduct = (id) => request("POST", `/products/${id}/approve`);

/** Reject a product */
export const rejectProduct = (id) => request("POST", `/products/${id}/reject`);

/** Create an Etsy draft for a product */
export const createEtsyDraft = (id) => request("POST", `/products/${id}/create-etsy-draft`);

/** Delete a product */
export const deleteProduct = (id) => request("DELETE", `/products/${id}`);

/**
 * Generate a downloadable digital product (CSV) for a product.
 * Uses template-based generation on the backend — no AI API required.
 * Returns the updated product with the new file metadata in generatedFiles.
 */
export const generateDigitalProduct = (id) =>
  request("POST", `/products/${id}/generate-digital-product`);

// ---- POD design concepts + listing (template-based; SQLite on product row) ----

export const generateDesignConcepts = (id) =>
  request("POST", `/products/${id}/generate-concepts`);

export const selectProductConcept = (id, conceptId) =>
  request("POST", `/products/${id}/select-concept`, { conceptId });

export const rejectProductConcept = (id, conceptId) =>
  request("POST", `/products/${id}/reject-concept`, { conceptId });

/** Optional conceptId uses that concept; otherwise backend uses selectedConceptId */
export const generatePodListing = (id, conceptId = null) =>
  request(
    "POST",
    `/products/${id}/generate-listing`,
    conceptId ? { conceptId } : undefined
  );

/** Printify-oriented POD prep (template, prep mode — no live Printify API) */
export const generatePodPrep = (id) =>
  request("POST", `/products/${id}/generate-pod-prep`);

/** Design / mockup / social prompt package (template; requires listing + POD prep) */
export const generateDesignPackage = (id) =>
  request("POST", `/products/${id}/generate-design-package`);

/**
 * Printify Draft Preview — pure template / preview mode.
 * NOT connected to a real Printify API. Persists `printifyPreview`
 * on the product (selected concept + POD prep + listing required;
 * designPackage optional).
 */
export const generatePrintifyPreview = (id) =>
  request("POST", `/products/${id}/generate-printify-preview`);

/**
 * Artwork Generation Prep — pure template / preparation mode.
 * NOT connected to any image API. Persists `artworkAssets`
 * + `artworkStatus` on the product. Requires selected concept
 * + POD prep; listing / design package / Printify preview are
 * optional but enrich the brief when present.
 */
export const prepareArtwork = (id) =>
  request("POST", `/products/${id}/prepare-artwork`);

/**
 * Upload a single artwork file (PNG / JPEG / WEBP / GIF / SVG).
 * Files are stored locally under backend/generated-artwork and
 * served at /artwork/<filename>.
 *
 * @param {string} id        Product id
 * @param {File}   file      Browser File / Blob
 * @param {object} [options]
 * @param {"uploaded"|"manual"|"generated"|"mockup"} [options.type="uploaded"]
 * @param {boolean} [options.isPrimary=false]
 */
export const uploadArtwork = async (id, file, options = {}) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("type", options.type || "uploaded");
  if (options.isPrimary) fd.append("isPrimary", "true");

  const response = await fetch(`${API_BASE_URL}/products/${id}/upload-artwork`, {
    method: "POST",
    body: fd
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Upload failed");
  }
  return data.data;
};

export const approveArtworkAsset = (id, assetId) =>
  request("POST", `/products/${id}/artwork/${assetId}/approve`);

export const rejectArtworkAsset = (id, assetId) =>
  request("POST", `/products/${id}/artwork/${assetId}/reject`);

export const setPrimaryArtworkAsset = (id, assetId) =>
  request("POST", `/products/${id}/artwork/${assetId}/set-primary`);

export const deleteArtworkAsset = (id, assetId) =>
  request("DELETE", `/products/${id}/artwork/${assetId}`);

// ---- Ideas / research intake API (SQLite-backed on the server) ----

/** Fetch ideas; optional filters match GET /api/ideas query params */
export const fetchIdeas = (filters = {}) => {
  const q = new URLSearchParams();
  if (filters.sourcePlatform) q.set("sourcePlatform", filters.sourcePlatform);
  if (filters.decisionStatus) q.set("decisionStatus", filters.decisionStatus);
  if (filters.productType) q.set("productType", filters.productType);
  const qs = q.toString();
  return request("GET", `/ideas${qs ? `?${qs}` : ""}`);
};

export const fetchIdea = (id) => request("GET", `/ideas/${id}`);

export const createIdea = (payload) => request("POST", "/ideas", payload);

export const updateIdea = (id, payload) => request("PUT", `/ideas/${id}`, payload);

export const deleteIdea = (id) => request("DELETE", `/ideas/${id}`);

export const scoreIdea = (id) => request("POST", `/ideas/${id}/score`);

/** Returns { product, idea } from the backend */
export const convertIdeaToProduct = (id) =>
  request("POST", `/ideas/${id}/convert-to-product`);

// ---- Trend Scanner API (manual/assisted trend intake; converts to ideas) ----

/** Fetch trend scans; optional filters: sourcePlatform, productType */
export const fetchTrendScans = (filters = {}) => {
  const q = new URLSearchParams();
  if (filters.sourcePlatform) q.set("sourcePlatform", filters.sourcePlatform);
  if (filters.productType) q.set("productType", filters.productType);
  const qs = q.toString();
  return request("GET", `/trends${qs ? `?${qs}` : ""}`);
};

export const fetchTrendScan = (id) => request("GET", `/trends/${id}`);

export const createTrendScan = (payload) => request("POST", "/trends", payload);

export const updateTrendScan = (id, payload) =>
  request("PUT", `/trends/${id}`, payload);

export const deleteTrendScan = (id) => request("DELETE", `/trends/${id}`);

/** Returns { idea, trendScan } from the backend */
export const convertTrendScanToIdea = (id) =>
  request("POST", `/trends/${id}/convert-to-idea`);

// ============================================================
// Integration layer — OpenAI / image gen / Printify / Etsy
// ============================================================
// All integrations have a mock or preview fallback on the backend
// so these calls work even when no API keys are set. The status
// endpoint never returns secret values.

/**
 * Returns the health report for every integration: configured /
 * not configured, mode (mock | preview | live), missing env vars,
 * setup instructions, and what each integration powers.
 */
export const fetchIntegrationStatus = () =>
  request("GET", "/integrations/status");

/** Etsy-specific status (mirrors integration report; convenient for the OAuth callback page). */
export const fetchEtsyStatus = () => request("GET", "/etsy/status");

/**
 * Returns the absolute URL that the user's browser should be sent
 * to start the Etsy OAuth (PKCE) flow. The backend issues a 302 to
 * Etsy from there. We DO NOT call this with fetch — it's a redirect.
 */
export function getEtsyAuthStartUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (raw && raw !== "/api") {
    const origin = raw.replace(/\/api\/?$/i, "").replace(/\/$/, "");
    return `${origin}/api/etsy/auth/start`;
  }
  return "/api/etsy/auth/start";
}

/**
 * Generate an artwork image for a product. In mock mode (default)
 * writes a deterministic SVG placeholder; in live mode calls the
 * configured image-generation provider. Either way the result is
 * added to product.artworkAssets.items[] as type="generated".
 *
 * Requires that artwork prep has been run first.
 */
export const generateArtworkImage = (id) =>
  request("POST", `/products/${id}/generate-artwork-image`);

/**
 * Create a Printify product DRAFT (never published). In preview/mock
 * mode stores a deterministic stub; in live mode uploads the approved
 * primary artwork and POSTs to Printify.
 */
export const createPrintifyProduct = (id) =>
  request("POST", `/products/${id}/create-printify-product`);

/**
 * Create a real Etsy DRAFT listing (never auto-published). Falls back
 * to the existing simulator when live mode is off or OAuth is missing.
 */
export const createRealEtsyDraft = (id) =>
  request("POST", `/products/${id}/create-real-etsy-draft`);
