/**
 * EduNerd - Navigation Drawer Component
 * =====================================
 * Slide-out navigation sidebar supporting all app modules and session termination.
 */

import React from "react";
import BrandLogo from "./BrandLogo";
import { MENU_ITEMS } from "../constants/navigation";
import { useApp } from "../context/AppContext";

export default function NavigationDrawer() {
  const { mode, currentRoute, drawerOpen, setDrawerOpen, navigateTo, signOut } = useApp();

  if (!mode) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        id="sh"
        className={drawerOpen ? "open" : ""}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer Panel */}
      <aside id="dr" className={drawerOpen ? "open" : ""}>
        <h1 style={{ padding: "0 12px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <BrandLogo size={30} />
          <span>Edunurd</span>
        </h1>

        {MENU_ITEMS.map((item, idx) => (
          <button
            key={item.id}
            className={currentRoute === item.id ? "on" : ""}
            onClick={() => navigateTo(item.id)}
            style={{ "--n": idx }}
          >
            {item.image ? (
              <img
                src={item.image}
                alt=""
                aria-hidden="true"
                width="22"
                height="22"
                style={{ verticalAlign: "middle", objectFit: "contain", borderRadius: "4px" }}
              />
            ) : (
              <span>{item.icon}</span>
            )} &nbsp;
            <span>{item.label}</span>
          </button>
        ))}

        <button
          onClick={signOut}
          style={{ color: "var(--r)", marginTop: "14px" }}
        >
          <span>🚪</span> &nbsp;
          <span>{mode === "cloud" ? "Sign out" : "Exit guest"}</span>
        </button>
      </aside>
    </>
  );
}
