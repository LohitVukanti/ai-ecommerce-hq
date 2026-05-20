import React from "react";

/**
 * Catches uncaught render errors so the whole app doesn't white-screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UI error boundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "var(--bg-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px"
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              width: "100%",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "28px"
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>⚠️</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "20px",
                fontWeight: 800,
                marginBottom: "8px",
                color: "var(--text-primary)"
              }}
            >
              Something went wrong
            </h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "16px" }}>
              An unexpected UI error occurred. Your data on the server is unaffected. Reload the page or try again.
            </p>
            <pre
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "10px",
                overflow: "auto",
                maxHeight: "120px",
                marginBottom: "16px"
              }}
            >
              {this.state.error?.message || "Unknown error"}
            </pre>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                background: "var(--accent)",
                color: "#0d1117",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
