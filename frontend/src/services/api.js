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
