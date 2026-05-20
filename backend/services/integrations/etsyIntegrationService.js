// ============================================================
// services/integrations/etsyIntegrationService.js
// ============================================================
// Etsy OAuth v3 (PKCE) + Open API v3 draft-listing surface.
//
// MOCK MODE (default) — never calls Etsy. The existing
// etsyService.createEtsyDraftListing() mock simulator continues
// to power the "Create Etsy Draft (Simulated)" button. The new
// /create-real-etsy-draft route also delegates to that mock
// when live mode is off.
//
// LIVE MODE requires:
//   - ETSY_CLIENT_ID
//   - ETSY_CLIENT_SECRET (only used for token exchange/refresh)
//   - ETSY_REDIRECT_URI  (must match what's registered on Etsy)
//   - ENABLE_REAL_ETSY=true
//   - An access token obtained via the OAuth callback handler.
//
// Tokens are persisted to backend/data/etsy_tokens.json
// (gitignored). State + PKCE verifiers are kept in an in-memory
// map keyed by `state`; entries auto-expire after 10 minutes.
//
// We DO NOT auto-publish — every listing is created with
// state="draft".
// ============================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createEtsyDraftListing: simulateEtsyDraftFallback } = require("../etsyService");

const ETSY_API_BASE = "https://openapi.etsy.com";
const ETSY_OAUTH_AUTHORIZE = "https://www.etsy.com/oauth/connect";
const ETSY_TOKEN_URL = `${ETSY_API_BASE}/v3/public/oauth/token`;

const TOKEN_FILE = path.join(__dirname, "..", "..", "data", "etsy_tokens.json");

// In-memory state cache for OAuth flow (state -> { codeVerifier, createdAt }).
// Lives only for the lifetime of the backend process — acceptable for a
// private MVP where a single user does the OAuth flow once.
const _oauthState = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

function _gcState() {
  const now = Date.now();
  for (const [k, v] of _oauthState.entries()) {
    if (now - v.createdAt > STATE_TTL_MS) _oauthState.delete(k);
  }
}

// ------------------------------------------------------------
// Health helpers
// ------------------------------------------------------------

function liveFlagOn() {
  const v = (process.env.ENABLE_REAL_ETSY || "").toLowerCase().trim();
  return v === "true" || v === "1" || v === "yes";
}
function hasClientCreds() {
  return Boolean(
    process.env.ETSY_CLIENT_ID && String(process.env.ETSY_CLIENT_ID).trim() &&
    process.env.ETSY_CLIENT_SECRET && String(process.env.ETSY_CLIENT_SECRET).trim()
  );
}
function hasRedirectUri() {
  return Boolean(process.env.ETSY_REDIRECT_URI && String(process.env.ETSY_REDIRECT_URI).trim());
}

function getStoredTokens() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    const raw = fs.readFileSync(TOKEN_FILE, "utf8");
    const json = JSON.parse(raw);
    if (!json || !json.access_token) return null;
    return json;
  } catch (e) {
    console.error("Etsy: failed to read tokens file:", e.message);
    return null;
  }
}

function saveTokens(tokens) {
  const dir = path.dirname(TOKEN_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const merged = { ...(getStoredTokens() || {}), ...tokens, updatedAt: new Date().toISOString() };
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

function clearTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
  } catch (e) { /* ignore */ }
}

function hasAccessToken() {
  const t = getStoredTokens();
  return Boolean(t && t.access_token);
}

function isConfigured() {
  return liveFlagOn() && hasClientCreds() && hasRedirectUri() && hasAccessToken();
}

function needsOAuth() {
  // OAuth start is meaningful only when client creds + redirect are set
  // AND we don't yet have a token.
  return hasClientCreds() && hasRedirectUri() && !hasAccessToken();
}

function getMode() {
  if (isConfigured()) return "live";
  return "mock";
}

function getHealthReport() {
  const missing = [];
  if (!process.env.ETSY_CLIENT_ID) missing.push("ETSY_CLIENT_ID");
  if (!process.env.ETSY_CLIENT_SECRET) missing.push("ETSY_CLIENT_SECRET");
  if (!process.env.ETSY_REDIRECT_URI) missing.push("ETSY_REDIRECT_URI");
  if (!liveFlagOn()) missing.push("ENABLE_REAL_ETSY=true");
  if (!hasAccessToken() && hasClientCreds()) missing.push("OAUTH_FLOW");

  return {
    key: "etsy",
    label: "Etsy",
    mode: getMode(),
    configured: isConfigured(),
    ready: isConfigured(),
    enabledFlag: process.env.ENABLE_REAL_ETSY || null,
    clientIdSet: Boolean(process.env.ETSY_CLIENT_ID),
    redirectUri: process.env.ETSY_REDIRECT_URI || null,
    hasAccessToken: hasAccessToken(),
    needsOAuth: needsOAuth(),
    missingEnv: missing,
    powers:
      "POST /api/products/:id/create-real-etsy-draft — creates a real Etsy DRAFT listing " +
      "(never auto-published). In mock mode it falls back to the existing simulator. " +
      "OAuth endpoints: GET /api/etsy/auth/start → 302 to Etsy, GET /api/etsy/auth/callback.",
    setup:
      "1) Create an Etsy app at https://www.etsy.com/developers/your-apps  " +
      "2) Set Callback URL there to match ETSY_REDIRECT_URI exactly  " +
      "3) Add ETSY_CLIENT_ID, ETSY_CLIENT_SECRET, ETSY_REDIRECT_URI, ENABLE_REAL_ETSY=true to backend env  " +
      "4) Visit /api/etsy/auth/start in your browser to perform the OAuth flow (PKCE).  " +
      "5) Optional: set ETSY_SHOP_ID to skip the /me lookup.",
    docsUrl: "https://developers.etsy.com/documentation/essentials/authentication"
  };
}

// ------------------------------------------------------------
// PKCE helpers
// ------------------------------------------------------------

function base64UrlEncode(buf) {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function generatePkce() {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(48));
  const codeChallenge = base64UrlEncode(crypto.createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

function generateState() {
  return base64UrlEncode(crypto.randomBytes(24));
}

/**
 * Build the OAuth start URL and stash the PKCE verifier in memory
 * so /auth/callback can complete the exchange.
 *
 * @returns {{url: string, state: string}}
 */
function buildAuthStartUrl(scopes = ["listings_w", "listings_r", "shops_r", "transactions_r"]) {
  if (!hasClientCreds() || !hasRedirectUri()) {
    throw new Error("Etsy OAuth not configured. Set ETSY_CLIENT_ID, ETSY_CLIENT_SECRET, ETSY_REDIRECT_URI.");
  }
  _gcState();
  const state = generateState();
  const { codeVerifier, codeChallenge } = generatePkce();
  _oauthState.set(state, { codeVerifier, createdAt: Date.now() });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ETSY_CLIENT_ID,
    redirect_uri: process.env.ETSY_REDIRECT_URI,
    scope: scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });

  return { url: `${ETSY_OAUTH_AUTHORIZE}?${params.toString()}`, state };
}

/**
 * Exchange an authorization code for tokens. The state must match
 * a value previously issued by buildAuthStartUrl() in this process.
 */
async function exchangeCodeForToken(code, state) {
  _gcState();
  const entry = _oauthState.get(state);
  if (!entry) {
    throw new Error("Invalid or expired OAuth state. Restart the connection flow.");
  }
  _oauthState.delete(state);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.ETSY_CLIENT_ID,
    redirect_uri: process.env.ETSY_REDIRECT_URI,
    code,
    code_verifier: entry.codeVerifier
  });

  const r = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  if (!r.ok) {
    throw new Error(`Etsy token exchange failed (${r.status}): ${json.error_description || json.error || text}`);
  }
  const tokens = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    token_type: json.token_type || "Bearer",
    expires_in: json.expires_in || null,
    obtainedAt: new Date().toISOString()
  };
  saveTokens(tokens);
  return tokens;
}

async function refreshAccessToken() {
  const existing = getStoredTokens();
  if (!existing || !existing.refresh_token) {
    throw new Error("No Etsy refresh token. Re-run OAuth.");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.ETSY_CLIENT_ID,
    refresh_token: existing.refresh_token
  });
  const r = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  if (!r.ok) {
    throw new Error(`Etsy token refresh failed (${r.status}): ${json.error_description || json.error || text}`);
  }
  return saveTokens({
    access_token: json.access_token,
    refresh_token: json.refresh_token || existing.refresh_token,
    expires_in: json.expires_in || null,
    obtainedAt: new Date().toISOString()
  });
}

// ------------------------------------------------------------
// Live API helpers
// ------------------------------------------------------------

async function etsyFetch(pathname, { method = "GET", body, retryOn401 = true } = {}) {
  const tokens = getStoredTokens();
  if (!tokens) throw new Error("Etsy not authorized — run OAuth flow first.");

  const r = await fetch(`${ETSY_API_BASE}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "x-api-key": process.env.ETSY_CLIENT_ID,
      "Content-Type": "application/json",
      "User-Agent": "ai-ecommerce-hq/1.0"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (r.status === 401 && retryOn401) {
    console.log("ℹ️  Etsy 401 — refreshing access token and retrying once.");
    try {
      await refreshAccessToken();
      return etsyFetch(pathname, { method, body, retryOn401: false });
    } catch (e) {
      throw new Error(`Etsy 401 and refresh failed: ${e.message}`);
    }
  }

  const text = await r.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { _raw: text }; }
  if (!r.ok) {
    const msg = (json && (json.error || json.error_description || json._raw)) || `Etsy ${method} ${pathname} failed: ${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function resolveShopId() {
  if (process.env.ETSY_SHOP_ID) return Number(process.env.ETSY_SHOP_ID);
  // /v3/application/users/me returns the authenticated user; the user has
  // a shop_id at /v3/application/users/{user_id}/shops or /v3/application/shops.
  const me = await etsyFetch("/v3/application/users/me");
  const userId = me && (me.user_id || me.userId);
  if (!userId) throw new Error("Could not determine Etsy user id from /me. Set ETSY_SHOP_ID directly.");
  const shop = await etsyFetch(`/v3/application/users/${userId}/shops`);
  const shopId = shop && (shop.shop_id || shop.id);
  if (!shopId) throw new Error("Could not determine Etsy shop id. Set ETSY_SHOP_ID directly.");
  return Number(shopId);
}

// ------------------------------------------------------------
// Build Etsy draft body from app data
// ------------------------------------------------------------

function buildDraftBody({ product, listingData, aiData, printifyProduct }) {
  // Prefer richer AI listing data (etsyTitle/etsyTags/etsyDescription/suggestedPrice).
  // Fall back to listingData (POD listing builder) if aiData is missing.
  const title = (aiData && aiData.etsyTitle) || (listingData && listingData.etsyTitle) || product.title;
  const description =
    (aiData && aiData.etsyDescription) ||
    (listingData && listingData.etsyDescription) ||
    product.description ||
    "Draft listing from AI E-Commerce HQ.";
  const tagsSource = (aiData && aiData.etsyTags) || (listingData && listingData.etsyTags) || [];
  const tags = Array.isArray(tagsSource) ? tagsSource.slice(0, 13) : [];

  // Pricing: prefer aiData.suggestedPrice, else listingData.pricingRecommendation.retailPrice
  let priceNumber = null;
  if (aiData && typeof aiData.suggestedPrice === "number") priceNumber = aiData.suggestedPrice;
  else if (listingData && listingData.pricingRecommendation && typeof listingData.pricingRecommendation.retailPrice === "number") {
    priceNumber = listingData.pricingRecommendation.retailPrice;
  } else {
    priceNumber = 24.99;
  }

  return {
    quantity: 1,
    title: String(title).slice(0, 140),
    description: String(description),
    price: Number(priceNumber.toFixed ? priceNumber.toFixed(2) : priceNumber),
    who_made: "i_did",
    when_made: "made_to_order",
    taxonomy_id: 68888509, // Generic "T-Shirts" — caller can override later.
    tags,
    state: "draft" // CRITICAL: never auto-publish.
  };
}

// ------------------------------------------------------------
// Public entry point
// ------------------------------------------------------------

/**
 * Create a draft listing on Etsy (or simulate in mock mode).
 * NEVER auto-publishes — state is always "draft".
 */
async function createDraftListing({ product, listingData, aiData, printifyProduct }) {
  if (!isConfigured()) {
    // Fall back to the existing mock simulator. We synthesize the
    // aiData shape it expects from whatever the product has so this
    // works even for products that never ran aiService.
    const synth = aiData || {
      etsyTitle: (listingData && listingData.etsyTitle) || product.title,
      etsyDescription: (listingData && listingData.etsyDescription) || product.description || "Draft listing",
      etsyTags: (listingData && listingData.etsyTags) || [],
      suggestedPrice: (listingData && listingData.pricingRecommendation && listingData.pricingRecommendation.retailPrice) || 24.99
    };
    const result = await simulateEtsyDraftFallback(product, synth);
    return {
      ...result,
      via: "mock_fallback",
      mockReason: !liveFlagOn() ? "live_disabled" : (!hasClientCreds() ? "missing_client_creds" : (!hasAccessToken() ? "no_oauth_token" : "unknown"))
    };
  }

  const shopId = await resolveShopId();
  const body = buildDraftBody({ product, listingData, aiData, printifyProduct });

  console.log(`🛒 Etsy: creating DRAFT listing in shop ${shopId} …`);
  const created = await etsyFetch(`/v3/application/shops/${shopId}/listings`, {
    method: "POST",
    body
  });

  const listingId = created.listing_id || created.id;
  return {
    listing_id: listingId,
    shop_id: shopId,
    state: "draft",
    title: body.title,
    url: listingId ? `https://www.etsy.com/listing/${listingId}` : null,
    editUrl: listingId ? `https://www.etsy.com/your/shops/me/tools/listings/edit/${listingId}` : null,
    createdTimestamp: Math.floor(Date.now() / 1000),
    via: "live",
    isMock: false,
    rawResponseSummary: {
      taxonomy_id: created.taxonomy_id || body.taxonomy_id,
      tag_count: (created.tags || body.tags || []).length,
      price: created.price || body.price
    }
  };
}

module.exports = {
  isConfigured,
  needsOAuth,
  getMode,
  getHealthReport,
  getStoredTokens,
  saveTokens,
  clearTokens,
  hasAccessToken,
  buildAuthStartUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  createDraftListing,
  // Exposed for tests
  buildDraftBody
};
