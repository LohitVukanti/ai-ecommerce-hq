// ============================================================
// services/integrations/openaiIntegrationService.js
// ============================================================
// Thin wrapper over the existing `openaiTextService.js`. Lives
// in the integrations/ folder for organizational consistency
// and adds health helpers used by /api/integrations/status.
//
// CRITICAL: This file is purely additive — the existing
// openaiTextService.js (and all callers of it) continue to
// work unchanged. Do not duplicate its retry/JSON logic here.
// ============================================================

const text = require("../openaiTextService");

const DEFAULT_MODEL = "gpt-4o-mini";

/** True iff backend has a non-empty OPENAI_API_KEY. */
function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim());
}

/**
 * Returns mode label: "live" | "mock".
 * Note: we DO NOT gate OpenAI text on ENABLE_REAL_OPENAI because
 * the existing app already uses the key when present. The flag
 * appears in the health report for visibility only.
 */
function getMode() {
  return isConfigured() ? "live" : "mock";
}

function getHealthReport() {
  const missing = [];
  if (!process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");

  return {
    key: "openai-text",
    label: "OpenAI text",
    mode: getMode(),
    configured: isConfigured(),
    ready: isConfigured(),
    enabledFlag: process.env.ENABLE_REAL_OPENAI || null,
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    missingEnv: missing,
    powers:
      "POD concept generation, listing copy, design package prompts, opportunity-score narrative. " +
      "Always falls back to deterministic templates when missing or failing.",
    setup:
      "Add OPENAI_API_KEY to backend/.env (gitignored) for local dev, or to Render's Environment for deploys. " +
      "OPENAI_MODEL defaults to gpt-4o-mini. Costs are billed to your OpenAI API account.",
    docsUrl: "https://platform.openai.com/docs/api-reference/chat"
  };
}

// Re-export the underlying helper unchanged so future code can
// import everything OpenAI-text-related from one place.
module.exports = {
  isConfigured,
  getMode,
  getHealthReport,
  generateJsonWithOpenAI: text.generateJsonWithOpenAI,
  extractJsonText: text.extractJsonText
};
