// ============================================================
// PrivateAccessGate — optional shared password (env-driven)
// ============================================================
// If VITE_APP_PASSWORD is set at build time, block the app until
// the user enters it once; unlock flag is stored in localStorage.
// Not a substitute for real authentication.
// ============================================================

import React, { useState, useEffect } from "react";

const STORAGE_KEY = "ai_ecommerce_hq_private_unlock";

function isUnlocked() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function setUnlocked() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export default function PrivateAccessGate({ children }) {
  const requiredPassword = (import.meta.env.VITE_APP_PASSWORD || "").trim();
  const [unlocked, setUnlockedState] = useState(() =>
    !requiredPassword ? true : isUnlocked()
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!requiredPassword) {
      setUnlockedState(true);
      return;
    }
    setUnlockedState(isUnlocked());
  }, [requiredPassword]);

  if (!requiredPassword || unlocked) {
    return children;
  }

  const onSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (input === requiredPassword) {
      setUnlocked();
      setUnlockedState(true);
      setInput("");
    } else {
      setError("Incorrect password.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg-primary)",
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(240, 165, 0, 0.08), transparent)"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: "28px 26px"
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "13px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: "8px"
          }}
        >
          Private deployment
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "22px",
            fontWeight: 800,
            marginBottom: "8px",
            color: "var(--text-primary)"
          }}
        >
          AI E-Commerce HQ
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px", lineHeight: 1.55 }}>
          This instance is gated with a shared password. Enter it to continue. This is not full authentication — use proper auth for sensitive data.
        </p>
        <form onSubmit={onSubmit}>
          <label
            htmlFor="hq-private-pass"
            style={{
              display: "block",
              fontSize: "11px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "8px"
            }}
          >
            Password
          </label>
          <input
            id="hq-private-pass"
            type="password"
            autoComplete="current-password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              fontSize: "15px",
              marginBottom: "14px",
              outline: "none"
            }}
          />
          {error && (
            <div
              style={{
                fontSize: "12px",
                color: "var(--danger)",
                marginBottom: "12px",
                padding: "8px 10px",
                background: "var(--danger-dim)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--danger)"
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: "var(--accent)",
              color: "#0d1117",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
