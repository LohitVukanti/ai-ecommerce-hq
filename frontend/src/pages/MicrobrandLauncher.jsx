// ============================================================
// pages/MicrobrandLauncher.jsx — Beginner Launch Product workflow
// ============================================================
// Simple surface over the existing advanced product pipeline.
// Advanced Dashboard, Trend Scanner, Ideas, and Product Detail
// remain available from the global nav.
// ============================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  approveArtworkAsset,
  createPrintifyProduct,
  createRealEtsyDraft,
  fetchIntegrationStatus,
  findLaunchOpportunities,
  resolveDownloadUrl,
  runLaunchWorkflow,
  saveProductDraft
} from "../services/api";
import {
  inferArtworkImageMode,
  inferEtsyDraftMode,
  inferPrintifyProductMode
} from "../utils/integrationMode";

const LAUNCH_STAGES = [
  "Find Opportunity",
  "Build Product",
  "Review Product",
  "Publish Product"
];

const PROGRESS_LABELS = [
  "Creating Product",
  "Generating AI Content",
  "Generating Concepts",
  "Building Listing",
  "Preparing POD",
  "Creating Apparel Package",
  "Preparing Artwork",
  "Generating Image",
  "Preparing Printify Product",
  "Preparing Etsy Draft",
  "Ready For Review"
];

const FALLBACK_NOTICE = "Using fallback templates because AI generation is unavailable.";

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

const cardStyle = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "18px"
};

const buttonStyle = (variant = "secondary") => ({
  padding: "10px 16px",
  background:
    variant === "primary"
      ? "var(--accent)"
      : variant === "success"
        ? "var(--success)"
        : variant === "danger"
          ? "var(--danger-dim)"
          : "var(--bg-tertiary)",
  color:
    variant === "primary" || variant === "success"
      ? "#0d1117"
      : variant === "danger"
        ? "var(--danger)"
        : "var(--text-secondary)",
  border:
    variant === "danger"
      ? "1px solid var(--danger)"
      : variant === "primary" || variant === "success"
        ? "none"
        : "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  fontSize: "13px",
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer"
});

function ModeBadge({ label, mode }) {
  const normalized = mode || "mock";
  const styles = {
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

  return (
    <span
      style={{
        ...(styles[normalized] || styles.mock),
        padding: "4px 9px",
        borderRadius: "999px",
        fontSize: "10px",
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap"
      }}
    >
      {label}: {normalized}
    </span>
  );
}

function getProviderMode(status, key, fallback = "mock") {
  const provider = status?.providers?.find((p) => p.key === key);
  return provider?.mode || fallback;
}

function getSelectedConcept(product) {
  const list = Array.isArray(product?.generatedConcepts) ? product.generatedConcepts : [];
  return list.find((c) => c.id === product?.selectedConceptId) || list[0] || null;
}

function getPrimaryImage(product) {
  const items = Array.isArray(product?.artworkAssets?.items) ? product.artworkAssets.items : [];
  if (!items.length) return null;
  const primary = items.find((item) => item.isPrimary) || items[items.length - 1];
  return {
    ...primary,
    url: resolveDownloadUrl(primary.previewUrl || primary.fileUrl)
  };
}

function getArtworkByRole(product, role) {
  const items = Array.isArray(product?.artworkAssets?.items) ? product.artworkAssets.items : [];
  const item = items.find((it) => it.artworkRole === role || it.printArea === role);
  if (!item) return null;
  return {
    ...item,
    url: resolveDownloadUrl(item.previewUrl || item.fileUrl)
  };
}

function getMargin(product) {
  const preview = product?.printifyPreview;
  if (preview?.estimatedMarginPercent != null) return `${preview.estimatedMarginPercent}%`;
  const prep = product?.podPrep;
  if (prep?.estimatedMarginPercent != null) return `${prep.estimatedMarginPercent}%`;
  return "Not estimated";
}

function getPrice(product) {
  const listing = product?.listingData;
  const ai = product?.aiData;
  const price =
    listing?.pricingRecommendation?.suggested ||
    product?.printifyPreview?.retailPrice ||
    ai?.suggestedPrice;
  return price ? `$${price}` : "Not set";
}

function getOpportunityScore(product) {
  const score =
    product?.aiData?.sourceIntent?.opportunityScore ??
    product?.aiData?.launchEtsyDraftData?.sourceIntent?.opportunityScore;
  return score == null ? "Manual idea" : `${score}/100`;
}

function getTargetCustomer(product) {
  return (
    product?.aiData?.sourceIntent?.targetCustomer ||
    product?.aiData?.launchEtsyDraftData?.targetCustomer ||
    product?.listingData?.audienceNotes ||
    product?.aiData?.buyerPersona ||
    "Not specified"
  );
}

function statusText(value, empty) {
  if (!value) return empty;
  return String(value).replace(/_/g, " ");
}

function ProgressList({ steps, failedStep }) {
  const actualByLabel = new Map((steps || []).map((step) => [step.label, step]));
  const activeIndex = (steps || []).findIndex((step) => step.status === "active");

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      {PROGRESS_LABELS.map((label, index) => {
        const actual = actualByLabel.get(label);
        const done = actual?.status === "done" || label === "Ready For Review" && steps?.some((s) => s.key === "ready");
        const failed = actual?.status === "failed" || failedStep?.label === label;
        const active = actual?.status === "active" || (!actual && activeIndex >= 0 && index === activeIndex);
        return (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "9px 10px",
              background: "var(--bg-primary)",
              border: `1px solid ${failed ? "var(--danger)" : done ? "rgba(46,160,67,0.45)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              color: failed ? "var(--danger)" : done ? "var(--success)" : "var(--text-secondary)"
            }}
          >
            {active ? (
              <span className="spinner" />
            ) : (
              <span style={{ fontWeight: 900 }}>{failed ? "x" : done ? "✓" : "○"}</span>
            )}
            <span style={{ flex: 1 }}>{label}</span>
            {failed && <span style={{ color: "var(--danger)" }}>Failed</span>}
          </div>
        );
      })}
    </div>
  );
}

function OpportunityCard({ opportunity, selected, onSelect, onBuild, disabled }) {
  return (
    <div
      style={{
        ...cardStyle,
        border: selected ? "2px solid var(--accent)" : "1px solid var(--border)",
        padding: "16px"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.25 }}>
            {opportunity.title}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            {opportunity.niche} · {opportunity.productType}
          </div>
        </div>
        <div
          style={{
            minWidth: "54px",
            height: "54px",
            borderRadius: "50%",
            border: "2px solid var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            fontWeight: 900,
            fontFamily: "var(--font-display)"
          }}
        >
          {opportunity.opportunityScore}
        </div>
      </div>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 12px" }}>
        {opportunity.trendExplanation}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "12px" }}>
        <MiniMetric label="Demand" value={opportunity.demand} />
        <MiniMetric label="Competition" value={opportunity.competition} />
        <MiniMetric label="Profit" value={opportunity.profitPotential} />
      </div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
        Target: <span style={{ color: "var(--text-secondary)" }}>{opportunity.targetAudience}</span>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button type="button" onClick={onSelect} disabled={disabled} style={buttonStyle("secondary")}>
          {selected ? "Selected" : "Select"}
        </button>
        <button type="button" onClick={onBuild} disabled={disabled} style={buttonStyle("primary")}>
          Build Product From Opportunity
        </button>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px" }}>
      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 900 }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function AdvancedDetails({ product, launchResult }) {
  if (!product) return null;
  return (
    <details style={{ ...cardStyle, marginTop: "16px" }}>
      <summary style={{ cursor: "pointer", fontWeight: 900, color: "var(--text-secondary)" }}>
        Advanced Details
      </summary>
      <div style={{ marginTop: "14px", display: "grid", gap: "12px" }}>
        <AdvancedJson title="Original intent and workflow steps" data={{ sourceIntent: product.aiData?.sourceIntent, steps: launchResult?.steps }} />
        <AdvancedJson title="Concepts and selected concept" data={{ selectedConceptId: product.selectedConceptId, generatedConcepts: product.generatedConcepts }} />
        <AdvancedJson title="Artwork prompts and assets" data={product.artworkAssets} />
        <AdvancedJson title="Printify payload preview" data={product.printifyPreview} />
        <AdvancedJson title="AI / Etsy draft data" data={{ aiData: product.aiData, etsyDraft: product.etsyDraft }} />
      </div>
    </details>
  );
}

function AdvancedJson({ title, data }) {
  return (
    <details style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px" }}>
      <summary style={{ cursor: "pointer", fontSize: "12px", fontWeight: 800, color: "var(--text-secondary)" }}>
        {title}
      </summary>
      <pre
        style={{
          margin: "10px 0 0",
          padding: "10px",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          maxHeight: "280px",
          overflow: "auto",
          color: "var(--text-muted)",
          fontSize: "11px",
          lineHeight: 1.5
        }}
      >
        {JSON.stringify(data || null, null, 2)}
      </pre>
    </details>
  );
}

const MicrobrandLauncher = ({ onOpenDashboard }) => {
  const [manualIdea, setManualIdea] = useState({
    idea: "",
    niche: "",
    productType: "POD apparel",
    targetCustomer: "",
    notes: ""
  });
  const [opportunities, setOpportunities] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [opportunityLoading, setOpportunityLoading] = useState(false);
  const [opportunityMeta, setOpportunityMeta] = useState(null);
  const [launchResult, setLaunchResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [integrationStatus, setIntegrationStatus] = useState(null);

  useEffect(() => {
    fetchIntegrationStatus()
      .then(setIntegrationStatus)
      .catch(() => setIntegrationStatus(null));
  }, []);

  const product = launchResult?.product || null;
  const selectedConcept = getSelectedConcept(product);
  const image = getPrimaryImage(product);
  const frontArtwork = getArtworkByRole(product, "front") || image;
  const backArtwork = getArtworkByRole(product, "back");
  const mockupArtwork = getArtworkByRole(product, "mockup");
  const apparelPackage = product?.aiData?.apparelPackage || null;
  const listing = product?.listingData || product?.aiData?.launchEtsyDraftData || product?.aiData || {};
  const fallbackActive =
    opportunityMeta?.fallbackNotice ||
    product?.aiData?.fallbackNotice ||
    launchResult?.notices?.includes(FALLBACK_NOTICE);

  const modes = useMemo(() => {
    return {
      aiText: product?.aiData?.generationMode || opportunityMeta?.mode || getProviderMode(integrationStatus, "openai-text"),
      image: inferArtworkImageMode(product) || getProviderMode(integrationStatus, "image-generation"),
      printify:
        inferPrintifyProductMode(product?.printifyProduct) ||
        (product?.printifyPreview ? "preview" : getProviderMode(integrationStatus, "printify", "preview")),
      etsy: inferEtsyDraftMode(product?.etsyDraft) || getProviderMode(integrationStatus, "etsy")
    };
  }, [integrationStatus, opportunityMeta?.mode, product]);

  const setManualField = (key) => (e) =>
    setManualIdea((prev) => ({ ...prev, [key]: e.target.value }));

  const loadOpportunities = async () => {
    setOpportunityLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const result = await findLaunchOpportunities();
      setOpportunities(result.opportunities || []);
      setOpportunityMeta(result);
      setSelectedOpportunity((result.opportunities || [])[0] || null);
    } catch (err) {
      setError(err.message || "Could not find product opportunities.");
    } finally {
      setOpportunityLoading(false);
    }
  };

  const runLaunch = async (source) => {
    setRunning(true);
    setError(null);
    setActionMessage(null);
    try {
      const payload =
        source === "opportunity"
          ? { opportunity: selectedOpportunity }
          : { manualIdea };
      const result = await runLaunchWorkflow(payload);
      setLaunchResult(result);
      if (!result.completed) {
        setError(`${result.failedStep?.label || "Launch workflow"} failed: ${result.error}`);
      }
    } catch (err) {
      setError(err.message || "Could not build product.");
    } finally {
      setRunning(false);
    }
  };

  const retryLaunch = () => {
    if (launchResult?.product?.aiData?.sourceIntent?.origin === "opportunity" && selectedOpportunity) {
      runLaunch("opportunity");
      return;
    }
    runLaunch(selectedOpportunity ? "opportunity" : "manual");
  };

  const runReviewAction = async (key, fn, message) => {
    if (!product?.id) return;
    setActionBusy(key);
    setError(null);
    setActionMessage(null);
    try {
      const updated = await fn(product.id);
      setLaunchResult((prev) => ({ ...(prev || {}), product: updated }));
      setActionMessage(message);
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setActionBusy(null);
    }
  };

  const approveReviewArtwork = async () => {
    if (!product?.id) return;
    const targets = [frontArtwork, backArtwork].filter((item) => item?.id && item.status !== "approved");
    if (!targets.length && image?.id && image.status !== "approved") targets.push(image);
    if (!targets.length) return;

    setActionBusy("approveArtwork");
    setError(null);
    setActionMessage(null);
    try {
      let updated = product;
      for (const target of targets) {
        updated = await approveArtworkAsset(updated.id, target.id);
      }
      setLaunchResult((prev) => ({ ...(prev || {}), product: updated }));
      setActionMessage("Front/back artwork approved for Printify review.");
    } catch (err) {
      setError(err.message || "Could not approve artwork.");
    } finally {
      setActionBusy(null);
    }
  };

  const saveDraft = async () => {
    await runReviewAction(
      "saveDraft",
      saveProductDraft,
      "Product draft saved. It will appear in Advanced Dashboard."
    );
  };

  const needsArtworkApproval = [frontArtwork, backArtwork].some(
    (item) => item?.id && item.status !== "approved"
  ) || (image?.id && image.status !== "approved");

  const isSavedDraft = Boolean(product?.aiData?.savedDraftAt || apparelPackage?.status === "saved");

  const approvePrimaryArtwork = async () => {
    await approveReviewArtwork();
  };

  const printifyStatus = product?.printifyProduct
    ? `${statusText(product.printifyProduct.status, "Draft prepared")} · product ${product.printifyProduct.productId || "created"} · store ${product.printifyProduct.shopId || "not set"}`
    : product?.printifyPreview
      ? "Preview ready · product draft not created"
      : "Not ready";

  const etsyStatus = product?.etsyDraft
    ? `${statusText(product.etsyDraft.state, "Draft Created")} · ${product.etsyDraft.listing_id || "listing ready"}`
    : product?.aiData?.launchEtsyDraftData
      ? "Draft data prepared · not created"
      : "Not ready";

  const nextAction = !product
    ? opportunities.length
      ? "Choose an opportunity or enter your own idea, then build the product."
      : "Start with Find Product Opportunities, or enter a product idea manually."
    : !launchResult?.completed
      ? `Retry the failed step: ${launchResult?.failedStep?.label || "workflow"}`
      : !product.printifyProduct
        ? "Review the product, approve artwork if needed, then create the Printify product draft."
        : !product.etsyDraft
          ? "Create the Etsy draft after you confirm the listing copy, price, tags, and artwork."
          : "You are ready for human review. Publish only from Etsy/Printify after final approval.";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "28px 24px 56px" }}>
        <header style={{ marginBottom: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
                AI Microbrand Operating System
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "30px", lineHeight: 1.12, fontWeight: 900, marginBottom: "8px" }}>
                Launch Product
              </h1>
              <p style={{ maxWidth: "680px", color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.55 }}>
                Find an Etsy/POD opportunity, build the product, review the listing and artwork, then create drafts for human approval.
              </p>
            </div>
            <button type="button" onClick={onOpenDashboard} style={buttonStyle("secondary")}>
              Advanced Dashboard
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
            <ModeBadge label="AI Text" mode={modes.aiText} />
            <ModeBadge label="Image Generation" mode={modes.image} />
            <ModeBadge label="Printify" mode={modes.printify} />
            <ModeBadge label="Etsy" mode={modes.etsy} />
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px", marginBottom: "18px" }}>
          {LAUNCH_STAGES.map((stage, index) => {
            const active =
              (!product && index <= 1) ||
              (product && launchResult?.completed && index <= 2) ||
              (product?.printifyProduct || product?.etsyDraft ? index <= 3 : false);
            return (
              <div
                key={stage}
                style={{
                  padding: "12px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "var(--accent-dim)" : "var(--bg-secondary)",
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  fontSize: "12px",
                  fontWeight: 900,
                  fontFamily: "var(--font-display)"
                }}
              >
                {index + 1}. {stage}
              </div>
            );
          })}
        </section>

        {fallbackActive && (
          <div style={{ ...cardStyle, border: "1px solid var(--accent)", color: "var(--accent)", marginBottom: "16px" }}>
            {FALLBACK_NOTICE}
          </div>
        )}

        {error && (
          <div style={{ ...cardStyle, border: "1px solid var(--danger)", color: "var(--danger)", marginBottom: "16px" }}>
            <div style={{ fontWeight: 900, marginBottom: "8px" }}>Action needs attention</div>
            <div style={{ fontSize: "13px", lineHeight: 1.45 }}>{error}</div>
            {launchResult?.failedStep && (
              <button type="button" onClick={retryLaunch} disabled={running} style={{ ...buttonStyle("primary"), marginTop: "12px" }}>
                {running ? "Retrying..." : `Retry ${launchResult.failedStep.label}`}
              </button>
            )}
          </div>
        )}

        {actionMessage && (
          <div style={{ ...cardStyle, border: "1px solid var(--success)", color: "var(--success)", marginBottom: "16px" }}>
            {actionMessage}
          </div>
        )}

        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "16px", marginBottom: "8px" }}>
            What should I do next?
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.5 }}>
            {nextAction}
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: product ? "0.95fr 1.05fr" : "1fr", gap: "18px", alignItems: "start" }}>
          <div style={{ display: "grid", gap: "18px" }}>
            <section style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 900, marginBottom: "4px" }}>
                    1. Find Product Opportunity
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.5 }}>
                    Use trend scanner data or enter an idea manually.
                  </p>
                </div>
                <button type="button" onClick={loadOpportunities} disabled={opportunityLoading || running} style={buttonStyle("primary")}>
                  {opportunityLoading ? "Finding..." : "Find Product Opportunities"}
                </button>
              </div>

              {opportunityMeta && (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                  Analyzed {opportunityMeta.trendScanCount} trend scanner entr{opportunityMeta.trendScanCount === 1 ? "y" : "ies"} · AI opportunity discovery: {opportunityMeta.mode}
                </div>
              )}

              {opportunities.length > 0 && (
                <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
                  {opportunities.map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      selected={selectedOpportunity?.id === opportunity.id}
                      disabled={running}
                      onSelect={() => setSelectedOpportunity(opportunity)}
                      onBuild={() => {
                        setSelectedOpportunity(opportunity);
                        runLaunch("opportunity");
                      }}
                    />
                  ))}
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 900, marginBottom: "10px" }}>
                  Or enter your own product idea
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <label style={{ gridColumn: "1 / -1" }}>
                    <span style={labelStyle}>Product idea</span>
                    <input
                      value={manualIdea.idea}
                      onChange={setManualField("idea")}
                      placeholder="Example: pickleball social club sweatshirt for women over 40"
                      style={inputStyle}
                    />
                  </label>
                  <label>
                    <span style={labelStyle}>Niche</span>
                    <input value={manualIdea.niche} onChange={setManualField("niche")} placeholder="Pickleball gifts" style={inputStyle} />
                  </label>
                  <label>
                    <span style={labelStyle}>Product type</span>
                    <input value={manualIdea.productType} onChange={setManualField("productType")} placeholder="POD sweatshirt" style={inputStyle} />
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    <span style={labelStyle}>Target customer</span>
                    <input value={manualIdea.targetCustomer} onChange={setManualField("targetCustomer")} placeholder="Who buys this?" style={inputStyle} />
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    <span style={labelStyle}>Notes</span>
                    <textarea value={manualIdea.notes} onChange={setManualField("notes")} rows={3} placeholder="Style, audience, trend evidence, or constraints" style={{ ...inputStyle, resize: "vertical" }} />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={running || !manualIdea.idea.trim()}
                  onClick={() => runLaunch("manual")}
                  style={buttonStyle("primary")}
                >
                  {running ? "Building..." : "Build Product From Idea"}
                </button>
              </div>
            </section>

            {(running || launchResult?.steps?.length > 0) && (
              <section style={cardStyle}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 900, marginBottom: "12px" }}>
                  2. Build Product
                </h2>
                <ProgressList steps={launchResult?.steps || []} failedStep={launchResult?.failedStep} />
              </section>
            )}
          </div>

          {product && (
            <section style={cardStyle}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 900, marginBottom: "14px" }}>
                3. Review Product
              </h2>

              <div style={{ display: "grid", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "16px", alignItems: "start" }}>
                  <div style={{ display: "grid", gap: "8px" }}>
                    <ArtworkPreview label="Front Artwork" item={frontArtwork} />
                    <ArtworkPreview label="Back Artwork" item={backArtwork} />
                    <ArtworkPreview label="Mockup Preview" item={mockupArtwork} />
                  </div>
                  <div>
                    <ReviewField label="Product Name" value={product.title} />
                    <ReviewField label="Opportunity Score" value={getOpportunityScore(product)} />
                    <ReviewField label="Target Customer" value={getTargetCustomer(product)} />
                    {apparelPackage && <ReviewField label="Recommended Product" value={`${apparelPackage.recommendedProduct?.blank || "Apparel blank"} · ${(apparelPackage.recommendedProduct?.colors || []).join(", ")}`} />}
                    {selectedConcept && <ReviewField label="Recommended Concept" value={selectedConcept.conceptName} />}
                  </div>
                </div>

                {apparelPackage && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <ReviewField label="Front Design Brief" value={apparelPackage.frontDesignBrief} pre />
                    <ReviewField label="Back Design Brief" value={apparelPackage.backDesignBrief} pre />
                  </div>
                )}

                <ReviewField label="Etsy Title" value={listing.etsyTitle || product.title} />
                <ReviewField label="Etsy Description" value={listing.etsyDescription || product.description} pre />
                <div>
                  <div style={labelStyle}>Tags</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {(listing.etsyTags || []).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: "4px 9px",
                          background: "var(--accent-dim)",
                          border: "1px solid rgba(240,165,0,0.25)",
                          borderRadius: "999px",
                          color: "var(--accent)",
                          fontSize: "12px"
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                  <SmallReviewStat label="Price" value={getPrice(product)} />
                  <SmallReviewStat label="Margin Estimate" value={getMargin(product)} />
                  <SmallReviewStat label="Printify Status" value={printifyStatus} />
                  <SmallReviewStat label="Etsy Status" value={etsyStatus} />
                </div>
              </div>

              <section style={{ borderTop: "1px solid var(--border)", marginTop: "18px", paddingTop: "16px" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 900, marginBottom: "10px" }}>
                  4. Publish Product
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.5, marginBottom: "12px" }}>
                  Create drafts only after review. Nothing is automatically published.
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={!!actionBusy || isSavedDraft}
                    onClick={saveDraft}
                    style={buttonStyle("secondary")}
                  >
                    {actionBusy === "saveDraft" ? "Saving..." : isSavedDraft ? "Product Draft Saved" : "Save Product Draft"}
                  </button>
                  {needsArtworkApproval && (
                    <button
                      type="button"
                      disabled={!!actionBusy}
                      onClick={approvePrimaryArtwork}
                      style={buttonStyle("secondary")}
                    >
                      {actionBusy === "approveArtwork" ? "Approving..." : "Approve Front/Back Artwork"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!!actionBusy || !product.printifyPreview}
                    onClick={() =>
                      runReviewAction(
                        "printify",
                        createPrintifyProduct,
                        "Printify product draft is prepared. It has not been published."
                      )
                    }
                    style={buttonStyle("primary")}
                  >
                    {actionBusy === "printify" ? "Creating..." : "Create Printify Product"}
                  </button>
                  <button
                    type="button"
                    disabled={!!actionBusy || !product.aiData}
                    onClick={() =>
                      runReviewAction(
                        "etsy",
                        createRealEtsyDraft,
                        "Etsy draft created. Publishing still requires explicit approval."
                      )
                    }
                    style={buttonStyle("success")}
                  >
                    {actionBusy === "etsy" ? "Creating..." : "Create Etsy Draft"}
                  </button>
                </div>
                {product.printifyProduct && (
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "10px" }}>
                    Printify draft status: {product.printifyProduct.status || "draft"} · Product ID: {product.printifyProduct.productId || "n/a"} · Store ID: {product.printifyProduct.shopId || "n/a"}
                  </div>
                )}
                {product.etsyDraft && (
                  <div style={{ fontSize: "12px", color: "var(--success)", marginTop: "10px" }}>
                    Draft Created · Ready To Publish after human approval.
                  </div>
                )}
              </section>

              <AdvancedDetails product={product} launchResult={launchResult} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

function ReviewField({ label, value, pre }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={labelStyle}>{label}</div>
      <div
        style={{
          color: "var(--text-primary)",
          fontSize: "14px",
          lineHeight: 1.55,
          whiteSpace: pre ? "pre-wrap" : "normal",
          maxHeight: pre ? "220px" : undefined,
          overflow: pre ? "auto" : undefined,
          background: pre ? "var(--bg-primary)" : "transparent",
          border: pre ? "1px solid var(--border)" : "none",
          borderRadius: pre ? "var(--radius-sm)" : 0,
          padding: pre ? "10px" : 0
        }}
      >
        {value || "Not available"}
      </div>
    </div>
  );
}

function ArtworkPreview({ label, item }) {
  return (
    <div
      style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden"
      }}
    >
      <div style={{ ...labelStyle, padding: "8px 10px", marginBottom: 0 }}>
        {label}
      </div>
      <div
        style={{
          height: "120px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-secondary)"
        }}
      >
        {item?.url ? (
          <img src={item.url} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Not generated</span>
        )}
      </div>
      {item?.status && (
        <div style={{ padding: "6px 10px", fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
          {item.status}
        </div>
      )}
    </div>
  );
}

function SmallReviewStat({ label, value }) {
  return (
    <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px" }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ color: "var(--text-primary)", fontSize: "13px", lineHeight: 1.45, fontWeight: 800 }}>
        {value || "Not ready"}
      </div>
    </div>
  );
}

export default MicrobrandLauncher;
