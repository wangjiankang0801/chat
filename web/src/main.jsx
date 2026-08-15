import React from "react";
import { createRoot } from "react-dom/client";
import "./lib/disableZoom.js";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(<App />);