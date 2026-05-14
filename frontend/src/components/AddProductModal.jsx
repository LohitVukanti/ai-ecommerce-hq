import React, { useState } from "react";
import { createProduct } from "../services/api";

const AddProductModal = ({ onClose, onProductAdded }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const newProduct = await createProduct({
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || undefined
      });
      onProductAdded(newProduct);
      onClose();
    } catch (err) {
      setError(err.message || "Could not create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
        padding: "20px"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "var(--shadow-lg)"
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              fontWeight: 800
            }}
          >
            Add Product Idea
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              fontSize: "20px",
              border: "none",
              cursor: "pointer"
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          {error && (
            <div
              style={{
                marginBottom: "16px",
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

          <label style={{ display: "block", marginBottom: "16px" }}>
            <span
              style={{
                display: "block",
                fontSize: "11px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "6px"
              }}
            >
              Title *
            </span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Personalized star map print"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                fontSize: "14px"
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "16px" }}>
            <span
              style={{
                display: "block",
                fontSize: "11px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "6px"
              }}
            >
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What makes this product special?"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                resize: "vertical"
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "20px" }}>
            <span
              style={{
                display: "block",
                fontSize: "11px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "6px"
              }}
            >
              Category
            </span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Digital Download"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                fontSize: "14px"
              }}
            />
          </label>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 18px",
                background: "var(--accent)",
                color: "#0d1117",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.85 : 1
              }}
            >
              {loading ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
