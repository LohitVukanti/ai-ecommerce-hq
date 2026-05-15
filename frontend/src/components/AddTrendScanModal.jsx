// ============================================================
// components/AddTrendScanModal.jsx — Create trend scan (intake form)
// ============================================================

import React, { useRef, useState } from "react";
import { createTrendScan } from "../services/api";

const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: "6px"
};

const empty = {
  trendKeyword: "",
  sourcePlatform: "",
  sourceUrl: "",
  niche: "",
  targetCustomer: "",
  productType: "",
  productAngle: "",
  observedEngagement: "",
  trendStrength: "",
  competitionSignal: "",
  notes: ""
};

const AddTrendScanModal = ({ onClose, onCreated }) => {
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
      const scan = await createTrendScan(form);
      onCreated(scan);
      onClose();
    } catch (err) {
      setError(err.message || "Could not save trend scan");
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
            New trend scan
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
              <span style={labelStyle}>Trend keyword *</span>
              <input
                required
                value={form.trendKeyword}
                onChange={(e) => set("trendKeyword", e.target.value)}
                placeholder='e.g. "tomato girl summer"'
                style={{ width: "100%" }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label style={{ display: "block" }}>
                <span style={labelStyle}>Source platform</span>
                <input
                  value={form.sourcePlatform}
                  onChange={(e) => set("sourcePlatform", e.target.value)}
                  placeholder="e.g. TikTok, Etsy, Reddit"
                  style={{ width: "100%" }}
                />
              </label>
              <label style={{ display: "block" }}>
                <span style={labelStyle}>Source URL</span>
                <input
                  value={form.sourceUrl}
                  onChange={(e) => set("sourceUrl", e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label style={{ display: "block" }}>
                <span style={labelStyle}>Niche</span>
                <input
                  value={form.niche}
                  onChange={(e) => set("niche", e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
              <label style={{ display: "block" }}>
                <span style={labelStyle}>Product type</span>
                <input
                  value={form.productType}
                  onChange={(e) => set("productType", e.target.value)}
                  placeholder="e.g. T-shirt, poster"
                  style={{ width: "100%" }}
                />
              </label>
            </div>

            <label style={{ display: "block" }}>
              <span style={labelStyle}>Target customer</span>
              <input
                value={form.targetCustomer}
                onChange={(e) => set("targetCustomer", e.target.value)}
                style={{ width: "100%" }}
              />
            </label>

            <label style={{ display: "block" }}>
              <span style={labelStyle}>Product angle</span>
              <input
                value={form.productAngle}
                onChange={(e) => set("productAngle", e.target.value)}
                placeholder="What product would you sell against this trend?"
                style={{ width: "100%" }}
              />
            </label>

            <label style={{ display: "block" }}>
              <span style={labelStyle}>Observed engagement</span>
              <textarea
                rows={2}
                value={form.observedEngagement}
                onChange={(e) => set("observedEngagement", e.target.value)}
                placeholder="Likes, views, saves, search interest…"
                style={{ width: "100%" }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label style={{ display: "block" }}>
                <span style={labelStyle}>Trend strength</span>
                <select
                  value={form.trendStrength}
                  onChange={(e) => set("trendStrength", e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="">—</option>
                  <option value="hot">Hot</option>
                  <option value="rising">Rising</option>
                  <option value="steady">Steady</option>
                  <option value="fading">Fading</option>
                </select>
              </label>
              <label style={{ display: "block" }}>
                <span style={labelStyle}>Competition signal</span>
                <input
                  value={form.competitionSignal}
                  onChange={(e) => set("competitionSignal", e.target.value)}
                  placeholder="e.g. saturated, light, contested"
                  style={{ width: "100%" }}
                />
              </label>
            </div>

            <label style={{ display: "block" }}>
              <span style={labelStyle}>Notes</span>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                style={{ width: "100%" }}
              />
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
              {loading ? "Saving…" : "Save trend scan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTrendScanModal;
