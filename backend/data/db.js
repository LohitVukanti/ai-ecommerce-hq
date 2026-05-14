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
    generatedFiles: parseJson(row.generatedFiles, [])
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
    generatedFiles: []
  };

  db.prepare(`
    INSERT INTO products (
      id, title, description, category, status,
      aiData, etsyDraft, digitalProduct, generatedFiles,
      createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  getAnalyticsSummary
};