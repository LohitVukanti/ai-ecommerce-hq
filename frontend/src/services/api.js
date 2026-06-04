// ============================================================
// services/api.js — Frontend API Service
// ============================================================
// Central HTTP layer with timeouts, safe JSON parsing, GET retry,
// and normalized errors for consistent UI recovery.
// ============================================================

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

/** Default timeout — long enough for template AI/image generation. */
const DEFAULT_TIMEOUT_MS = 90000;
const GET_RETRY_ATTEMPTS = 2;
const GET_RETRY_DELAY_MS = 800;

/** Optional backend shared secret (must match API_SECRET on Render). */
const API_SECRET = (import.meta.env.VITE_API_SECRET || "").trim();

/**
 * Typed error for API failures — callers can check `.retryable` and `.status`.
 */
export class ApiError extends Error {
  constructor(message, { status = null, retryable = false, cause = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryable = retryable;
    this.cause = cause;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildAuthHeaders(extra = {}) {
  const headers = { ...extra };
  if (API_SECRET) {
    headers["X-Api-Key"] = API_SECRET;
  }
  return headers;
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!text) {
    if (response.ok) return { success: true, data: null };
    throw new ApiError(`Server returned ${response.status} with an empty body.`, {
      status: response.status,
      retryable: isRetryableStatus(response.status)
    });
  }

  const looksJson =
    contentType.includes("application/json") ||
    contentType.includes("+json") ||
    /^\s*[{[]/.test(text);

  if (!looksJson) {
    const snippet = text.replace(/\s+/g, " ").slice(0, 120);
    throw new ApiError(
      response.ok
        ? "Unexpected response format from server."
        : `Server error (${response.status}): ${snippet}`,
      { status: response.status, retryable: isRetryableStatus(response.status) }
    );
  }

  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new ApiError("Invalid JSON from server.", {
      status: response.status,
      retryable: true,
      cause
    });
  }
}

function normalizeFetchError(err, timedOut = false) {
  if (err instanceof ApiError) return err;
  if (timedOut || err?.name === "AbortError") {
    return new ApiError("Request timed out. The server may be busy — try again.", {
      retryable: true,
      cause: err
    });
  }
  if (err instanceof TypeError) {
    const hint = API_BASE_URL.startsWith("http")
      ? `Check that the API at ${API_BASE_URL} is reachable.`
      : "Check that the backend is running and VITE_API_BASE_URL is correct.";
    return new ApiError(`Cannot reach the API. ${hint}`, { retryable: true, cause: err });
  }
  return new ApiError(err?.message || "An API error occurred.", { retryable: false, cause: err });
}

async function fetchWithTimeout(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw normalizeFetchError(err, true);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Core JSON request helper.
 * GET requests retry once on retryable failures (network, 5xx, 429).
 */
async function request(method, path, body = null, { timeoutMs } = {}) {
  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${urlPath}`;

  const fetchOptions = {
    method,
    headers: buildAuthHeaders(
      body != null ? { "Content-Type": "application/json" } : {}
    )
  };
  if (body != null) {
    fetchOptions.body = JSON.stringify(body);
  }

  const maxAttempts = method === "GET" ? GET_RETRY_ATTEMPTS : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions, timeoutMs);
      const data = await parseJsonResponse(response);

      if (!response.ok || data.success === false) {
        const msg = data.message || `Request failed (${response.status}).`;
        const retryable = isRetryableStatus(response.status);
        if (retryable && attempt < maxAttempts) {
          await sleep(GET_RETRY_DELAY_MS * attempt);
          continue;
        }
        throw new ApiError(msg, { status: response.status, retryable });
      }

      return data.data;
    } catch (err) {
      const apiErr = normalizeFetchError(err);
      if (apiErr.retryable && attempt < maxAttempts) {
        await sleep(GET_RETRY_DELAY_MS * attempt);
        continue;
      }
      throw apiErr;
    }
  }

  throw new ApiError("Request failed after retries.", { retryable: true });
}

/**
 * Resolve a backend-relative URL for production cross-origin assets.
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

/** User-facing hint when list pages fail to load. */
export function getApiConnectionHint() {
  const raw = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (raw && raw.startsWith("http")) {
    return `Verify the backend is running at ${raw.replace(/\/api\/?$/i, "")} and CORS allows this frontend origin.`;
  }
  return "Start the backend locally: cd backend && npm run dev (default port 3001).";
}

// ---- Product API Methods ----

export const fetchProducts = () => request("GET", "/products");
export const fetchProduct = (id) => request("GET", `/products/${id}`);
export const createProduct = (productData) => request("POST", "/products", productData);
export const generateAI = (id) => request("POST", `/products/${id}/generate-ai`);
export const approveProduct = (id) => request("POST", `/products/${id}/approve`);
export const rejectProduct = (id) => request("POST", `/products/${id}/reject`);
export const createEtsyDraft = (id) => request("POST", `/products/${id}/create-etsy-draft`);
export const deleteProduct = (id) => request("DELETE", `/products/${id}`);
export const generateDigitalProduct = (id) =>
  request("POST", `/products/${id}/generate-digital-product`);

export const generateDesignConcepts = (id) =>
  request("POST", `/products/${id}/generate-concepts`);
export const selectProductConcept = (id, conceptId) =>
  request("POST", `/products/${id}/select-concept`, { conceptId });
export const rejectProductConcept = (id, conceptId) =>
  request("POST", `/products/${id}/reject-concept`, { conceptId });
export const generatePodListing = (id, conceptId = null) =>
  request(
    "POST",
    `/products/${id}/generate-listing`,
    conceptId ? { conceptId } : undefined
  );
export const generatePodPrep = (id) => request("POST", `/products/${id}/generate-pod-prep`);
export const generateDesignPackage = (id) =>
  request("POST", `/products/${id}/generate-design-package`);
export const generatePrintifyPreview = (id) =>
  request("POST", `/products/${id}/generate-printify-preview`);
export const prepareArtwork = (id) => request("POST", `/products/${id}/prepare-artwork`);

export const uploadArtwork = async (id, file, options = {}) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("type", options.type || "uploaded");
  if (options.isPrimary) fd.append("isPrimary", "true");

  const url = `${API_BASE_URL}/products/${id}/upload-artwork`;
  const headers = buildAuthHeaders();

  try {
    const response = await fetchWithTimeout(
      url,
      { method: "POST", headers, body: fd },
      120000
    );
    const data = await parseJsonResponse(response);
    if (!response.ok || data.success === false) {
      throw new ApiError(data.message || "Upload failed.", {
        status: response.status,
        retryable: isRetryableStatus(response.status)
      });
    }
    return data.data;
  } catch (err) {
    throw normalizeFetchError(err);
  }
};

export const approveArtworkAsset = (id, assetId) =>
  request("POST", `/products/${id}/artwork/${assetId}/approve`);
export const rejectArtworkAsset = (id, assetId) =>
  request("POST", `/products/${id}/artwork/${assetId}/reject`);
export const setPrimaryArtworkAsset = (id, assetId) =>
  request("POST", `/products/${id}/artwork/${assetId}/set-primary`);
export const deleteArtworkAsset = (id, assetId) =>
  request("DELETE", `/products/${id}/artwork/${assetId}`);

// ---- Ideas ----

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
export const convertIdeaToProduct = (id) =>
  request("POST", `/ideas/${id}/convert-to-product`);

// ---- Trends ----

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
export const convertTrendScanToIdea = (id) =>
  request("POST", `/trends/${id}/convert-to-idea`);

// ---- Launch Workflow ----

export const findLaunchOpportunities = () =>
  request("POST", "/launch/opportunities", null, { timeoutMs: 120000 });

export const runLaunchWorkflow = (payload) =>
  request("POST", "/launch/run", payload, { timeoutMs: 180000 });

// ---- Integrations ----

export const fetchIntegrationStatus = () => request("GET", "/integrations/status");
export const fetchEtsyStatus = () => request("GET", "/etsy/status");

export function getEtsyAuthStartUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (raw && raw !== "/api") {
    const origin = raw.replace(/\/api\/?$/i, "").replace(/\/$/, "");
    return `${origin}/api/etsy/auth/start`;
  }
  return "/api/etsy/auth/start";
}

export const generateArtworkImage = (id) =>
  request("POST", `/products/${id}/generate-artwork-image`, null, { timeoutMs: 120000 });
export const createPrintifyProduct = (id) =>
  request("POST", `/products/${id}/create-printify-product`, null, { timeoutMs: 120000 });
export const createRealEtsyDraft = (id) =>
  request("POST", `/products/${id}/create-real-etsy-draft`, null, { timeoutMs: 120000 });

/** Lightweight ping for connection checks (used by error recovery UI). */
export const pingHealth = () => request("GET", "/health", null, { timeoutMs: 10000 });
