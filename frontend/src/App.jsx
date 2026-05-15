import React, { useState } from "react";
import Dashboard from "./pages/Dashboard";
import IdeasResearch from "./pages/IdeasResearch";
import TrendScanner from "./pages/TrendScanner";
import PrivateAccessGate from "./components/PrivateAccessGate";

export default function App() {
  const [page, setPage] = useState("products");

  const goProducts = () => setPage("products");
  const goIdeas = () => setPage("ideas");
  const goTrends = () => setPage("trends");

  let body;
  if (page === "ideas") {
    body = <IdeasResearch onBack={goProducts} onOpenTrends={goTrends} />;
  } else if (page === "trends") {
    body = <TrendScanner onBack={goProducts} onOpenIdeas={goIdeas} />;
  } else {
    body = <Dashboard onOpenIdeas={goIdeas} onOpenTrends={goTrends} />;
  }

  return <PrivateAccessGate>{body}</PrivateAccessGate>;
}
