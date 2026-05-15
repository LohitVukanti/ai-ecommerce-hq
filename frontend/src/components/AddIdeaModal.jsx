// ============================================================
// components/AddIdeaModal.jsx — Create research idea (intake form)
// ============================================================

import React, { useState, useRef } from "react";
import { createIdea } from "../services/api";

const empty = {
  title: "",
  sourcePlatform: "",
  sourceUrl: "",
  niche: "",
  targetCustomer: "",
  productType: "",
  estimatedSellingPrice: "",
  estimatedProductionCost: "",
  competitionLevel: "",
  demandEvidence: "",
  trendEvidence: "",
  fulfillmentDifficulty: "",
  copyrightRisk: "",
  notes: ""
};

const AddIdeaModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const submitLock = useRef(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || submitLock.current) return;
    submitLock.current = true;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        estimatedSellingPrice: form.estimatedSellingPrice === "" ? 0 : Number(form.estimatedSellingPrice),
        estimatedProductionCost: form.estimatedProductionCost === "" ? 0 : Number(form.estimatedProductionCost)
      };
      const idea = await createIdea(payload);
      onCreated(idea);
      onClose();
    } catch (err) {
      setError(err.message || "Could not save idea");
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
        padding: "20px",
        overflowY: "auto"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: "640px",
          boxShadow: "var(--shadow-lg)",
          marginBottom: "24px"
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, margin: 0 }}>
            New research idea
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              fontSize: "20px",
              border: "none",
              cursor: "pointer"
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "22px" }}>
          {error && (
            <div
              style={{
                marginBottom: "14px",
                padding: "12px 14px",
                background: "var(--danger-dim)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--radius-sm)",
                color: "var(--danger)",
                fontSize: "13px"
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "grid", gap: "14px" }}>
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
                Title *
              </span>
              <input
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                style={{ width: "100%" }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                  Source platform
                </span>
                <input value={form.sourcePlatform} onChange={(e) => set("sourcePlatform", e.target.value)} style={{ width: "100%" }} />
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
                  Source URL
                </span>
                <input value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} style={{ width: "100%" }} />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                  Niche
                </span>
                <input value={form.niche} onChange={(e) => set("niche", e.target.value)} style={{ width: "100%" }} />
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
                  Product type
                </span>
                <input value={form.productType} onChange={(e) => set("productType", e.target.value)} style={{ width: "100%" }} />
              </label>
            </div>

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
                Target customer
              </span>
              <input value={form.targetCustomer} onChange={(e) => set("targetCustomer", e.target.value)} style={{ width: "100%" }} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                  Est. selling price (USD)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimatedSellingPrice}
                  onChange={(e) => set("estimatedSellingPrice", e.target.value)}
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
                  Est. production cost (USD)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimatedProductionCost}
                  onChange={(e) => set("estimatedProductionCost", e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
            </div>

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
                Competition level (describe)
              </span>
              <input value={form.competitionLevel} onChange={(e) => set("competitionLevel", e.target.value)} style={{ width: "100%" }} />
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
                Demand evidence
              </span>
              <textarea rows={3} value={form.demandEvidence} onChange={(e) => set("demandEvidence", e.target.value)} style={{ width: "100%" }} />
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
                Trend evidence
              </span>
              <textarea rows={3} value={form.trendEvidence} onChange={(e) => set("trendEvidence", e.target.value)} style={{ width: "100%" }} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                  Fulfillment difficulty
                </span>
                <input value={form.fulfillmentDifficulty} onChange={(e) => set("fulfillmentDifficulty", e.target.value)} style={{ width: "100%" }} />
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
                  Copyright / IP risk
                </span>
                <input value={form.copyrightRisk} onChange={(e) => set("copyrightRisk", e.target.value)} style={{ width: "100%" }} />
              </label>
            </div>

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
                Notes
              </span>
              <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} style={{ width: "100%" }} />
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 16px",
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                fontWeight: 700
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 16px",
                background: "var(--accent)",
                color: "#0d1117",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                fontWeight: 800
              }}
            >
              {loading ? "Saving…" : "Save idea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddIdeaModal;
