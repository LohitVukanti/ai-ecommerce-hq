// ============================================================
// pages/MicrobrandLauncher.jsx — One-click microbrand workflow
// ============================================================
// Simple intake form that runs the existing product API pipeline
// end-to-end. Advanced pages (Dashboard, Ideas, etc.) remain
// available via "Advanced Dashboard".
// ============================================================

import React, { useState } from "react";
import {
  createProduct,
  generateDesignConcepts,
  selectProductConcept,
  generatePodListing,
  generatePodPrep,
  generateDesignPackage,
  prepareArtwork,
  generatePrintifyPreview,
  generateArtworkImage,
  approveArtworkAsset,
  resolveDownloadUrl
} from "../services/api";

const WORKFLOW_STEPS = [
  { key: "product", label: "Product idea created" },
  { key: "concepts", label: "Design concepts generated" },
  { key: "select", label: "Best concept selected" },
  { key: "listing", label: "Etsy listing generated" },
  { key: "podPrep", label: "POD prep generated" },
  { key: "designPackage", label: "Design package generated" },
  { key: "artwork", label: "Artwork brief prepared" },
  { key: "printify", label: "Printify preview generated" }
];

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--bg-primary)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  fontSize: "14px",
  boxSizing: "border-box"
};

const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: "6px"
};

function buildProductPayload(form) {
  const niche = form.niche.trim();
  const productType = form.productType.trim();
  const targetCustomer = form.targetCustomer.trim();
  const designVibe = form.designVibe.trim();
  const notes = form.notes.trim();

  const title = [niche, productType].filter(Boolean).join(" — ") || "New microbrand product";
  const descriptionParts = [
    targetCustomer && `Target customer: ${targetCustomer}`,
    designVibe && `Design vibe: ${designVibe}`,
    notes && `Notes: ${notes}`
  ].filter(Boolean);

  return {
    title,
    description: descriptionParts.join("\n") || undefined,
    category: productType || niche || undefined
  };
}

function getLatestArtworkItem(product) {
  const items = Array.isArray(product?.artworkAssets?.items) ? product.artworkAssets.items : [];
  if (items.length === 0) return null;
  const generated = items.filter((it) => it.type === "generated");
  return generated.length > 0 ? generated[generated.length - 1] : items[items.length - 1];
}

function isImageApiKeyError(message) {
  const m = String(message || "").toLowerCase();
  return (
    m.includes("api key") ||
    m.includes("openai") ||
    m.includes("image generation failed") ||
    m.includes("enable_real_image") ||
    m.includes("not connected")
  );
}

const actionBtnStyle = (variant = "secondary") => ({
  padding: "8px 14px",
  background:
    variant === "primary"
      ? "var(--accent)"
      : variant === "success"
        ? "var(--success-dim)"
        : "var(--bg-tertiary)",
  color:
    variant === "primary"
      ? "#0d1117"
      : variant === "success"
        ? "var(--success)"
        : "var(--text-secondary)",
  border:
    variant === "success"
      ? "1px solid var(--success)"
      : "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px"
});

function getSelectedConcept(product) {
  const list = Array.isArray(product?.generatedConcepts) ? product.generatedConcepts : [];
  const id = product?.selectedConceptId;
  if (id) return list.find((c) => c.id === id) || null;
  return list[0] || null;
}

function StepIcon({ status }) {
  if (status === "done") return <span style={{ color: "var(--success)" }}>✓</span>;
  if (status === "active") return <span className="spinner" />;
  if (status === "error") return <span style={{ color: "var(--danger)" }}>✕</span>;
  return <span style={{ color: "var(--text-muted)", opacity: 0.5 }}>○</span>;
}

const MicrobrandLauncher = ({ onOpenDashboard }) => {
  const [form, setForm] = useState({
    niche: "",
    productType: "",
    targetCustomer: "",
    designVibe: "",
    notes: ""
  });

  const [running, setRunning] = useState(false);
  const [stepStatus, setStepStatus] = useState({});
  const [failedStep, setFailedStep] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [artworkBusy, setArtworkBusy] = useState(null);
  const [artworkError, setArtworkError] = useState(null);
  const [approvedArtwork, setApprovedArtwork] = useState(null);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const resetRun = () => {
    setStepStatus({});
    setFailedStep(null);
    setError(null);
    setResult(null);
    setArtworkBusy(null);
    setArtworkError(null);
    setApprovedArtwork(null);
  };

  const markStep = (key, status) => {
    setStepStatus((prev) => ({ ...prev, [key]: status }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (running) return;

    if (!form.niche.trim() || !form.productType.trim()) {
      setError("Niche and product type are required.");
      return;
    }

    resetRun();
    setRunning(true);

    let currentStepKey = "product";

    const runStep = async (key, fn) => {
      currentStepKey = key;
      markStep(key, "active");
      const out = await fn();
      markStep(key, "done");
      return out;
    };

    try {
      let product = await runStep("product", () =>
        createProduct(buildProductPayload(form))
      );

      product = await runStep("concepts", () => generateDesignConcepts(product.id));
      const concepts = product.generatedConcepts || [];
      if (!concepts.length) {
        throw new Error("No design concepts were returned.");
      }

      const conceptId = concepts[0].id;
      product = await runStep("select", () =>
        selectProductConcept(product.id, conceptId)
      );

      product = await runStep("listing", () => generatePodListing(product.id));
      product = await runStep("podPrep", () => generatePodPrep(product.id));
      product = await runStep("designPackage", () => generateDesignPackage(product.id));
      product = await runStep("artwork", () => prepareArtwork(product.id));
      product = await runStep("printify", () => generatePrintifyPreview(product.id));

      setResult(product);
    } catch (err) {
      const message = err.message || "Something went wrong.";
      const failed = WORKFLOW_STEPS.find((s) => s.key === currentStepKey);
      markStep(currentStepKey, "error");
      setFailedStep(failed?.label || currentStepKey);
      setError(message);
    } finally {
      setRunning(false);
    }
  };

  const handleGenerateArtwork = async () => {
    if (!result?.id || artworkBusy) return;
    setArtworkBusy("generate");
    setArtworkError(null);
    try {
      const updated = await generateArtworkImage(result.id);
      setResult(updated);
      setApprovedArtwork(null);
    } catch (err) {
      const msg = err.message || "Artwork generation failed.";
      setArtworkError(
        isImageApiKeyError(msg)
          ? "Artwork generation is ready, but your image API key is not connected yet."
          : msg
      );
    } finally {
      setArtworkBusy(null);
    }
  };

  const handleApproveArtwork = async () => {
    const item = getLatestArtworkItem(result);
    if (!result?.id || !item?.id || artworkBusy) return;
    setArtworkBusy("approve");
    setArtworkError(null);
    try {
      const updated = await approveArtworkAsset(result.id, item.id);
      setResult(updated);
      const approved =
        (updated.artworkAssets?.items || []).find((it) => it.id === item.id) ||
        { ...item, status: "approved" };
      setApprovedArtwork(approved);
    } catch (err) {
      setArtworkError(err.message || "Could not approve artwork.");
    } finally {
      setArtworkBusy(null);
    }
  };

  const concept = result ? getSelectedConcept(result) : null;
  const listing = result?.listingData;
  const artworkPrompt = result?.artworkAssets?.artworkPrompt;
  const draftArtwork = result ? getLatestArtworkItem(result) : null;
  const displayArtwork = approvedArtwork || draftArtwork;
  const artworkPreviewUrl = displayArtwork
    ? resolveDownloadUrl(displayArtwork.previewUrl || displayArtwork.fileUrl)
    : null;

  const showProgress = running || Object.keys(stepStatus).length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "32px 24px 48px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "28px"
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "var(--accent)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              flexShrink: 0
            }}
          >
            ⚡
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "16px",
                lineHeight: 1
              }}
            >
              Microbrand Launcher
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.04em"
              }}
            >
              ONE-CLICK ETSY MICROBRAND CREATOR
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "26px",
              fontWeight: 800,
              marginBottom: "8px",
              color: "var(--text-primary)"
            }}
          >
            Launch a microbrand in one click
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.55 }}>
            Describe your niche and vibe — we&apos;ll create the product, generate design concepts,
            build your Etsy listing, POD prep, design package, artwork brief, and Printify preview
            automatically.
          </p>
        </div>

        {!result && (
          <form
            onSubmit={handleGenerate}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "24px",
              marginBottom: "24px"
            }}
          >
            <div style={{ display: "grid", gap: "16px" }}>
              <label>
                <span style={labelStyle}>Niche *</span>
                <input
                  type="text"
                  value={form.niche}
                  onChange={setField("niche")}
                  placeholder="e.g. coastal dog moms, vintage gym, quiet luxury"
                  style={inputStyle}
                  disabled={running}
                  required
                />
              </label>

              <label>
                <span style={labelStyle}>Product type *</span>
                <input
                  type="text"
                  value={form.productType}
                  onChange={setField("productType")}
                  placeholder="e.g. T-shirt, hoodie, tote bag, sticker"
                  style={inputStyle}
                  disabled={running}
                  required
                />
              </label>

              <label>
                <span style={labelStyle}>Target customer</span>
                <input
                  type="text"
                  value={form.targetCustomer}
                  onChange={setField("targetCustomer")}
                  placeholder="e.g. women 25–40 who love minimalist coastal style"
                  style={inputStyle}
                  disabled={running}
                />
              </label>

              <label>
                <span style={labelStyle}>Design vibe</span>
                <input
                  type="text"
                  value={form.designVibe}
                  onChange={setField("designVibe")}
                  placeholder="e.g. old money, tennis club, minimalist, vintage gym"
                  style={inputStyle}
                  disabled={running}
                />
              </label>

              <label>
                <span style={labelStyle}>Notes (optional)</span>
                <textarea
                  value={form.notes}
                  onChange={setField("notes")}
                  placeholder="Any extra direction — slogans, colors, placement, trends…"
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                  disabled={running}
                />
              </label>
            </div>

            {error && !showProgress && (
              <div
                style={{
                  marginTop: "16px",
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

            <button
              type="submit"
              disabled={running}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "14px 20px",
                background: running ? "var(--bg-tertiary)" : "var(--accent)",
                color: running ? "var(--text-muted)" : "#0d1117",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontSize: "15px",
                fontWeight: 800,
                fontFamily: "var(--font-display)",
                letterSpacing: "0.02em",
                cursor: running ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px"
              }}
            >
              {running ? (
                <>
                  <span className="spinner" />
                  Generating microbrand…
                </>
              ) : (
                "Generate Microbrand"
              )}
            </button>
          </form>
        )}

        {showProgress && (
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
              marginBottom: "24px"
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: "14px"
              }}
            >
              {result ? "Complete" : running ? "Running workflow…" : "Workflow stopped"}
            </div>

            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "10px" }}>
              {WORKFLOW_STEPS.map((step) => {
                const status = stepStatus[step.key] || "pending";
                return (
                  <li
                    key={step.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: "14px",
                      color:
                        status === "done"
                          ? "var(--text-primary)"
                          : status === "error"
                            ? "var(--danger)"
                            : status === "active"
                              ? "var(--accent)"
                              : "var(--text-muted)"
                    }}
                  >
                    <span style={{ width: "20px", display: "inline-flex", justifyContent: "center" }}>
                      <StepIcon status={status} />
                    </span>
                    {step.label}
                  </li>
                );
              })}
            </ul>

            {error && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  background: "var(--danger-dim)",
                  border: "1px solid var(--danger)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  color: "var(--danger)",
                  lineHeight: 1.5
                }}
              >
                <strong>Failed at:</strong> {failedStep || "Unknown step"}
                <div style={{ marginTop: "6px" }}>{error}</div>
              </div>
            )}
          </div>
        )}

        {result && (
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
              marginBottom: "24px"
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: "8px"
              }}
            >
              Artwork Review
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px", lineHeight: 1.5 }}>
              Generate artwork from your prepared brief, preview it here, then approve when you&apos;re happy.
              Regenerate anytime for a new variation.
            </p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={handleGenerateArtwork}
                disabled={!!artworkBusy}
                style={actionBtnStyle("primary")}
              >
                {artworkBusy === "generate" ? <span className="spinner" /> : null}
                {draftArtwork ? "Regenerate Artwork" : "Generate Artwork"}
              </button>
              <button
                type="button"
                onClick={handleApproveArtwork}
                disabled={!!artworkBusy || !draftArtwork || approvedArtwork?.status === "approved"}
                style={actionBtnStyle("success")}
              >
                {artworkBusy === "approve" ? <span className="spinner" /> : null}
                {approvedArtwork?.status === "approved" ? "Artwork Approved ✓" : "Approve Artwork"}
              </button>
            </div>

            {artworkError && (
              <div
                style={{
                  marginBottom: "14px",
                  padding: "10px 12px",
                  background: "var(--danger-dim)",
                  border: "1px solid var(--danger)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--danger)",
                  fontSize: "13px",
                  lineHeight: 1.5
                }}
              >
                {artworkError}
              </div>
            )}

            {artworkPreviewUrl ? (
              <div
                style={{
                  border: approvedArtwork ? "2px solid var(--success)" : "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  background: "var(--bg-primary)"
                }}
              >
                <img
                  src={artworkPreviewUrl}
                  alt={displayArtwork?.originalFileName || "Generated artwork"}
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: "360px",
                    objectFit: "contain",
                    background: "repeating-conic-gradient(#1a1f26 0% 25%, #0d1117 0% 50%) 50% / 16px 16px"
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div
                  style={{
                    padding: "8px 12px",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                    flexWrap: "wrap"
                  }}
                >
                  <span>{displayArtwork?.originalFileName || displayArtwork?.fileName}</span>
                  <span>
                    {displayArtwork?.width && displayArtwork?.height
                      ? `${displayArtwork.width}×${displayArtwork.height}px`
                      : null}
                    {approvedArtwork?.status === "approved" ? " · Approved" : " · Draft"}
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "24px",
                  border: "1px dashed var(--border)",
                  borderRadius: "var(--radius-sm)",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "13px"
                }}
              >
                No artwork generated yet — click Generate Artwork to create a preview.
              </div>
            )}
          </div>
        )}

        {result && (
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--radius-lg)",
              padding: "24px",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--success)",
                marginBottom: "12px"
              }}
            >
              ✓ Microbrand ready
            </div>

            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "20px",
                fontWeight: 800,
                marginBottom: "16px",
                color: "var(--text-primary)"
              }}
            >
              {result.title}
            </h2>

            <div style={{ display: "grid", gap: "12px", fontSize: "14px" }}>
              {concept?.conceptName && (
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Selected concept
                  </span>
                  <div style={{ color: "var(--text-primary)", marginTop: "4px" }}>{concept.conceptName}</div>
                  {concept.slogan && (
                    <div style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "2px" }}>
                      &ldquo;{concept.slogan}&rdquo;
                    </div>
                  )}
                </div>
              )}

              {listing?.etsyTitle && (
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Etsy title
                  </span>
                  <div style={{ color: "var(--text-primary)", marginTop: "4px" }}>{listing.etsyTitle}</div>
                </div>
              )}

              {(listing?.pricingRecommendation?.retailPrice != null || concept?.estimatedMargin != null) && (
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Pricing / margin
                  </span>
                  <div style={{ color: "var(--text-primary)", marginTop: "4px" }}>
                    {listing?.pricingRecommendation?.retailPrice != null && (
                      <span>Suggested price ${listing.pricingRecommendation.retailPrice}</span>
                    )}
                    {concept?.estimatedMargin != null && (
                      <span>
                        {listing?.pricingRecommendation?.retailPrice != null ? " · " : ""}
                        Est. margin {concept.estimatedMargin}%
                      </span>
                    )}
                  </div>
                </div>
              )}

              {artworkPrompt && (
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Artwork prompt
                  </span>
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "10px 12px",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      maxHeight: "140px",
                      overflow: "auto"
                    }}
                  >
                    {artworkPrompt}
                  </div>
                </div>
              )}

              {approvedArtwork && (
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Approved artwork
                  </span>
                  <div
                    style={{
                      marginTop: "8px",
                      border: "2px solid var(--success)",
                      borderRadius: "var(--radius-sm)",
                      overflow: "hidden",
                      background: "var(--bg-primary)"
                    }}
                  >
                    {artworkPreviewUrl ? (
                      <img
                        src={artworkPreviewUrl}
                        alt={approvedArtwork.originalFileName || "Approved artwork"}
                        style={{
                          display: "block",
                          width: "100%",
                          maxHeight: "200px",
                          objectFit: "contain"
                        }}
                      />
                    ) : (
                      <div style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        {approvedArtwork.originalFileName || approvedArtwork.fileName || "Artwork approved"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px", flexWrap: "wrap" }}>
              {typeof onOpenDashboard === "function" && (
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  style={{
                    padding: "12px 18px",
                    background: "var(--accent)",
                    color: "#0d1117",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "14px",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  Open Full Dashboard
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  resetRun();
                  setForm({
                    niche: "",
                    productType: "",
                    targetCustomer: "",
                    designVibe: "",
                    notes: ""
                  });
                }}
                style={{
                  padding: "12px 18px",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Create another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MicrobrandLauncher;
