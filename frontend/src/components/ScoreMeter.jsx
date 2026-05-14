import React from "react";

const ScoreMeter = ({ label, score, invert, tooltip }) => {
  const n = typeof score === "number" ? score : 0;
  const pct = Math.min(100, Math.max(0, (n / 10) * 100));
  const good = invert ? n >= 7 : n <= 3;
  const mid = invert ? n >= 4 : n <= 7;
  const fill = good ? "var(--success)" : mid ? "var(--warning)" : "var(--danger)";

  return (
    <div style={{ marginBottom: "16px" }} title={tooltip}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "6px"
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--text-secondary)"
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "14px",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            color: "var(--text-primary)"
          }}
        >
          {n}/10
        </span>
      </div>
      <div
        style={{
          height: "8px",
          borderRadius: "4px",
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: fill,
            transition: "width 0.25s ease"
          }}
        />
      </div>
    </div>
  );
};

export default ScoreMeter;
