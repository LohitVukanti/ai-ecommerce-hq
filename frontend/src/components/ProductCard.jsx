// ============================================================
// components/ProductCard.jsx — Dashboard Product Card
// ============================================================
// Displays a single product as a card in the dashboard grid.
// Shows key info at a glance and has a "View Details" button.
// ============================================================

import React from "react";
import StatusBadge from "./StatusBadge";
import { getNextActionShortLabel, getNextAction } from "../utils/launchProgress";

const NEXT_TONE = {
  concepts: "var(--purple)",
  select: "var(--accent)",
  listing: "var(--accent)",
  podPrep: "var(--accent)",
  designPackage: "var(--purple)",
  aiContent: "var(--purple)",
  approve: "var(--success)",
  etsy: "var(--accent)",
  rejected: "var(--danger)",
  published: "var(--text-muted)"
};

const ProductCard = ({ product, onClick }) => {
  // Format date for display (e.g. "Dec 25, 2024")
  const formattedDate = new Date(product.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });

  // Show AI scores if available (from the aiData field)
  const hasAiData = !!product.aiData;

  // Recommended next action (read-only from existing fields)
  const nextLabel = getNextActionShortLabel(product);
  const nextKey = getNextAction(product).key;
  const nextColor = NEXT_TONE[nextKey] || "var(--accent)";

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden"
      }}
      // Hover effect via inline event handlers
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(240,165,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Accent line at the top of the card */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "2px",
        background: product.status === "rejected"
          ? "var(--danger)"
          : product.status === "etsy_draft_created"
          ? "var(--accent)"
          : product.status === "approved"
          ? "var(--success)"
          : "var(--border)"
      }} />

      {/* Card header: status badge + category */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <StatusBadge status={product.status} />
        <span style={{
          fontSize: "11px",
          fontFamily: "var(--font-display)",
          color: "var(--text-muted)",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase"
        }}>
          {product.category}
        </span>
      </div>

      {/* Product title */}
      <h3 style={{
        fontFamily: "var(--font-display)",
        fontSize: "16px",
        fontWeight: 700,
        marginBottom: "8px",
        lineHeight: 1.3,
        color: "var(--text-primary)"
      }}>
        {product.title}
      </h3>

      {/* Product description preview */}
      {product.description && (
        <p style={{
          fontSize: "13px",
          color: "var(--text-secondary)",
          marginBottom: "16px",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        }}>
          {product.description}
        </p>
      )}

      {/* AI Scores (only shown if AI has been run) */}
      {hasAiData && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "16px",
          padding: "12px",
          background: "var(--bg-tertiary)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)"
        }}>
          <MiniScore label="Demand" value={product.aiData.demandScore} good="high" />
          <MiniScore label="Competition" value={product.aiData.competitionScore} good="low" />
          <MiniScore label="Originality" value={product.aiData.originalityScore} good="high" />
          <MiniScore label="© Risk" value={product.aiData.copyrightRiskScore} good="low" />
        </div>
      )}

      {/* Footer: price + date */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {hasAiData ? (
          <span style={{ color: "var(--accent)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "15px" }}>
            ${product.aiData.suggestedPrice}
          </span>
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>No AI data yet</span>
        )}
        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{formattedDate}</span>
      </div>

      {/* Recommended next action — derived purely from existing fields */}
      <div
        style={{
          marginTop: "12px",
          paddingTop: "10px",
          borderTop: "1px dashed var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "11px",
          color: "var(--text-muted)",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          letterSpacing: "0.03em"
        }}
      >
        <span style={{ color: "var(--text-muted)", textTransform: "uppercase" }}>Next ·</span>
        <span style={{ color: nextColor, fontWeight: 700 }}>{nextLabel}</span>
      </div>
    </div>
  );
};

// Small score display used inside the card grid
const MiniScore = ({ label, value, good }) => {
  const isGood = good === "high" ? value >= 7 : value <= 3;
  const isMid = good === "high" ? value >= 4 : value <= 7;
  const color = isGood ? "#3fb950" : isMid ? "#d29922" : "#f85149";

  return (
    <div>
      <div style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-display)", color }}>
        {value}/10
      </div>
    </div>
  );
};

export default ProductCard;
