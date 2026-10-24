// Connection: src/views/LibraryView.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Renders saved learning materials and library navigation.
/**
 * =============================================================================
 * EduNerd - Library View (LibraryView.jsx)
 * =============================================================================
 * Curated repository of study resources and interactive learning modules:
 * - Flashcard decks for active recall
 * - Visual learning STEM simulations
 * - Previous Year Question papers (PYQ) & sample mock tests
 * - Curated educational video lectures and reference portals
 *
 * NOTE (Cleanup Compliance):
 * - The Class section, Notes section, and Timer section have been safely removed.
 * - Layout integrity is preserved with zero undefined variable errors.
 * =============================================================================
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { EXAMS_LIST } from "../constants/exams";
import { SIMULATIONS } from "../constants/simulations";
import { FLASHCARD_PRESETS } from "../constants/flashcards";

export default function LibraryView() {
  const { navigateTo } = useApp();
  const [filterQuery, setFilterQuery] = useState("");

  const query = (filterQuery || "").trim().toLowerCase();
  const filteredSims = SIMULATIONS.filter(s => {
    const text = `${s.n || s.title || ""} ${s.s || s.subject || ""} ${s.t || s.desc || ""}`.toLowerCase();
    return text.includes(query);
  });

  return (
    <div className="pg">
      <h1>📚 Study Library</h1>
      <p className="mu">Browse active learning simulations, curated flashcards, and exam resource archives.</p>

      {/* Search Filter */}
      <div className="row" style={{ marginTop: "12px" }}>
        <input
          type="text"
          placeholder="🔍 Search simulations, flashcard topics, or exam banks…"
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)}
        />
      </div>

      {/* 1. Visual Learning Simulations Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
        <h2>🔬 Interactive Simulations ({filteredSims.length})</h2>
        <button className="alt" onClick={() => navigateTo("vl")}>View all</button>
      </div>
      <div className="grid">
        {filteredSims.slice(0, 4).map((sim, idx) => (
          <div key={sim.n || sim.id || idx} className="card">
            <span style={{ fontSize: "28px" }}>{sim.e || sim.icon || "🔬"}</span>
            <b style={{ display: "block", marginTop: "6px" }}>{sim.n || sim.title || "Simulation"}</b>
            <div className="mu" style={{ fontSize: "13px" }}>
              {sim.s || sim.subject || "STEM"} · {sim.t || sim.desc || ""}
            </div>
            <button
              className="alt"
              style={{ marginTop: "10px", width: "100%" }}
              onClick={() => navigateTo("vl")}
            >
              Launch Simulation
            </button>
          </div>
        ))}
      </div>

      {/* 2. Flashcard Decks Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
        <h2>🗂️ Flashcard Decks</h2>
        <button className="alt" onClick={() => navigateTo("fc")}>Open Flashcards</button>
      </div>
      <div className="grid">
        {Object.entries(FLASHCARD_PRESETS).slice(0, 3).map(([subject, cards]) => (
          <div key={subject} className="card">
            <b>{subject} Flashcards</b>
            <div className="mu">{cards.length} high-yield concept cards</div>
            <button
              className="alt"
              style={{ marginTop: "10px", width: "100%" }}
              onClick={() => navigateTo("fc")}
            >
              Practice Deck
            </button>
          </div>
        ))}
      </div>

      {/* 3. Examination Question Archive */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
        <h2>📜 Exam Archives &amp; PYQ</h2>
        <button className="alt" onClick={() => navigateTo("pyq")}>Explore PYQ</button>
      </div>
      <div className="card">
        <p className="mu">Access 10-year official question papers, model answer keys, and dynamic mock tests.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
          {EXAMS_LIST.slice(0, 8).map(exam => (
            <button
              key={exam}
              className="chip"
              onClick={() => navigateTo("comp")}
            >
              🏆 {exam}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Named export alias for testing convenience
export { LibraryView as Library };
