// ============================================================
// services/integrations/printifyIntegrationService.js
// ============================================================
// Printify integration surface. Wraps the Printify v1 REST API
// behind a small set of functions so the route handler stays
// thin and the mock/live switch is centralized.
//
// MOCK MODE (default) — never calls the Printify network.
//   Returns a "preview-mock" object that echoes the existing
//   printifyPreview payload so the rest of the app sees a
//   consistent shape (id, shopId, status, createdAt, ...).
//
// LIVE MODE requires:
//   - PRINTIFY_API_TOKEN
//   - PRINTIFY_SHOP_ID
//   - ENABLE_REAL_PRINTIFY=true
//
// The live path:
//   1. Reads the primary approved artwork item's file from disk.
//   2. Uploads it via POST /v1/uploads/images.json (base64).
//   3. Substitutes the upload's image_id into every placeholder
//      slot of apiPayloadPreview.print_areas[].placeholders[].images[].
//   4. POSTs the payload to /v1/shops/{shop_id}/products.json
//      with state="draft" (we NEVER auto-publish).
//   5. Returns a trimmed response summary suitable for storing
//      on product.printifyProduct.
// ============================================================

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const PRINTIFY_API_BASE = "https://api.printify.com";

// ------------------------------------------------------------
// Health helpers
// ------------------------------------------------------------

function liveFlagOn() {
  const v = (process.env.ENABLE_REAL_PRINTIFY || "").toLowerCase().trim();
  return v === "true" || v === "1" || v === "yes";
}
function hasToken() {
  return Boolean(process.env.PRINTIFY_API_TOKEN && String(process.env.PRINTIFY_API_TOKEN).trim());
}
function hasShop() {
  return Boolean(process.env.PRINTIFY_SHOP_ID && String(process.env.PRINTIFY_SHOP_ID).trim());
}

function isConfigured() {
  return liveFlagOn() && hasToken() && hasShop();
}

function getMode() {
  if (isConfigured()) return "live";
  return "preview";
}

function getHealthReport() {
  const missing = [];
  if (!hasToken()) missing.push("PRINTIFY_API_TOKEN");
  if (!hasShop()) missing.push("PRINTIFY_SHOP_ID");
  if (!liveFlagOn()) missing.push("ENABLE_REAL_PRINTIFY=true");

  return {
    key: "printify",
    label: "Printify",
    mode: getMode(),
    configured: isConfigured(),
    ready: isConfigured(),
    enabledFlag: process.env.ENABLE_REAL_PRINTIFY || null,
    shopIdSet: hasShop(),
    missingEnv: missing,
    powers:
      "POST /api/products/:id/create-printify-product — creates a real Printify product DRAFT (never " +
      "published automatically). Uses product.printifyPreview.apiPayloadPreview + the approved primary " +
      "artwork. In preview mode it returns a deterministic stub so the rest of the workflow runs.",
    setup:
      "1) Create a Printify personal access token at " +
      "https://printify.com/app/account/api  " +
      "2) Copy your shop id from https://printify.com/app/store (or GET /v1/shops.json)  " +
      "3) Add PRINTIFY_API_TOKEN, PRINTIFY_SHOP_ID, ENABLE_REAL_PRINTIFY=true to the backend env.",
    docsUrl: "https://developers.printify.com/"
  };
}

// ------------------------------------------------------------
// Live API helpers
// ------------------------------------------------------------

async function printifyFetch(pathname, { method = "GET", body } = {}) {
  if (!hasToken()) throw new Error("Printify token missing");
  const url = `${PRINTIFY_API_BASE}${pathname}`;
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "ai-ecommerce-hq/1.0"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { _raw: text }; }
  if (!r.ok) {
    const msg = (json && (json.message || json.error || json._raw)) || `Printify ${method} ${pathname} failed: ${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    err.body = json;
    throw err;
  }
  return json;
}

/**
 * Upload an image file to Printify. Returns { id, file_name, preview_url, ... }.
 * We always send base64 to avoid requiring our backend to be publicly reachable.
 */
async function uploadImage(filePath, displayFileName) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Artwork file not found at ${filePath}`);
  }
  const buf = fs.readFileSync(filePath);
  const file_name = displayFileName || path.basename(filePath);
  const body = {
    file_name,
    contents: buf.toString("base64")
  };
  return printifyFetch("/v1/uploads/images.json", { method: "POST", body });
}

function toPrintifyVariantId(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || String(parsed) !== String(value).trim()) {
    throw new Error(`Invalid Printify variant id: ${value}`);
  }
  return parsed;
}

function normalizePrintifyVariantIds(apiPayload) {
  const next = JSON.parse(JSON.stringify(apiPayload || {}));
  if (!Array.isArray(next.variants)) {
    throw new Error("Printify payload must include variants[]");
  }
  next.variants = next.variants.map((variant) => ({
    ...variant,
    id: toPrintifyVariantId(variant.id)
  }));

  if (Array.isArray(next.print_areas)) {
    next.print_areas = next.print_areas.map((area) => ({
      ...area,
      variant_ids: Array.isArray(area.variant_ids)
        ? area.variant_ids.map(toPrintifyVariantId)
        : []
    }));
  }

  return next;
}

function logPrintifyPayloadIdTypes(apiPayload) {
  const variantSample = (apiPayload.variants || []).slice(0, 6).map((v) => ({
    id: v.id,
    type: typeof v.id
  }));
  const printAreaSample = (apiPayload.print_areas || []).slice(0, 2).map((area) => ({
    position: (area.placeholders || []).map((ph) => ph.position).filter(Boolean).join(",") || "unknown",
    variant_ids: (area.variant_ids || []).slice(0, 6).map((id) => ({ id, type: typeof id }))
  }));
  console.log("🛍️  Printify payload id check:", {
    blueprint_id: apiPayload.blueprint_id,
    print_provider_id: apiPayload.print_provider_id,
    variants: variantSample,
    printAreaVariantIds: printAreaSample
  });
}

/**
 * Replace every placeholder image_id in apiPayloadPreview.print_areas
 * with the freshly uploaded Printify image_id. Returns a new payload.
 *
 * The existing printifyPreviewService writes a structure like:
 *   print_areas: [{
 *     variant_ids: [...],
 *     placeholders: [{
 *       position: "front",
 *       images: [{ id: "PLACEHOLDER_IMAGE_ID_FRONT", ...positioning }]
 *     }]
 *   }]
 * We swap every image id (regardless of name) to the real upload id.
 */
function substitutePlaceholderImageIds(apiPayload, uploadedImageId, uploadedImagesByPosition = null) {
  const next = JSON.parse(JSON.stringify(apiPayload || {}));
  if (Array.isArray(next.print_areas)) {
    for (const area of next.print_areas) {
      if (Array.isArray(area.placeholders)) {
        for (const ph of area.placeholders) {
          const position = ph.position || "front";
          const replacement =
            uploadedImagesByPosition && uploadedImagesByPosition[position]
              ? uploadedImagesByPosition[position].id
              : uploadedImageId;
          if (Array.isArray(ph.images)) {
            ph.images = ph.images.map((img) => ({
              ...img,
              id: replacement
            }));
          }
        }
      }
    }
  }
  return next;
}

// ------------------------------------------------------------
// Mock stub
// ------------------------------------------------------------

function buildMockStub(apiPayload, reason) {
  return {
    productId: `preview-mock-${uuidv4()}`,
    shopId: process.env.PRINTIFY_SHOP_ID || "mock-shop",
    status: "preview_only",
    url: null,
    createdAt: new Date().toISOString(),
    isMock: true,
    mockReason: reason || "live_disabled",
    rawResponseSummary: {
      title: apiPayload?.title || null,
      blueprint_id: apiPayload?.blueprint_id || null,
      print_provider_id: apiPayload?.print_provider_id || null,
      variant_count: Array.isArray(apiPayload?.variants) ? apiPayload.variants.length : 0,
      print_area_count: Array.isArray(apiPayload?.print_areas) ? apiPayload.print_areas.length : 0
    }
  };
}

// ------------------------------------------------------------
// Public entry point
// ------------------------------------------------------------

/**
 * Create a Printify product DRAFT. NEVER publishes.
 *
 * @param {object} input
 * @param {object} input.apiPayload      — printifyPreview.apiPayloadPreview
 * @param {string} input.primaryArtworkAbsolutePath — absolute path to the fallback/front file on disk (live mode only)
 * @param {string} input.primaryArtworkOriginalName — original file name (for display in Printify)
 * @param {object} input.printAreaArtwork — optional map { front, back } of approved artwork files
 *
 * Returns the persisted summary that goes into product.printifyProduct.
 */
async function createProductDraft({
  apiPayload,
  primaryArtworkAbsolutePath,
  primaryArtworkOriginalName,
  printAreaArtwork
}) {
  if (!isConfigured()) {
    let reason = "live_disabled";
    if (!hasToken()) reason = "missing_token";
    else if (!hasShop()) reason = "missing_shop_id";
    return buildMockStub(apiPayload, reason);
  }

  if (!apiPayload || typeof apiPayload !== "object") {
    throw new Error("apiPayload is required for live Printify product creation");
  }
  if (!primaryArtworkAbsolutePath) {
    throw new Error("Approved primary artwork is required for live Printify product creation");
  }

  const normalizedPayload = normalizePrintifyVariantIds(apiPayload);

  const hasBackPrintArea = (normalizedPayload.print_areas || []).some((area) =>
    (area.placeholders || []).some((ph) => ph.position === "back")
  );
  if (hasBackPrintArea && !(printAreaArtwork && printAreaArtwork.back)) {
    throw new Error(
      "Printify payload includes a back print area, but no approved back artwork is available. Approve back artwork first or regenerate a front-only preview."
    );
  }

  const artworkByPosition = {
    ...(printAreaArtwork || {}),
    front: (printAreaArtwork && printAreaArtwork.front) || {
      absolutePath: primaryArtworkAbsolutePath,
      originalName: primaryArtworkOriginalName
    }
  };

  console.log("🛍️  Printify: uploading artwork to /v1/uploads/images.json …");
  const uploadedImagesByPosition = {};
  for (const [position, art] of Object.entries(artworkByPosition)) {
    if (!art || !art.absolutePath) continue;
    const upload = await uploadImage(art.absolutePath, art.originalName);
    if (!upload || !upload.id) {
      throw new Error(`Printify upload returned no image id for ${position} artwork`);
    }
    uploadedImagesByPosition[position] = upload;
  }

  const uploadedImageId = uploadedImagesByPosition.front?.id || Object.values(uploadedImagesByPosition)[0]?.id;
  if (!uploadedImageId) {
    throw new Error("No artwork images were uploaded to Printify");
  }

  const liveBody = substitutePlaceholderImageIds(
    normalizedPayload,
    uploadedImageId,
    uploadedImagesByPosition
  );
  // ALWAYS force draft state; never publish automatically.
  liveBody.publish = false;

  const shopId = process.env.PRINTIFY_SHOP_ID;
  logPrintifyPayloadIdTypes(liveBody);
  console.log(`🛍️  Printify: creating product DRAFT in shop ${shopId} …`);
  const created = await printifyFetch(`/v1/shops/${shopId}/products.json`, {
    method: "POST",
    body: liveBody
  });

  return {
    productId: String(created.id || created.product_id || ""),
    shopId,
    status: "draft",
    url: created.id ? `https://printify.com/app/products/${created.id}` : null,
    createdAt: new Date().toISOString(),
    isMock: false,
    uploadedImage: {
      id: uploadedImageId,
      positions: Object.fromEntries(
        Object.entries(uploadedImagesByPosition).map(([position, upload]) => [
          position,
          { id: upload.id, file_name: upload.file_name || null }
        ])
      )
    },
    rawResponseSummary: {
      title: created.title || liveBody.title || null,
      blueprint_id: created.blueprint_id ?? liveBody.blueprint_id ?? null,
      print_provider_id: created.print_provider_id ?? liveBody.print_provider_id ?? null,
      variant_count: Array.isArray(created.variants) ? created.variants.length : 0,
      visible: typeof created.visible === "boolean" ? created.visible : null,
      tags: Array.isArray(created.tags) ? created.tags.slice(0, 13) : []
    }
  };
}

module.exports = {
  isConfigured,
  getMode,
  getHealthReport,
  createProductDraft,
  // Exposed for tests / advanced callers
  uploadImage,
  toPrintifyVariantId,
  normalizePrintifyVariantIds,
  substitutePlaceholderImageIds,
  buildMockStub
};
