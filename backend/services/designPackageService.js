// ============================================================
// designPackageService.js — AI Design / mockup prep (template layer)
// ============================================================
// Structured mock output for prompts, social, and export specs.
// Replace `buildDesignPackage` internals later with real image APIs
// (same function signature + persisted JSON shape on the product).
// ============================================================

const { v4: uuidv4 } = require("uuid");
const { sanitizeCopy, inferPodProductShape } = require("./podConceptService");
const { generateJsonWithOpenAI } = require("./openaiTextService");

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

// ============================================================
// Optional OpenAI augmentation
// ============================================================
// Always builds the full template package first; if OpenAI is
// configured and returns valid JSON, the prompt + creative copy
// fields are replaced. Identity/timestamp/flag fields stay
// authoritative from this service.
// ============================================================

const DESIGN_PKG_SYSTEM = `You are an art director for an Etsy / POD apparel brand.
You MUST respond with a single valid JSON object only (no markdown fences, no commentary).
No third-party trademarks, no celebrity likenesses, no real luxury or sports brands.
Prompts must be ready for a downstream image-generation API (DALL·E, SDXL, Ideogram).`;

function buildDesignPackageUserPrompt(product, concept, listingData, podPrep, shape) {
  return `Produce a design package for the POD product below.
Return ONE JSON object with EXACTLY these keys:
{
  "masterDesignPrompt": string,
  "alternateDesignPrompts": string[3],
  "mockupPrompts": string[3],
  "aestheticPack": string,
  "typographySuggestions": string,
  "colorSystem": string,
  "visualDirection": string,
  "printFileGuidelines": string,
  "exportRecommendations": string,
  "adCreativeIdeas": string[3],
  "socialMediaConcepts": [
    {
      "platform": string,
      "hook": string,
      "caption": string,
      "hashtags": string[]
    },
    {
      "platform": string,
      "hook": string,
      "caption": string,
      "hashtags": string[]
    }
  ]
}

Garment / blank shape: ${JSON.stringify(shape)}
Concept:
- conceptName: ${JSON.stringify(concept.conceptName)}
- slogan: ${JSON.stringify(concept.slogan)}
- aesthetic: ${JSON.stringify(concept.aesthetic)}
- designStyle: ${JSON.stringify(concept.designStyle || "")}
- placement: ${JSON.stringify(concept.placement)}
- colorPalette: ${JSON.stringify(concept.colorPalette)}
- apparelType: ${JSON.stringify(concept.apparelType)}

POD prep:
- recommendedProductType: ${JSON.stringify(podPrep.recommendedProductType || "")}
- apparelColor: ${JSON.stringify(podPrep.apparelColor || "")}
- printPlacement: ${JSON.stringify(podPrep.printPlacement || "")}
- printArea: ${JSON.stringify(podPrep.printArea || "")}
- estimatedMarginPercent: ${podPrep.estimatedMarginPercent ?? ""}

Listing:
- etsyTitle: ${JSON.stringify(listingData.etsyTitle || "")}
- audienceNotes: ${JSON.stringify(listingData.audienceNotes || "")}

Constraints:
- Each prompt 60-220 words, suitable for an image-generation API.
- Keep transparent-background guidance for apparel art.
- Mention 300 DPI / sRGB / safe-margin notes in printFileGuidelines.`;
}

function pickArrayOfStrings(val, expectedLen, fallback) {
  if (!Array.isArray(val)) return fallback;
  const cleaned = val
    .map((s) => (typeof s === "string" ? sanitizeCopy(s) : ""))
    .filter(Boolean);
  if (cleaned.length === 0) return fallback;
  // Pad with template entries if we got fewer than expected
  const out = cleaned.slice(0, expectedLen);
  while (out.length < expectedLen && fallback[out.length]) {
    out.push(fallback[out.length]);
  }
  return out;
}

function pickSocialConcepts(val, fallback) {
  if (!Array.isArray(val) || val.length === 0) return fallback;
  return val.slice(0, 2).map((sm, i) => {
    const fb = fallback[i] || fallback[0];
    return {
      id: fb.id, // preserve our IDs for stability
      platform:
        typeof sm?.platform === "string" && sm.platform.trim()
          ? sanitizeCopy(sm.platform).slice(0, 60)
          : fb.platform,
      hook:
        typeof sm?.hook === "string" && sm.hook.trim()
          ? sanitizeCopy(sm.hook).slice(0, 240)
          : fb.hook,
      caption:
        typeof sm?.caption === "string" && sm.caption.trim()
          ? sanitizeCopy(sm.caption).slice(0, 600)
          : fb.caption,
      hashtags:
        Array.isArray(sm?.hashtags) && sm.hashtags.length
          ? sm.hashtags
              .map((h) => sanitizeCopy(String(h || "")))
              .filter(Boolean)
              .slice(0, 10)
          : fb.hashtags
    };
  });
}

async function buildDesignPackageAsync(product, concept, listingData, podPrep) {
  const template = buildDesignPackage(product, concept, listingData, podPrep);
  const shape = inferPodProductShape(concept, product);

  const result = await generateJsonWithOpenAI({
    system: DESIGN_PKG_SYSTEM,
    user: buildDesignPackageUserPrompt(product, concept, listingData, podPrep, shape),
    traceLabel: "design package",
    temperature: 0.7
  });

  if (!result.ok) return template;
  const raw = result.data || {};

  return {
    ...template, // preserves id, selectedConceptId, imageGenerationProviderReady, createdAt
    masterDesignPrompt:
      typeof raw.masterDesignPrompt === "string" && raw.masterDesignPrompt.trim()
        ? sanitizeCopy(raw.masterDesignPrompt).slice(0, 4000)
        : template.masterDesignPrompt,
    alternateDesignPrompts: pickArrayOfStrings(
      raw.alternateDesignPrompts,
      3,
      template.alternateDesignPrompts
    ),
    mockupPrompts: pickArrayOfStrings(raw.mockupPrompts, 3, template.mockupPrompts),
    aestheticPack:
      typeof raw.aestheticPack === "string" && raw.aestheticPack.trim()
        ? sanitizeCopy(raw.aestheticPack).slice(0, 2000)
        : template.aestheticPack,
    typographySuggestions:
      typeof raw.typographySuggestions === "string" && raw.typographySuggestions.trim()
        ? sanitizeCopy(raw.typographySuggestions).slice(0, 1500)
        : template.typographySuggestions,
    colorSystem:
      typeof raw.colorSystem === "string" && raw.colorSystem.trim()
        ? sanitizeCopy(raw.colorSystem).slice(0, 1500)
        : template.colorSystem,
    visualDirection:
      typeof raw.visualDirection === "string" && raw.visualDirection.trim()
        ? sanitizeCopy(raw.visualDirection).slice(0, 2000)
        : template.visualDirection,
    printFileGuidelines:
      typeof raw.printFileGuidelines === "string" && raw.printFileGuidelines.trim()
        ? sanitizeCopy(raw.printFileGuidelines).slice(0, 2000)
        : template.printFileGuidelines,
    exportRecommendations:
      typeof raw.exportRecommendations === "string" && raw.exportRecommendations.trim()
        ? sanitizeCopy(raw.exportRecommendations).slice(0, 2000)
        : template.exportRecommendations,
    adCreativeIdeas: pickArrayOfStrings(raw.adCreativeIdeas, 3, template.adCreativeIdeas),
    socialMediaConcepts: pickSocialConcepts(raw.socialMediaConcepts, template.socialMediaConcepts)
  };
}

module.exports = {
  buildDesignPackage,
  buildDesignPackageAsync
};
