// Connection: src/components/Header.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Renders the fixed top bar, navigation trigger, brand, cohort badge, and theme control.
/**
 * EduNerd - Sticky App Header
 * ============================
 * Provides drawer toggle, branding, and light/dark theme switch.
 */

import React from "react";
import BrandLogo from "./BrandLogo";
import { useApp } from "../context/AppContext";

export default function Header() {
  const { mode, userProfile, drawerOpen, setDrawerOpen, theme, setTheme } = useApp();

  if (!mode) return null; // Hidden on Welcome/Auth screen

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const cohort = userProfile?.cohort;

  return (
    <>
      <header id="hd">
        <button
          id="mb"
          aria-label="Open Navigation Drawer"
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          ☰
        </button>
        <b id="hb" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BrandLogo size={28} />
          <span>Edunurd</span>
          {cohort && (
            <span
              className="badge"
              style={{
                fontSize: "10px",
                background: "rgba(168, 85, 247, 0.2)",
                color: "var(--ac2)",
                marginLeft: "6px"
              }}
            >
              {cohort}
            </span>
          )}
        </b>
      </header>

      {/* Floating Theme Button */}
      <button
        id="thb"
        className="alt"
        aria-label="Toggle theme"
        onClick={toggleTheme}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </>
  );
}
