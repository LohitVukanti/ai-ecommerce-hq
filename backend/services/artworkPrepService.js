// ============================================================
// services/artworkPrepService.js — Artwork Generation Prep
// ============================================================
// PURE TEMPLATE generator. No image APIs, no network calls,
// no OpenAI. Produces the exact JSON shape persisted on
// `products.artworkAssets`. Designed to be a swap-in target
// for a future image-generation provider — when one is added,
// only this file needs to learn how to call it.
// ============================================================

const { v4: uuidv4 } = require("uuid");
const { sanitizeCopy, inferPodProductShape } = require("./podConceptService");

// Canvas size + transparent-bg rule per supported POD shape.
const CANVAS_BY_SHAPE = {
  "T-shirt": {
    size: "4500 × 5400 px @ 300 DPI, sRGB (front print)",
    transparent: true
  },
  Crewneck: {
    size: "4500 × 5400 px @ 300 DPI, sRGB (front print; keep ≥ 2.5\" below collar)",
    transparent: true
  },
  Hoodie: {
    size: "4500 × 5400 px @ 300 DPI, sRGB (front print; avoid kangaroo pocket seam)",
    transparent: true
  },
  Poster: {
    size: "5400 × 7200 px @ 300 DPI, sRGB or CMYK (18×24 in with 0.125\" full-bleed)",
    transparent: false
  },
  "Tote bag": {
    size: "3000 × 3600 px @ 300 DPI, sRGB (front panel, centered between handles)",
    transparent: true
  },
  Sticker: {
    size: "1500 × 1500 px @ 300 DPI, sRGB (with 0.125\" bleed; kiss-cut friendly)",
    transparent: true
  }
};

const DEFAULT_FILE_REQS_BY_SHAPE = {
  "T-shirt":
    'PNG, 300 DPI, sRGB, transparent background, min 4500×5400 px, 0.5" safe margin from seams.',
  Crewneck:
    'PNG, 300 DPI, sRGB, transparent background, min 4500×5400 px, keep art ≥ 2.5" below collar line.',
  Hoodie:
    'PNG, 300 DPI, sRGB, transparent background, min 4500×5400 px, avoid kangaroo pocket break line.',
  Poster:
    'PDF (vector) or PNG @ 300 DPI in trim size; full bleed 0.125" beyond cut; embed sRGB or CMYK profile.',
  "Tote bag":
    'PNG, 300 DPI, sRGB, transparent background, ~3000×3600 px centered between handles.',
  Sticker:
    'PNG or SVG with transparent background, 300 DPI, 0.125" bleed, kiss-cut friendly outline.'
};

// Negative-prompt block reused across providers (DALL·E, SDXL, Ideogram, etc.).
// Tuned for POD art: avoid IP risk, avoid common artifacts, keep print-ready.
const STANDARD_NEGATIVE_PROMPT = [
  "no third-party logos",
  "no trademarked brand marks",
  "no celebrity likenesses",
  "no university or sports-league insignia",
  "no real player names or band names",
  "no signatures or watermarks",
  "no text artifacts, no garbled letters",
  "no jpeg artifacts, no banding, no halftone moiré",
  "no low resolution, no pixelation, no soft focus",
  "no extra fingers, no distorted hands",
  "no cropped subjects, no edges cut off",
  "no busy background bleed for apparel (must remain transparent unless poster)"
].join(", ");

function joinNonEmpty(parts, sep = " · ") {
  return parts
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter(Boolean)
    .join(sep);
}

/**
 * Build the artwork prep record from existing product data.
 * Caller must pass `concept` and `podPrep`; listing / designPackage /
 * printifyPreview are optional but enrich the prompt.
 *
 * @param {object} product
 * @param {object} concept
 * @param {object} podPrep
 * @param {object|null} listingData
 * @param {object|null} designPackage
 * @param {object|null} printifyPreview
 * @returns {object} artworkAssets shape
 */
function buildArtworkPrep(
  product,
  concept,
  podPrep,
  listingData,
  designPackage,
  printifyPreview
) {
  const shape = inferPodProductShape(concept, product);
  const canvas = CANVAS_BY_SHAPE[shape] || CANVAS_BY_SHAPE["T-shirt"];

  const palette = concept.colorPalette || "ivory, ink, brass";
  const aesthetic = concept.aesthetic || "minimalist";
  const placement = podPrep.printPlacement || concept.placement || "front chest typographic lockup";
  const apparelColor = podPrep.apparelColor || "neutral base";
  const printArea = podPrep.printArea || "follow provider safe print area";

  // Extract a SHORT, sanitized slogan word/phrase for the wordmark text guidance.
  // Strip trailing punctuation/quotes for cleaner prompt phrasing.
  const sloganLead = sanitizeCopy((concept.slogan || "").split("—")[0] || "")
    .replace(/^["“'`]+|["”'`]+$/g, "")
    .slice(0, 60);

  const conceptName = sanitizeCopy(concept.conceptName || product.title || "Product");

  // Master prompt — combine concept fields + (optionally) the design package
  // master prompt so the artwork prompt benefits from the richer brief when
  // present, while still working with just a concept + POD prep.
  const baseLine = `${canvas.transparent ? "Transparent-background PNG artwork" : "Full-bleed poster artwork"} for an original ${aesthetic} ${shape.toLowerCase()} design (placement: ${placement}).`;
  const paletteLine = `Palette: ${palette}. Garment / blank color target: ${apparelColor}.`;
  const compositionLine = `Composition: typography-led lockup, balanced negative space, readable at thumbnail scale (Etsy grid). Mood: ${aesthetic}, ecommerce-ready, premium feel.`;
  const wordmarkLine = sloganLead
    ? `Original wordmark / typographic element reads exactly: "${sloganLead}" — no other text, no brand marks, no trademark imitation.`
    : `Original typographic element only; no brand marks, no trademark imitation.`;
  const technicalLine = canvas.transparent
    ? "Technical: PNG with transparent background, 300 DPI, sRGB color space, vector-clean edges, no halftone moiré, suitable for direct-to-garment or DTF print."
    : "Technical: 300 DPI raster (PNG) or vector PDF, sRGB/CMYK as required, full-bleed 0.125\" beyond trim, no transparency for poster output.";

  // If the design package has a master prompt, append it as "design reference"
  // — guarded length, sanitized.
  const designPkgRef =
    designPackage && designPackage.masterDesignPrompt
      ? `Design reference brief: ${sanitizeCopy(designPackage.masterDesignPrompt).slice(0, 600)}`
      : "";

  // If the Printify preview is present, append concrete print-area constraints.
  const printifyRef =
    printifyPreview && printifyPreview.recommendedBlueprint
      ? `Target Printify blueprint: ${printifyPreview.recommendedBlueprint.name} (id ${printifyPreview.recommendedBlueprint.blueprint_id}). ${printArea}`
      : printArea
        ? `Print area: ${printArea}`
        : "";

  // Audience hint from listing (kept short).
  const audienceRef =
    listingData && listingData.audienceNotes
      ? `Audience: ${sanitizeCopy(listingData.audienceNotes).slice(0, 240)}`
      : "";

  const artworkPrompt = sanitizeCopy(
    [
      `ARTWORK BRIEF — ${conceptName} (${shape}).`,
      baseLine,
      paletteLine,
      compositionLine,
      wordmarkLine,
      technicalLine,
      designPkgRef,
      printifyRef,
      audienceRef
    ]
      .filter(Boolean)
      .join("\n\n")
  ).slice(0, 4000);

  const styleNotes = sanitizeCopy(
    joinNonEmpty(
      [
        `Aesthetic: ${aesthetic}`,
        `Palette: ${palette}`,
        concept.designStyle ? `Design style: ${concept.designStyle}` : "",
        `Placement: ${placement}`,
        concept.trendAlignment ? `Trend alignment: ${concept.trendAlignment}` : "",
        concept.copyrightRisk ? `IP posture: ${concept.copyrightRisk} risk` : ""
      ],
      " · "
    )
  ).slice(0, 600);

  // Prefer Printify preview's file reqs → design package's print file guidelines
  // → POD prep's print file requirements → shape default. Pick the richest
  // source available so this field never feels "thin".
  const printFileRequirements = sanitizeCopy(
    (printifyPreview && printifyPreview.designFileRequirements) ||
      (designPackage && designPackage.printFileGuidelines) ||
      (podPrep && podPrep.printFileRequirements) ||
      DEFAULT_FILE_REQS_BY_SHAPE[shape] ||
      DEFAULT_FILE_REQS_BY_SHAPE["T-shirt"]
  ).slice(0, 2000);

  return {
    id: uuidv4(),
    isPreviewOnly: true,
    artworkPrompt,
    negativePrompt: STANDARD_NEGATIVE_PROMPT,
    styleNotes,
    recommendedCanvasSize: canvas.size,
    transparentBackgroundRequired: canvas.transparent,
    printFileRequirements,
    status: "prepped",
    generatedImages: [],
    manualUploads: [],
    source: {
      conceptId: concept.id || null,
      podPrepId: podPrep.id || null,
      listingFromConceptId: (listingData && listingData.fromConceptId) || null,
      designPackageId: (designPackage && designPackage.id) || null,
      printifyPreviewId: (printifyPreview && printifyPreview.id) || null
    },
    notes:
      "Preparation mode only — no image APIs are called yet. Paste artworkPrompt + negativePrompt into your image-generation tool (DALL·E / SDXL / Ideogram), or upload artwork manually once exported.",
    createdAt: new Date().toISOString()
  };
}

module.exports = { buildArtworkPrep };
