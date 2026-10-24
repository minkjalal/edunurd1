// Connection: src/views/ResourcesView.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Composes videos, PYQs, and resource tabs under one learning destination.
/**
 * Anti Gravity 2.0 - Resources Hub (ResourcesView.jsx)
 * =====================================================
 * Combines:
 * 1. Verified Educational Video Explorer (youtube-nocookie)
 * 2. 10-Year Previous Year Question (PYQ) Archive
 */

import React, { useEffect, useState } from "react";
import VideoResourceExplorer from "../components/VideoResourceExplorer";
import PYQView from "./PYQView";

export default function ResourcesView() {
  const readResourceTab = () => new URLSearchParams(window.location.hash.split("?")[1] || "").get("tab") === "pyq" ? "pyq" : "videos";
  const [activeSubTab, setActiveSubTab] = useState(readResourceTab); // 'videos' | 'pyq'

  useEffect(() => {
    const syncResourceTab = () => setActiveSubTab(readResourceTab());
    window.addEventListener("hashchange", syncResourceTab);
    return () => window.removeEventListener("hashchange", syncResourceTab);
  }, []);

  return (
    <div className="pg">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--bd)"
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className={activeSubTab === "videos" ? "" : "alt"}
            onClick={() => setActiveSubTab("videos")}
          >
            📺 STEM Video Lectures
          </button>
          <button
            className={activeSubTab === "pyq" ? "" : "alt"}
            onClick={() => setActiveSubTab("pyq")}
          >
            📄 10-Year PYQ &amp; Papers
          </button>
        </div>

        <span className="badge" style={{ background: "rgba(168, 85, 247, 0.15)", color: "var(--ac2)" }}>
          Curated Educational Repository
        </span>
      </div>

      {activeSubTab === "videos" ? <VideoResourceExplorer /> : <PYQView />}
    </div>
  );
}
