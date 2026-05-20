import React, { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import IdeasResearch from "./pages/IdeasResearch";
import TrendScanner from "./pages/TrendScanner";
import Integrations from "./pages/Integrations";
import PrivateAccessGate from "./components/PrivateAccessGate";

function readOauthFromUrl() {
  if (typeof window === "undefined") return { page: "products", banner: null };
  const params = new URLSearchParams(window.location.search);
  const flag = params.get("etsy_oauth");
  if (!flag) return { page: "products", banner: null };

  const banner =
    flag === "success"
      ? { kind: "success", text: "Etsy connected — tokens stored on the backend." }
      : {
          kind: "error",
          text: `Etsy OAuth failed: ${params.get("reason") || "unknown error"}`
        };

  return { page: "integrations", banner };
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
  } else {
    body = (
      <Dashboard
        onOpenIdeas={goIdeas}
        onOpenTrends={goTrends}
        onOpenIntegrations={goIntegrations}
      />
    );
  }

  return <PrivateAccessGate>{body}</PrivateAccessGate>;
}
