const fs = require("fs");
const path = require("path");

const {
  getAllTrendScans,
  createProduct,
  getProductById,
  updateProduct
} = require("../data/db");
const { computeOpportunityScores } = require("./opportunityScorer");
const { generateJsonWithOpenAI } = require("./openaiTextService");
const { generateProductContent } = require("./aiService");
const {
  generatePodConceptsAsync,
  buildPodListingFromConceptAsync,
  buildPodPrepFromConcept
} = require("./podConceptService");
const { buildDesignPackageAsync } = require("./designPackageService");
const { buildPrintifyPreview } = require("./printifyPreviewService");
const { buildArtworkPrep } = require("./artworkPrepService");
const imageGenService = require("./integrations/imageGenerationService");
const {
  ARTWORK_DIR,
  addItem,
  buildNewItem,
  deriveArtworkStatus,
  getItems
} = require("./artworkAssetService");

const FALLBACK_NOTICE = "Using fallback templates because AI generation is unavailable.";

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));

const safe = (value) => String(value || "").trim();

const uniq = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = safe(item).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function scoreText(text, positives, negatives, base = 55) {
  const t = safe(text).toLowerCase();
  let score = base + Math.min(24, Math.floor(t.length / 18));
  for (const rx of positives) if (rx.test(t)) score += 10;
  for (const rx of negatives) if (rx.test(t)) score -= 12;
  return clamp(score);
}

function inferDifficulty(text) {
  const t = safe(text).toLowerCase();
  if (/(high|hard|complex|crowded|saturated|copyright|trademark)/.test(t)) return "Medium";
  if (/(low|easy|simple|niche|few|print|pod)/.test(t)) return "Easy";
  return "Medium";
}

function normalizeProductType(value) {
  const v = safe(value);
  if (v) return v;
  return "POD apparel";
}

function buildOpportunityFromTrend(scan, index = 0) {
  const titleSeed = safe(scan.productAngle) || safe(scan.trendKeyword) || `Trend opportunity ${index + 1}`;
  const niche = safe(scan.niche) || safe(scan.trendKeyword) || "Lifestyle niche";
  const targetAudience = safe(scan.targetCustomer) || "Etsy shoppers looking for original giftable designs";
  const productType = normalizeProductType(scan.productType);
  const trendExplanation = uniq([
    scan.trendStrength && `Trend strength: ${scan.trendStrength}`,
    scan.observedEngagement && `Demand signal: ${scan.observedEngagement}`,
    scan.notes && `Notes: ${scan.notes}`,
    scan.sourcePlatform && `Observed on ${scan.sourcePlatform}`
  ]).join(" ");

  const demand = scoreText(
    `${scan.observedEngagement} ${scan.trendStrength} ${scan.notes}`,
    [/viral/, /high/, /strong/, /growing/, /sold/, /views/, /likes/, /search/, /repeat/],
    [/weak/, /unclear/, /unknown/],
    52
  );
  const competitionFriendly = scoreText(
    scan.competitionSignal,
    [/low/, /few/, /niche/, /fragmented/, /blue ocean/],
    [/high/, /saturated/, /crowded/, /dominated/],
    58
  );
  const uniqueness = scoreText(
    `${scan.productAngle} ${scan.notes}`,
    [/original/, /specific/, /personal/, /micro/, /niche/, /new/, /twist/],
    [/generic/, /copy/, /trend only/],
    56
  );
  const etsySuitability = scoreText(
    `${targetAudience} ${productType} ${niche}`,
    [/gift/, /personal/, /wedding/, /mom/, /teacher/, /home/, /shirt/, /tee/, /sweatshirt/, /print/, /planner/],
    [/regulated/, /electronics/, /inventory/],
    60
  );
  const podSuitability = scoreText(
    `${productType} ${scan.productAngle} ${scan.notes}`,
    [/shirt/, /tee/, /sweatshirt/, /hoodie/, /mug/, /tote/, /poster/, /print/, /pod/, /apparel/],
    [/fragile/, /handmade only/, /shipping heavy/],
    62
  );
  const profitPotential = scoreText(
    `${productType} ${targetAudience} ${scan.competitionSignal}`,
    [/premium/, /gift/, /custom/, /bundle/, /low/, /pod/],
    [/cheap/, /high competition/, /commodity/],
    58
  );

  const opportunityScore = clamp(
    demand * 0.22 +
      competitionFriendly * 0.16 +
      uniqueness * 0.16 +
      etsySuitability * 0.16 +
      podSuitability * 0.15 +
      profitPotential * 0.15
  );

  return {
    id: `trend-${scan.id || index}`,
    source: "trend_scanner",
    sourceTrendId: scan.id || null,
    title: titleSeed,
    niche,
    targetAudience,
    productType,
    trendExplanation:
      trendExplanation ||
      `This opportunity is based on the "${safe(scan.trendKeyword) || niche}" trend scanner entry.`,
    estimatedDifficulty: inferDifficulty(`${scan.competitionSignal} ${scan.notes}`),
    opportunityScore,
    demand,
    competition: 100 - competitionFriendly,
    uniqueness,
    etsySuitability,
    podSuitability,
    profitPotential,
    originalTrend: scan
  };
}

function starterOpportunities() {
  return [
    {
      title: "Coastal Grandparent Club Sweatshirt",
      niche: "Coastal lifestyle apparel",
      targetAudience: "Gift buyers and casual apparel shoppers who like nostalgic beach-house humor",
      productType: "POD sweatshirt",
      trendExplanation:
        "Starter opportunity for empty trend data: giftable lifestyle apparel with clear POD fit and low fulfillment complexity."
    },
    {
      title: "Teacher Off-Duty Minimal Tee",
      niche: "Teacher gifts",
      targetAudience: "Teachers and back-to-school gift buyers",
      productType: "POD t-shirt",
      trendExplanation:
        "Starter opportunity for empty trend data: evergreen Etsy audience, clear seasonal spikes, and simple apparel execution."
    },
    {
      title: "Pickleball Social Club Tote",
      niche: "Pickleball lifestyle",
      targetAudience: "Pickleball players buying playful accessories for league days and tournaments",
      productType: "POD tote bag",
      trendExplanation:
        "Starter opportunity for empty trend data: fast-growing hobby culture with giftable, non-IP design angles."
    }
  ].map((item, index) =>
    buildOpportunityFromTrend(
      {
        id: `starter-${index}`,
        trendKeyword: item.niche,
        productAngle: item.title,
        productType: item.productType,
        targetCustomer: item.targetAudience,
        niche: item.niche,
        trendStrength: item.trendExplanation,
        competitionSignal: "medium",
        observedEngagement: "evergreen Etsy demand signal"
      },
      index
    )
  );
}

function normalizeAiOpportunities(raw, fallback) {
  const arr = Array.isArray(raw?.opportunities) ? raw.opportunities : [];
  const out = arr
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const base = fallback[index % Math.max(1, fallback.length)] || {};
      const opportunity = {
        ...base,
        id: `ai-${index}-${Date.now()}`,
        source: "openai",
        title: safe(item.title) || base.title,
        niche: safe(item.niche) || base.niche,
        targetAudience: safe(item.targetAudience || item.target_customer) || base.targetAudience,
        productType: safe(item.productType || item.product_type) || base.productType,
        trendExplanation: safe(item.trendExplanation || item.trend_explanation) || base.trendExplanation,
        estimatedDifficulty: safe(item.estimatedDifficulty || item.estimated_difficulty) || base.estimatedDifficulty,
        demand: clamp(item.demand ?? base.demand),
        competition: clamp(item.competition ?? base.competition),
        uniqueness: clamp(item.uniqueness ?? base.uniqueness),
        etsySuitability: clamp(item.etsySuitability ?? item.etsy_suitability ?? base.etsySuitability),
        podSuitability: clamp(item.podSuitability ?? item.pod_suitability ?? base.podSuitability),
        profitPotential: clamp(item.profitPotential ?? item.profit_potential ?? base.profitPotential)
      };
      opportunity.opportunityScore = clamp(
        item.opportunityScore ??
          item.opportunity_score ??
          opportunity.demand * 0.22 +
            (100 - opportunity.competition) * 0.16 +
            opportunity.uniqueness * 0.16 +
            opportunity.etsySuitability * 0.16 +
            opportunity.podSuitability * 0.15 +
            opportunity.profitPotential * 0.15
      );
      return opportunity;
    })
    .filter(Boolean);

  return out.length ? out : fallback;
}

async function discoverOpportunities() {
  const scans = getAllTrendScans();
  const templateBase = scans.length
    ? scans.map((scan, index) => buildOpportunityFromTrend(scan, index))
    : starterOpportunities();

  const topBase = templateBase
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 8);

  const trendContext = scans.slice(0, 12).map((scan) => ({
    trendKeyword: scan.trendKeyword,
    sourcePlatform: scan.sourcePlatform,
    observedEngagement: scan.observedEngagement,
    productAngle: scan.productAngle,
    targetCustomer: scan.targetCustomer,
    productType: scan.productType,
    niche: scan.niche,
    trendStrength: scan.trendStrength,
    competitionSignal: scan.competitionSignal,
    notes: safe(scan.notes).slice(0, 500)
  }));

  const aiResult = await generateJsonWithOpenAI({
    traceLabel: "launch opportunity discovery",
    temperature: 0.55,
    maxTokens: 1800,
    system:
      "You are a senior Etsy/POD opportunity strategist. Return one valid JSON object only. Do not include markdown.",
    user:
      `Analyze this trend scanner data and produce 4-6 POD/Etsy product opportunities. ` +
      `Each opportunity must include title, niche, targetAudience, productType, trendExplanation, ` +
      `estimatedDifficulty, demand, competition, uniqueness, etsySuitability, podSuitability, ` +
      `profitPotential, opportunityScore. Scores are 0-100; competition means higher competition.\n\n` +
      JSON.stringify({ trendScannerData: trendContext, templateBaseline: topBase }, null, 2)
  });

  const opportunities = normalizeAiOpportunities(aiResult.ok ? aiResult.data : null, topBase)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 6);

  return {
    mode: aiResult.ok ? "live" : "mock",
    fallbackNotice: aiResult.ok ? null : FALLBACK_NOTICE,
    trendScanCount: scans.length,
    opportunities
  };
}

function sourceIntentFromInput(input) {
  const opportunity = input?.opportunity && typeof input.opportunity === "object" ? input.opportunity : null;
  const manualIdea = input?.manualIdea && typeof input.manualIdea === "object" ? input.manualIdea : null;

  if (opportunity) {
    return {
      origin: "opportunity",
      originalIdea: safe(opportunity.title),
      title: safe(opportunity.title),
      niche: safe(opportunity.niche),
      targetCustomer: safe(opportunity.targetAudience),
      productType: safe(opportunity.productType),
      trendExplanation: safe(opportunity.trendExplanation),
      opportunityScore: opportunity.opportunityScore ?? null,
      demand: opportunity.demand ?? null,
      competition: opportunity.competition ?? null,
      uniqueness: opportunity.uniqueness ?? null,
      etsySuitability: opportunity.etsySuitability ?? null,
      podSuitability: opportunity.podSuitability ?? null,
      profitPotential: opportunity.profitPotential ?? null,
      estimatedDifficulty: safe(opportunity.estimatedDifficulty)
    };
  }

  return {
    origin: "manual",
    originalIdea: safe(manualIdea?.idea || input?.idea || ""),
    title: safe(manualIdea?.idea || input?.idea || "New product idea"),
    niche: safe(manualIdea?.niche || ""),
    targetCustomer: safe(manualIdea?.targetCustomer || ""),
    productType: safe(manualIdea?.productType || "POD apparel"),
    trendExplanation: safe(manualIdea?.notes || ""),
    opportunityScore: null,
    estimatedDifficulty: "Medium"
  };
}

function buildProductPayloadFromIntent(intent) {
  const readable = [
    `Original user idea: ${intent.originalIdea || intent.title}`,
    intent.targetCustomer && `Target customer: ${intent.targetCustomer}`,
    intent.niche && `Niche: ${intent.niche}`,
    intent.productType && `Product type: ${intent.productType}`,
    intent.trendExplanation && `Research notes:\n${intent.trendExplanation}`,
    intent.opportunityScore != null &&
      `Intake opportunity score: ${intent.opportunityScore}/100 (${intent.estimatedDifficulty || "Medium"})`,
    "Source intent JSON:",
    "```json",
    JSON.stringify(intent, null, 2),
    "```"
  ].filter(Boolean);

  return {
    title: intent.title || intent.originalIdea || "New microbrand product",
    description: readable.join("\n\n"),
    category: intent.productType || intent.niche || "POD apparel"
  };
}

function chooseRecommendedConcept(concepts) {
  const list = Array.isArray(concepts) ? concepts : [];
  if (!list.length) return null;
  return [...list].sort((a, b) => {
    const score = (c) => {
      let s = 0;
      if (c.recommendedStatus === "strong_candidate") s += 30;
      if (/low/i.test(c.copyrightRisk || "")) s += 20;
      if (/high/i.test(c.trendAlignment || "")) s += 15;
      const margin = Number(String(c.estimatedMargin || "").replace(/[^0-9.]/g, ""));
      if (!Number.isNaN(margin)) s += Math.min(20, margin / 3);
      return s;
    };
    return score(b) - score(a);
  })[0];
}

function buildPreparedEtsyDraftData(product, intent) {
  const listing = product.listingData || {};
  const ai = product.aiData || {};
  const price =
    listing.pricingRecommendation?.suggested ||
    ai.suggestedPrice ||
    product.printifyPreview?.retailPrice ||
    null;

  return {
    status: "ready_for_draft",
    state: "draft",
    title: listing.etsyTitle || ai.etsyTitle || product.title,
    description: listing.etsyDescription || ai.etsyDescription || product.description,
    tags: listing.etsyTags || ai.etsyTags || [],
    price,
    targetCustomer: intent.targetCustomer || ai.buyerPersona || "",
    sourceIntent: intent,
    preparedAt: new Date().toISOString(),
    note: "Prepared Etsy draft data only. No Etsy listing has been created or published."
  };
}

function stepRecord(key, label, status, extra = {}) {
  return { key, label, status, ...extra };
}

async function runLaunchPipeline(input) {
  const intent = sourceIntentFromInput(input || {});
  if (!intent.originalIdea && !intent.title) {
    throw new Error("Manual idea or selected opportunity is required.");
  }

  const steps = [];
  let product = null;
  let failedStep = null;
  const notices = [];

  const runStep = async (key, label, fn) => {
    const active = stepRecord(key, label, "active");
    steps.push(active);
    try {
      const result = await fn();
      active.status = "done";
      return result;
    } catch (error) {
      active.status = "failed";
      active.error = error.message || String(error);
      failedStep = active;
      throw error;
    }
  };

  try {
    product = await runStep("createProduct", "Creating Product", () =>
      Promise.resolve(createProduct(buildProductPayloadFromIntent(intent)))
    );

    product = await runStep("aiContent", "Generating AI Content", async () => {
      const aiData = await generateProductContent(product.title, product.description);
      if (aiData.fallbackNotice) notices.push(aiData.fallbackNotice);
      return updateProduct(product.id, {
        aiData: {
          ...aiData,
          sourceIntent: intent
        },
        status: "listing_generated"
      });
    });

    product = await runStep("concepts", "Generating Concepts", async () => {
      const { concepts } = await generatePodConceptsAsync(product);
      return updateProduct(product.id, {
        generatedConcepts: concepts,
        selectedConceptId: null,
        listingData: null,
        podPrep: null,
        designPackage: null,
        printifyPreview: null
      });
    });

    product = await runStep("selectConcept", "Selecting Recommended Concept", () => {
      const concept = chooseRecommendedConcept(product.generatedConcepts);
      if (!concept) throw new Error("No design concepts were returned.");
      const next = product.generatedConcepts.map((c) =>
        c.id === concept.id
          ? { ...c, conceptStatus: "selected", autoSelected: true }
          : { ...c, conceptStatus: c.conceptStatus || "generated" }
      );
      return Promise.resolve(
        updateProduct(product.id, {
          generatedConcepts: next,
          selectedConceptId: concept.id
        })
      );
    });

    product = await runStep("listing", "Building Listing", async () => {
      const concept = (product.generatedConcepts || []).find((c) => c.id === product.selectedConceptId);
      if (!concept) throw new Error("Selected concept was not found.");
      const listingData = await buildPodListingFromConceptAsync(product, concept);
      return updateProduct(product.id, { listingData });
    });

    product = await runStep("podPrep", "Preparing POD", () => {
      const concept = (product.generatedConcepts || []).find((c) => c.id === product.selectedConceptId);
      if (!concept) throw new Error("Selected concept was not found.");
      const podPrep = buildPodPrepFromConcept(product, concept);
      return Promise.resolve(updateProduct(product.id, { podPrep }));
    });

    product = await runStep("designPackage", "Creating Design Package", async () => {
      const concept = (product.generatedConcepts || []).find((c) => c.id === product.selectedConceptId);
      if (!concept) throw new Error("Selected concept was not found.");
      const designPackage = await buildDesignPackageAsync(
        product,
        concept,
        product.listingData,
        product.podPrep
      );
      return updateProduct(product.id, { designPackage });
    });

    product = await runStep("printifyPreview", "Generating Printify Preview", () => {
      const concept = (product.generatedConcepts || []).find((c) => c.id === product.selectedConceptId);
      if (!concept) throw new Error("Selected concept was not found.");
      const printifyPreview = buildPrintifyPreview(
        product,
        concept,
        product.podPrep,
        product.listingData,
        product.designPackage
      );
      return Promise.resolve(updateProduct(product.id, { printifyPreview }));
    });

    product = await runStep("artworkPrep", "Preparing Artwork", () => {
      const concept = (product.generatedConcepts || []).find((c) => c.id === product.selectedConceptId);
      if (!concept) throw new Error("Selected concept was not found.");
      const artworkAssets = buildArtworkPrep(
        product,
        concept,
        product.podPrep,
        product.listingData,
        product.designPackage,
        product.printifyPreview
      );
      return Promise.resolve(
        updateProduct(product.id, {
          artworkAssets: { ...artworkAssets, items: getItems(product.artworkAssets) },
          artworkStatus: deriveArtworkStatus(artworkAssets)
        })
      );
    });

    product = await runStep("image", "Generating Image", async () => {
      const artworkAssets = product.artworkAssets;
      if (!artworkAssets?.artworkPrompt) throw new Error("Artwork prompt was not prepared.");
      const mode = imageGenService.getMode();
      const imgResult = await imageGenService.generateArtworkImage({
        prompt: artworkAssets.artworkPrompt,
        negativePrompt: artworkAssets.negativePrompt || "",
        recommendedCanvasSize: artworkAssets.recommendedCanvasSize || "",
        transparentBackground: Boolean(artworkAssets.transparentBackgroundRequired),
        productId: product.id
      });

      if (!fs.existsSync(ARTWORK_DIR)) fs.mkdirSync(ARTWORK_DIR, { recursive: true });
      const tempName = `launch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${imgResult.originalFileName || "artwork.png"}`;
      const tempPath = path.join(ARTWORK_DIR, tempName);
      fs.writeFileSync(tempPath, imgResult.buffer);

      const item = buildNewItem({
        productId: product.id,
        type: "generated",
        fileName: imgResult.originalFileName || "artwork.png",
        mimeType: imgResult.mimeType,
        sizeBytes: imgResult.buffer.length,
        diskPath: tempPath,
        sourceConceptId: product.selectedConceptId || null,
        requestedPrimary: true
      });
      if ((item.width == null || item.height == null) && imgResult.dimensions) {
        item.width = imgResult.dimensions.width || item.width;
        item.height = imgResult.dimensions.height || item.height;
      }
      item.providerMeta = imgResult.providerMeta || null;
      item.generationMode = imgResult.mode || mode;

      const nextArtwork = addItem(artworkAssets, item);
      return updateProduct(product.id, {
        artworkAssets: nextArtwork,
        artworkStatus: deriveArtworkStatus(nextArtwork)
      });
    });

    product = await runStep("etsyDraftData", "Preparing Etsy Draft", () => {
      const etsyDraftData = buildPreparedEtsyDraftData(product, intent);
      return Promise.resolve(
        updateProduct(product.id, {
          aiData: {
            ...(product.aiData || {}),
            launchEtsyDraftData: etsyDraftData,
            sourceIntent: intent
          }
        })
      );
    });

    product = await runStep("printifyProductPrep", "Preparing Printify Product", () =>
      Promise.resolve(
        updateProduct(product.id, {
          printifyPreview: {
            ...(product.printifyPreview || {}),
            status: "ready_for_draft",
            sourceIntent: intent,
            preparedAt: new Date().toISOString()
          }
        })
      )
    );

    steps.push(stepRecord("ready", "Ready For Review", "done"));

    return {
      completed: true,
      product: getProductById(product.id),
      steps,
      failedStep: null,
      notices: uniq(notices)
    };
  } catch (error) {
    return {
      completed: false,
      product: product?.id ? getProductById(product.id) : null,
      steps,
      failedStep,
      error: error.message || String(error),
      notices: uniq(notices)
    };
  }
}

module.exports = {
  discoverOpportunities,
  runLaunchPipeline,
  FALLBACK_NOTICE
};
