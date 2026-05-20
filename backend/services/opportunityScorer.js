// ============================================================
// services/opportunityScorer.js — Rule-based opportunity scoring
// ============================================================
// No paid APIs: heuristics from numeric fields + free-text signals.
// Produces six 0–100 sub-scores and an overall 0–100 opportunity score.
// ============================================================

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Margin quality from selling vs production cost (0–100).
 * @param {{ estimatedSellingPrice?: number, estimatedProductionCost?: number }} idea
 */
const scoreMargin = (idea) => {
  const sell = Number(idea.estimatedSellingPrice) || 0;
  const cost = Number(idea.estimatedProductionCost) || 0;
  if (sell <= 0) return 35;
  const margin = (sell - cost) / sell;
  if (margin <= 0) return 20;
  // 15% margin ~ 55, 40% ~ 90, cap at 100
  return clamp(Math.round(40 + margin * 130), 0, 100);
};

/**
 * Strength of qualitative evidence from text length + simple keyword boosts.
 * @param {string} text
 */
const scoreEvidence = (text) => {
  const t = (text || "").trim();
  if (t.length < 8) return 32;
  let s = 45 + Math.min(35, Math.floor(t.length / 12));
  const low = t.toLowerCase();
  if (/(strong|high|growing|viral|surge|sold out|waitlist|seo|search volume)/i.test(low)) s += 12;
  if (/(weak|unclear|unknown|guess|unsure)/i.test(low)) s -= 10;
  return clamp(s, 0, 100);
};

/**
 * Map "low | medium | high" style strings to an opportunity-friendly 0–100 score.
 * For competition: low competition text → high score.
 */
const scoreCompetitionLandscape = (value) => {
  const v = (value || "").toLowerCase();
  if (!v.trim()) return 55;
  let s = 60;
  if (/(low|weak|niche|blue ocean|fragmented|few sellers)/i.test(v)) s += 28;
  if (/(high|saturated|crowded|amazon|dominated|cutthroat)/i.test(v)) s -= 32;
  if (/(medium|moderate)/i.test(v)) s += 0;
  return clamp(s, 0, 100);
};

/** Lower fulfillment difficulty text → higher score (easier = better). */
const scoreFulfillment = (value) => {
  const v = (value || "").toLowerCase();
  if (!v.trim()) return 58;
  let s = 62;
  if (/(easy|simple|digital|template|passive|print|lightweight)/i.test(v)) s += 22;
  if (/(hard|complex|heavy|regulated|shipping|inventory|custom per order)/i.test(v)) s -= 28;
  return clamp(s, 0, 100);
};

/** Lower copyright / IP risk text → higher score. */
const scoreCopyright = (value) => {
  const v = (value || "").toLowerCase();
  if (!v.trim()) return 55;
  let s = 65;
  if (/(low|original|licensed|public domain|template)/i.test(v)) s += 22;
  if (/(high|disney|trademark|brand|celebrity|fan art|risky)/i.test(v)) s -= 35;
  return clamp(s, 0, 100);
};

const bandFromOverall = (overall) => {
  if (overall >= 80) {
    return {
      decisionStatus: "high_potential",
      recommendationLabel: "High Potential"
    };
  }
  if (overall >= 60) {
    return { decisionStatus: "test", recommendationLabel: "Test" };
  }
  if (overall >= 40) {
    return {
      decisionStatus: "needs_refinement",
      recommendationLabel: "Needs Refinement"
    };
  }
  return { decisionStatus: "reject", recommendationLabel: "Reject" };
};

/**
 * Compute all scores from a persisted idea row (plain object).
 * @param {Record<string, unknown>} idea
 */
const computeOpportunityScores = (idea) => {
  const marginScore = scoreMargin(idea);
  const demandScore = scoreEvidence(idea.demandEvidence);
  const trendScore = scoreEvidence(idea.trendEvidence);
  const competitionScore = scoreCompetitionLandscape(idea.competitionLevel);
  const fulfillmentDifficultyScore = scoreFulfillment(idea.fulfillmentDifficulty);
  const copyrightRiskScore = scoreCopyright(idea.copyrightRisk);

  const parts = [
    marginScore,
    demandScore,
    trendScore,
    competitionScore,
    fulfillmentDifficultyScore,
    copyrightRiskScore
  ];
  const overallOpportunityScore = clamp(
    Math.round(parts.reduce((a, b) => a + b, 0) / parts.length),
    0,
    100
  );

  const band = bandFromOverall(overallOpportunityScore);

  const scoreBreakdown = {
    marginScore,
    demandScore,
    trendScore,
    competitionScore,
    fulfillmentDifficultyScore,
    copyrightRiskScore,
    overallOpportunityScore,
    recommendationLabel: band.recommendationLabel,
    summary:
      "Rule-based blend of margin, demand/trend evidence, competitive landscape, fulfillment ease, and copyright/IP risk."
  };

  return {
    marginScore,
    demandScore,
    trendScore,
    competitionScore,
    fulfillmentDifficultyScore,
    copyrightRiskScore,
    overallOpportunityScore,
    decisionStatus: band.decisionStatus,
    scoreBreakdown
  };
};

// ============================================================
// Optional OpenAI narrative augmentation
// ============================================================
// Numeric scores stay 100% rule-based (deterministic). When the
// backend has OPENAI_API_KEY set, we ask the model only for a
// short plain-English explanation that gets merged into
// scoreBreakdown.summary + an optional scoreBreakdown.narrative.
// Falls back silently to the rule-based summary on any failure.
// ============================================================

const { generateJsonWithOpenAI } = require("./openaiTextService");

const SCORE_NARRATIVE_SYSTEM = `You are an analyst explaining a rule-based product-opportunity score.
You MUST respond with a single valid JSON object only (no markdown fences, no commentary).
Do NOT contradict the numeric scores you are given. Use them as the ground truth.
Keep the tone factual and concise.`;

function buildScoreNarrativeUserPrompt(idea, scored) {
  const safeIdea = {
    title: idea.title || "",
    niche: idea.niche || "",
    productType: idea.productType || "",
    targetCustomer: idea.targetCustomer || "",
    estimatedSellingPrice: idea.estimatedSellingPrice ?? null,
    estimatedProductionCost: idea.estimatedProductionCost ?? null,
    competitionLevel: idea.competitionLevel || "",
    demandEvidence: (idea.demandEvidence || "").slice(0, 600),
    trendEvidence: (idea.trendEvidence || "").slice(0, 600),
    fulfillmentDifficulty: idea.fulfillmentDifficulty || "",
    copyrightRisk: idea.copyrightRisk || "",
    notes: (idea.notes || "").slice(0, 600)
  };

  return `Given the following idea + numeric sub-scores, write a short JSON object with EXACTLY:
{
  "summary": string (1 sentence, 18-32 words, factual),
  "narrative": string (2-3 sentences explaining strongest + weakest dimensions, no new numbers)
}

Sub-scores (0-100, higher = better opportunity for that dimension):
- marginScore: ${scored.marginScore}
- demandScore: ${scored.demandScore}
- trendScore: ${scored.trendScore}
- competitionScore: ${scored.competitionScore}
- fulfillmentDifficultyScore: ${scored.fulfillmentDifficultyScore}
- copyrightRiskScore: ${scored.copyrightRiskScore}
- overall: ${scored.overallOpportunityScore}
- decisionBand: ${JSON.stringify(scored.scoreBreakdown.recommendationLabel)}

Idea data:
${JSON.stringify(safeIdea, null, 2)}`;
}

/**
 * Async, non-throwing. Always returns the original `scored` object,
 * with `scoreBreakdown.summary` (and optionally `scoreBreakdown.narrative`)
 * replaced when OpenAI succeeded.
 *
 * @param {Record<string, unknown>} idea  — same idea you passed to computeOpportunityScores
 * @param {ReturnType<typeof computeOpportunityScores>} scored
 * @returns {Promise<ReturnType<typeof computeOpportunityScores>>}
 */
async function enhanceScoreNarrative(idea, scored) {
  if (!scored || !scored.scoreBreakdown) return scored;

  const result = await generateJsonWithOpenAI({
    system: SCORE_NARRATIVE_SYSTEM,
    user: buildScoreNarrativeUserPrompt(idea, scored),
    traceLabel: "opportunity score narrative",
    temperature: 0.4,
    maxTokens: 400
  });

  if (!result.ok) return scored;

  const raw = result.data || {};
  const summary =
    typeof raw.summary === "string" && raw.summary.trim()
      ? raw.summary.trim().slice(0, 400)
      : scored.scoreBreakdown.summary;
  const narrative =
    typeof raw.narrative === "string" && raw.narrative.trim()
      ? raw.narrative.trim().slice(0, 1200)
      : null;

  return {
    ...scored,
    scoreBreakdown: {
      ...scored.scoreBreakdown,
      summary,
      ...(narrative ? { narrative } : {})
    }
  };
}

module.exports = { computeOpportunityScores, enhanceScoreNarrative };
