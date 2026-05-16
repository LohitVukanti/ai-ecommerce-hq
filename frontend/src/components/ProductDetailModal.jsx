// ============================================================
// components/ProductDetailModal.jsx — Full Product Detail View
// ============================================================
// Shows all information about a product in a large modal:
// - Basic info
// - All AI-generated content (scores, listing, design prompts)
// - Action buttons (Generate AI, Approve, Create Etsy Draft)
// - Digital Product Generator button + download links
// ============================================================

import React, { useState } from "react";
import PodConceptStudio from "./PodConceptStudio";
import StatusBadge from "./StatusBadge";
import ScoreMeter from "./ScoreMeter";
import LaunchChecklist from "./LaunchChecklist";

import {
  generateAI,
  approveProduct,
  rejectProduct,
  createEtsyDraft,
  deleteProduct,
  generateDigitalProduct,
  resolveDownloadUrl
} from "../services/api";

// Helper: A collapsible section for organizing content
const Section = ({ title, icon, children, accent }) => (
  <div style={{
    background: "var(--bg-tertiary)",
    border: `1px solid ${accent ? "var(--accent)" : "var(--border)"}`,
    borderRadius: "var(--radius-md)",
    marginBottom: "16px",
    overflow: "hidden"
  }}>
    <div style={{
      padding: "12px 16px",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", gap: "8px",
      background: accent ? "var(--accent-dim)" : "transparent"
    }}>
      <span style={{ fontSize: "16px" }}>{icon}</span>
      <span style={{
        fontFamily: "var(--font-display)", fontWeight: 700,
        fontSize: "13px", letterSpacing: "0.05em", textTransform: "uppercase",
        color: accent ? "var(--accent)" : "var(--text-secondary)"
      }}>
        {title}
      </span>
    </div>
    <div style={{ padding: "16px" }}>
      {children}
    </div>
  </div>
);

// Helper: A text block with a label
const Field = ({ label, value, mono }) => (
  <div style={{ marginBottom: "12px" }}>
    <div style={{ fontSize: "11px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>
      {label}
    </div>
    <div style={{
      fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.6,
      background: mono ? "var(--bg-primary)" : "transparent",
      padding: mono ? "10px 12px" : 0,
      borderRadius: mono ? "var(--radius-sm)" : 0,
      fontFamily: mono ? "monospace" : "var(--font-body)",
      whiteSpace: "pre-wrap",
      border: mono ? "1px solid var(--border)" : "none"
    }}>
      {value}
    </div>
  </div>
);

// Helper: Action button
const ActionButton = ({ onClick, disabled, loading, icon, label, variant = "primary" }) => {
  const styles = {
    primary:  { bg: "var(--accent)",   color: "#0d1117" },
    success:  { bg: "var(--success)",  color: "#0d1117" },
    purple:   { bg: "var(--purple)",   color: "#0d1117" },
    danger:   { bg: "var(--danger-dim)", color: "var(--danger)", border: "1px solid var(--danger)" },
    secondary:{ bg: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
  };
  const s = styles[variant] || styles.primary;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: "10px 18px",
        background: s.bg,
        color: s.color,
        border: s.border || "none",
        borderRadius: "var(--radius-sm)",
        fontSize: "13px", fontWeight: 700,
        display: "flex", alignItems: "center", gap: "7px",
        transition: "opacity 0.15s"
      }}
      onMouseEnter={(e) => { if (!disabled && !loading) e.currentTarget.style.opacity = "0.85"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      {loading ? <span className="spinner" /> : <span>{icon}</span>}
      {loading ? "Working..." : label}
    </button>
  );
};


const ProductDetailModal = ({ product: initialProduct, onClose, onProductUpdated }) => {
  // Keep a local copy of the product so we can update it without re-fetching
  const [product, setProduct] = useState(initialProduct);

  // Track which action is currently loading
  // "ai" | "approve" | "reject" | "etsy" | "digital" | "delete"
  const [loadingAction, setLoadingAction] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Helper to run an API action safely
  const runAction = async (actionName, apiFn, successMsg) => {
    setLoadingAction(actionName);
    setError(null);
    setSuccessMessage(null);
    try {
      const updatedProduct = await apiFn(product.id);
      setProduct(updatedProduct);                // Update local state
      onProductUpdated(updatedProduct);           // Tell parent dashboard to update too
      if (successMsg) setSuccessMessage(successMsg);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGenerateAI      = () => runAction("ai",      generateAI,              "AI content generated.");
  const handleApprove         = () => runAction("approve", approveProduct,          "Listing approved — Etsy draft is now available.");
  const handleReject          = () => runAction("reject",  rejectProduct,           "Product marked as rejected.");
  const handleEtsyDraft       = () => runAction("etsy",    createEtsyDraft,         "Etsy draft (simulated) created.");
  // NEW: triggers template-based CSV generation — no AI API used
  const handleGenerateDigital = () => runAction("digital", generateDigitalProduct,  "Digital product CSV generated.");

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete "${product.title}"? This cannot be undone.`);
    if (!confirmed) return;
  
    setLoadingAction("delete");
    setError(null);
  
    try {
      await deleteProduct(product.id);
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err.message || "Failed to delete product");
    } finally {
      setLoadingAction(null);
    }
  };

  // Determine which action buttons to show based on current status
  const canGenerateAI  = ["idea", "researched", "listing_generated"].includes(product.status);
  const canApprove     = product.status === "listing_generated" && product.aiData;
  const canReject      = ["listing_generated", "approved"].includes(product.status);
  const canEtsyDraft   = product.status === "approved";
  // Digital product can be generated at any stage — it's independent of AI / Etsy workflow
  const canGenerateDigital = true;

  const ai = product.aiData; // Shorthand

  // Safely resolve the generated files array (may be null/undefined on older records)
  const generatedFiles = Array.isArray(product.generatedFiles) ? product.generatedFiles : [];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
        padding: "20px",
        overflowY: "auto"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: "800px",
          marginBottom: "20px",
          boxShadow: "var(--shadow-lg)"
        }}
      >
        {/* ---- Modal Header ---- */}
        <div style={{
          padding: "24px 28px",
          borderBottom: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start"
        }}>
          <div style={{ flex: 1, marginRight: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
              <StatusBadge status={product.status} />
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-display)" }}>
                {product.category}
              </span>
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 800, lineHeight: 1.2 }}>
              {product.title}
            </h2>
            {product.description && (
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px" }}>
                {product.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-tertiary)", color: "var(--text-secondary)",
              width: "36px", height: "36px", borderRadius: "50%",
              fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0
            }}
          >×</button>
        </div>

        {/* ---- Action Bar ---- */}
        <div style={{
          padding: "16px 28px",
          borderBottom: "1px solid var(--border)",
          display: "flex", gap: "10px", flexWrap: "wrap",
          background: "var(--bg-primary)"
        }}>
          {canGenerateAI && (
            <ActionButton
              onClick={handleGenerateAI}
              loading={loadingAction === "ai"}
              disabled={!!loadingAction}
              icon="🤖" label={ai ? "Re-Generate AI" : "Generate AI Content"}
              variant="purple"
            />
          )}
          {canApprove && (
            <ActionButton
              onClick={handleApprove}
              loading={loadingAction === "approve"}
              disabled={!!loadingAction}
              icon="✅" label="Approve Listing"
              variant="success"
            />
          )}
          {canEtsyDraft && (
            <ActionButton
              onClick={handleEtsyDraft}
              loading={loadingAction === "etsy"}
              disabled={!!loadingAction}
              icon="🛍️" label="Create Etsy Draft"
              variant="primary"
            />
          )}
          {canReject && (
            <ActionButton
              onClick={handleReject}
              loading={loadingAction === "reject"}
              disabled={!!loadingAction}
              icon="❌" label="Reject"
              variant="danger"
            />
          )}

          {/* NEW: Generate Digital Product button — always visible, independent of Etsy flow */}
          {canGenerateDigital && (
            <ActionButton
              onClick={handleGenerateDigital}
              loading={loadingAction === "digital"}
              disabled={!!loadingAction}
              icon="📄"
              label={generatedFiles.length > 0 ? "Re-Generate CSV" : "Generate Digital Product"}
              variant="secondary"
            />
          )}

          <ActionButton
            onClick={handleDelete}
            loading={loadingAction === "delete"}
            disabled={!!loadingAction}
            icon="🗑️"
            label="Delete"
            variant="danger"
          />
        </div>

        {/* ---- Feedback Messages ---- */}
        {error && (
          <div style={{ margin: "16px 28px 0", padding: "12px 16px", background: "var(--danger-dim)", border: "1px solid var(--danger)", borderRadius: "var(--radius-sm)", color: "var(--danger)", fontSize: "13px" }}>
            ⚠️ {error}
          </div>
        )}
        {successMessage && (
          <div
            style={{
              margin: "16px 28px 0",
              padding: "10px 14px",
              background: "var(--success-dim)",
              border: "1px solid var(--success)",
              borderRadius: "var(--radius-sm)",
              color: "var(--success)",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <span style={{ flex: 1 }}>✅ {successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              style={{
                background: "transparent",
                border: "1px solid var(--success)",
                color: "var(--success)",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                fontSize: "11px",
                fontWeight: 700
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ---- Content Area ---- */}
        <div style={{ padding: "24px 28px" }}>

          <LaunchChecklist product={product} />

          <PodConceptStudio
            product={product}
            onProductChange={(updated) => {
              setProduct(updated);
              onProductUpdated(updated);
            }}
          />

          {/* No AI data yet */}
          {!ai && (
            <div style={{
              textAlign: "center", padding: "48px 24px",
              color: "var(--text-muted)", border: "1px dashed var(--border)",
              borderRadius: "var(--radius-md)"
            }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🤖</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "16px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                No AI content yet
              </div>
              <div style={{ fontSize: "13px" }}>
                Click "Generate AI Content" above to research this product idea
              </div>
            </div>
          )}

          {/* AI Data Sections */}
          {ai && (
            <>
              {/* Scores */}
              <Section title="Market Research Scores" icon="📊">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                  <ScoreMeter label="Demand Score" score={ai.demandScore} invert={true} tooltip="higher is better" />
                  <ScoreMeter label="Competition Score" score={ai.competitionScore} invert={false} tooltip="lower is better" />
                  <ScoreMeter label="Originality Score" score={ai.originalityScore} invert={true} tooltip="higher is better" />
                  <ScoreMeter label="Copyright Risk Score" score={ai.copyrightRiskScore} invert={false} tooltip="lower is better" />
                </div>
                <div style={{
                  marginTop: "12px", padding: "10px 14px",
                  background: "var(--bg-primary)", borderRadius: "var(--radius-sm)",
                  display: "flex", alignItems: "center", gap: "8px"
                }}>
                  <span style={{ fontSize: "20px" }}>💰</span>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Suggested Price</div>
                    <div style={{ fontSize: "22px", fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--accent)" }}>
                      ${ai.suggestedPrice}
                    </div>
                  </div>
                </div>
              </Section>

              {/* Buyer Persona */}
              <Section title="Buyer Persona" icon="👤">
                <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--text-secondary)" }}>
                  {ai.buyerPersona}
                </p>
              </Section>

              {/* Etsy Listing */}
              <Section title="Etsy Listing" icon="🏷️" accent>
                <Field label="Listing Title" value={ai.etsyTitle} />
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                    13 ETSY TAGS
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {ai.etsyTags?.map((tag, i) => (
                      <span key={i} style={{
                        padding: "4px 10px",
                        background: "var(--accent-dim)",
                        border: "1px solid rgba(240,165,0,0.25)",
                        borderRadius: "20px",
                        fontSize: "12px",
                        color: "var(--accent)",
                        fontFamily: "var(--font-body)"
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Field label="Listing Description" value={ai.etsyDescription} mono />
              </Section>

              {/* Design Prompts */}
              <Section title="Design & Mockup Guidance" icon="🎨">
                <Field label="AI Image Generation Prompt" value={ai.designPrompt} mono />
                <Field label="Canva / Mockup Instructions" value={ai.canvaInstructions} mono />
              </Section>
            </>
          )}

          {/* Etsy Draft Info */}
          {product.etsyDraft && (
            <Section title="Etsy Draft Created" icon="🛍️" accent>
              <div style={{
                padding: "12px 16px",
                background: "var(--success-dim)",
                border: "1px solid var(--success)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "12px",
                color: "var(--success)",
                fontSize: "13px",
                display: "flex", alignItems: "center", gap: "8px"
              }}>
                ✅ {product.etsyDraft.isMock
                  ? "Simulated Etsy draft created successfully! Add real Etsy credentials to create actual listings."
                  : "Etsy draft listing created successfully!"}
              </div>
              <Field label="Listing ID" value={`#${product.etsyDraft.listing_id}`} />
              <Field label="State" value={product.etsyDraft.state} />
              {product.etsyDraft.url && (
                <Field label="Listing URL" value={product.etsyDraft.url} />
              )}
            </Section>
          )}

          {/* ---- NEW: Generated Digital Products Section ---- */}
          {/* Shown whenever at least one file has been generated */}
          {generatedFiles.length > 0 && (
            <Section title="Generated Digital Products" icon="📁">
              <div style={{
                padding: "10px 14px",
                background: "var(--success-dim)",
                border: "1px solid var(--success)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "14px",
                color: "var(--success)",
                fontSize: "13px",
                display: "flex", alignItems: "center", gap: "8px"
              }}>
                ✅ {generatedFiles.length} file{generatedFiles.length !== 1 ? "s" : ""} generated — click a file to download it
              </div>

              {/* File list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {generatedFiles.map((file, index) => (
                  <a
                    key={index}
                    href={resolveDownloadUrl(file.url)}
                    download={file.filename}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      textDecoration: "none",
                      transition: "border-color 0.15s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    {/* File icon */}
                    <span style={{ fontSize: "22px", flexShrink: 0 }}>📊</span>

                    {/* File info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>
                        {file.type}
                      </div>
                      <div style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-display)",
                        marginTop: "2px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>
                        {file.filename}
                      </div>
                      <div style={{
                        fontSize: "10px",
                        color: "var(--text-muted)",
                        marginTop: "2px"
                      }}>
                        Created {new Date(file.createdAt).toLocaleDateString(undefined, {
                          year: "numeric", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </div>
                    </div>

                    {/* Download label */}
                    <span style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      color: "var(--accent)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      flexShrink: 0
                    }}>
                      ↓ CSV
                    </span>
                  </a>
                ))}
              </div>
            </Section>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
