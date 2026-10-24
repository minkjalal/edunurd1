// Connection: src/index.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Creates the React root and imports the global application stylesheet.
/**
 * EduNerd - React 18 Application Entry Point
 * ===========================================
 * Mounts the root App component using React 18 Concurrent Root API.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
