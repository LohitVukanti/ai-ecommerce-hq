// ============================================================
// utils/integrationMode.jsx — Integration mode labels (UI only)
// ============================================================
// Infers mock | preview | live from persisted product fields.
// Does not call APIs; does not require response meta.
// ============================================================

import React from "react";

const MODE_STYLES = {
  live: {
    background: "rgba(46, 160, 67, 0.15)",
    color: "#56d364",
    border: "1px solid rgba(46, 160, 67, 0.4)"
  },
  preview: {
    background: "rgba(187, 128, 9, 0.15)",
    color: "#e3b341",
    border: "1px solid rgba(187, 128, 9, 0.4)"
  },
  mock: {
    background: "rgba(99, 110, 123, 0.18)",
    color: "#9aa6b2",
    border: "1px solid rgba(99, 110, 123, 0.4)"
  }
};

export function inferArtworkImageMode(product) {
  const items = Array.isArray(product?.artworkAssets?.items) ? product.artworkAssets.items : [];
  const generated = items.filter((it) => it && it.type === "generated");
  const latest = generated.length > 0 ? generated[generated.length - 1] : null;
  if (!latest) return null;
  if (latest.generationMode === "live") return "live";
  if (latest.generationMode === "mock") return "mock";
  const provider = latest.providerMeta?.provider || "";
  if (provider === "openai-images") return "live";
  if (provider === "mock-svg") return "mock";
  return "mock";
}

export function inferPrintifyProductMode(printifyProduct) {
  if (!printifyProduct) return null;
  if (printifyProduct.isMock) {
    return printifyProduct.status === "preview_only" ? "preview" : "mock";
  }
  return "live";
}

export function inferEtsyDraftMode(etsyDraft) {
  if (!etsyDraft) return null;
  if (etsyDraft.via === "live" && !etsyDraft.isMock) return "live";
  if (etsyDraft.isMock || etsyDraft.via === "mock_fallback" || etsyDraft.via === "mock_simulated") {
    return "mock";
  }
  return etsyDraft.isMock === false ? "live" : "mock";
}

export function IntegrationModePill({ mode, style }) {
  if (!mode) return null;
  const pillStyle = MODE_STYLES[mode] || MODE_STYLES.mock;
  return (
    <span
      style={{
        ...pillStyle,
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: "var(--font-display)",
        flexShrink: 0,
        ...style
      }}
    >
      {mode}
    </span>
  );
}
