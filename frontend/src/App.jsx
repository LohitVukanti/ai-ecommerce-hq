import React, { useState } from "react";
import Dashboard from "./pages/Dashboard";
import IdeasResearch from "./pages/IdeasResearch";

export default function App() {
  const [page, setPage] = useState("products");

  if (page === "ideas") {
    return <IdeasResearch onBack={() => setPage("products")} />;
  }

  return <Dashboard onOpenIdeas={() => setPage("ideas")} />;
}
