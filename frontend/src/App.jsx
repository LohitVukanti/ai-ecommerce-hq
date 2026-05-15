import React, { useState } from "react";
import Dashboard from "./pages/Dashboard";
import IdeasResearch from "./pages/IdeasResearch";
import PrivateAccessGate from "./components/PrivateAccessGate";

export default function App() {
  const [page, setPage] = useState("products");

  return (
    <PrivateAccessGate>
      {page === "ideas" ? (
        <IdeasResearch onBack={() => setPage("products")} />
      ) : (
        <Dashboard onOpenIdeas={() => setPage("ideas")} />
      )}
    </PrivateAccessGate>
  );
}
