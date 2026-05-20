import React from "react";

/**
 * Consistent error banner with optional retry and connection hint.
 */
export default function ErrorBanner({
  title = "Something went wrong",
  message,
  hint,
  onRetry,
  retryLabel = "Try again",
  retrying = false
}) {
  if (!message) return null;

  return (
    <div
      style={{
        background: "var(--danger-dim)",
        border: "1px solid var(--danger)",
        borderRadius: "var(--radius-md)",
        padding: "16px 20px",
        marginBottom: "24px",
        color: "var(--danger)"
      }}
      role="alert"
    >
      <div style={{ fontWeight: 700, marginBottom: "4px" }}>⚠️ {title}</div>
      <div style={{ fontSize: "13px", lineHeight: 1.5 }}>{message}</div>
      {hint && (
        <div style={{ fontSize: "12px", marginTop: "8px", color: "var(--text-secondary)" }}>
          {hint}
        </div>
      )}
      {typeof onRetry === "function" && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          style={{
            marginTop: "12px",
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            fontSize: "12px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: retrying ? "default" : "pointer",
            opacity: retrying ? 0.7 : 1
          }}
        >
          {retrying ? <span className="spinner" /> : null}
          {retrying ? "Retrying…" : retryLabel}
        </button>
      )}
    </div>
  );
}
