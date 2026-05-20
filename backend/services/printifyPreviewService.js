// ============================================================
// services/printifyPreviewService.js — Printify Draft Preview
// ============================================================
// PURE TEMPLATE generator. No API keys, no network calls, no
// OpenAI. The output mirrors the shape of Printify's product
// creation payload (POST /v1/shops/{shop_id}/products.json) so
// when a real integration is wired later, this preview becomes
// the actual request body.
//
// Reference blueprint / provider IDs come from Printify's
// publicly documented catalog; if they ever drift, only this
// file needs an update. Values are explicitly marked as
// "reference" in the output.
// ============================================================

const { v4: uuidv4 } = require("uuid");
const { sanitizeCopy, inferPodProductShape } = require("./podConceptService");

// Minimal, conservative mapping of internal POD shape → Printify blueprint
// + a sensible default print provider. Keep IDs stable; consumers later
// override per-shop.
const BLUEPRINT_BY_SHAPE = {
  "T-shirt": {
    blueprint_id: 6,
    blueprint_name: "Unisex Heavy Cotton Tee (Gildan 5000)",
    print_provider_id: 99,
    print_provider_name: "Printify Choice"
  },
  Crewneck: {
    blueprint_id: 145,
    blueprint_name: "Unisex Heavy Blend Crewneck Sweatshirt (Gildan 18000)",
    print_provider_id: 99,
    print_provider_name: "Printify Choice"
  },
  Hoodie: {
    blueprint_id: 49,
    blueprint_name: "Unisex Heavy Blend Hooded Sweatshirt (Gildan 18500)",
    print_provider_id: 99,
    print_provider_name: "Printify Choice"
  },
  Poster: {
    blueprint_id: 282,
    blueprint_name: "Premium Matte Vertical Poster",
    print_provider_id: 1,
    print_provider_name: "Sensaria"
  },
  "Tote bag": {
    blueprint_id: 9,
    blueprint_name: "Eco Tote Bag (Liberty Bags 8502)",
    print_provider_id: 6,
    print_provider_name: "MWW On Demand"
  },
  Sticker: {
    blueprint_id: 357,
    blueprint_name: "Kiss-Cut Sticker Sheet",
    print_provider_id: 105,
    print_provider_name: "DJ Stickers"
  }
};

const COLORS_BY_SHAPE = {
  "T-shirt": ["Black", "White", "Heather Grey", "Navy", "Sand"],
  Crewneck: ["Black", "Sport Grey", "Navy", "Bone", "Forest"],
  Hoodie: ["Black", "Sport Grey", "Navy", "Cream", "Maroon"],
  Poster: ["—"],
  "Tote bag": ["Natural"],
  Sticker: ["—"]
};

const SIZES_BY_SHAPE = {
  "T-shirt": ["S", "M", "L", "XL", "2XL"],
  Crewneck: ["S", "M", "L", "XL", "2XL"],
  Hoodie: ["S", "M", "L", "XL", "2XL"],
  Poster: ['12"x18"', '18"x24"', '24"x36"'],
  "Tote bag": ["One size"],
  Sticker: ['3"x3"', '4"x4"', '5.5"x5.5"']
};

const FILE_REQS_BY_SHAPE = {
  "T-shirt":
    'PNG, 300 DPI, sRGB, transparent background, min 4500×5400 px (front), keep 0.5" safe margin from collar / side seams.',
  Crewneck:
    'PNG, 300 DPI, sRGB, transparent background, min 4500×5400 px, keep art ≥ 2.5" below collar line.',
  Hoodie:
    'PNG, 300 DPI, sRGB, transparent background, min 4500×5400 px (front), avoid the kangaroo pocket break line.',
  Poster:
    'PDF (vector) or PNG @ 300 DPI in trim size; full bleed 0.125" beyond cut; embed sRGB or CMYK profile.',
  "Tote bag":
    'PNG, 300 DPI, sRGB, transparent background, ~3000×3600 px centered between handles.',
  Sticker:
    'PNG or SVG with transparent background, 300 DPI, 0.125" bleed, kiss-cut friendly outline.'
};

const MOCKUP_HINT_BY_SHAPE = {
  "T-shirt":
    "Use Printify mockup generator: front flat + 1 model 3/4. Match color swatch before publishing.",
  Crewneck:
    "Use Printify mockup generator: front flat + back flat for placement QA; collar interference check.",
  Hoodie:
    "Use Printify mockup generator: front flat + hood up lifestyle for editorial polish.",
  Poster:
    "Use Printify mockup generator: framed wall mockup at 1:1 + 3:2 wide for context.",
  "Tote bag":
    "Use Printify mockup generator: handheld lifestyle + flat-on-wood scene.",
  Sticker:
    "Use Printify mockup generator: laptop scene + isolated sheet view."
};

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * Build a deterministic Printify-shaped draft preview from existing product data.
 * Caller must guarantee `concept` and `podPrep` are present; `listingData` and
 * `designPackage` are optional but improve the payload preview.
 *
 * @param {object} product
 * @param {object} concept
 * @param {object} podPrep
 * @param {object|null} listingData
 * @param {object|null} designPackage
 * @returns {object} printifyPreview shape
 */
function buildPrintifyPreview(product, concept, podPrep, listingData, designPackage) {
  const shape = inferPodProductShape(concept, product);
  const blueprint = BLUEPRINT_BY_SHAPE[shape] || BLUEPRINT_BY_SHAPE["T-shirt"];

  // Pricing — prefer podPrep numbers; fall back to concept estimates.
  const retailPrice = round2(
    podPrep.recommendedSellingPrice ??
      concept.estimatedSellingPrice ??
      30
  );
  const productionCost = round2(
    podPrep.productionCostEstimate ?? concept.estimatedProductionCost ?? 11
  );
  const estimatedProfit = round2(retailPrice - productionCost);
  const estimatedMarginPercent =
    retailPrice > 0 ? Math.round(((retailPrice - productionCost) / retailPrice) * 1000) / 10 : 0;

  const suggestedColors = COLORS_BY_SHAPE[shape] || COLORS_BY_SHAPE["T-shirt"];
  const suggestedSizes = SIZES_BY_SHAPE[shape] || SIZES_BY_SHAPE["T-shirt"];

  // Listing strings (sanitized; trademark-stripped via sanitizeCopy)
  const title = sanitizeCopy(
    (listingData && listingData.etsyTitle) ||
      `${concept.conceptName || product.title} — ${shape}`
  ).slice(0, 140);

  const description = sanitizeCopy(
    (listingData && listingData.etsyDescription) ||
      `${concept.slogan || product.title} — original ${concept.aesthetic || ""} ${shape}. Made to order.`
  ).slice(0, 2000);

  const tags = Array.isArray(listingData?.etsyTags) ? listingData.etsyTags.slice(0, 13) : [];

  // Build a realistic Printify-shaped payload preview. Placeholder IDs are used
  // for `id` fields we cannot know without an API call (variants, image upload).
  // When the real integration lands, swap placeholders for Printify catalog calls.
  const priceCents = Math.round(retailPrice * 100);
  const variants = suggestedSizes.flatMap((size, sIdx) =>
    suggestedColors
      .filter((c) => c !== "—")
      .slice(0, 3)
      .map((color, cIdx) => ({
        // Placeholder id pattern: P-<size>-<colorIdx> — replace with real variant_id from Printify catalog
        id: `P-${size.replace(/[^A-Za-z0-9]/g, "")}-${cIdx + 1}`,
        price: priceCents,
        is_enabled: sIdx < 3 && cIdx < 2, // sensible default set
        title: `${color} / ${size}`
      }))
  );

  const apiPayloadPreview = {
    // POST /v1/shops/{shop_id}/products.json — `shop_id` and image upload are out of scope here
    title,
    description,
    blueprint_id: blueprint.blueprint_id,
    print_provider_id: blueprint.print_provider_id,
    tags,
    variants,
    print_areas: [
      {
        variant_ids: variants.slice(0, 6).map((v) => v.id),
        placeholders: [
          {
            position: "front",
            images: [
              {
                // Placeholder — replace with the `id` returned by POST /v1/uploads/images.json
                id: "IMG_FRONT_PLACEHOLDER",
                name: `${sanitizeCopy(concept.conceptName || product.title).slice(0, 60)} — front`,
                type: "image/png",
                x: 0.5,
                y: 0.45,
                scale: 1,
                angle: 0
              }
            ]
          }
        ]
      }
    ],
    metadata: {
      __preview_only: true,
      __notes:
        "Generated by printifyPreviewService — not sent to Printify. Replace placeholder image id + variant ids before live publish.",
      sourceConceptId: concept.id,
      sourcePodPrepId: podPrep.id || null,
      sourceDesignPackageId: designPackage?.id || null
    }
  };

  // Readiness checklist — uses existing product state only; no new flags.
  const publishReadinessChecklist = [
    {
      key: "concept",
      label: "Concept selected",
      done: !!product.selectedConceptId,
      hint: "Selected concept locks the visual direction passed into the payload."
    },
    {
      key: "listing",
      label: "Listing copy generated",
      done: !!(listingData && listingData.etsyTitle),
      hint: "Listing title + tags + description feed the Printify product body."
    },
    {
      key: "podPrep",
      label: "POD prep generated",
      done: !!(podPrep && podPrep.id),
      hint: "POD prep drives cost, retail, margin, print area, and provider."
    },
    {
      key: "designPackage",
      label: "Design package generated",
      done: !!(designPackage && designPackage.id),
      hint: "Optional — supplies master prompts + export specs for the print file."
    },
    {
      key: "printFile",
      label: "Print file exported (PNG @ 300 DPI, transparent)",
      done: false,
      hint:
        "Use the Design Package master prompt to generate the artwork, then export per the file requirements above."
    },
    {
      key: "mockups",
      label: "Mockups uploaded to product",
      done: false,
      hint: "Use Printify's mockup generator OR upload the lifestyle shots from the Design Package."
    },
    {
      key: "printifyConnected",
      label: "Printify API connected (future)",
      done: false,
      hint:
        "Set PRINTIFY_API_KEY + PRINTIFY_SHOP_ID on the backend later, then a publish route will POST this payload for real."
    }
  ];

  return {
    id: uuidv4(),
    provider: "Printify",
    isPreviewOnly: true,
    sourceConceptId: concept.id,
    sourcePodPrepId: podPrep.id || null,
    sourceListingId: (listingData && listingData.fromConceptId) || null,
    sourceDesignPackageId: (designPackage && designPackage.id) || null,
    productType: shape,
    recommendedBlueprint: {
      blueprint_id: blueprint.blueprint_id,
      name: blueprint.blueprint_name,
      source: "reference"
    },
    recommendedPrintProvider: {
      print_provider_id: blueprint.print_provider_id,
      name: blueprint.print_provider_name,
      source: "reference"
    },
    suggestedColors,
    suggestedSizes,
    printPlacement: sanitizeCopy(
      podPrep.printPlacement || concept.placement || "Front chest — centered"
    ),
    retailPrice,
    productionCost,
    estimatedProfit,
    estimatedMarginPercent,
    designFileRequirements: FILE_REQS_BY_SHAPE[shape] || FILE_REQS_BY_SHAPE["T-shirt"],
    mockupInstructions: sanitizeCopy(
      podPrep.mockupInstructions
        ? `${MOCKUP_HINT_BY_SHAPE[shape]} ${podPrep.mockupInstructions.slice(0, 400)}`
        : MOCKUP_HINT_BY_SHAPE[shape] || MOCKUP_HINT_BY_SHAPE["T-shirt"]
    ),
    publishReadinessChecklist,
    apiPayloadPreview,
    notes:
      "Preview mode only — not connected to Printify API yet. apiPayloadPreview mirrors POST /v1/shops/{shop_id}/products.json shape so wiring the real call later is a swap-in change.",
    createdAt: new Date().toISOString()
  };
}

module.exports = { buildPrintifyPreview };
