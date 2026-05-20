import React, { useState } from "react";
import Dashboard from "./pages/Dashboard";
import IdeasResearch from "./pages/IdeasResearch";
import TrendScanner from "./pages/TrendScanner";
import Integrations from "./pages/Integrations";
import PrivateAccessGate from "./components/PrivateAccessGate";

export default function App() {
  const [page, setPage] = useState("products");

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
    body = <Integrations onBack={goProducts} />;
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
