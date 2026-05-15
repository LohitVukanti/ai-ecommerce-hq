// ============================================================
// components/IdeaCard.jsx — Summary card for a research idea
// ============================================================

import React from "react";

const STATUS_LABELS = {
  pending: "Pending score",
  high_potential: "High potential",
  test: "Test",
  needs_refinement: "Needs refinement",
  reject: "Reject",
  converted_to_product: "Converted"
};

const IdeaCard = ({ idea, onScore, onConvert, onDelete, busyId }) => {
  const busy = busyId === idea.id;
  const converted = !!idea.convertedProductId;

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minHeight: "220px"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "16px",
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.3,
            color: "var(--text-primary)"
          }}
        >
          {idea.title}
        </h3>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "13px",
            color: idea.opportunityScore == null ? "var(--text-muted)" : "var(--accent)",
            whiteSpace: "nowrap"
          }}
        >
          {idea.opportunityScore == null ? "—" : `${idea.opportunityScore}/100`}
        </div>
      </div>

      <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "grid", gap: "4px" }}>
        <div>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>Niche: </span>
          {idea.niche || "—"}
        </div>
        <div>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>Type: </span>
          {idea.productType || "—"}
        </div>
        <div>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>Source: </span>
          {idea.sourcePlatform || "—"}
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: "8px" }}>
        <div
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "6px"
          }}
        >
          Decision
        </div>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>
          {STATUS_LABELS[idea.decisionStatus] || idea.decisionStatus}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
        <button
          type="button"
          disabled={busy || converted}
          onClick={() => onScore(idea.id)}
          style={{
            flex: "1 1 120px",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--purple-dim)",
            color: "var(--purple)",
            fontWeight: 700,
            fontSize: "12px",
            cursor: converted ? "not-allowed" : "pointer",
            opacity: converted ? 0.5 : 1
          }}
        >
          {busy ? "…" : "Score opportunity"}
        </button>
        <button
          type="button"
          disabled={busy || converted}
          onClick={() => onConvert(idea.id)}
          style={{
            flex: "1 1 120px",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--accent-dim)",
            color: "var(--accent)",
            fontWeight: 700,
            fontSize: "12px",
            cursor: converted ? "not-allowed" : "pointer",
            opacity: converted ? 0.5 : 1
          }}
        >
          {converted ? "Converted" : "Convert to product"}
        </button>
        <button
          type="button"
          disabled={busy || converted}
          onClick={() => onDelete(idea.id)}
          style={{
            flex: "1 1 90px",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--danger)",
            background: "var(--danger-dim)",
            color: "var(--danger)",
            fontWeight: 700,
            fontSize: "12px",
            cursor: converted ? "not-allowed" : "pointer",
            opacity: converted ? 0.5 : 1
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default IdeaCard;
