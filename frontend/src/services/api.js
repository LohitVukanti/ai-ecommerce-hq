// ============================================================
// services/api.js — Frontend API Service
// ============================================================
// All API calls to our backend live here.
// This keeps API logic in one place — easy to update later.
// ============================================================

// Base URL for all API requests
// In development, Vite proxies /api requests to localhost:3001
const BASE_URL = "/api";

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

  const response = await fetch(`${BASE_URL}${path}`, options);
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
