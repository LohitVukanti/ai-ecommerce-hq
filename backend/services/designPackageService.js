// ============================================================
// designPackageService.js — AI Design / mockup prep (template layer)
// ============================================================
// Structured mock output for prompts, social, and export specs.
// Replace `buildDesignPackage` internals later with real image APIs
// (same function signature + persisted JSON shape on the product).
// ============================================================

const { v4: uuidv4 } = require("uuid");
const { sanitizeCopy, inferPodProductShape } = require("./podConceptService");

const CATALOG_SHAPE_HINT = {
  "T-shirt": "Emphasize chest print legibility at distance",
  Crewneck: "Watch collar interference — keep art 2.5\" below neckline",
  Hoodie: "Account for pocket break line on front art",
  Poster: "Full-bleed vector or 300 DPI raster; include quiet border for framing",
  "Tote bag": "Vertical composition; avoid handle overlap",
  Sticker: "Bold outlines; min 2mm safe cut margin; kiss-cut friendly"
};

function hashString(s) {
  let h = 0;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * @param {object} product
 * @param {object} concept — selected concept
 * @param {object} listingData — POD listing from generate-listing
 * @param {object} podPrep — from generate-pod-prep
 */
function buildDesignPackage(product, concept, listingData, podPrep) {
  const shape = inferPodProductShape(concept, product);
  const seed = hashString(`${product.id}|${concept.id}|${podPrep.id || ""}`);
  const palette = concept.colorPalette || "Ivory / ink / brass";
  const title = sanitizeCopy(product.title || "Product");
  const listingTitle = sanitizeCopy(listingData.etsyTitle || title);

  const masterDesignPrompt = sanitizeCopy(
    `MASTER ART BRIEF (${shape}) for "${listingTitle}".\n\n` +
      `Visual lane: ${concept.aesthetic} — ${concept.designStyle || "original graphic"}.\n` +
      `Typography-led composition; abstract or geometric accents only; no third-party logos or marks.\n` +
      `Palette: ${palette}. Garment/blank color target: ${podPrep.apparelColor || "neutral base"}.\n` +
      `Print zone: ${podPrep.printPlacement || concept.placement}. ${podPrep.printArea || ""}\n\n` +
      `Technical: transparent PNG artwork layer; 300 DPI minimum; sRGB; keep 0.5" safe margin from seams on textiles.\n` +
      `Printify-ready: align to provider print template; no full-bleed off garment edges unless product allows.\n` +
      `Reference slogan energy (do not copy verbatim if generating variations): ${concept.slogan || "original line"}.`
  );

  const alternateDesignPrompts = [
    sanitizeCopy(
      `ALT A — Minimal: single wordmark + micro-icon, ${concept.aesthetic}, ${palette}, ${shape}, lots of negative space, transparent PNG.`
    ),
    sanitizeCopy(
      `ALT B — Badge: circular seal with abstract wave or court-line motif (no real school seals), ${palette}, centered for ${shape}.`
    ),
    sanitizeCopy(
      `ALT C — Editorial: stacked type + thin rules, magazine cover vibe, ${concept.aesthetic}, high contrast, print-safe for ${shape}.`
    )
  ];

  const mockupPrompts = [
    sanitizeCopy(
      `Flat lay ${shape}: front view on neutral concrete, soft daylight, subtle fabric texture, artwork centered per Printify safe zone — ${concept.mockupPrompt || ""}`.slice(0, 1200)
    ),
    sanitizeCopy(
      `Lifestyle: model 3/4 turn, ${podPrep.apparelStyle || concept.aesthetic} wardrobe match, shallow depth of field, ecommerce crop, highlight ${podPrep.apparelColor || "garment"} vs artwork contrast.`
    ),
    sanitizeCopy(
      `Detail macro: stitch + print edge sharpness check, macro lens, show halftone or line weight clarity for POD QC (${shape}).`
    )
  ];

  const aestheticPack = sanitizeCopy(
    `Mood: ${concept.aesthetic} · ${concept.trendAlignment || "on-trend"} alignment.\n` +
      `Lighting: soft window / golden-hour optional for social variants.\n` +
      `Set dressing: linen, oak, brushed metal props — avoid branded packaging.\n` +
      `Shape focus: ${shape} — ${CATALOG_SHAPE_HINT[shape] || CATALOG_SHAPE_HINT["T-shirt"]}.`
  );

  const typographySuggestions = sanitizeCopy(
    `Primary: condensed grotesk or modern serif for headline (licensed fonts only in production).\n` +
      `Secondary: geometric sans for subcopy; tracking +2–5% on all-caps.\n` +
      `Avoid collegiate fonts that mimic known universities; keep weights 600–800 max for print clarity.`
  );

  const colorSystem = sanitizeCopy(
    `Core: ${palette}.\n` +
      `Neutrals: warm white #F6F1E7, ink #1A1F2C, optional accent pulled from palette second swatch.\n` +
      `Print: solid fills preferred; if gradients, keep vector or high-res raster to avoid banding at 300 DPI.\n` +
      `Sticker/poster: allow CMYK + spot white where supported.`
  );

  const visualDirection = sanitizeCopy(
    `Hero story: "${title}" as a ${shape} piece in the ${concept.aesthetic} lane.\n` +
      `Composition: rule of thirds, clear focal lockup, readable at thumbnail scale (Etsy grid).\n` +
      `Listing alignment: echo keywords from "${listingTitle.slice(0, 80)}…" without duplicating trademarked terms.`
  );

  const printFileGuidelines = sanitizeCopy(
    `Deliverable: PNG with transparent background for apparel/hybrid; PDF vector optional for posters.\n` +
      `Min size: 3600px on long edge for apparel front; posters 5400×7200px @300 DPI for 18×24.\n` +
      `Bleed: +0.125" poster trim; textiles no bleed beyond garment print mask.\n` +
      `Color: embed sRGB profile; flatten transparency only when vendor requires.\n` +
      `Printify: upload through file assistant; verify DPI warning flags before publish.`
  );

  const exportRecommendations = sanitizeCopy(
    `Shop assets: 3000×3000px square hero (PNG), 2000×2000 lifestyle, 1080×1920 story vertical.\n` +
      `Etsy: use listing title + first 3 tags as filename stems for SEO consistency.\n` +
      `Archive: store layered source (AI/PSD) privately; ship flattened PNG to POD.\n` +
      `Future API batch: export JSON bundle { masterDesignPrompt, mockupPrompts[], shape:"${shape}" } for image providers.`
  );

  const socialMediaConcepts = [
    {
      id: `sm-${seed}-1`,
      platform: "Instagram Reel",
      hook: sanitizeCopy(`POV: you just found the ${concept.aesthetic} ${shape} drop.`),
      caption: sanitizeCopy(`${listingTitle.slice(0, 120)} — made to order. Tap shop. Original artwork.`),
      hashtags: ["#pod", "#smallbusiness", "#graphictee", "#madeToOrder", "#originaldesign"].slice(0, 5)
    },
    {
      id: `sm-${seed}-2`,
      platform: "Pinterest / Short",
      hook: sanitizeCopy(`Quiet-luxury layout idea for ${shape} — save for your next launch.`),
      caption: sanitizeCopy(`Mood: ${concept.aesthetic}. Palette: ${palette}. Link in bio.`),
      hashtags: ["#etsyshop", "#printondemand", "#mockup", "#aesthetic", "#designprocess"]
    }
  ];

  const adCreativeIdeas = [
    sanitizeCopy(
      `Static ad: split frame — left flat mockup, right 1-line benefit + CTA "Shop ${shape}".`
    ),
    sanitizeCopy(
      `Carousel ad: slide 1 lifestyle, slide 2 detail macro, slide 3 reviews placeholder, slide 4 urgency "Made to order".`
    ),
    sanitizeCopy(
      `Retargeting: "Still thinking?" + ${concept.aesthetic} color bar + small trust badge (shipping/returns copy only).`
    )
  ];

  const imageGenerationProviderReady = true;

  return {
    id: uuidv4(),
    selectedConceptId: concept.id,
    masterDesignPrompt,
    alternateDesignPrompts,
    mockupPrompts,
    socialMediaConcepts,
    aestheticPack,
    typographySuggestions,
    colorSystem,
    visualDirection,
    printFileGuidelines,
    exportRecommendations,
    adCreativeIdeas,
    imageGenerationProviderReady,
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  buildDesignPackage
};
