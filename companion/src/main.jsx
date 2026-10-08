import React from "react";
import { AxiomProvider } from "@optiaxiom/react";
import "@optiaxiom/globals/fonts";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AxiomProvider>
      <App />
    </AxiomProvider>
  </React.StrictMode>,
);
