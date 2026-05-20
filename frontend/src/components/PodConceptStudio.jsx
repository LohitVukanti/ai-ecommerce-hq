// ============================================================
// PodConceptStudio — POD design concepts + listing preview
// ============================================================

import React, { useState, useRef } from "react";
import {
  generateDesignConcepts,
  selectProductConcept,
  rejectProductConcept,
  generatePodListing,
  generatePodPrep,
  generateDesignPackage,
  generatePrintifyPreview,
  prepareArtwork,
  uploadArtwork,
  approveArtworkAsset,
  rejectArtworkAsset,
  setPrimaryArtworkAsset,
  deleteArtworkAsset,
  generateArtworkImage,
  createPrintifyProduct,
  resolveDownloadUrl
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
  const printifyPreview = product.printifyPreview;
  const artworkAssets = product.artworkAssets;
  const artworkStatus = product.artworkStatus || "not_prepared";
  const artworkItems = Array.isArray(artworkAssets?.items) ? artworkAssets.items : [];
  const fileInputRef = useRef(null);

  const canDesignPackage = Boolean(
    product.selectedConceptId &&
    listing &&
    listing.etsyTitle &&
    podPrep &&
    podPrep.id
  );

  // Printify preview shares prereqs with the design package except the
  // design package itself is optional. designPackage simply enriches the
  // payload preview when present.
  const canPrintifyPreview = Boolean(
    product.selectedConceptId &&
    listing &&
    listing.etsyTitle &&
    podPrep &&
    podPrep.id
  );
  const printifyPreviewReason = !product.selectedConceptId
    ? "Select a concept first."
    : !(podPrep && podPrep.id)
      ? "Generate POD Prep first — it provides cost / placement / margin inputs."
      : !(listing && listing.etsyTitle)
        ? "Generate the listing first — its title, tags, and description fill the Printify payload."
        : null;

  // Artwork Generation Prep needs concept + POD prep. Listing /
  // design package / Printify preview enrich the brief when present
  // but aren't strictly required.
  const canArtwork = Boolean(
    product.selectedConceptId &&
    podPrep &&
    podPrep.id
  );
  const artworkReason = !product.selectedConceptId
    ? "Select a concept first."
    : !(podPrep && podPrep.id)
      ? "Generate POD Prep first — it provides print placement, color, and area for the artwork brief."
      : null;

  // Inline reason explaining why Design Package is disabled (instead of a hidden tooltip)
  const designPackageReason = !product.selectedConceptId
    ? "Select a concept first."
    : !(listing && listing.etsyTitle)
      ? "Generate the listing for the selected concept first."
      : !(podPrep && podPrep.id)
        ? "Generate POD Prep first — it provides cost / margin inputs."
        : null;

  // Did the saved listing come from a concept that is no longer selected?
  const listingMismatch =
    listing && listing.fromConceptId && product.selectedConceptId &&
    listing.fromConceptId !== product.selectedConceptId;

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
        {/* How-to-use guidance for the whole studio */}
        <div
          style={{
            padding: "10px 12px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "11px",
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            marginBottom: "14px"
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "10px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: "4px"
            }}
          >
            How to use this
          </div>
          <span style={{ color: "var(--text-muted)" }}>
            1. Generate concepts &nbsp;→&nbsp; 2. Select one &nbsp;→&nbsp; 3. Generate listing
            &nbsp;→&nbsp; 4. Generate POD Prep &nbsp;→&nbsp; 5. Generate Design Package.
            All output is template-based; no paid API calls. Persisted to SQLite.
          </span>
        </div>

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

        {concepts.length > 0 && !product.selectedConceptId && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--accent-dim)",
              border: "1px dashed var(--accent)",
              borderRadius: "var(--radius-sm)",
              color: "var(--accent)",
              fontSize: "11px",
              marginBottom: "12px"
            }}
          >
            👇 Pick one concept (click <strong>Select</strong>) to unlock listing, POD prep, and design package.
          </div>
        )}

        {listingMismatch && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: "11px",
              marginBottom: "12px"
            }}
          >
            ⚠ The saved listing was built from a different concept. Re-run <strong>Generate listing</strong> on the currently selected concept to keep them aligned.
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
              <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--success)",
                    background: "var(--success-dim)",
                    border: "1px solid var(--success)",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    fontFamily: "var(--font-display)"
                  }}
                >
                  ✓ Saved to product
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Provider: <strong style={{ color: "var(--text-primary)" }}>{podPrep.provider}</strong>
                  {" · "}Prep id: <span style={{ fontFamily: "monospace" }}>{podPrep.id?.slice(0, 8)}…</span>
                </span>
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
                Preparation layer — structured prompts for art, mockups, and social.
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "rgba(139, 92, 246, 0.08)",
              border: "1px solid rgba(139, 92, 246, 0.35)",
              borderRadius: "var(--radius-sm)",
              fontSize: "11px",
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              marginBottom: "12px"
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "10px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--purple)",
                marginBottom: "4px"
              }}
            >
              How to use this
            </div>
            Combines your selected concept, listing copy, and POD prep into a single creative brief: 1 master prompt, 3 alternates, 3 mockup prompts, social hooks, ad ideas, plus print-file + export guidance. Nothing is sent to an image API yet — copy a prompt block into DALL·E / SDXL / Ideogram or save for future automation.
          </div>

          <button
            type="button"
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
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: canDesignPackage ? "0 0 20px rgba(139, 92, 246, 0.15)" : "none"
            }}
          >
            {loading === "designPkg" ? <span className="spinner" /> : <span>✨</span>}
            {loading === "designPkg" ? "Generating…" : "Generate Design Package"}
          </button>

          {designPackageReason && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginBottom: "14px",
                lineHeight: 1.4
              }}
            >
              🔒 {designPackageReason}
            </div>
          )}

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

        {/* ---- Printify Draft Preview (preview mode — no API keys) ---- */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "18px",
            marginTop: "16px"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
              flexWrap: "wrap"
            }}
          >
            <span style={{ fontSize: "22px" }}>🖨</span>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "14px",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--accent)"
                }}
              >
                Printify draft preview
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                Builds a Printify-shaped payload — blueprint, provider, variants, print areas, file specs.
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "var(--accent-dim)",
              border: "1px dashed var(--accent)",
              borderRadius: "var(--radius-sm)",
              fontSize: "11px",
              color: "var(--accent)",
              lineHeight: 1.55,
              marginBottom: "12px"
            }}
          >
            <strong style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}>Preview mode only</strong>
            {" — "}not connected to Printify API yet. Inspect the payload here; later wiring will POST it for real.
          </div>

          <button
            type="button"
            onClick={() => run("printifyPrev", () => generatePrintifyPreview(product.id))}
            disabled={!!loading || !canPrintifyPreview}
            style={{
              padding: "10px 18px",
              background: canPrintifyPreview ? "var(--accent)" : "var(--bg-primary)",
              color: canPrintifyPreview ? "#0d1117" : "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {loading === "printifyPrev" ? <span className="spinner" /> : <span>🖨</span>}
            {loading === "printifyPrev"
              ? "Generating…"
              : printifyPreview
                ? "Re-Generate Printify Preview"
                : "Generate Printify Preview"}
          </button>

          {printifyPreviewReason && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginBottom: "14px",
                lineHeight: 1.4
              }}
            >
              🔒 {printifyPreviewReason}
            </div>
          )}

          {printifyPreview && (
            <div
              style={{
                padding: "14px",
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                color: "var(--text-secondary)"
              }}
            >
              <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--success)",
                    background: "var(--success-dim)",
                    border: "1px solid var(--success)",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    fontFamily: "var(--font-display)"
                  }}
                >
                  ✓ Saved to product
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Provider: <strong style={{ color: "var(--text-primary)" }}>{printifyPreview.provider}</strong>
                  {" · "}Preview id:{" "}
                  <span style={{ fontFamily: "monospace" }}>{printifyPreview.id?.slice(0, 8)}…</span>
                  {" · "}Type: <strong style={{ color: "var(--text-primary)" }}>{printifyPreview.productType}</strong>
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "10px",
                  marginBottom: "14px"
                }}
              >
                <SmallStat label="Retail" value={`$${printifyPreview.retailPrice}`} />
                <SmallStat label="Production" value={`$${printifyPreview.productionCost}`} />
                <SmallStat label="Profit" value={`$${printifyPreview.estimatedProfit}`} />
                <SmallStat label="Margin" value={`${printifyPreview.estimatedMarginPercent}%`} />
              </div>

              {[
                ["Recommended blueprint", printifyPreview.recommendedBlueprint
                  ? `${printifyPreview.recommendedBlueprint.name} (id ${printifyPreview.recommendedBlueprint.blueprint_id}, ${printifyPreview.recommendedBlueprint.source})`
                  : "—"],
                ["Recommended print provider", printifyPreview.recommendedPrintProvider
                  ? `${printifyPreview.recommendedPrintProvider.name} (id ${printifyPreview.recommendedPrintProvider.print_provider_id}, ${printifyPreview.recommendedPrintProvider.source})`
                  : "—"],
                ["Print placement", printifyPreview.printPlacement],
                ["Suggested colors", (printifyPreview.suggestedColors || []).join(" · ")],
                ["Suggested sizes", (printifyPreview.suggestedSizes || []).join(" · ")],
                ["Design file requirements", printifyPreview.designFileRequirements],
                ["Mockup instructions", printifyPreview.mockupInstructions]
              ].map(([label, val]) => (
                <div key={label} style={{ marginBottom: "12px" }}>
                  <div style={labelStyle}>{label}</div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{val || "—"}</div>
                </div>
              ))}

              {Array.isArray(printifyPreview.publishReadinessChecklist) && (
                <div style={{ marginBottom: "14px" }}>
                  <div style={labelStyle}>Publish readiness checklist</div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {printifyPreview.publishReadinessChecklist.map((item) => (
                      <li
                        key={item.key}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                          padding: "6px 0",
                          borderBottom: "1px dashed var(--border)"
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            background: item.done ? "var(--success)" : "transparent",
                            border: item.done ? "none" : "1.5px solid var(--text-muted)",
                            color: "#0d1117",
                            fontSize: "10px",
                            fontWeight: 800,
                            flexShrink: 0,
                            marginTop: "2px"
                          }}
                        >
                          {item.done ? "✓" : ""}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: item.done ? "var(--text-secondary)" : "var(--text-primary)"
                            }}
                          >
                            {item.label}
                          </div>
                          {item.hint && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--text-muted)",
                                marginTop: "2px",
                                lineHeight: 1.45
                              }}
                            >
                              {item.hint}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {printifyPreview.apiPayloadPreview && (
                <div style={{ marginBottom: "8px" }}>
                  <div
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px"
                    }}
                  >
                    <span>Printify API payload preview</span>
                    <CopyTextButton text={JSON.stringify(printifyPreview.apiPayloadPreview, null, 2)} />
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "10px",
                      background: "var(--bg-secondary)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      fontSize: "11px",
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                      maxHeight: "240px",
                      overflow: "auto",
                      fontFamily: "monospace"
                    }}
                  >
                    {JSON.stringify(printifyPreview.apiPayloadPreview, null, 2)}
                  </pre>
                </div>
              )}

              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "8px" }}>
                Created {new Date(printifyPreview.createdAt).toLocaleString()}
                {printifyPreview.sourceConceptId && (
                  <span>
                    {" · "}concept{" "}
                    <span style={{ fontFamily: "monospace" }}>
                      {printifyPreview.sourceConceptId.slice(0, 8)}…
                    </span>
                  </span>
                )}
              </div>

              {/* ---- Live / mock: create real Printify product DRAFT ---- */}
              <CreatePrintifyProductPanel
                product={product}
                onProductChange={onProductChange}
              />
            </div>
          )}
        </div>

        {/* ---- Artwork Generation Prep (no image APIs) ---- */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "18px",
            marginTop: "16px"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
              flexWrap: "wrap"
            }}
          >
            <span style={{ fontSize: "22px" }}>🖼</span>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "14px",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--accent)"
                }}
              >
                Artwork generation prep
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                Builds a paste-ready artwork brief, negative prompt, canvas spec, and print-file checklist.
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "var(--accent-dim)",
              border: "1px dashed var(--accent)",
              borderRadius: "var(--radius-sm)",
              fontSize: "11px",
              color: "var(--accent)",
              lineHeight: 1.55,
              marginBottom: "12px"
            }}
          >
            <strong style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}>Preparation mode only</strong>
            {" — "}no image APIs are called yet. Paste the brief into your image-generation tool (DALL·E / SDXL / Ideogram), or upload artwork manually once exported.
          </div>

          <button
            type="button"
            onClick={() => run("artwork", () => prepareArtwork(product.id))}
            disabled={!!loading || !canArtwork}
            style={{
              padding: "10px 18px",
              background: canArtwork ? "var(--purple)" : "var(--bg-primary)",
              color: canArtwork ? "#0d1117" : "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {loading === "artwork" ? <span className="spinner" /> : <span>🖼</span>}
            {loading === "artwork"
              ? "Preparing…"
              : artworkAssets
                ? "Re-Prepare Artwork"
                : "Prepare Artwork"}
          </button>

          {artworkReason && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginBottom: "14px",
                lineHeight: 1.4
              }}
            >
              🔒 {artworkReason}
            </div>
          )}

          {artworkAssets && (
            <div
              style={{
                padding: "14px",
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                color: "var(--text-secondary)"
              }}
            >
              <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--success)",
                    background: "var(--success-dim)",
                    border: "1px solid var(--success)",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    fontFamily: "var(--font-display)"
                  }}
                >
                  ✓ {artworkStatus === "prepped" ? "Prepped" : artworkStatus}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Asset id:{" "}
                  <span style={{ fontFamily: "monospace" }}>{artworkAssets.id?.slice(0, 8)}…</span>
                  {" · "}Background:{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {artworkAssets.transparentBackgroundRequired ? "Transparent" : "Full-bleed"}
                  </strong>
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "10px",
                  marginBottom: "14px"
                }}
              >
                <SmallStat label="Canvas" value={artworkAssets.recommendedCanvasSize || "—"} />
                <SmallStat
                  label="Transparent BG"
                  value={artworkAssets.transparentBackgroundRequired ? "Required" : "Not required"}
                />
              </div>

              {artworkAssets.styleNotes && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={labelStyle}>Style notes</div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                    {artworkAssets.styleNotes}
                  </div>
                </div>
              )}

              {artworkAssets.printFileRequirements && (
                <div style={{ marginBottom: "14px" }}>
                  <div style={labelStyle}>Print file requirements</div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                    {artworkAssets.printFileRequirements}
                  </div>
                </div>
              )}

              {artworkAssets.artworkPrompt && (
                <div style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px"
                    }}
                  >
                    <span>Artwork prompt</span>
                    <CopyTextButton text={artworkAssets.artworkPrompt} label="Copy prompt" />
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "10px",
                      background: "var(--bg-secondary)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      fontSize: "11px",
                      lineHeight: 1.55,
                      color: "var(--text-secondary)",
                      maxHeight: "240px",
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--font-body, inherit)"
                    }}
                  >
                    {artworkAssets.artworkPrompt}
                  </pre>
                </div>
              )}

              {artworkAssets.negativePrompt && (
                <div style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px"
                    }}
                  >
                    <span>Negative prompt</span>
                    <CopyTextButton text={artworkAssets.negativePrompt} label="Copy negatives" />
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "10px",
                      background: "var(--bg-secondary)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      fontSize: "11px",
                      lineHeight: 1.55,
                      color: "var(--text-secondary)",
                      maxHeight: "160px",
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--font-body, inherit)"
                    }}
                  >
                    {artworkAssets.negativePrompt}
                  </pre>
                </div>
              )}

              <div style={{ marginBottom: "14px" }}>
                <CopyTextButton
                  text={`PROMPT:\n${artworkAssets.artworkPrompt || ""}\n\nNEGATIVE:\n${artworkAssets.negativePrompt || ""}`}
                  label="Copy combined prompt + negatives"
                />
              </div>

              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "12px" }}>
                Created {new Date(artworkAssets.createdAt).toLocaleString()}
                {artworkAssets.source?.conceptId && (
                  <span>
                    {" · "}concept{" "}
                    <span style={{ fontFamily: "monospace" }}>
                      {artworkAssets.source.conceptId.slice(0, 8)}…
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ---- Artwork assets — upload + manage (always available) ---- */}
          <ArtworkAssetManager
            product={product}
            items={artworkItems}
            artworkStatus={artworkStatus}
            loading={loading}
            fileInputRef={fileInputRef}
            onUpload={async (file, opts) => {
              setLoading("artwork-upload");
              setErr(null);
              try {
                const updated = await uploadArtwork(product.id, file, opts);
                onProductChange(updated);
              } catch (e) {
                setErr(e.message || "Upload failed");
              } finally {
                setLoading(null);
              }
            }}
            onApprove={(assetId) => run(`artwork-approve-${assetId}`, () => approveArtworkAsset(product.id, assetId))}
            onReject={(assetId) => run(`artwork-reject-${assetId}`, () => rejectArtworkAsset(product.id, assetId))}
            onSetPrimary={(assetId) => run(`artwork-primary-${assetId}`, () => setPrimaryArtworkAsset(product.id, assetId))}
            onDelete={(assetId) => {
              if (!window.confirm("Delete this artwork asset? The file will be removed from disk.")) return;
              return run(`artwork-delete-${assetId}`, () => deleteArtworkAsset(product.id, assetId));
            }}
            onGenerateImage={() => run("artwork-imggen", () => generateArtworkImage(product.id))}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ArtworkAssetManager — upload control + asset grid for the
// Artwork Generation Prep section. Always rendered; works
// independently of whether the prep brief has been generated.
// ============================================================
function ArtworkAssetManager({
  product,
  items,
  artworkStatus,
  loading,
  fileInputRef,
  onUpload,
  onApprove,
  onReject,
  onSetPrimary,
  onDelete,
  onGenerateImage
}) {
  const uploading = loading === "artwork-upload";
  const generating = loading === "artwork-imggen";
  // The image-gen route requires a prep brief — same constraint as the backend route.
  const hasPrepBrief =
    product && product.artworkAssets && Boolean(product.artworkAssets.artworkPrompt);
  const handleFileChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-uploading the same name
    if (!f) return;
    await onUpload(f, { type: "uploaded" });
  };

  const statusBadgeColor = (s) =>
    s === "approved"
      ? { color: "var(--success)", bg: "var(--success-dim)", border: "var(--success)" }
      : s === "rejected"
        ? { color: "var(--danger)", bg: "var(--danger-dim)", border: "var(--danger)" }
        : { color: "var(--accent)", bg: "var(--accent-dim)", border: "var(--accent)" };

  return (
    <div
      style={{
        borderTop: "1px dashed var(--border)",
        paddingTop: "14px",
        marginTop: "14px"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "8px"
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "12px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--accent)"
          }}
        >
          Artwork assets
        </div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            padding: "2px 8px",
            borderRadius: "999px",
            fontFamily: "var(--font-display)"
          }}
        >
          {artworkStatus || "not_prepared"}
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {items.length} asset{items.length === 1 ? "" : "s"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "10px"
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: "none" }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          disabled={!!loading}
          style={{
            padding: "8px 14px",
            background: uploading ? "var(--bg-primary)" : "var(--accent)",
            color: uploading ? "var(--text-muted)" : "#0d1117",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          {uploading ? <span className="spinner" /> : <span>📤</span>}
          {uploading ? "Uploading…" : "Upload artwork"}
        </button>
        <button
          type="button"
          onClick={() => onGenerateImage && onGenerateImage()}
          disabled={!!loading || !hasPrepBrief}
          title={
            hasPrepBrief
              ? "Generate an artwork image from the prepared brief (mock SVG unless ENABLE_REAL_IMAGE_GENERATION=true)"
              : "Run Prepare Artwork first — the image generator uses the prompt + negative prompt + canvas + transparency from the brief."
          }
          style={{
            padding: "8px 14px",
            background: !hasPrepBrief
              ? "var(--bg-tertiary)"
              : generating
                ? "var(--bg-primary)"
                : "var(--bg-secondary)",
            color: !hasPrepBrief ? "var(--text-muted)" : "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: !hasPrepBrief || generating ? "default" : "pointer"
          }}
        >
          {generating ? <span className="spinner" /> : <span>🎨</span>}
          {generating ? "Generating…" : "Generate artwork image"}
        </button>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4 }}>
          PNG / JPEG / WEBP / GIF / SVG · max 20 MB · mock SVG is generated when image generation is off
        </span>
      </div>

      {items.length === 0 && (
        <div
          style={{
            padding: "18px 14px",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-muted)",
            fontSize: "12px",
            textAlign: "center",
            lineHeight: 1.5
          }}
        >
          No artwork uploaded yet. Generate art externally using the brief above (or your own
          process), then upload finished PNGs / JPEGs here.
        </div>
      )}

      {items.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "10px"
          }}
        >
          {items.map((item) => {
            const badge = statusBadgeColor(item.status);
            const imgSrc = resolveDownloadUrl(item.previewUrl || item.fileUrl) || "";
            return (
              <div
                key={item.id}
                style={{
                  position: "relative",
                  border: `1px solid ${item.isPrimary ? "var(--accent)" : "var(--border)"}`,
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                {item.isPrimary && (
                  <span
                    title="Primary artwork"
                    style={{
                      position: "absolute",
                      top: "6px",
                      left: "6px",
                      zIndex: 1,
                      background: "var(--accent)",
                      color: "#0d1117",
                      fontSize: "9px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: "999px",
                      fontFamily: "var(--font-display)"
                    }}
                  >
                    ★ Primary
                  </span>
                )}
                <a
                  href={imgSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    aspectRatio: "1 / 1",
                    background: "#11161c",
                    overflow: "hidden",
                    position: "relative"
                  }}
                >
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={item.originalFileName || item.fileName}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                        background:
                          "repeating-conic-gradient(#222 0% 25%, transparent 0% 50%) 50% / 16px 16px"
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-muted)",
                        fontSize: "11px"
                      }}
                    >
                      No preview
                    </div>
                  )}
                </a>

                <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div
                    title={item.originalFileName || item.fileName}
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {item.originalFileName || item.fileName}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: badge.color,
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        padding: "1px 6px",
                        borderRadius: "999px",
                        fontFamily: "var(--font-display)"
                      }}
                    >
                      {item.status || "draft"}
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "var(--text-secondary)",
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border)",
                        padding: "1px 6px",
                        borderRadius: "999px",
                        fontFamily: "var(--font-display)"
                      }}
                    >
                      {item.type || "uploaded"}
                    </span>
                  </div>

                  <div style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.45 }}>
                    {(item.width && item.height)
                      ? `${item.width} × ${item.height}px`
                      : "— × —"}
                    {" · "}
                    {item.transparentBackground ? "Transparent" : "Opaque (no alpha)"}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    <ArtworkActionBtn
                      onClick={() => onApprove(item.id)}
                      disabled={!!loading || item.status === "approved"}
                      tone="success"
                    >
                      ✓ Approve
                    </ArtworkActionBtn>
                    <ArtworkActionBtn
                      onClick={() => onReject(item.id)}
                      disabled={!!loading || item.status === "rejected"}
                      tone="danger"
                    >
                      ✕ Reject
                    </ArtworkActionBtn>
                    {!item.isPrimary && (
                      <ArtworkActionBtn
                        onClick={() => onSetPrimary(item.id)}
                        disabled={!!loading}
                        tone="accent"
                      >
                        ★ Primary
                      </ArtworkActionBtn>
                    )}
                    <ArtworkActionBtn
                      onClick={() => onDelete(item.id)}
                      disabled={!!loading}
                      tone="muted"
                    >
                      🗑 Delete
                    </ArtworkActionBtn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          fontSize: "10px",
          color: "var(--text-muted)",
          marginTop: "10px",
          lineHeight: 1.5
        }}
      >
        Files are stored locally under <code>backend/generated-artwork/</code> and served at{" "}
        <code>/artwork/&lt;filename&gt;</code>. The same surface is designed to receive future
        image-generation API output and Printify upload responses without changing call sites.
      </div>
    </div>
  );
}

function ArtworkActionBtn({ children, onClick, disabled, tone }) {
  const palette = {
    success: { color: "var(--success)", border: "var(--success)", bg: "var(--success-dim)" },
    danger: { color: "var(--danger)", border: "var(--danger)", bg: "var(--danger-dim)" },
    accent: { color: "var(--accent)", border: "var(--accent)", bg: "var(--accent-dim)" },
    muted: { color: "var(--text-secondary)", border: "var(--border)", bg: "var(--bg-primary)" }
  }[tone || "muted"];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "3px 7px",
        fontSize: "10px",
        fontWeight: 700,
        borderRadius: "4px",
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.color,
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0
      }}
    >
      {children}
    </button>
  );
}

function SmallStat({ label, value }) {
  return (
    <div
      style={{
        padding: "10px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)"
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: "2px"
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "16px",
          fontWeight: 800,
          color: "var(--text-primary)"
        }}
      >
        {value}
      </div>
    </div>
  );
}

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

function CopyTextButton({ text, label }) {
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
      {done ? "Copied" : (label || "Copy")}
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

// ============================================================
// CreatePrintifyProductPanel — calls /create-printify-product
// Renders below the Printify Preview JSON block. In preview/mock
// mode the button always works and stores a stub. In live mode
// the backend additionally checks that a primary artwork item
// is approved.
// ============================================================
function CreatePrintifyProductPanel({ product, onProductChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const handleCreate = async () => {
    setBusy(true);
    setErr(null);
    try {
      const updated = await createPrintifyProduct(product.id);
      onProductChange(updated);
      setLastResult(updated.printifyProduct || null);
    } catch (e) {
      setErr(e.message || "Failed to create Printify product");
    } finally {
      setBusy(false);
    }
  };

  const stored = product && product.printifyProduct;

  return (
    <div
      style={{
        borderTop: "1px dashed var(--border)",
        marginTop: "14px",
        paddingTop: "14px"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap"
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--accent)"
            }}
          >
            Create Printify product
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", lineHeight: 1.5 }}>
            Creates a real Printify DRAFT (or a deterministic preview stub when live mode is off).
            Never auto-publishes. Live mode also requires an APPROVED primary artwork item.
          </div>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={busy}
          style={{
            padding: "8px 14px",
            background: busy ? "var(--bg-primary)" : "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: busy ? "default" : "pointer"
          }}
        >
          {busy ? <span className="spinner" /> : <span>🛍️</span>}
          {busy ? "Creating…" : stored ? "Re-create Printify product" : "Create Printify product"}
        </button>
      </div>

      {err && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px 10px",
            fontSize: "12px",
            background: "rgba(229, 83, 75, 0.08)",
            border: "1px solid rgba(229, 83, 75, 0.3)",
            color: "#f85149",
            borderRadius: "var(--radius-sm)"
          }}
        >
          {err}
        </div>
      )}

      {(lastResult || stored) && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px 12px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
            color: "var(--text-secondary)",
            lineHeight: 1.5
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
            <span>
              <strong style={{ color: "var(--text-primary)" }}>
                {(lastResult || stored).isMock ? "Preview stub" : "Live draft"}
              </strong>
              {" · "}status: {(lastResult || stored).status}
              {" · "}id:{" "}
              <code style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>
                {String((lastResult || stored).productId || "—").slice(0, 32)}
              </code>
            </span>
            {(lastResult || stored).url && (
              <a
                href={(lastResult || stored).url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)", fontSize: "12px", fontWeight: 700 }}
              >
                Open in Printify →
              </a>
            )}
          </div>
          {(lastResult || stored).rawResponseSummary && (
            <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
              variants: {(lastResult || stored).rawResponseSummary.variant_count || 0}
              {" · "}
              blueprint: {(lastResult || stored).rawResponseSummary.blueprint_id || "—"}
              {" · "}
              provider: {(lastResult || stored).rawResponseSummary.print_provider_id || "—"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PodConceptStudio;
