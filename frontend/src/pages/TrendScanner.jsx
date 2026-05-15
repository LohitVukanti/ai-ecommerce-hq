// ============================================================
// pages/TrendScanner.jsx — Manual/assisted trend intake UI
// ============================================================
// Captures structured trend signals before they become ideas.
// Convert turns a scan into a row in the existing Ideas system,
// which then flows into scoring → product → POD → design package.
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import {
  fetchTrendScans,
  deleteTrendScan,
  convertTrendScanToIdea
} from "../services/api";
import TrendScanCard from "../components/TrendScanCard";
import AddTrendScanModal from "../components/AddTrendScanModal";

const TrendScanner = ({ onBack, onOpenIdeas }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterProductType, setFilterProductType] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrendScans({
        sourcePlatform: filterPlatform || undefined,
        productType: filterProductType || undefined
      });
      setScans(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Could not load trend scans. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [filterPlatform, filterProductType]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this trend scan permanently?")) return;
    setBusyId(id);
    setInfo(null);
    try {
      await deleteTrendScan(id);
      setScans((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleConvert = async (id) => {
    if (!window.confirm("Create a new research idea from this trend scan?")) return;
    setBusyId(id);
    setInfo(null);
    setError(null);
    try {
      const result = await convertTrendScanToIdea(id);
      setScans((prev) => prev.map((s) => (s.id === id ? result.trendScan : s)));
      setInfo(
        result?.idea?.id
          ? `Idea created (id: ${result.idea.id}). Open Ideas & Research to score it and convert to a product.`
          : "Idea created. Open Ideas & Research to continue."
      );
    } catch (e) {
      setError(e.message || "Convert failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
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
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              fontWeight: 700
            }}
          >
            ← Products
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "var(--accent)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px"
              }}
            >
              📈
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "16px", lineHeight: 1 }}>
                Trend Scanner
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.04em"
                }}
              >
                MANUAL / ASSISTED TREND INTAKE
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {typeof onOpenIdeas === "function" && (
            <button
              type="button"
              onClick={onOpenIdeas}
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                padding: "8px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                fontWeight: 700
              }}
            >
              Ideas & Research
            </button>
          )}
          <button
            type="button"
            onClick={load}
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              fontWeight: 600
            }}
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            style={{
              background: "var(--accent)",
              color: "#0d1117",
              padding: "8px 18px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              fontWeight: 800
            }}
          >
            + New trend scan
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: "22px" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "28px", marginBottom: "6px" }}>
            Trend signals
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", maxWidth: "820px" }}>
            Capture structured trend observations from any platform. No scraping or paid APIs yet — convert promising
            scans into research ideas to score and push down the existing pipeline.
          </p>
        </div>

        {info && (
          <div
            style={{
              marginBottom: "16px",
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--success)",
              background: "var(--success-dim)",
              color: "var(--success)",
              fontSize: "13px"
            }}
          >
            {info}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--danger)",
              background: "var(--danger-dim)",
              color: "var(--danger)",
              fontSize: "13px"
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            marginBottom: "22px",
            padding: "12px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-secondary)"
          }}
        >
          <label style={{ display: "block" }}>
            <span
              style={{
                display: "block",
                fontSize: "11px",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "6px"
              }}
            >
              Source platform contains
            </span>
            <input
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              placeholder="e.g. tiktok"
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ display: "block" }}>
            <span
              style={{
                display: "block",
                fontSize: "11px",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "6px"
              }}
            >
              Product type contains
            </span>
            <input
              value={filterProductType}
              onChange={(e) => setFilterProductType(e.target.value)}
              placeholder="e.g. tee"
              style={{ width: "100%" }}
            />
          </label>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <div
              className="spinner"
              style={{ width: "32px", height: "32px", margin: "0 auto 16px", borderTopColor: "var(--accent)" }}
            />
            <div>Loading trend scans…</div>
          </div>
        )}

        {!loading && scans.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "70px 20px",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-lg)",
              color: "var(--text-muted)"
            }}
          >
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>📡</div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "18px",
                color: "var(--text-secondary)"
              }}
            >
              No trend scans match these filters
            </div>
            <div style={{ fontSize: "14px", marginTop: "8px" }}>
              Try clearing filters or capture a new trend signal.
            </div>
          </div>
        )}

        {!loading && scans.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px"
            }}
          >
            {scans.map((scan) => (
              <div key={scan.id} className="fade-in">
                <TrendScanCard
                  scan={scan}
                  busyId={busyId}
                  onConvert={handleConvert}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <AddTrendScanModal
          onClose={() => setShowAdd(false)}
          onCreated={(scan) => setScans((prev) => [scan, ...prev])}
        />
      )}
    </div>
  );
};

export default TrendScanner;
