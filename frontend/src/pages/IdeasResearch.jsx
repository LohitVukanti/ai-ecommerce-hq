// ============================================================
// pages/IdeasResearch.jsx — Ideas / research intake + opportunity scorer UI
// ============================================================
// Uses rule-based scoring on the server (no paid AI). Styling matches Dashboard tokens.
// ============================================================

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { fetchIdeas, scoreIdea, deleteIdea, convertIdeaToProduct } from "../services/api";
import IdeaCard from "../components/IdeaCard";
import AddIdeaModal from "../components/AddIdeaModal";

const IdeasResearch = ({ onBack }) => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterDecision, setFilterDecision] = useState("");
  const [filterProductType, setFilterProductType] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIdeas({
        sourcePlatform: filterPlatform || undefined,
        decisionStatus: filterDecision || undefined,
        productType: filterProductType || undefined
      });
      setIdeas(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Could not load ideas. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [filterPlatform, filterDecision, filterProductType]);

  useEffect(() => {
    load();
  }, [load]);

  const decisionOptions = useMemo(() => {
    const base = [
      { value: "", label: "All decisions" },
      { value: "pending", label: "Pending score" },
      { value: "high_potential", label: "High potential" },
      { value: "test", label: "Test" },
      { value: "needs_refinement", label: "Needs refinement" },
      { value: "reject", label: "Reject" },
      { value: "converted_to_product", label: "Converted" }
    ];
    return base;
  }, []);

  const handleScore = async (id) => {
    setBusyId(id);
    setInfo(null);
    try {
      const updated = await scoreIdea(id);
      setIdeas((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (e) {
      setError(e.message || "Scoring failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this idea permanently?")) return;
    setBusyId(id);
    setInfo(null);
    try {
      await deleteIdea(id);
      setIdeas((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(e.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleConvert = async (id) => {
    if (!window.confirm("Create a new product in the pipeline from this idea?")) return;
    setBusyId(id);
    setInfo(null);
    try {
      const result = await convertIdeaToProduct(id);
      const pid = result?.product?.id;
      setIdeas((prev) => prev.map((i) => (i.id === id ? result.idea : i)));
      setInfo(
        pid
          ? `Product created (id: ${pid}). Open the Product Dashboard to run AI, digital products, and Etsy draft as usual.`
          : "Product created. Open the Product Dashboard to continue."
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
              🔭
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "16px", lineHeight: 1 }}>
                Ideas & Research
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.04em"
                }}
              >
                INTAKE + OPPORTUNITY SCORER
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
            + New idea
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: "22px" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "28px", marginBottom: "6px" }}>
            Research intake
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", maxWidth: "820px" }}>
            Capture signals from any platform, score opportunities with transparent rules (no paid AI), then convert winners into
            products in your existing pipeline.
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
            <input value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} placeholder="e.g. etsy" style={{ width: "100%" }} />
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
              Decision status
            </span>
            <select value={filterDecision} onChange={(e) => setFilterDecision(e.target.value)} style={{ width: "100%" }}>
              {decisionOptions.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
            <input value={filterProductType} onChange={(e) => setFilterProductType(e.target.value)} placeholder="e.g. printable" style={{ width: "100%" }} />
          </label>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <div className="spinner" style={{ width: "32px", height: "32px", margin: "0 auto 16px", borderTopColor: "var(--accent)" }} />
            <div>Loading ideas…</div>
          </div>
        )}

        {!loading && ideas.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "70px 20px",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-lg)",
              color: "var(--text-muted)"
            }}
          >
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>🧭</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "18px", color: "var(--text-secondary)" }}>
              No ideas match these filters
            </div>
            <div style={{ fontSize: "14px", marginTop: "8px" }}>Try clearing filters or add a new research idea.</div>
          </div>
        )}

        {!loading && ideas.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px"
            }}
          >
            {ideas.map((idea) => (
              <div key={idea.id} className="fade-in">
                <IdeaCard
                  idea={idea}
                  busyId={busyId}
                  onScore={handleScore}
                  onConvert={handleConvert}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <AddIdeaModal
          onClose={() => setShowAdd(false)}
          onCreated={(idea) => setIdeas((prev) => [idea, ...prev])}
        />
      )}
    </div>
  );
};

export default IdeasResearch;
