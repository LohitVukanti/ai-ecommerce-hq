import React, { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import IdeasResearch from "./pages/IdeasResearch";
import TrendScanner from "./pages/TrendScanner";
import Integrations from "./pages/Integrations";
import MicrobrandLauncher from "./pages/MicrobrandLauncher";
import PrivateAccessGate from "./components/PrivateAccessGate";

function readOauthFromUrl() {
  if (typeof window === "undefined") return { page: "launcher", banner: null };
  const params = new URLSearchParams(window.location.search);
  const flag = params.get("etsy_oauth");
  if (!flag) return { page: "launcher", banner: null };

  const banner =
    flag === "success"
      ? { kind: "success", text: "Etsy connected — tokens stored on the backend." }
      : {
          kind: "error",
          text: `Etsy OAuth failed: ${params.get("reason") || "unknown error"}`
        };

  return { page: "integrations", banner };
}

function navBtnStyle(active) {
  return {
    background: active ? "var(--accent-dim)" : "var(--bg-tertiary)",
    color: active ? "var(--accent)" : "var(--text-secondary)",
    border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
    padding: "7px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap"
  };
}

function AppNav({ page, onNavigate }) {
  const items = [
    { id: "launcher", label: "Home" },
    { id: "products", label: "Advanced Dashboard" },
    { id: "ideas", label: "Ideas" },
    { id: "trends", label: "Trend Scanner" },
    { id: "integrations", label: "Integrations" }
  ];

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "48px",
        gap: "12px"
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "13px",
          color: "var(--text-primary)",
          letterSpacing: "0.02em",
          flexShrink: 0
        }}
      >
        AI E-Commerce HQ
      </div>
      <div
        style={{
          display: "flex",
          gap: "6px",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "flex-end"
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            style={navBtnStyle(page === item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function App() {
  const initial = readOauthFromUrl();
  const [page, setPage] = useState(initial.page);
  const [oauthBanner] = useState(initial.banner);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.search.includes("etsy_oauth")) {
      window.history.replaceState({}, "", window.location.pathname || "/");
    }
  }, []);

  const goLauncher = () => setPage("launcher");
  const goProducts = () => setPage("products");
  const goIdeas = () => setPage("ideas");
  const goTrends = () => setPage("trends");
  const goIntegrations = () => setPage("integrations");

  let body;
  if (page === "ideas") {
    body = <IdeasResearch onBack={goProducts} onOpenTrends={goTrends} />;
  } else if (page === "trends") {
    body = <TrendScanner onBack={goProducts} onOpenIdeas={goIdeas} />;
  } else if (page === "integrations") {
    body = <Integrations onBack={goProducts} initialOauthBanner={oauthBanner} />;
  } else if (page === "products") {
    body = (
      <Dashboard
        onOpenIdeas={goIdeas}
        onOpenTrends={goTrends}
        onOpenIntegrations={goIntegrations}
      />
    );
  } else {
    body = <MicrobrandLauncher onOpenDashboard={goProducts} />;
  }

  return (
    <PrivateAccessGate>
      <AppNav page={page} onNavigate={setPage} />
      {body}
    </PrivateAccessGate>
  );
}
