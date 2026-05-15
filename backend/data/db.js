const path = require("path");
const Database = require("better-sqlite3");
const { v4: uuidv4 } = require("uuid");

const dbPath = path.join(__dirname, "products.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    status TEXT NOT NULL,
    aiData TEXT,
    etsyDraft TEXT,
    digitalProduct TEXT,
    generatedFiles TEXT,
    generatedConcepts TEXT,
    selectedConceptId TEXT,
    listingData TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

(() => {
  const cols = db.prepare(`PRAGMA table_info(products)`).all().map((c) => c.name);
  if (!cols.includes("generatedConcepts")) {
    db.exec(`ALTER TABLE products ADD COLUMN generatedConcepts TEXT`);
  }
  if (!cols.includes("selectedConceptId")) {
    db.exec(`ALTER TABLE products ADD COLUMN selectedConceptId TEXT`);
  }
  if (!cols.includes("listingData")) {
    db.exec(`ALTER TABLE products ADD COLUMN listingData TEXT`);
  }
})();

// ---- Ideas / research intake (separate from sellable products) ----
// Stores intake fields, rule-based opportunity score, and optional link to a converted product.
db.exec(`
  CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sourcePlatform TEXT NOT NULL DEFAULT '',
    sourceUrl TEXT NOT NULL DEFAULT '',
    niche TEXT NOT NULL DEFAULT '',
    targetCustomer TEXT NOT NULL DEFAULT '',
    productType TEXT NOT NULL DEFAULT '',
    estimatedSellingPrice REAL NOT NULL DEFAULT 0,
    estimatedProductionCost REAL NOT NULL DEFAULT 0,
    competitionLevel TEXT NOT NULL DEFAULT '',
    demandEvidence TEXT NOT NULL DEFAULT '',
    trendEvidence TEXT NOT NULL DEFAULT '',
    fulfillmentDifficulty TEXT NOT NULL DEFAULT '',
    copyrightRisk TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    decisionStatus TEXT NOT NULL DEFAULT 'pending',
    opportunityScore INTEGER,
    scoreBreakdown TEXT,
    convertedProductId TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

const parseJson = (value, fallback = null) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const serializeJson = (value) => {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
};

const rowToProduct = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    category: row.category || "General",
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    aiData: parseJson(row.aiData, null),
    etsyDraft: parseJson(row.etsyDraft, null),
    digitalProduct: parseJson(row.digitalProduct, null),
    generatedFiles: parseJson(row.generatedFiles, []),
    generatedConcepts: parseJson(row.generatedConcepts, []),
    selectedConceptId: row.selectedConceptId || null,
    listingData: parseJson(row.listingData, null)
  };
};

const getAllProducts = () => {
  const rows = db.prepare(`
    SELECT * FROM products
    ORDER BY datetime(createdAt) DESC
  `).all();

  return rows.map(rowToProduct);
};

const getProductById = (id) => {
  const row = db.prepare(`
    SELECT * FROM products
    WHERE id = ?
  `).get(id);

  return rowToProduct(row);
};

const createProduct = (data) => {
  const now = new Date().toISOString();

  const newProduct = {
    id: uuidv4(),
    title: data.title,
    description: data.description || "",
    category: data.category || "General",
    status: "idea",
    createdAt: now,
    updatedAt: now,
    aiData: null,
    etsyDraft: null,
    digitalProduct: null,
    generatedFiles: [],
    generatedConcepts: [],
    selectedConceptId: null,
    listingData: null
  };

  db.prepare(`
    INSERT INTO products (
      id, title, description, category, status,
      aiData, etsyDraft, digitalProduct, generatedFiles,
      generatedConcepts, selectedConceptId, listingData,
      createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newProduct.id,
    newProduct.title,
    newProduct.description,
    newProduct.category,
    newProduct.status,
    serializeJson(newProduct.aiData),
    serializeJson(newProduct.etsyDraft),
    serializeJson(newProduct.digitalProduct),
    serializeJson(newProduct.generatedFiles),
    serializeJson(newProduct.generatedConcepts),
    newProduct.selectedConceptId,
    serializeJson(newProduct.listingData),
    newProduct.createdAt,
    newProduct.updatedAt
  );

  return newProduct;
};

const updateProduct = (id, updates) => {
  const existing = getProductById(id);
  if (!existing) return null;

  const updatedProduct = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const concepts = Array.isArray(updatedProduct.generatedConcepts)
    ? updatedProduct.generatedConcepts
    : existing.generatedConcepts || [];
  const listingData =
    updatedProduct.listingData !== undefined
      ? updatedProduct.listingData
      : existing.listingData;

  db.prepare(`
    UPDATE products
    SET
      title = ?,
      description = ?,
      category = ?,
      status = ?,
      aiData = ?,
      etsyDraft = ?,
      digitalProduct = ?,
      generatedFiles = ?,
      generatedConcepts = ?,
      selectedConceptId = ?,
      listingData = ?,
      updatedAt = ?
    WHERE id = ?
  `).run(
    updatedProduct.title,
    updatedProduct.description,
    updatedProduct.category,
    updatedProduct.status,
    serializeJson(updatedProduct.aiData),
    serializeJson(updatedProduct.etsyDraft),
    serializeJson(updatedProduct.digitalProduct),
    serializeJson(updatedProduct.generatedFiles),
    serializeJson(concepts),
    updatedProduct.selectedConceptId ?? null,
    serializeJson(listingData),
    updatedProduct.updatedAt,
    id
  );

  return getProductById(id);
};

const deleteProduct = (id) => {
  const result = db.prepare(`
    DELETE FROM products
    WHERE id = ?
  `).run(id);

  return result.changes > 0;
};

// ============================================================
// Ideas — row mapping & CRUD (same SQLite file as products)
// ============================================================

const rowToIdea = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    sourcePlatform: row.sourcePlatform || "",
    sourceUrl: row.sourceUrl || "",
    niche: row.niche || "",
    targetCustomer: row.targetCustomer || "",
    productType: row.productType || "",
    estimatedSellingPrice: Number(row.estimatedSellingPrice) || 0,
    estimatedProductionCost: Number(row.estimatedProductionCost) || 0,
    competitionLevel: row.competitionLevel || "",
    demandEvidence: row.demandEvidence || "",
    trendEvidence: row.trendEvidence || "",
    fulfillmentDifficulty: row.fulfillmentDifficulty || "",
    copyrightRisk: row.copyrightRisk || "",
    notes: row.notes || "",
    decisionStatus: row.decisionStatus || "pending",
    opportunityScore: row.opportunityScore === null || row.opportunityScore === undefined ? null : Number(row.opportunityScore),
    scoreBreakdown: parseJson(row.scoreBreakdown, null),
    convertedProductId: row.convertedProductId || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

const getAllIdeas = () => {
  const rows = db.prepare(`
    SELECT * FROM ideas
    ORDER BY datetime(createdAt) DESC
  `).all();
  return rows.map(rowToIdea);
};

const getIdeaById = (id) => {
  const row = db.prepare(`SELECT * FROM ideas WHERE id = ?`).get(id);
  return rowToIdea(row);
};

const createIdea = (data) => {
  const now = new Date().toISOString();
  const idea = {
    id: uuidv4(),
    title: (data.title || "").trim(),
    sourcePlatform: (data.sourcePlatform || "").trim(),
    sourceUrl: (data.sourceUrl || "").trim(),
    niche: (data.niche || "").trim(),
    targetCustomer: (data.targetCustomer || "").trim(),
    productType: (data.productType || "").trim(),
    estimatedSellingPrice: Number(data.estimatedSellingPrice) || 0,
    estimatedProductionCost: Number(data.estimatedProductionCost) || 0,
    competitionLevel: (data.competitionLevel || "").trim(),
    demandEvidence: (data.demandEvidence || "").trim(),
    trendEvidence: (data.trendEvidence || "").trim(),
    fulfillmentDifficulty: (data.fulfillmentDifficulty || "").trim(),
    copyrightRisk: (data.copyrightRisk || "").trim(),
    notes: (data.notes || "").trim(),
    decisionStatus: "pending",
    opportunityScore: null,
    scoreBreakdown: null,
    convertedProductId: null,
    createdAt: now,
    updatedAt: now
  };

  if (!idea.title) {
    throw new Error("Idea title is required");
  }

  db.prepare(`
    INSERT INTO ideas (
      id, title, sourcePlatform, sourceUrl, niche, targetCustomer, productType,
      estimatedSellingPrice, estimatedProductionCost, competitionLevel,
      demandEvidence, trendEvidence, fulfillmentDifficulty, copyrightRisk,
      notes, decisionStatus, opportunityScore, scoreBreakdown, convertedProductId,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    idea.id,
    idea.title,
    idea.sourcePlatform,
    idea.sourceUrl,
    idea.niche,
    idea.targetCustomer,
    idea.productType,
    idea.estimatedSellingPrice,
    idea.estimatedProductionCost,
    idea.competitionLevel,
    idea.demandEvidence,
    idea.trendEvidence,
    idea.fulfillmentDifficulty,
    idea.copyrightRisk,
    idea.notes,
    idea.decisionStatus,
    idea.opportunityScore,
    serializeJson(idea.scoreBreakdown),
    idea.convertedProductId,
    idea.createdAt,
    idea.updatedAt
  );

  return getIdeaById(idea.id);
};

const updateIdea = (id, updates) => {
  const existing = getIdeaById(id);
  if (!existing) return null;

  const merged = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  };

  db.prepare(`
    UPDATE ideas SET
      title = ?,
      sourcePlatform = ?,
      sourceUrl = ?,
      niche = ?,
      targetCustomer = ?,
      productType = ?,
      estimatedSellingPrice = ?,
      estimatedProductionCost = ?,
      competitionLevel = ?,
      demandEvidence = ?,
      trendEvidence = ?,
      fulfillmentDifficulty = ?,
      copyrightRisk = ?,
      notes = ?,
      decisionStatus = ?,
      opportunityScore = ?,
      scoreBreakdown = ?,
      convertedProductId = ?,
      updatedAt = ?
    WHERE id = ?
  `).run(
    merged.title,
    merged.sourcePlatform,
    merged.sourceUrl,
    merged.niche,
    merged.targetCustomer,
    merged.productType,
    merged.estimatedSellingPrice,
    merged.estimatedProductionCost,
    merged.competitionLevel,
    merged.demandEvidence,
    merged.trendEvidence,
    merged.fulfillmentDifficulty,
    merged.copyrightRisk,
    merged.notes,
    merged.decisionStatus,
    merged.opportunityScore === undefined ? null : merged.opportunityScore,
    serializeJson(merged.scoreBreakdown),
    merged.convertedProductId,
    merged.updatedAt,
    id
  );

  return getIdeaById(id);
};

const deleteIdea = (id) => {
  const result = db.prepare(`DELETE FROM ideas WHERE id = ?`).run(id);
  return result.changes > 0;
};

const { computeOpportunityScores } = require("../services/opportunityScorer");

/** Run rule-based scorer and persist scores + decision band on the idea row. */
const scoreIdea = (id) => {
  const idea = getIdeaById(id);
  if (!idea) return null;
  const scored = computeOpportunityScores(idea);
  return updateIdea(id, {
    opportunityScore: scored.overallOpportunityScore,
    scoreBreakdown: scored.scoreBreakdown,
    decisionStatus: scored.decisionStatus
  });
};

/**
 * Create a product from an idea (existing products pipeline unchanged).
 * Marks the idea as converted and stores the new product id for traceability.
 */
const convertIdeaToProduct = (id) => {
  const idea = getIdeaById(id);
  if (!idea) return null;
  if (idea.convertedProductId) {
    const err = new Error("Idea was already converted to a product");
    err.code = "ALREADY_CONVERTED";
    throw err;
  }

  const lines = [];
  if (idea.targetCustomer) lines.push(`Target customer: ${idea.targetCustomer}`);
  if (idea.niche) lines.push(`Niche: ${idea.niche}`);
  if (idea.sourcePlatform || idea.sourceUrl) {
    lines.push(`Source: ${[idea.sourcePlatform, idea.sourceUrl].filter(Boolean).join(" — ")}`);
  }
  if (idea.notes) lines.push(`Research notes:\n${idea.notes}`);
  if (idea.opportunityScore != null) {
    lines.push(`Intake opportunity score: ${idea.opportunityScore}/100 (${idea.decisionStatus})`);
  }

  const product = createProduct({
    title: idea.title,
    description: lines.join("\n\n") || idea.title,
    category: (idea.productType && idea.productType.trim()) || (idea.niche && idea.niche.trim()) || "General"
  });

  const updatedIdea = updateIdea(id, {
    convertedProductId: product.id,
    decisionStatus: "converted_to_product"
  });

  return { product, idea: updatedIdea };
};

const getAnalyticsSummary = () => {
  const products = getAllProducts();

  const productsByStatus = {};
  const productsByCategory = {};

  let estimatedRevenue = 0;

  for (const product of products) {
    productsByStatus[product.status] = (productsByStatus[product.status] || 0) + 1;
    productsByCategory[product.category] = (productsByCategory[product.category] || 0) + 1;

    if (product.aiData?.suggestedPrice) {
      estimatedRevenue += Number(product.aiData.suggestedPrice) || 0;
    }
  }

  return {
    totalProducts: products.length,
    approvedProducts: products.filter((p) => p.status === "approved").length,
    etsyDrafts: products.filter((p) => p.status === "etsy_draft_created").length,
    rejectedProducts: products.filter((p) => p.status === "rejected").length,
    estimatedRevenue: Number(estimatedRevenue.toFixed(2)),
    productsByStatus,
    productsByCategory
  };
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAnalyticsSummary,
  getAllIdeas,
  getIdeaById,
  createIdea,
  updateIdea,
  deleteIdea,
  scoreIdea,
  convertIdeaToProduct
};