// ============================================================
// services/artworkAssetService.js — Artwork Asset Management
// ============================================================
// Pure helpers for the `artworkAssets.items[]` collection that
// lives on `products.artworkAssets`. No image API and no
// network calls — just file inspection + JSON shape management.
//
// The `artworkAssets` shape on a product is:
//   {
//     ...prep fields (artworkPrompt, negativePrompt, ...) — optional
//     items: [
//       {
//         id, type, fileName, fileUrl, previewUrl,
//         width, height, transparentBackground,
//         status, isPrimary,
//         sourceConceptId, mimeType, sizeBytes,
//         createdAt, updatedAt
//       }
//     ]
//   }
//
// Designed so prep + upload are independent: either may exist
// without the other. `deriveArtworkStatus` collapses both signals
// into the top-level `products.artworkStatus` enum.
// ============================================================

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { imageSize } = require("image-size");

// ---- Storage directory + static mount ------------------------
// Resolved relative to this file so it works no matter where the
// server is started from. Mirrors digitalProductService's pattern.
const ARTWORK_DIR = path.join(__dirname, "..", "generated-artwork");
if (!fs.existsSync(ARTWORK_DIR)) {
  fs.mkdirSync(ARTWORK_DIR, { recursive: true });
}

// Static URL path the server exposes the directory at.
// Backend mounts `/artwork` → ARTWORK_DIR in server.js.
const PUBLIC_URL_PREFIX = "/artwork";

// ---- Asset config -------------------------------------------
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml"
]);

// Formats that natively support an alpha / transparent channel.
// JPEG cannot carry transparency.
const TRANSPARENT_CAPABLE_MIMES = new Set([
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml"
]);

const ALLOWED_TYPES = new Set(["uploaded", "manual", "generated", "mockup"]);
const ALLOWED_STATUSES = new Set(["draft", "approved", "rejected"]);

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB per file

// ============================================================
// File-system helpers
// ============================================================

/**
 * Build the on-disk filename for a freshly uploaded asset.
 * Includes the product id + asset id so collisions are impossible
 * and a future cleanup pass can find all files for a product.
 */
function buildStoredFilename(productId, assetId, originalName) {
  const safeOriginal = String(originalName || "asset")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-80);
  return `${productId}_${assetId}_${safeOriginal}`;
}

/** Return `{ width, height }` (numbers) for an image file, or {} on failure. */
function readImageMeta(filePath, mimeType) {
  // SVGs aren't reliably sized by image-size (vector). Skip silently.
  if (mimeType === "image/svg+xml") return {};
  try {
    const buf = fs.readFileSync(filePath);
    const dim = imageSize(buf);
    if (dim && typeof dim.width === "number" && typeof dim.height === "number") {
      return { width: dim.width, height: dim.height };
    }
  } catch (e) {
    // image-size throws on unrecognized format — fall through.
  }
  return {};
}

/** Best-effort transparency capability check by mime type. */
function isTransparentCapable(mimeType) {
  return TRANSPARENT_CAPABLE_MIMES.has(String(mimeType || "").toLowerCase());
}

/** Resolve an asset id to its on-disk path; returns null if unknown. */
function resolveDiskPath(item) {
  if (!item || !item.fileName) return null;
  return path.join(ARTWORK_DIR, item.fileName);
}

/** Delete the underlying file if it exists. Never throws. */
function tryDeleteFile(item) {
  const p = resolveDiskPath(item);
  if (!p) return false;
  try {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      return true;
    }
  } catch (e) {
    console.error("Failed to delete artwork file:", p, e.message);
  }
  return false;
}

// ============================================================
// JSON shape helpers
// ============================================================

function getItems(artworkAssets) {
  if (!artworkAssets || typeof artworkAssets !== "object") return [];
  return Array.isArray(artworkAssets.items) ? artworkAssets.items : [];
}

/** Returns a fresh `artworkAssets` object with the new item appended. */
function addItem(existing, item) {
  const base = existing && typeof existing === "object" ? { ...existing } : {};
  const items = getItems(existing).slice();

  // If the new item asks to be primary, demote any existing primary.
  const wantsPrimary = item.isPrimary === true;
  const next = items.map((it) =>
    wantsPrimary ? { ...it, isPrimary: false } : it
  );

  // If there's no primary yet, the first item added is primary by default.
  const hasPrimary = next.some((it) => it.isPrimary);
  const isPrimary = wantsPrimary || !hasPrimary;

  next.push({ ...item, isPrimary });
  base.items = next;
  return base;
}

/** Update an item's `status` ("draft" | "approved" | "rejected"). */
function updateItemStatus(existing, assetId, status) {
  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error(`Unknown artwork status: ${status}`);
  }
  const base = existing && typeof existing === "object" ? { ...existing } : {};
  const items = getItems(existing);
  let touched = false;
  const next = items.map((it) => {
    if (it.id !== assetId) return it;
    touched = true;
    return { ...it, status, updatedAt: new Date().toISOString() };
  });
  if (!touched) return null;
  base.items = next;
  return base;
}

/** Move the `isPrimary` flag to a specific asset (demotes the rest). */
function setPrimary(existing, assetId) {
  const base = existing && typeof existing === "object" ? { ...existing } : {};
  const items = getItems(existing);
  if (!items.some((it) => it.id === assetId)) return null;
  base.items = items.map((it) => ({
    ...it,
    isPrimary: it.id === assetId,
    ...(it.id === assetId ? { updatedAt: new Date().toISOString() } : {})
  }));
  return base;
}

/**
 * Remove an item from the list. Returns `{ next, removed }` (or null if
 * the asset wasn't found). The caller is responsible for deleting the
 * underlying file — use `tryDeleteFile(removed)`.
 */
function removeItem(existing, assetId) {
  const base = existing && typeof existing === "object" ? { ...existing } : {};
  const items = getItems(existing);
  const idx = items.findIndex((it) => it.id === assetId);
  if (idx === -1) return null;
  const removed = items[idx];
  const next = items.slice(0, idx).concat(items.slice(idx + 1));

  // If we removed the primary, promote the first remaining (if any).
  if (removed.isPrimary && next.length > 0 && !next.some((it) => it.isPrimary)) {
    next[0] = { ...next[0], isPrimary: true };
  }

  base.items = next;
  return { next: base, removed };
}

/**
 * Strip every prep-only field while preserving `items[]`.
 * Used by upstream invalidation: when the user re-generates concepts,
 * the prep brief becomes stale, but their *uploaded files must NOT
 * be silently destroyed*. Returns `null` when there are no items and
 * no prep fields to keep.
 */
function stripPrepKeepItems(existing) {
  const items = getItems(existing);
  if (items.length === 0) return null;
  return { items };
}

/**
 * Top-level `artworkStatus` derived purely from the assets blob.
 *   "not_prepared" → no prep + no items
 *   "prepped"      → prep brief exists, no items yet
 *   "uploaded"     → ≥ 1 item, none approved yet
 *   "approved"     → ≥ 1 item approved
 */
function deriveArtworkStatus(artworkAssets) {
  const items = getItems(artworkAssets);
  if (items.some((it) => it.status === "approved")) return "approved";
  if (items.length > 0) return "uploaded";
  if (artworkAssets && typeof artworkAssets === "object" && artworkAssets.artworkPrompt) {
    return "prepped";
  }
  return "not_prepared";
}

/** Convenience for the upload route. */
function buildNewItem({
  productId,
  type,
  fileName,
  mimeType,
  sizeBytes,
  diskPath,
  sourceConceptId,
  requestedPrimary
}) {
  const id = uuidv4();
  const storedName = buildStoredFilename(productId, id, fileName);
  const finalDiskPath = path.join(ARTWORK_DIR, storedName);
  // Caller already wrote the file to a temp location; rename it into the
  // final stored name so the URL is stable and tied to the asset id.
  if (diskPath !== finalDiskPath) {
    fs.renameSync(diskPath, finalDiskPath);
  }
  const { width, height } = readImageMeta(finalDiskPath, mimeType);
  const transparent = isTransparentCapable(mimeType);
  const url = `${PUBLIC_URL_PREFIX}/${storedName}`;
  return {
    id,
    type: ALLOWED_TYPES.has(type) ? type : "uploaded",
    fileName: storedName,
    originalFileName: fileName,
    fileUrl: url,
    previewUrl: url,
    width: typeof width === "number" ? width : null,
    height: typeof height === "number" ? height : null,
    transparentBackground: transparent,
    status: "draft",
    isPrimary: requestedPrimary === true,
    sourceConceptId: sourceConceptId || null,
    mimeType,
    sizeBytes: typeof sizeBytes === "number" ? sizeBytes : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

module.exports = {
  ARTWORK_DIR,
  PUBLIC_URL_PREFIX,
  ALLOWED_MIME_TYPES,
  ALLOWED_TYPES,
  ALLOWED_STATUSES,
  MAX_UPLOAD_BYTES,
  // shape helpers
  getItems,
  addItem,
  updateItemStatus,
  setPrimary,
  removeItem,
  deriveArtworkStatus,
  stripPrepKeepItems,
  // file helpers
  buildNewItem,
  tryDeleteFile,
  resolveDiskPath,
  readImageMeta,
  isTransparentCapable
};
