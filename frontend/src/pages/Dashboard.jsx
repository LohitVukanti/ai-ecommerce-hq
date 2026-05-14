// ============================================================
// pages/Dashboard.jsx — Main Dashboard Page
// ============================================================
// The main view of the app. Shows:
// - A header with app branding and "Add Product" button
// - Status filter tabs
// - A grid of product cards
// - Modals (Add Product, Product Detail) when opened
// ============================================================

import React, { useState, useEffect } from "react";
import { fetchProducts } from "../services/api";
import ProductCard from "../components/ProductCard";
import AddProductModal from "../components/AddProductModal";
import ProductDetailModal from "../components/ProductDetailModal";

// The order of statuses in the workflow
const STATUSES = [
  { value: "all",                label: "All",              icon: "📋" },
  { value: "idea",               label: "Ideas",            icon: "💡" },
  { value: "researched",         label: "Researched",       icon: "🔍" },
  { value: "listing_generated",  label: "Listing Ready",    icon: "✍️" },
  { value: "approved",           label: "Approved",         icon: "✅" },
  { value: "etsy_draft_created", label: "Etsy Draft",       icon: "🛍️" },
  { value: "rejected",           label: "Rejected",         icon: "❌" }
];

const Dashboard = () => {
  // ---- State ----
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Which status tab is active ("all" shows everything)
  const [activeFilter, setActiveFilter] = useState("all");

  // Modal state — which modal (if any) is open
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // Opens detail modal

  // ---- Fetch Products on Load ----
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      // Sort by newest first
      setProducts(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      setError("Could not load products. Make sure the backend is running on port 3001.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Handlers ----

  // Called when a new product is added via the Add Product modal
  const handleProductAdded = (newProduct) => {
    setProducts((prev) => [newProduct, ...prev]);
  };

  // Called when a product is updated in the detail modal (AI, approve, etc.)
  const handleProductUpdated = (updatedProduct) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    setSelectedProduct(updatedProduct); // Also update the currently open modal
  };

  // ---- Filtering ----
  const filteredProducts = activeFilter === "all"
    ? products
    : products.filter((p) => p.status === activeFilter);

  // Count products per status for the tab badges
  const countByStatus = (status) =>
    status === "all" ? products.length : products.filter((p) => p.status === status).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* ---- Top Navigation Bar ---- */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "64px"
      }}>
        {/* Logo / Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px",
            background: "var(--accent)",
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px"
          }}>
            🏪
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "16px", lineHeight: 1 }}>
              AI E-Commerce HQ
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
              PRODUCT DASHBOARD
            </div>
          </div>
        </div>

        {/* Nav Actions */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={loadProducts}
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px", fontWeight: 600
            }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: "var(--accent)",
              color: "#0d1117",
              padding: "8px 18px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px", fontWeight: 700,
              display: "flex", alignItems: "center", gap: "6px"
            }}
          >
            <span style={{ fontSize: "16px" }}>+</span>
            Add Product Idea
          </button>
        </div>
      </nav>

      {/* ---- Page Content ---- */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Page Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "28px", marginBottom: "6px" }}>
            Product Pipeline
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Track your product ideas from concept to live Etsy listing.
            <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>
              {products.length} total product{products.length !== 1 ? "s" : ""}
            </span>
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            background: "var(--danger-dim)", border: "1px solid var(--danger)",
            borderRadius: "var(--radius-md)", padding: "16px 20px",
            marginBottom: "24px", color: "var(--danger)"
          }}>
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>⚠️ Connection Error</div>
            <div style={{ fontSize: "13px" }}>{error}</div>
            <div style={{ fontSize: "12px", marginTop: "8px", color: "var(--text-secondary)" }}>
              Start the backend: <code style={{ background: "var(--bg-primary)", padding: "2px 6px", borderRadius: "4px" }}>cd backend && npm run dev</code>
            </div>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div style={{
          display: "flex", gap: "4px", marginBottom: "24px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "4px",
          flexWrap: "wrap"
        }}>
          {STATUSES.map((status) => {
            const count = countByStatus(status.value);
            const isActive = activeFilter === status.value;
            return (
              <button
                key={status.value}
                onClick={() => setActiveFilter(status.value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: isActive ? "var(--accent)" : "transparent",
                  color: isActive ? "#0d1117" : "var(--text-secondary)",
                  fontSize: "13px",
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  display: "flex", alignItems: "center", gap: "5px",
                  transition: "all 0.15s"
                }}
              >
                <span>{status.icon}</span>
                {status.label}
                {count > 0 && (
                  <span style={{
                    background: isActive ? "rgba(0,0,0,0.2)" : "var(--bg-tertiary)",
                    color: isActive ? "#0d1117" : "var(--text-muted)",
                    padding: "1px 7px",
                    borderRadius: "10px",
                    fontSize: "11px",
                    fontWeight: 700
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--text-muted)" }}>
            <div className="spinner" style={{ width: "32px", height: "32px", margin: "0 auto 16px", borderTopColor: "var(--accent)" }} />
            <div>Loading products...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProducts.length === 0 && (
          <div style={{
            textAlign: "center", padding: "80px 24px",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-lg)",
            color: "var(--text-muted)"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>
              {activeFilter === "all" ? "💡" : "🔍"}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "18px", color: "var(--text-secondary)", marginBottom: "8px" }}>
              {activeFilter === "all" ? "No products yet" : `No ${activeFilter.replace(/_/g, " ")} products`}
            </div>
            <div style={{ fontSize: "14px", marginBottom: "24px" }}>
              {activeFilter === "all"
                ? "Add your first product idea to get started!"
                : "Try a different filter tab."}
            </div>
            {activeFilter === "all" && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  background: "var(--accent)", color: "#0d1117",
                  padding: "10px 24px", borderRadius: "var(--radius-sm)",
                  fontSize: "14px", fontWeight: 700
                }}
              >
                + Add Product Idea
              </button>
            )}
          </div>
        )}

        {/* Product Grid */}
        {!loading && filteredProducts.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "16px"
          }}>
            {filteredProducts.map((product) => (
              <div key={product.id} className="fade-in">
                <ProductCard
                  product={product}
                  onClick={() => setSelectedProduct(product)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ---- Modals ---- */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onProductAdded={handleProductAdded}
        />
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onProductUpdated={handleProductUpdated}
        />
      )}
    </div>
  );
};

export default Dashboard;
