// ============================================================
// data/db.js — Simple In-Memory Database
// ============================================================
// This acts as our "database" for now. All products are stored
// in a JavaScript array in memory. Data resets when the server
// restarts. This is perfect for an MVP — swap it for a real DB
// (MongoDB, PostgreSQL, etc.) later.
// ============================================================

const { v4: uuidv4 } = require("uuid");

// Our in-memory "table" of products
let products = [
  // ---- Sample product so the dashboard isn't empty on first load ----
  {
    id: uuidv4(),
    title: "Personalized Star Map Print",
    description: "A custom star map showing the night sky from any location and date. Perfect for anniversaries, birthdays, or new babies.",
    category: "Digital Download",
    status: "idea", // idea → researched → listing_generated → approved → etsy_draft_created → rejected
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiData: null,   // Filled in after AI generation
    etsyDraft: null // Filled in after Etsy draft creation
  }
];

// ---- Helper Functions ----
// Think of these as simple database query functions

/** Get all products */
const getAllProducts = () => products;

/** Get a single product by its ID */
const getProductById = (id) => products.find((p) => p.id === id);

/** Add a new product */
const createProduct = (data) => {
  const newProduct = {
    id: uuidv4(),
    title: data.title,
    description: data.description || "",
    category: data.category || "General",
    status: "idea",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiData: null,
    etsyDraft: null
  };
  products.push(newProduct);
  return newProduct;
};

/** Update a product by ID with new fields */
const updateProduct = (id, updates) => {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  products[index] = {
    ...products[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  return products[index];
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct };
