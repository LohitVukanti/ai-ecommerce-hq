// ============================================================
// PodConceptStudio — POD design concepts + listing preview
// ============================================================

import React, { useState } from "react";
import {
  generateDesignConcepts,
  selectProductConcept,
  rejectProductConcept,
  generatePodListing,
  generatePodPrep,
  generateDesignPackage
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
  const designPackage = product.designPackage;

  const canDesignPackage = Boolean(
    product.selectedConceptId &&
    listing &&
    listing.etsyTitle &&
    podPrep &&
    podPrep.id
  );

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

        {/* ---- AI Design / Mockup Studio (template prep) ---- */}
        <div style={{
          borderTop: "2px solid rgba(139, 92, 246, 0.35)",
          paddingTop: "18px",
          marginTop: "16px",
          background: "linear-gradient(180deg, rgba(139, 92, 246, 0.06) 0%, transparent 120px)"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
            flexWrap: "wrap"
          }}>
            <span style={{ fontSize: "22px" }}>🎨</span>
            <div>
              <div style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "14px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--purple)"
              }}>
                Design package studio
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                Preparation layer — structured prompts for art, mockups, and social. No image APIs yet; export JSON-shaped prompts for future DALL·E / SDXL / Ideogram workflows.
              </div>
            </div>
          </div>

          <button
            type="button"
            title={
              !canDesignPackage
                ? "Requires selected concept + POD listing + POD prep"
                : undefined
            }
            onClick={() => run("designPkg", () => generateDesignPackage(product.id))}
            disabled={!!loading || !canDesignPackage}
            style={{
              padding: "10px 20px",
              background: canDesignPackage ? "var(--purple)" : "var(--bg-primary)",
              color: canDesignPackage ? "#0d1117" : "var(--text-muted)",
              border: "1px solid rgba(139, 92, 246, 0.45)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              fontWeight: 800,
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: canDesignPackage ? "0 0 20px rgba(139, 92, 246, 0.15)" : "none"
            }}
          >
            {loading === "designPkg" ? <span className="spinner" /> : <span>✨</span>}
            {loading === "designPkg" ? "Generating…" : "Generate Design Package"}
          </button>

          {designPackage && (
            <div style={{
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              background: "var(--bg-primary)"
            }}>
              <div style={{
                padding: "10px 14px",
                background: "rgba(139, 92, 246, 0.12)",
                borderBottom: "1px solid var(--border)",
                fontSize: "11px",
                color: "var(--text-secondary)"
              }}>
                Package id <span style={{ fontFamily: "monospace" }}>{designPackage.id?.slice(0, 10)}…</span>
                {" · "}
                <span style={{ color: "var(--success)" }}>
                  imageGenerationProviderReady: {String(designPackage.imageGenerationProviderReady)}
                </span>
                {" — "}flag means prompts are structured for a future provider adapter, not that keys are configured.
              </div>
              <div style={{ padding: "14px" }}>
                <PromptBlock title="Master design prompt" text={designPackage.masterDesignPrompt} />
                {(designPackage.alternateDesignPrompts || []).map((t, i) => (
                  <PromptBlock key={`alt-${i}`} title={`Alternate prompt ${i + 1}`} text={t} />
                ))}
                {(designPackage.mockupPrompts || []).map((t, i) => (
                  <PromptBlock key={`mock-${i}`} title={`Mockup prompt ${i + 1}`} text={t} />
                ))}
                <TextBlock title="Aesthetic pack" body={designPackage.aestheticPack} />
                <TextBlock title="Typography suggestions" body={designPackage.typographySuggestions} />
                <TextBlock title="Color system" body={designPackage.colorSystem} />
                <TextBlock title="Visual direction" body={designPackage.visualDirection} />
                <div style={{ marginBottom: "14px" }}>
                  <div style={labelStyle}>Social media concepts</div>
                  {(designPackage.socialMediaConcepts || []).map((sm) => (
                    <div key={sm.id} style={{
                      marginBottom: "10px",
                      padding: "10px",
                      background: "var(--bg-secondary)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      fontSize: "12px",
                      color: "var(--text-secondary)"
                    }}>
                      <strong>{sm.platform}</strong>
                      <div style={{ marginTop: "6px" }}><em>{sm.hook}</em></div>
                      <div style={{ marginTop: "6px", whiteSpace: "pre-wrap" }}>{sm.caption}</div>
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                        {(sm.hashtags || []).join(" ")}
                      </div>
                      <CopyRow text={`${sm.hook}\n\n${sm.caption}\n\n${(sm.hashtags || []).join(" ")}`} />
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <div style={labelStyle}>Ad creative ideas</div>
                  <ul style={{ margin: "6px 0 0 18px", padding: 0, fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {(designPackage.adCreativeIdeas || []).map((line, i) => (
                      <li key={i} style={{ marginBottom: "6px" }}>{line}</li>
                    ))}
                  </ul>
                </div>
                <TextBlock title="Print file guidelines" body={designPackage.printFileGuidelines} />
                <TextBlock title="Export recommendations" body={designPackage.exportRecommendations} />
                <CopyRow text={[
                  designPackage.masterDesignPrompt,
                  ...(designPackage.alternateDesignPrompts || []),
                  ...(designPackage.mockupPrompts || [])
                ].join("\n\n---\n\n")} label="Copy all prompts" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const labelStyle = {
  fontSize: "10px",
  fontFamily: "var(--font-display)",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: "6px"
};

function PromptBlock({ title, text }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ ...labelStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span>{title}</span>
        <CopyTextButton text={text} />
      </div>
      <div style={{
        fontSize: "11px",
        fontFamily: "monospace",
        color: "var(--text-secondary)",
        whiteSpace: "pre-wrap",
        lineHeight: 1.55,
        padding: "10px",
        background: "var(--bg-secondary)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
        maxHeight: "220px",
        overflow: "auto"
      }}>
        {text}
      </div>
    </div>
  );
}

function TextBlock({ title, body }) {
  if (!body) return null;
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ ...labelStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span>{title}</span>
        <CopyTextButton text={body} />
      </div>
      <div style={{
        fontSize: "12px",
        color: "var(--text-secondary)",
        whiteSpace: "pre-wrap",
        lineHeight: 1.55,
        padding: "10px",
        background: "var(--bg-secondary)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)"
      }}>
        {body}
      </div>
    </div>
  );
}

function CopyTextButton({ text }) {
  const [done, setDone] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      window.prompt("Copy:", text);
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      style={{
        padding: "4px 10px",
        fontSize: "10px",
        fontWeight: 700,
        borderRadius: "4px",
        border: "1px solid var(--border)",
        background: "var(--bg-primary)",
        color: "var(--accent)",
        flexShrink: 0
      }}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function CopyRow({ text, label = "Copy block" }) {
  const [done, setDone] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      window.prompt("Copy:", text);
    }
  };
  return (
    <div style={{ marginTop: "8px" }}>
      <button
        type="button"
        onClick={onCopy}
        style={{
          padding: "4px 10px",
          fontSize: "10px",
          fontWeight: 700,
          borderRadius: "4px",
          border: "1px solid var(--border)",
          background: "var(--bg-primary)",
          color: "var(--accent)"
        }}
      >
        {done ? "Copied" : label}
      </button>
    </div>
  );
}

export default PodConceptStudio;
