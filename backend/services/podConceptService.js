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

module.exports = {
  generatePodConcepts,
  buildPodListingFromConcept,
  sanitizeCopy,
  AESTHETICS
};
