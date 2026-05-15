// ============================================================
// PodConceptStudio — POD design concepts + listing preview
// ============================================================

import React, { useState } from "react";
import {
  generateDesignConcepts,
  selectProductConcept,
  rejectProductConcept,
  generatePodListing,
  generatePodPrep
} from "../services/api";

const SectionHeader = ({ title, icon }) => (
  <div style={{
    padding: "12px 16px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--accent-dim)"
  }}>
    <span style={{ fontSize: "16px" }}>{icon}</span>
    <span style={{
      fontFamily: "var(--font-display)", fontWeight: 700,
      fontSize: "13px", letterSpacing: "0.05em", textTransform: "uppercase",
      color: "var(--accent)"
    }}>
      {title}
    </span>
  </div>
);

const MiniBtn = ({ children, onClick, disabled, loading, variant }) => {
  const isDanger = variant === "danger";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: 700,
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${isDanger ? "var(--danger)" : "var(--border)"}`,
        background: isDanger ? "var(--danger-dim)" : "var(--bg-primary)",
        color: isDanger ? "var(--danger)" : "var(--text-secondary)",
        opacity: disabled ? 0.5 : 1
      }}
    >
      {loading ? "…" : children}
    </button>
  );
};

const PodConceptStudio = ({ product, onProductChange }) => {
  const [loading, setLoading] = useState(null);
  const [err, setErr] = useState(null);

  const concepts = Array.isArray(product.generatedConcepts) ? product.generatedConcepts : [];
  const listing = product.listingData;
  const podPrep = product.podPrep;

  const run = async (key, fn) => {
    setLoading(key);
    setErr(null);
    try {
      const updated = await fn();
      onProductChange(updated);
    } catch (e) {
      setErr(e.message || "Request failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)",
      marginBottom: "16px",
      overflow: "hidden"
    }}>
      <SectionHeader title="Product Concept Studio" icon="🧵" />

      <div style={{ padding: "16px" }}>
        {err && (
          <div style={{
            marginBottom: "12px", padding: "10px 12px",
            background: "var(--danger-dim)", border: "1px solid var(--danger)",
            borderRadius: "var(--radius-sm)", color: "var(--danger)", fontSize: "12px"
          }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={() => run("concepts", () => generateDesignConcepts(product.id))}
            disabled={!!loading}
            style={{
              padding: "10px 18px",
              background: "var(--purple)",
              color: "#0d1117",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {loading === "concepts" ? <span className="spinner" /> : <span>✨</span>}
            {loading === "concepts" ? "Generating…" : "Generate Design Concepts"}
          </button>
          {concepts.length > 0 && (
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {concepts.length} concept{concepts.length !== 1 ? "s" : ""}
              {product.selectedConceptId ? " · one selected" : ""}
            </span>
          )}
        </div>

        {concepts.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "28px 16px",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-muted)",
            fontSize: "13px"
          }}>
            No POD concepts yet. Use the button above to generate 3–5 apparel directions
            (template-based, no paid API).
          </div>
        )}

        {concepts.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "12px",
            marginBottom: "20px"
          }}>
            {concepts.map((c) => {
              const isSelected = product.selectedConceptId === c.id;
              const isRejected = c.conceptStatus === "rejected";
              return (
                <div
                  key={c.id}
                  style={{
                    background: "var(--bg-primary)",
                    border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "var(--radius-sm)",
                    padding: "12px",
                    opacity: isRejected ? 0.55 : 1,
                    boxShadow: isSelected ? "0 0 0 1px rgba(240,165,0,0.2)" : "none"
                  }}
                >
                  {isSelected && (
                    <div style={{
                      fontSize: "10px", fontWeight: 800, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: "var(--accent)", marginBottom: "6px"
                    }}>
                      Selected concept
                    </div>
                  )}
                  <div style={{ fontWeight: 800, fontSize: "14px", marginBottom: "6px", color: "var(--text-primary)" }}>
                    {c.conceptName}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", fontStyle: "italic" }}>
                    “{c.slogan}”
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    <strong style={{ color: "var(--text-secondary)" }}>Aesthetic</strong> · {c.aesthetic}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    <strong style={{ color: "var(--text-secondary)" }}>Palette</strong> · {c.colorPalette}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    <strong style={{ color: "var(--text-secondary)" }}>Apparel</strong> · {c.apparelType}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    <strong style={{ color: "var(--text-secondary)" }}>Margin</strong> · {c.estimatedMargin}
                    {" · "}
                    <strong style={{ color: "var(--text-secondary)" }}>Trend</strong> · {c.trendAlignment}
                    {" · "}
                    <strong style={{ color: "var(--text-secondary)" }}>IP risk</strong> · {c.copyrightRisk}
                  </div>
                  <div style={{
                    fontSize: "10px", fontFamily: "monospace",
                    color: "var(--text-muted)",
                    marginTop: "8px",
                    padding: "8px",
                    background: "var(--bg-secondary)",
                    borderRadius: "4px",
                    maxHeight: "72px",
                    overflow: "auto",
                    whiteSpace: "pre-wrap"
                  }}>
                    {c.mockupPrompt}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                    <MiniBtn
                      variant="default"
                      disabled={isRejected}
                      loading={loading === `sel-${c.id}`}
                      onClick={() => run(`sel-${c.id}`, () => selectProductConcept(product.id, c.id))}
                    >
                      Select
                    </MiniBtn>
                    <MiniBtn
                      variant="danger"
                      disabled={isRejected}
                      loading={loading === `rej-${c.id}`}
                      onClick={() => run(`rej-${c.id}`, () => rejectProductConcept(product.id, c.id))}
                    >
                      Reject
                    </MiniBtn>
                    <MiniBtn
                      disabled={isRejected}
                      loading={loading === `lst-${c.id}`}
                      onClick={() => run(`lst-${c.id}`, () => generatePodListing(product.id, c.id))}
                    >
                      Generate listing
                    </MiniBtn>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {listing && (
          <div style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "16px",
            marginTop: "4px"
          }}>
            <div style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "12px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              marginBottom: "10px"
            }}>
              POD listing preview (stored on product)
            </div>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: "var(--text-primary)" }}>
              {listing.etsyTitle}
            </div>
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "6px" }}>Tags</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {(listing.etsyTags || []).map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "2px 8px",
                      background: "var(--accent-dim)",
                      borderRadius: "12px",
                      fontSize: "11px",
                      color: "var(--accent)"
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Description</div>
            <div style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              whiteSpace: "pre-wrap",
              padding: "10px",
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              maxHeight: "160px",
              overflow: "auto",
              marginBottom: "10px"
            }}>
              {listing.etsyDescription}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>SEO keywords</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>
              {(listing.seoKeywords || []).join(", ")}
            </div>
            {listing.pricingRecommendation && (
              <div style={{
                padding: "10px 12px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                color: "var(--text-secondary)"
              }}>
                <strong>Pricing</strong>: ${listing.pricingRecommendation.suggested} suggested
                (range ${listing.pricingRecommendation.min}–${listing.pricingRecommendation.max})
                <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                  {listing.pricingRecommendation.basis}
                </div>
              </div>
            )}
            {listing.audienceNotes && (
              <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--text-secondary)" }}>
                <strong>Audience</strong>: {listing.audienceNotes}
              </div>
            )}
          </div>
        )}

        {/* ---- Printify / POD Prep (prep mode) ---- */}
        <div style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "16px",
          marginTop: listing ? "12px" : "4px"
        }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "12px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            marginBottom: "8px"
          }}>
            Printify / POD prep
          </div>
          <div style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginBottom: "12px",
            padding: "10px 12px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            lineHeight: 1.5
          }}>
            <strong style={{ color: "var(--accent)" }}>Prep mode</strong>
            {" — "}Estimates and checklists are template-generated. No Printify account or API keys
            are used yet; this block is for planning margins, files, and fulfillment before you wire
            a real integration.
          </div>

          <button
            type="button"
            title={!product.selectedConceptId ? "Select a concept on a card above first" : undefined}
            onClick={() => run("prep", () => generatePodPrep(product.id))}
            disabled={!!loading || !product.selectedConceptId}
            style={{
              padding: "10px 18px",
              background: !product.selectedConceptId ? "var(--bg-primary)" : "var(--accent)",
              color: !product.selectedConceptId ? "var(--text-muted)" : "#0d1117",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {loading === "prep" ? <span className="spinner" /> : <span>📦</span>}
            {loading === "prep" ? "Generating…" : "Generate POD Prep"}
          </button>

          {podPrep && (
            <div style={{
              padding: "14px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              color: "var(--text-secondary)"
            }}>
              <div style={{ marginBottom: "10px", fontSize: "11px", color: "var(--text-muted)" }}>
                Provider: <strong style={{ color: "var(--text-primary)" }}>{podPrep.provider}</strong>
                {" · "}Prep id: <span style={{ fontFamily: "monospace" }}>{podPrep.id?.slice(0, 8)}…</span>
              </div>
              {[
                ["Recommended product type", podPrep.recommendedProductType],
                ["Apparel style", podPrep.apparelStyle],
                ["Color", podPrep.apparelColor],
                ["Print placement", podPrep.printPlacement],
                ["Print area", podPrep.printArea],
                ["Production cost (est.)", `$${podPrep.productionCostEstimate}`],
                ["Selling price (est.)", `$${podPrep.recommendedSellingPrice}`],
                ["Estimated profit", `$${podPrep.estimatedProfit}`],
                ["Estimated margin", `${podPrep.estimatedMarginPercent}%`],
                ["Fulfillment notes", podPrep.fulfillmentNotes],
                ["Mockup instructions", podPrep.mockupInstructions],
                ["Print file requirements", podPrep.printFileRequirements],
                ["Risk notes", podPrep.riskNotes]
              ].map(([label, val]) => (
                <div key={label} style={{ marginBottom: "12px" }}>
                  <div style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    marginBottom: "4px"
                  }}>
                    {label}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{val}</div>
                </div>
              ))}
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "8px" }}>
                Created {new Date(podPrep.createdAt).toLocaleString()}
                {podPrep.selectedConceptId && (
                  <span> · linked concept <span style={{ fontFamily: "monospace" }}>{podPrep.selectedConceptId.slice(0, 8)}…</span></span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PodConceptStudio;
