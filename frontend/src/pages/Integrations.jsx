// ============================================================
// pages/Integrations.jsx — External integrations dashboard
// ============================================================
// Read-only summary of every external integration's mode and
// configuration state. The backend is the source of truth — this
// page renders whatever GET /api/integrations/status returns.
//
// Nothing on this page exposes a secret value; the backend never
// returns key contents, only the NAMES of env vars that are
// missing.
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import { fetchIntegrationStatus, getEtsyAuthStartUrl, getApiConnectionHint } from "../services/api";
import ErrorBanner from "../components/ErrorBanner";

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

const ICONS = {
  "openai-text": "✍️",
  "image-generation": "🎨",
  printify: "🛍️",
  etsy: "🛒"
};

function ModePill({ mode }) {
  const style = MODE_STYLES[mode] || MODE_STYLES.mock;
  return (
    <span
      style={{
        ...style,
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: "var(--font-display)"
      }}
    >
      {mode}
    </span>
  );
}

function ConfiguredBadge({ configured, needsOAuth }) {
  if (configured) {
    return (
      <span style={{ color: "#56d364", fontSize: "12px", fontWeight: 700 }}>
        ● Configured
      </span>
    );
  }
  if (needsOAuth) {
    return (
      <span style={{ color: "#e3b341", fontSize: "12px", fontWeight: 700 }}>
        ● OAuth required
      </span>
    );
  }
  return (
    <span style={{ color: "#9aa6b2", fontSize: "12px", fontWeight: 700 }}>
      ○ Not configured
    </span>
  );
}

function MissingEnvList({ items }) {
  if (!items || items.length === 0) {
    return (
      <div style={{ fontSize: "12px", color: "#56d364", marginTop: "8px" }}>
        All required environment variables are set.
      </div>
    );
  }
  return (
    <div style={{ marginTop: "10px" }}>
      <div
        style={{
          fontSize: "10px",
          color: "var(--text-muted)",
          fontFamily: "var(--font-display)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: "6px"
        }}
      >
        Missing
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {items.map((m) => (
          <code
            key={m}
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "2px 8px",
              fontSize: "11px",
              color: "#e3b341",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
            }}
          >
            {m}
          </code>
        ))}
      </div>
    </div>
  );
}

function ProviderCard({ provider, onConnectEtsy }) {
  const icon = ICONS[provider.key] || "🔌";
  const isEtsy = provider.key === "etsy";
  const isLive = provider.mode === "live";

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>{icon}</span>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
              {provider.label}
            </div>
            <div style={{ marginTop: "4px" }}>
              <ConfiguredBadge
                configured={provider.configured}
                needsOAuth={Boolean(provider.needsOAuth)}
              />
            </div>
          </div>
        </div>
        <ModePill mode={provider.mode} />
      </div>

      {/* Powers */}
      <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {provider.powers}
      </div>

      {/* Live-off warning */}
      {!isLive && (
        <div
          style={{
            background: "rgba(187, 128, 9, 0.08)",
            border: "1px solid rgba(187, 128, 9, 0.3)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 12px",
            fontSize: "12px",
            color: "#e3b341"
          }}
        >
          ⚠️ This integration is running in <strong>{provider.mode}</strong> mode. Real API calls are
          NOT being made. Add the env vars below and restart the backend to enable live mode.
        </div>
      )}

      {/* Missing env */}
      <MissingEnvList items={provider.missingEnv} />

      {/* Setup instructions */}
      <div
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 12px",
          fontSize: "12px",
          color: "var(--text-secondary)",
          lineHeight: 1.6
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "6px"
          }}
        >
          Setup
        </div>
        {provider.setup}
        {provider.docsUrl && (
          <div style={{ marginTop: "8px" }}>
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)", fontSize: "12px", fontWeight: 600 }}
            >
              Provider docs →
            </a>
          </div>
        )}
      </div>

      {/* Etsy connect button — only when OAuth handshake is the only thing left */}
      {isEtsy && provider.needsOAuth && (
        <button
          type="button"
          onClick={onConnectEtsy}
          style={{
            background: "var(--accent)",
            color: "#0d1117",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Connect Etsy account →
        </button>
      )}

      {/* Etsy disconnected hint */}
      {isEtsy && provider.hasAccessToken && (
        <div style={{ fontSize: "12px", color: "#56d364" }}>
          ✓ Etsy access token stored on backend.
        </div>
      )}
    </div>
  );
}

const Integrations = ({ onBack, initialOauthBanner = null }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [oauthBanner, setOauthBanner] = useState(initialOauthBanner);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchIntegrationStatus();
      setStatus(data);
    } catch (e) {
      setError(e.message || "Could not load integration status. Is the backend running?");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Legacy: if Integrations mounted without App bootstrap, still read URL once.
  useEffect(() => {
    if (initialOauthBanner) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("etsy_oauth");
    if (!flag) return;
    if (flag === "success") {
      setOauthBanner({ kind: "success", text: "Etsy connected — tokens stored on the backend." });
    } else {
      setOauthBanner({
        kind: "error",
        text: `Etsy OAuth failed: ${params.get("reason") || "unknown error"}`
      });
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [initialOauthBanner]);

  const handleConnectEtsy = () => {
    window.location.href = getEtsyAuthStartUrl();
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            ← Back to products
          </button>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
            Integrations
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
            EXTERNAL API STATUS
          </div>
        </div>

        <button
          onClick={load}
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            padding: "8px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          ↻ Refresh
        </button>
      </nav>

      <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
        {/* OAuth callback banner */}
        {oauthBanner && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "var(--radius)",
              fontSize: "13px",
              fontWeight: 600,
              background: oauthBanner.kind === "success" ? "rgba(46, 160, 67, 0.12)" : "rgba(229, 83, 75, 0.12)",
              border: oauthBanner.kind === "success" ? "1px solid rgba(46, 160, 67, 0.4)" : "1px solid rgba(229, 83, 75, 0.4)",
              color: oauthBanner.kind === "success" ? "#56d364" : "#f85149"
            }}
          >
            {oauthBanner.text}
          </div>
        )}

        {/* Summary banner */}
        {status && (
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "16px 20px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap"
            }}
          >
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                {status.summary.banner}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                {status.summary.live} live · {status.summary.mockOrPreview} mock/preview · runtime: {status.runtime?.nodeEnv}
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Generated {new Date(status.generatedAt).toLocaleString()}
            </div>
          </div>
        )}

        {/* Body */}
        {loading && (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            <span className="spinner" style={{ marginRight: "8px", verticalAlign: "middle" }} />
            Loading integration status…
          </div>
        )}

        <ErrorBanner
          title="Could not load integrations"
          message={error}
          hint={error ? getApiConnectionHint() : null}
          onRetry={error ? () => load(true) : undefined}
          retrying={retrying}
        />

        {!loading && !error && status && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
              gap: "16px"
            }}
          >
            {status.providers.map((p) => (
              <ProviderCard key={p.key} provider={p} onConnectEtsy={handleConnectEtsy} />
            ))}
          </div>
        )}

        {/* Safety note */}
        {!loading && !error && status && (
          <div
            style={{
              marginTop: "24px",
              padding: "14px 18px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              lineHeight: 1.6
            }}
          >
            <strong>Safety notes.</strong> Every live action (image generation, Printify product creation, Etsy
            draft creation) is server-side gated on its{" "}
            <code style={{ color: "#e3b341" }}>ENABLE_REAL_*</code> flag, credential presence, and the relevant
            product prerequisites — even if you call the route directly. Printify and Etsy never auto-publish;
            both create <strong>drafts only</strong>. Secret values are never sent to the frontend.
          </div>
        )}
      </div>
    </div>
  );
};

export default Integrations;
