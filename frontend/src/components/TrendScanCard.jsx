// ============================================================
// components/TrendScanCard.jsx — Summary card for a trend scan
// ============================================================

import React from "react";

const STRENGTH_COLORS = {
  rising: "var(--accent)",
  hot: "var(--success)",
  steady: "var(--info)",
  fading: "var(--text-muted)"
};

const TrendScanCard = ({ scan, busyId, onConvert, onDelete }) => {
  const busy = busyId === scan.id;
  const converted = !!scan.convertedIdeaId;

  const strengthKey = (scan.trendStrength || "").trim().toLowerCase();
  const strengthColor = STRENGTH_COLORS[strengthKey] || "var(--text-secondary)";

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
        minHeight: "230px"
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
          {scan.trendKeyword || "(untitled trend)"}
        </h3>
        {scan.trendStrength && (
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "11px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: "999px",
              border: `1px solid ${strengthColor}`,
              color: strengthColor,
              whiteSpace: "nowrap"
            }}
          >
            {scan.trendStrength}
          </span>
        )}
      </div>

      <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "grid", gap: "4px" }}>
        <div>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>Source: </span>
          {scan.sourcePlatform || "—"}
        </div>
        <div>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>Niche: </span>
          {scan.niche || "—"}
        </div>
        <div>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>Type: </span>
          {scan.productType || "—"}
        </div>
        {scan.productAngle && (
          <div>
            <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>Angle: </span>
            {scan.productAngle}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "auto" }}>
        <button
          type="button"
          disabled={busy || converted}
          onClick={() => onConvert(scan.id)}
          style={{
            flex: "1 1 140px",
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
          {busy ? "…" : converted ? "Converted" : "Convert to idea"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(scan.id)}
          style={{
            flex: "1 1 90px",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--danger)",
            background: "var(--danger-dim)",
            color: "var(--danger)",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer"
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default TrendScanCard;
