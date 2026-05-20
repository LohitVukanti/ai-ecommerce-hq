// ============================================================
// services/integrations/integrationHealthService.js
// ============================================================
// Aggregates configured / not configured state across all
// external integrations. Returned by GET /api/integrations/status.
//
// CRITICAL: never include actual secret values. Each provider's
// getHealthReport() returns only:
//   - mode label (mock | preview | live)
//   - configured / ready booleans
//   - which env-var names are MISSING (not their values)
//   - copy explaining what the integration powers + how to set it up
// ============================================================

const openai = require("./openaiIntegrationService");
const imageGen = require("./imageGenerationService");
const printify = require("./printifyIntegrationService");
const etsy = require("./etsyIntegrationService");

function buildOverallSummary(providers) {
  const liveCount = providers.filter((p) => p.mode === "live").length;
  const mockCount = providers.filter((p) => p.mode === "mock" || p.mode === "preview").length;
  return {
    total: providers.length,
    live: liveCount,
    mockOrPreview: mockCount,
    fullyMock: liveCount === 0,
    fullyLive: liveCount === providers.length,
    // Convenience banner the frontend can show without per-provider logic.
    banner:
      liveCount === 0
        ? "All integrations are running in mock / preview mode. The app works fully offline."
        : liveCount === providers.length
          ? "All integrations are LIVE — real API calls will be made."
          : `${liveCount} of ${providers.length} integrations are LIVE. The rest run in mock / preview.`
  };
}

function getHealthReport() {
  const providers = [
    openai.getHealthReport(),
    imageGen.getHealthReport(),
    printify.getHealthReport(),
    etsy.getHealthReport()
  ];

  return {
    summary: buildOverallSummary(providers),
    providers,
    generatedAt: new Date().toISOString(),
    // Public, non-sensitive runtime hints
    runtime: {
      nodeEnv: process.env.NODE_ENV || "development",
      // We expose ONLY that these flags exist (not their values) here too.
      flags: {
        ENABLE_REAL_OPENAI: process.env.ENABLE_REAL_OPENAI || null,
        ENABLE_REAL_IMAGE_GENERATION: process.env.ENABLE_REAL_IMAGE_GENERATION || null,
        ENABLE_REAL_PRINTIFY: process.env.ENABLE_REAL_PRINTIFY || null,
        ENABLE_REAL_ETSY: process.env.ENABLE_REAL_ETSY || null
      }
    }
  };
}

module.exports = { getHealthReport };
