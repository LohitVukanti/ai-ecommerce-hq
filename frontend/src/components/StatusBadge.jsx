import React from "react";

const STATUS_LABELS = {
  all: "All",
  idea: "Idea",
  researched: "Researched",
  listing_generated: "Listing Ready",
  approved: "Approved",
  etsy_draft_created: "Etsy Draft",
  rejected: "Rejected"
};

const StatusBadge = ({ status }) => {
  const label = STATUS_LABELS[status] || status?.replace(/_/g, " ") || "Unknown";
  const isRejected = status === "rejected";
  const isEtsy = status === "etsy_draft_created";
  const isApproved = status === "approved";
  const isListing = status === "listing_generated";

  const bg = isRejected
    ? "var(--danger-dim)"
    : isEtsy
      ? "var(--accent-dim)"
      : isApproved
        ? "var(--success-dim)"
        : isListing
          ? "var(--purple-dim)"
          : "var(--bg-tertiary)";
  const color = isRejected
    ? "var(--danger)"
    : isEtsy
      ? "var(--accent)"
      : isApproved
        ? "var(--success)"
        : isListing
          ? "var(--purple)"
          : "var(--text-secondary)";
  const border = isRejected
    ? "1px solid var(--danger)"
    : isEtsy
      ? "1px solid rgba(240,165,0,0.35)"
      : isApproved
        ? "1px solid var(--success)"
        : isListing
          ? "1px solid var(--purple)"
          : "1px solid var(--border)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: "20px",
        fontSize: "11px",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: bg,
        color,
        border
      }}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
