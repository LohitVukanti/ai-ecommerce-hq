// ============================================================
// services/integrations/imageGenerationService.js
// ============================================================
// Provider-agnostic image generation surface for AI E-Commerce HQ.
//
// In MOCK mode (default) — no network calls, no keys required.
// Returns a small deterministic SVG placeholder so the artwork
// pipeline (item add → preview card → approve/reject/set-primary)
// works end-to-end offline.
//
// In LIVE mode — calls OpenAI Images (gpt-image-1 by default).
// LIVE mode requires BOTH:
//   - OPENAI_API_KEY present
//   - ENABLE_REAL_IMAGE_GENERATION="true"
//
// If LIVE mode is requested but the call fails, the caller can
// choose to fall back to mock or surface the error (it currently
// surfaces — the route is an explicit live action).
// ============================================================

const crypto = require("crypto");

const DEFAULT_IMAGE_MODEL = "gpt-image-1";

// ------------------------------------------------------------
// Health helpers
// ------------------------------------------------------------

function liveFlagOn() {
  const v = (process.env.ENABLE_REAL_IMAGE_GENERATION || "").toLowerCase().trim();
  return v === "true" || v === "1" || v === "yes";
}

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim());
}

/** True iff env is fully set up to make REAL image-gen calls. */
function isConfigured() {
  return liveFlagOn() && hasOpenAIKey();
}

function getMode() {
  if (isConfigured()) return "live";
  return "mock";
}

function getHealthReport() {
  const missing = [];
  if (!hasOpenAIKey()) missing.push("OPENAI_API_KEY");
  if (!liveFlagOn()) missing.push("ENABLE_REAL_IMAGE_GENERATION=true");

  return {
    key: "image-generation",
    label: "Image generation",
    mode: getMode(),
    configured: isConfigured(),
    ready: isConfigured(),
    enabledFlag: process.env.ENABLE_REAL_IMAGE_GENERATION || null,
    model: process.env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
    missingEnv: missing,
    powers:
      "POST /api/products/:id/generate-artwork-image — generates a draft artwork asset directly into " +
      "the product's artworkAssets.items[] using the prepared artwork prompt. Mock mode writes an SVG " +
      "placeholder so the UI/flow works without keys.",
    setup:
      "Set OPENAI_API_KEY in the backend env (same key powers OpenAI text). " +
      "Set ENABLE_REAL_IMAGE_GENERATION=true to opt in to real billed calls. " +
      "Optional: OPENAI_IMAGE_MODEL=gpt-image-1 (default).",
    docsUrl: "https://platform.openai.com/docs/api-reference/images/create"
  };
}

// ------------------------------------------------------------
// Mock placeholder generator (deterministic per prompt)
// ------------------------------------------------------------

function hashToInt(str) {
  return crypto.createHash("md5").update(String(str || "")).digest().readUInt32BE(0);
}

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build a small SVG placeholder image keyed by prompt.
 * Returns a Buffer of UTF-8 SVG bytes. The artwork pipeline
 * accepts image/svg+xml because the asset service marks SVG as
 * transparent-capable and image-size can't read SVG dimensions
 * — we explicitly pass dimensions when registering the item.
 */
function buildMockSvgBuffer(prompt) {
  const seed = hashToInt(prompt || "");
  const hue1 = seed % 360;
  const hue2 = (hue1 + 180) % 360;
  const accentHue = (hue1 + 60) % 360;

  const promptLine1 = escapeXml((prompt || "Mock artwork").slice(0, 56));
  const promptLine2 = escapeXml((prompt || "").slice(56, 112));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue1}, 35%, 15%)"/>
      <stop offset="100%" stop-color="hsl(${hue2}, 45%, 25%)"/>
    </linearGradient>
    <radialGradient id="orb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="hsl(${accentHue}, 70%, 60%)" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="hsl(${accentHue}, 70%, 30%)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="512" cy="430" r="280" fill="url(#orb)"/>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="#f5f7fa" text-anchor="middle">
    <text x="512" y="700" font-size="44" font-weight="700" letter-spacing="6">MOCK ARTWORK</text>
    <text x="512" y="760" font-size="22" opacity="0.85">${promptLine1}</text>
    <text x="512" y="790" font-size="22" opacity="0.65">${promptLine2}</text>
    <text x="512" y="900" font-size="16" opacity="0.55">ENABLE_REAL_IMAGE_GENERATION=false</text>
  </g>
</svg>`;
  return Buffer.from(svg, "utf8");
}

// ------------------------------------------------------------
// Live provider — OpenAI Images
// ------------------------------------------------------------

let _openaiClient = null;
function getOpenAIClient() {
  if (_openaiClient) return _openaiClient;
  try {
    const OpenAI = require("openai");
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return _openaiClient;
  } catch (e) {
    console.error("Image gen: failed to load openai SDK:", e.message);
    return null;
  }
}

/**
 * Map our brief's `recommendedCanvasSize` (e.g. "4500 × 5400 px @ 300 DPI")
 * to a size string the image API accepts. gpt-image-1 supports
 * "1024x1024", "1024x1536", "1536x1024", "auto". We approximate
 * aspect ratio rather than literal print size.
 */
function pickImageSize(recommendedCanvasSize) {
  const s = String(recommendedCanvasSize || "").toLowerCase();
  // Poster-ish (4:3 or taller)
  if (/poster|18.*24|24.*36|portrait/.test(s)) return "1024x1536";
  // Landscape
  if (/landscape|wide|16.*9/.test(s)) return "1536x1024";
  return "1024x1024";
}

async function callOpenAIImage({ prompt, size, transparentBackground }) {
  const client = getOpenAIClient();
  if (!client) throw new Error("OpenAI SDK unavailable");

  const model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
  const request = {
    model,
    prompt: String(prompt || "").slice(0, 4000),
    n: 1,
    size: size || "1024x1024"
  };
  // gpt-image-1 supports `background: "transparent"` for PNG output.
  if (transparentBackground && /image-1/.test(model)) {
    request.background = "transparent";
  }

  console.log(`🎨 Image gen: calling ${model} (size ${request.size}, transparent=${Boolean(request.background)})`);
  const resp = await client.images.generate(request);

  const item = resp && resp.data && resp.data[0];
  if (!item) throw new Error("Image API returned no data");

  // gpt-image-1 always returns b64_json; DALL-E can return url.
  if (item.b64_json) {
    return {
      buffer: Buffer.from(item.b64_json, "base64"),
      mimeType: "image/png",
      providerMeta: { model, size: request.size, source: "b64_json" }
    };
  }
  if (item.url) {
    // Lightweight fetch — Node 18+ has global fetch.
    const r = await fetch(item.url);
    if (!r.ok) throw new Error(`Image URL fetch failed: ${r.status}`);
    const ab = await r.arrayBuffer();
    return {
      buffer: Buffer.from(ab),
      mimeType: "image/png",
      providerMeta: { model, size: request.size, source: "url" }
    };
  }
  throw new Error("Image API returned no image payload");
}

// ------------------------------------------------------------
// Public entry point
// ------------------------------------------------------------

/**
 * Generate an artwork image. Returns:
 *   { buffer, mimeType, originalFileName, dimensions, providerMeta, mode }
 *
 * - In mock mode dimensions are explicit; in live mode they're left
 *   undefined and the caller's asset service reads them via image-size
 *   (works for PNG/JPEG/WEBP/GIF).
 */
async function generateArtworkImage({
  prompt,
  negativePrompt,
  recommendedCanvasSize,
  transparentBackground = true,
  productId = "product"
}) {
  const effectivePrompt = [
    prompt || "",
    negativePrompt ? `\n\nAvoid: ${negativePrompt}` : ""
  ].join("");

  if (!isConfigured()) {
    // Mock path — never throws.
    const buffer = buildMockSvgBuffer(effectivePrompt);
    return {
      buffer,
      mimeType: "image/svg+xml",
      originalFileName: `mock-artwork-${productId}.svg`,
      dimensions: { width: 1024, height: 1024 },
      providerMeta: { provider: "mock-svg", reason: !hasOpenAIKey() ? "no_api_key" : "live_disabled" },
      mode: "mock"
    };
  }

  try {
    const size = pickImageSize(recommendedCanvasSize);
    const { buffer, mimeType, providerMeta } = await callOpenAIImage({
      prompt: effectivePrompt,
      size,
      transparentBackground
    });
    return {
      buffer,
      mimeType,
      originalFileName: `openai-${(providerMeta.model || "image").replace(/[^a-z0-9]+/gi, "-")}.png`,
      dimensions: null, // asset service will read from buffer
      providerMeta: { provider: "openai-images", ...providerMeta },
      mode: "live"
    };
  } catch (err) {
    console.error("❌ Image gen failed:", err.message);
    throw new Error(`Image generation failed: ${err.message}`);
  }
}

module.exports = {
  isConfigured,
  getMode,
  getHealthReport,
  generateArtworkImage,
  // Exposed for tests / advanced callers
  buildMockSvgBuffer
};
