// ============================================================
// utils/launchProgress.js — Pure helpers for product workflow
// ============================================================
// `getLaunchSteps(product)`  → ordered array describing the
//                              checklist + per-step status
// `getNextAction(product)`   → the single most useful next step
//                              (used for "Recommended Next Action")
//
// Read-only: relies on existing product fields. No DB/API calls.
// ============================================================

/** True when the product description carries idea-conversion markers. */
function fromIdea(desc) {
  return /Target customer:|Niche:|Research notes:|Intake opportunity score:/i.test(desc || "");
}

function parseIntakeScore(desc) {
  const m = (desc || "").match(/Intake opportunity score:\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

export function getLaunchSteps(product = {}) {
  const desc = product.description || "";
  const cameFromIdea = fromIdea(desc);
  const opportunityScore = parseIntakeScore(desc);

  const concepts = Array.isArray(product.generatedConcepts) ? product.generatedConcepts : [];
  const selectedConcept = product.selectedConceptId
    ? concepts.find((c) => c.id === product.selectedConceptId) || null
    : null;
  const listing = product.listingData;
  const podPrep = product.podPrep;
  const designPackage = product.designPackage;
  const generatedFiles = Array.isArray(product.generatedFiles) ? product.generatedFiles : [];
  const aiData = product.aiData;
  const status = product.status;
  const etsyDraft = product.etsyDraft;

  return [
    {
      key: "source",
      label: "Trend scan or idea source",
      icon: "🛰",
      optional: true,
      done: cameFromIdea,
      meta: cameFromIdea
        ? (opportunityScore != null
            ? `Captured from research · score ${opportunityScore}/100`
            : "Captured from research")
        : "Created manually (skip if you didn't use Trend Scanner / Ideas)",
      hint: "Use Trend Scanner → Ideas & Research to capture signals before adding products."
    },
    {
      key: "scored",
      label: "Idea opportunity scored",
      icon: "📊",
      optional: true,
      done: opportunityScore != null,
      meta: opportunityScore != null ? `${opportunityScore}/100` : null,
      hint: "Run rule-based scoring on the originating idea before converting."
    },
    {
      key: "product",
      label: "Product created",
      icon: "📦",
      done: true,
      meta: product.title,
      hint: null
    },
    {
      key: "concepts",
      label: "Design concepts generated",
      icon: "🧵",
      done: concepts.length > 0,
      meta: concepts.length > 0 ? `${concepts.length} concept${concepts.length === 1 ? "" : "s"}` : null,
      hint: "Use 'Generate Design Concepts' in the Concept Studio."
    },
    {
      key: "select",
      label: "Concept selected",
      icon: "🎯",
      done: !!selectedConcept,
      blockedBy: concepts.length === 0 ? "concepts" : null,
      meta: selectedConcept ? selectedConcept.conceptName : null,
      hint: "Click 'Select' on the concept card you want to ship."
    },
    {
      key: "listing",
      label: "Listing generated",
      icon: "🏷",
      done: !!(listing && listing.etsyTitle),
      blockedBy: !selectedConcept ? "select" : null,
      meta: listing?.etsyTitle
        ? `“${listing.etsyTitle.slice(0, 56)}${listing.etsyTitle.length > 56 ? "…" : ""}”`
        : null,
      hint: "Click 'Generate listing' on a non-rejected concept card."
    },
    {
      key: "podPrep",
      label: "POD prep generated",
      icon: "📐",
      done: !!(podPrep && podPrep.id),
      blockedBy: !selectedConcept ? "select" : null,
      meta: podPrep
        ? `${podPrep.recommendedProductType || "Prep saved"} · ~${podPrep.estimatedMarginPercent ?? "—"}% margin`
        : null,
      hint: "Generate POD Prep to estimate cost, retail, profit, and margin."
    },
    {
      key: "designPackage",
      label: "Design package generated",
      icon: "🎨",
      done: !!(designPackage && designPackage.id),
      blockedBy: !selectedConcept
        ? "select"
        : !(listing && listing.etsyTitle)
          ? "listing"
          : !(podPrep && podPrep.id)
            ? "podPrep"
            : null,
      meta: designPackage?.id ? `Package ${designPackage.id.slice(0, 6)}…` : null,
      hint: "Design package needs concept + listing + POD prep as inputs."
    },
    {
      key: "aiContent",
      label: "AI listing content (Etsy/AI path)",
      icon: "🤖",
      optional: true,
      done: !!aiData,
      meta: aiData?.suggestedPrice ? `Suggested price $${aiData.suggestedPrice}` : null,
      hint: "Generate AI Content fills market scores, persona, Etsy title/tags/description, design prompts."
    },
    {
      key: "digital",
      label: "Digital product generated",
      icon: "📁",
      optional: true,
      done: generatedFiles.length > 0,
      meta: generatedFiles.length > 0
        ? `${generatedFiles.length} CSV file${generatedFiles.length === 1 ? "" : "s"}`
        : null,
      hint: "Optional CSV deliverable for digital-product listings."
    },
    {
      key: "approved",
      label: "Listing approved",
      icon: "✅",
      done: status === "approved" || status === "etsy_draft_created",
      blockedBy:
        status === "rejected"
          ? "rejected"
          : !aiData
            ? "aiContent"
            : null,
      hint: "Approve the listing to enable the simulated Etsy draft."
    },
    {
      key: "etsy",
      label: "Etsy draft created (simulated)",
      icon: "🛍",
      done: !!etsyDraft || status === "etsy_draft_created",
      blockedBy:
        !(status === "approved" || status === "etsy_draft_created" || etsyDraft)
          ? "approved"
          : null,
      hint: "Click 'Create Etsy Draft' once approved. Mock until Etsy creds are added."
    },
    {
      key: "published",
      label: "Published to live channel",
      icon: "🚀",
      future: true,
      done: false,
      hint: "Future step — connect a real Printify / Etsy publish API."
    }
  ];
}

const NEXT_ACTIONS = {
  concepts: {
    label: "Generate design concepts next.",
    detail: "Inside the Concept Studio, click 'Generate Design Concepts' to get 3–5 apparel directions.",
    tone: "purple"
  },
  select: {
    label: "Select one concept before generating a listing.",
    detail: "Pick the concept you want to ship — it locks in style, palette, and apparel for downstream steps.",
    tone: "accent"
  },
  listing: {
    label: "Generate the listing from your selected concept.",
    detail: "Click 'Generate listing' on the chosen card to produce title, tags, description, SEO, and pricing.",
    tone: "accent"
  },
  podPrep: {
    label: "Generate POD Prep before the Design Package.",
    detail: "POD Prep estimates print area, fulfillment, and margin — the design package uses it as input.",
    tone: "accent"
  },
  designPackage: {
    label: "Generate the Design Package — master prompts + social pack.",
    detail: "Combines listing copy and POD prep into a structured creative brief, ready for image-generation APIs later.",
    tone: "purple"
  },
  aiContent: {
    label: "Run Generate AI Content for market scores + Etsy listing copy.",
    detail: "Fills demand / competition / originality / © risk + Etsy title/tags/description (uses mock data unless OPENAI_API_KEY is set).",
    tone: "purple"
  },
  approve: {
    label: "Approve the listing.",
    detail: "Marks it ready and unlocks the Etsy draft simulation.",
    tone: "success"
  },
  etsy: {
    label: "Ready for Etsy draft simulation.",
    detail: "Creates a mock Etsy draft until real credentials are configured.",
    tone: "accent"
  },
  rejected: {
    label: "This product is rejected.",
    detail: "Use 'Reject' control or delete it; or revisit the listing if rejection was a mistake.",
    tone: "danger"
  },
  published: {
    label: "Future step: connect Printify / Etsy publish API.",
    detail: "All template stages are complete in this build. Live publish is intentionally out of scope.",
    tone: "muted"
  }
};

export function getNextAction(product = {}) {
  if (product.status === "rejected") {
    return { key: "rejected", ...NEXT_ACTIONS.rejected };
  }
  const steps = getLaunchSteps(product);
  const order = [
    "concepts",
    "select",
    "listing",
    "podPrep",
    "designPackage",
    "aiContent",
    "approved",
    "etsy"
  ];
  for (const key of order) {
    const step = steps.find((s) => s.key === key);
    if (!step || step.done) continue;
    if (key === "approved") return { key: "approve", ...NEXT_ACTIONS.approve };
    return { key, ...(NEXT_ACTIONS[key] || NEXT_ACTIONS.published) };
  }
  return { key: "published", ...NEXT_ACTIONS.published };
}

/** Short label suitable for compact card footers (e.g. "Generate listing"). */
export function getNextActionShortLabel(product = {}) {
  const a = getNextAction(product);
  switch (a.key) {
    case "concepts": return "Generate design concepts";
    case "select": return "Select a concept";
    case "listing": return "Generate listing";
    case "podPrep": return "Generate POD prep";
    case "designPackage": return "Generate design package";
    case "aiContent": return "Generate AI content";
    case "approve": return "Approve listing";
    case "etsy": return "Create Etsy draft";
    case "rejected": return "Rejected — revisit or delete";
    case "published":
    default: return "Done — future: live publish";
  }
}
