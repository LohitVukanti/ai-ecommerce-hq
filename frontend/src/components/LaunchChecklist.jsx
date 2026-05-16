// ============================================================
// components/LaunchChecklist.jsx — Workflow progress + next step
// ============================================================
// Shown at the top of ProductDetailModal. Pure read of the product
// object; no API calls. Helps the user see (a) what to do next and
// (b) which workflow steps are done / pending / blocked.
// ============================================================

import React, { useState } from "react";
import { getLaunchSteps, getNextAction } from "../utils/launchProgress";

const TONE_COLORS = {
  accent: { bg: "var(--accent-dim)", text: "var(--accent)", border: "var(--accent)" },
  purple: { bg: "var(--purple-dim)", text: "var(--purple)", border: "var(--purple)" },
  success: { bg: "var(--success-dim)", text: "var(--success)", border: "var(--success)" },
  danger: { bg: "var(--danger-dim)", text: "var(--danger)", border: "var(--danger)" },
  muted: { bg: "var(--bg-tertiary)", text: "var(--text-secondary)", border: "var(--border)" }
};

const StatusIcon = ({ step }) => {
  if (step.future) return <span style={{ fontSize: "14px" }} title="Future step">🔮</span>;
  if (step.done) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "var(--success)",
          color: "#0d1117",
          fontSize: "11px",
          fontWeight: 800
        }}
      >
        ✓
      </span>
    );
  }
  if (step.blockedBy) {
    return <span style={{ fontSize: "14px" }} title="Blocked by an earlier step">🔒</span>;
  }
  if (step.optional) {
    return <span style={{ fontSize: "14px" }} title="Optional step">✨</span>;
  }
  return (
    <span
      style={{
        display: "inline-block",
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        border: "1.5px solid var(--text-muted)",
        marginLeft: "2px"
      }}
    />
  );
};

const LaunchChecklist = ({ product }) => {
  const [collapsed, setCollapsed] = useState(false);
  const steps = getLaunchSteps(product);
  const next = getNextAction(product);
  const tone = TONE_COLORS[next.tone] || TONE_COLORS.accent;

  const completed = steps.filter((s) => s.done && !s.future).length;
  const total = steps.filter((s) => !s.future).length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div
      style={{
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        marginBottom: "16px",
        overflow: "hidden"
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "var(--bg-primary)"
        }}
      >
        <span style={{ fontSize: "16px" }}>🧭</span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "13px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--text-secondary)"
          }}
        >
          Product launch checklist
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "auto" }}>
          {completed}/{total} done · {pct}%
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            padding: "4px 10px",
            borderRadius: "var(--radius-sm)",
            fontSize: "11px",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      <div style={{ padding: "16px" }}>
        {/* Progress bar */}
        <div
          style={{
            height: "6px",
            borderRadius: "999px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            overflow: "hidden",
            marginBottom: "14px"
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, var(--accent) 0%, var(--purple) 100%)",
              transition: "width 0.3s ease"
            }}
          />
        </div>

        {/* Recommended Next Action */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "14px 16px",
            background: tone.bg,
            border: `1px solid ${tone.border}`,
            borderRadius: "var(--radius-md)",
            marginBottom: collapsed ? 0 : "16px"
          }}
        >
          <div style={{ fontSize: "20px", lineHeight: 1.2 }}>👉</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: tone.text,
                marginBottom: "4px"
              }}
            >
              Recommended next action
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "15px",
                fontWeight: 800,
                color: "var(--text-primary)",
                lineHeight: 1.35,
                marginBottom: "4px"
              }}
            >
              {next.label}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {next.detail}
            </div>
          </div>
        </div>

        {!collapsed && (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "8px" }}>
            {steps.map((step, idx) => {
              const dim = step.future ? 0.65 : !step.done && step.blockedBy ? 0.7 : 1;
              const titleColor = step.done ? "var(--text-secondary)" : "var(--text-primary)";
              return (
                <li
                  key={step.key}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "10px 12px",
                    background: step.done ? "rgba(63, 185, 80, 0.04)" : "var(--bg-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    opacity: dim
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      minWidth: "20px",
                      paddingTop: "2px"
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ paddingTop: "1px", minWidth: "20px" }}>
                    <StatusIcon step={step} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap"
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: titleColor,
                          textDecoration: step.done && !step.future ? "line-through" : "none"
                        }}
                      >
                        {step.icon ? `${step.icon} ` : ""}
                        {step.label}
                      </span>
                      {step.optional && !step.done && !step.future && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "var(--text-muted)",
                            background: "var(--bg-tertiary)",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            border: "1px solid var(--border)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            fontFamily: "var(--font-display)"
                          }}
                        >
                          Optional
                        </span>
                      )}
                      {step.future && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "var(--text-muted)",
                            background: "var(--bg-tertiary)",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            border: "1px solid var(--border)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            fontFamily: "var(--font-display)"
                          }}
                        >
                          Future
                        </span>
                      )}
                      {step.blockedBy && !step.done && !step.future && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "var(--text-muted)",
                            background: "var(--bg-tertiary)",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            border: "1px solid var(--border)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            fontFamily: "var(--font-display)"
                          }}
                        >
                          Blocked
                        </span>
                      )}
                    </div>
                    {step.meta && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          marginTop: "3px",
                          lineHeight: 1.4
                        }}
                      >
                        {step.meta}
                      </div>
                    )}
                    {!step.done && step.hint && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          marginTop: "3px",
                          lineHeight: 1.45,
                          fontStyle: "italic"
                        }}
                      >
                        {step.hint}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
};

export default LaunchChecklist;
