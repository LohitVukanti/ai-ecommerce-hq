// ============================================================
// podConceptService.js — POD apparel concepts + listing (template)
// ============================================================
// Rule-based / structured mock generation — no paid OpenAI.
// Swap `generatePodConcepts` / `buildPodListingFromConcept` internals
// later for OpenAI while keeping the same exported function shapes.
// ============================================================

const { v4: uuidv4 } = require("uuid");

const AESTHETICS = [
  "old money",
  "coastal",
  "quiet luxury",
  "vintage gym",
  "tennis club",
  "yacht club",
  "country club",
  "streetwear",
  "minimalist",
  "collegiate",
  "beach club",
  "resort"
];

/** Block obvious luxury/sportswear marks — replace with neutral wording */
const TRADEMARK_PATTERN =
  /\b(nike|adidas|gucci|louis\s*vuitton|\blv\b|chanel|prada|versace|burberry|supreme|balenciaga|herm[eè]s|cartier|rolex|polo\s*ralph|ralph\s*lauren|lacoste|tommy\s*hilfiger|calvin\s*klein|under\s*armour|lululemon|yeezy|jordan)\b/gi;

const IP_SAFETY_PREFIX =
  "Original artwork only — no logos or marks resembling third-party brands. Use generic typography and abstract motifs.";

function sanitizeCopy(text) {
  if (!text || typeof text !== "string") return "";
  return text.replace(TRADEMARK_PATTERN, "generic-brand").replace(/\s+/g, " ").trim();
}

function hashString(s) {
  let h = 0;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function parseDescriptionContext(description) {
  const d = description || "";
  let niche = "";
  let targetCustomer = "";
  let notes = "";
  let opportunityScore = null;

  const nicheMatch = d.match(/Niche:\s*([^\n]+)/i);
  if (nicheMatch) niche = nicheMatch[1].trim();

  const tcMatch = d.match(/Target customer:\s*([^\n]+)/i);
  if (tcMatch) targetCustomer = tcMatch[1].trim();

  const notesMatch = d.match(/Research notes:\s*([\s\S]*?)(?=Intake opportunity score:|$)/i);
  if (notesMatch) notes = notesMatch[1].trim();

  const scoreMatch = d.match(/Intake opportunity score:\s*(\d+)/i);
  if (scoreMatch) opportunityScore = Number(scoreMatch[1]);

  return { niche, targetCustomer, notes, opportunityScore };
}

function buildContext(product) {
  const fromDesc = parseDescriptionContext(product.description);
  const title = sanitizeCopy(product.title || "Untitled");
  const category = sanitizeCopy(product.category || "General");
  const seed = hashString(product.id + title);

  return {
    title,
    category,
    niche: fromDesc.niche || category,
    productType: category,
    targetCustomer:
      fromDesc.targetCustomer ||
      (title.length > 20 ? "Style-conscious adults 25–45" : "Everyday buyers who value quality basics"),
    ideaNotes: sanitizeCopy(fromDesc.notes.slice(0, 800)),
    opportunityScore: fromDesc.opportunityScore,
    seed
  };
}

const CLUB_PREFIXES = [
  "Harbor",
  "Crestline",
  "Pelican",
  "Northbridge",
  "Silver",
  "Bay",
  "Lighthouse",
  "Maritime",
  "Summit",
  "Willow",
  "Fairway",
  "Tide",
  "Beacon",
  "Highland",
  "Cypress"
];

const CLUB_SUFFIXES = [
  "Athletic Club",
  "Rowing Society",
  "Sailing Circle",
  "Racquet Guild",
  "Field Club",
  "Studio Collective",
  "Social Club",
  "League",
  "House",
  "Guild",
  "Circle",
  "Workshop"
];

const SLOGAN_LEADS = [
  "Earned, not borrowed",
  "Quiet confidence",
  "Salt air standards",
  "Heritage in motion",
  "Court to coast",
  "Where discipline meets ease",
  "Made for members only — of your own story",
  "Stitch the legend lightly",
  "Soft power, hard standards",
  "Weekends with purpose"
];

const SLOGAN_TAILS = [
  "— original club series",
  "— limited capsule",
  "— wear it like tradition",
  "— POD-safe originals",
  "— no logos, all attitude"
];

const APPAREL_TYPES = [
  "Premium heavyweight tee",
  "Oversized crew sweatshirt",
  "Vintage-wash hoodie",
  "Unisex rugby shirt",
  "Relaxed-fit polo",
  "Lightweight quarter-zip",
  "Tank / club jersey",
  "Coach jacket (shell)"
];

const PLACEMENTS = [
  "Left chest typographic lockup (3–3.5\")",
  "Center chest minimal wordmark",
  "Upper back arc text + small front icon",
  "Sleeve hit + small chest badge",
  "Center back large format (max 12\") with small front corner mark"
];

const PALETTES = [
  "Ivory, navy, brass accent",
  "Sand, slate, washed black",
  "Cream, forest, muted gold",
  "Heather grey, charcoal, signal white",
  "Seafoam, bone, deep teal",
  "Oxblood, oatmeal, ink",
  "Powder blue, white, chocolate trim"
];

function marginPct(sell, cost) {
  if (!sell || sell <= 0) return "—";
  const m = ((sell - cost) / sell) * 100;
  return `${Math.max(0, Math.round(m))}%`;
}

function trendAlignmentFromScore(score, seed) {
  if (score == null) return pick(["Moderate", "Moderate", "Niche"], seed);
  if (score >= 75) return "High";
  if (score >= 50) return "Moderate";
  return "Niche";
}

function copyrightRiskLabel(aesthetic, seed) {
  // Template avoids marks; streetwear gets slightly higher caution in copy
  if (aesthetic === "streetwear") return pick(["Low", "Moderate"], seed + 1);
  return "Low";
}

function recommendedStatusFor(index, copyrightRisk, seed) {
  if (copyrightRisk === "Moderate") return pick(["alternate", "experimental"], seed);
  if (index === 0) return "strong_candidate";
  if (index === 1) return "strong_candidate";
  if (index === 2) return "alternate";
  return "experimental";
}

/**
 * Generate 3–5 unique POD concepts from product fields (+ idea notes if embedded in description).
 * @param {object} product — row from DB
 * @returns {{ concepts: object[] }}
 */
function generatePodConcepts(product) {
  const ctx = buildContext(product);
  const count = 3 + (ctx.seed % 3);
  const concepts = [];
  const usedAesthetics = new Set();

  for (let i = 0; i < count; i++) {
    const s = ctx.seed + i * 7919;
    let aesthetic = pick(AESTHETICS, s);
    let guard = 0;
    while (usedAesthetics.has(aesthetic) && guard < 20) {
      aesthetic = pick(AESTHETICS, s + guard + 3);
      guard++;
    }
    usedAesthetics.add(aesthetic);

    const clubName = `${pick(CLUB_PREFIXES, s)} ${pick(CLUB_SUFFIXES, s + 11)}`;
    const conceptName = `${clubName} — ${aesthetic}`;
    const slogan = `${pick(SLOGAN_LEADS, s + 2)} ${pick(SLOGAN_TAILS, s + 5)}`;
    const apparelType = pick(APPAREL_TYPES, s + 7);
    const placement = pick(PLACEMENTS, s + 13);
    const colorPalette = pick(PALETTES, s + 17);
    const designStyle = `${aesthetic} · clean line art · no third-party marks`;
    const targetCustomer = ctx.targetCustomer;
    const baseSell = 28 + (s % 18);
    const baseCost = 9 + (s % 6);
    const adj = ctx.opportunityScore != null ? (ctx.opportunityScore - 50) / 100 : 0;
    const estimatedSellingPrice = Math.round(baseSell + adj * 8);
    const estimatedProductionCost = Math.round(baseCost + adj * 2);
    const trendAlignment = trendAlignmentFromScore(ctx.opportunityScore, s + i);
    const copyrightRisk = copyrightRiskLabel(aesthetic, s);
    const recommendedStatus = recommendedStatusFor(i, copyrightRisk, s);

    const designNotes = sanitizeCopy(
      `${IP_SAFETY_PREFIX}\n\n` +
        `Niche angle: ${ctx.niche}. ` +
        `Lead with typography and abstract nautical / court / prep motifs — avoid crests that imitate known universities or sports leagues. ` +
        (ctx.ideaNotes ? `Brief from research: ${ctx.ideaNotes.slice(0, 280)}` : "")
    );

    const mockupPrompt = sanitizeCopy(
      `${IP_SAFETY_PREFIX}\n` +
        `Flat-lay ${apparelType.toLowerCase()}, ${colorPalette} palette, ` +
        `${placement}. ` +
        `Style: ${aesthetic}. ` +
        `Show subtle texture; no recognizable logos; original lettering only reading "${slogan.split("—")[0].trim().slice(0, 42)}". ` +
        `Lighting: soft natural window light, ecommerce-ready.`
    );

    concepts.push({
      id: uuidv4(),
      conceptName: sanitizeCopy(conceptName),
      slogan: sanitizeCopy(slogan),
      aesthetic,
      targetCustomer: sanitizeCopy(targetCustomer),
      designStyle,
      placement,
      colorPalette,
      apparelType,
      designNotes,
      mockupPrompt,
      estimatedSellingPrice,
      estimatedProductionCost,
      estimatedMargin: marginPct(estimatedSellingPrice, estimatedProductionCost),
      copyrightRisk,
      trendAlignment,
      recommendedStatus,
      conceptStatus: "generated",
      generatedAt: new Date().toISOString()
    });
  }

  return { concepts };
}

/**
 * Etsy-oriented listing from a chosen concept (template; OpenAI-ready shape).
 * @param {object} product
 * @param {object} concept — one element from generatedConcepts
 */
function buildPodListingFromConcept(product, concept) {
  if (!concept) return null;

  const titleBase = sanitizeCopy(concept.conceptName.split("—")[0].trim());
  const tags = [
    "pod apparel",
    "graphic tee",
    "minimalist gift",
    sanitizeCopy(product.category || "apparel").toLowerCase().slice(0, 20),
    concept.aesthetic.replace(/\s+/g, ""),
    "unisex streetwear",
    "vintage inspired",
    "quiet luxury",
    "coastal grandmother",
    "tennis aesthetic",
    "yacht club style",
    "collegiate inspired",
    "original design",
    "made to order"
  ]
    .map((t) => t.replace(/[^a-z0-9\s]/gi, "").trim().toLowerCase())
    .filter(Boolean);

  const uniqueTags = [...new Set(tags)].slice(0, 13);

  const etsyTitle = sanitizeCopy(
    `${titleBase} ${concept.apparelType} | ${concept.aesthetic} Original Graphic | POD`
  ).slice(0, 140);

  const seoKeywords = [
    `${concept.aesthetic} apparel`,
    `${product.title?.slice(0, 40) || "graphic tee"} gift`,
    "print on demand shirt",
    "original slogan tee",
    "neutral wardrobe",
    "elevated basics"
  ].map(sanitizeCopy);

  const desc = sanitizeCopy(
    `${etsyTitle}\n\n` +
      `${concept.slogan}\n\n` +
      `Why buyers love it:\n` +
      `- ${concept.designStyle}\n` +
      `- Placement: ${concept.placement}\n` +
      `- Palette: ${concept.colorPalette}\n\n` +
      `Fit & production:\n` +
      `Made to order (${concept.apparelType}). Sizing chart in images — order your usual size for relaxed fit.\n\n` +
      `IP note: Original artwork only; no affiliation with third-party brands or institutions.\n\n` +
      `Keywords: ${uniqueTags.join(", ")}`
  );

  const suggested = concept.estimatedSellingPrice || 32;

  return {
    etsyTitle,
    etsyTags: uniqueTags,
    etsyDescription: desc,
    seoKeywords,
    pricingRecommendation: {
      label: "Suggested retail (POD)",
      suggested: suggested,
      min: Math.max(12, Math.round(suggested * 0.85)),
      max: Math.round(suggested * 1.25),
      basis: `Template estimate from concept margin ${concept.estimatedMargin}; adjust for your POD provider fees.`
    },
    audienceNotes: sanitizeCopy(
      `Primary: ${concept.targetCustomer}. ` +
        `Trend alignment: ${concept.trendAlignment}. ` +
        `Copyright posture: keep artwork abstract/typographic; refresh seasonally.`
    ),
    generatedAt: new Date().toISOString(),
    fromConceptId: concept.id
  };
}

/** Map concept + product text to one of the supported prep catalog shapes. */
function inferPodProductShape(concept, product) {
  const combined = `${concept.apparelType || ""} ${product.title || ""} ${product.category || ""} ${product.description || ""}`.toLowerCase();
  if (/\bposter\b|wall art|fine art print/.test(combined)) return "Poster";
  if (/tote|canvas bag|carryall/.test(combined)) return "Tote bag";
  if (/sticker|vinyl decal|die cut/.test(combined)) return "Sticker";
  const t = (concept.apparelType || "").toLowerCase();
  if (/hoodie/.test(t)) return "Hoodie";
  if (/sweat|crew|quarter|coach|shell|rugby/.test(t)) return "Crewneck";
  return "T-shirt";
}

const PRINT_AREA_BY_SHAPE = {
  "T-shirt": 'Front: ~12" × 16" max print (keep 1" from collar/side seams). Back optional ~12" × 15".',
  Crewneck: 'Front chest or center: ~11" × 11"; back large up to ~12" × 14" on midweight fleece.',
  Hoodie: 'Front kangaroo-safe zone ~10" × 12"; back max ~13" × 16" — watch pocket seam alignment.',
  Poster: '18" × 24" or 24" × 36" trim — full bleed 0.125" beyond cut; 300 DPI raster or vector.',
  "Tote bag": 'Front panel ~10" × 12" centered between handles; avoid strap attachment zones.',
  Sticker: 'Kiss-cut sheet or individual die-cut; min stroke 0.25 pt; CMYK + white ink layer if offered.'
};

const CATALOG_BLURB_BY_SHAPE = {
  "T-shirt": "Tee — Bella+Canvas 3001–class garment (prep catalog label, not a live Printify SKU)",
  Crewneck: "Crew / fleece — midweight sweatshirt blank class (prep)",
  Hoodie: "Hoodie — midweight fleece blank class (prep)",
  Poster: "Matte or semi-gloss poster stock — rolled ship (prep)",
  "Tote bag": "Natural canvas tote — 10 oz class (prep)",
  Sticker: "Vinyl die-cut sticker — durable laminate class (prep)"
};

/**
 * Template-based Printify-oriented POD prep (no API keys).
 * Later: replace body with Printify catalog + pricing API while keeping this return shape.
 * @param {object} product
 * @param {object} concept — must be the selected concept
 * @returns {object|null}
 */
function buildPodPrepFromConcept(product, concept) {
  if (!concept) return null;

  const shape = inferPodProductShape(concept, product);
  const seed = hashString((product.id || "") + (concept.id || "") + shape);

  const sell = Math.max(8, Number(concept.estimatedSellingPrice) || 32);
  let cost = Math.max(3, Number(concept.estimatedProductionCost) || 11);

  const shapeCostBump = { "T-shirt": 0, Crewneck: 4, Hoodie: 7, Poster: 2, "Tote bag": 3, Sticker: 0.5 };
  cost = Math.round((cost + (shapeCostBump[shape] || 0) + (seed % 3)) * 100) / 100;

  const profit = Math.round((sell - cost) * 100) / 100;
  const marginPct = sell > 0 ? Math.round(((sell - cost) / sell) * 1000) / 10 : 0;

  const palette = concept.colorPalette || "Heather / core neutrals";
  const apparelColor = sanitizeCopy(palette.split(",")[0].trim() || "Heather Navy");

  const printPlacement = concept.placement || "Front chest — typographic lockup";
  const printArea = PRINT_AREA_BY_SHAPE[shape] || PRINT_AREA_BY_SHAPE["T-shirt"];

  const fulfillmentNotes = sanitizeCopy(
    `Prep mode only — not connected to Printify.\n` +
      `When live: create product in Printify, map this placement to their print area, ` +
      `enable flat mockups + lifestyle set, and confirm shipping profile (standard vs expedited). ` +
      `Shape: ${shape} — double-check variant colors match "${apparelColor}" swatch.`
  );

  const mockupInstructions = sanitizeCopy(
    `${concept.mockupPrompt || ""}\n\n` +
      `Printify mockup pass: flat front + 3/4 model; background neutral; ` +
      `highlight ${concept.aesthetic} palette (${palette}).`
  );

  const printFileRequirements = sanitizeCopy(
    `Deliver PNG at 300 DPI (min 3600px on long edge for ${shape}), transparent background for apparel, ` +
      `sRGB color space. No embedded trademark art. ` +
      `Safe margin: 0.5" from seams on textiles. ` +
      `For ${shape}: follow Printify file assistant once connected.`
  );

  const riskNotes = sanitizeCopy(
    `IP: use only original artwork; avoid varsity/collegiate marks and luxury house codes. ` +
      `Color: garment dye lots vary — note in listing. ` +
      `Returns: clarify made-to-order policy before enabling live sync. ` +
      `Concept copyright risk flagged as: ${concept.copyrightRisk || "unknown"}.`
  );

  return {
    id: uuidv4(),
    selectedConceptId: concept.id,
    provider: "Printify",
    recommendedProductType: CATALOG_BLURB_BY_SHAPE[shape],
    apparelStyle: sanitizeCopy(`${concept.aesthetic} · ${concept.designStyle || "original graphic"}`),
    apparelColor,
    printPlacement: sanitizeCopy(printPlacement),
    printArea,
    productionCostEstimate: cost,
    recommendedSellingPrice: sell,
    estimatedProfit: profit,
    estimatedMarginPercent: marginPct,
    fulfillmentNotes,
    mockupInstructions,
    printFileRequirements,
    riskNotes,
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  generatePodConcepts,
  buildPodListingFromConcept,
  buildPodPrepFromConcept,
  inferPodProductShape,
  sanitizeCopy,
  AESTHETICS
};
