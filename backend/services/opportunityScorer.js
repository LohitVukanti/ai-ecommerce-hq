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

module.exports = { computeOpportunityScores };
