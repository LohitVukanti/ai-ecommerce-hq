// ============================================================
// server.js — Main Express Server
// ============================================================
// This is the entry point for the backend.
// It sets up Express, connects middleware, and mounts routes.
// ============================================================

// Load environment variables from .env file (if it exists)
require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Import our route files
const productRoutes = require("./routes/products");

const app = express();
const PORT = process.env.PORT || 3001;

// ---- Middleware ----
// Allow requests from our React frontend (running on a different port)
app.use(cors());
// Parse incoming JSON request bodies
app.use(express.json());

// ---- Routes ----
// All product-related routes live under /api/products
app.use("/api/products", productRoutes);

// ---- Health Check ----
// Useful to quickly verify the server is running
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "AI E-Commerce HQ backend is running!" });
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Products API: http://localhost:${PORT}/api/products\n`);
});
