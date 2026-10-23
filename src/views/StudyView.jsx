/**
 * Anti Gravity 2.0 - Unified Study Hub (StudyView.jsx)
 * ======================================================
 * Combines:
 * 1. AI Epistemic Tutor
 * 2. 3D Active Recall Flashcards
 * 3. Focus Pomodoro Timer
 */

import React, { useState } from "react";
import AITutorView from "./AITutorView";
import FlashcardsView from "./FlashcardsView";
import StudyTimerView from "./StudyTimerView";
import { useApp } from "../context/AppContext";

export default function StudyView() {
  const { progress } = useApp();
  const [subTab, setSubTab] = useState("tutor"); // 'tutor' | 'flashcards' | 'timer'

  return (
    <div className="pg">
      {/* Top Segmented Controller */}
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
            className={subTab === "tutor" ? "" : "alt"}
            onClick={() => setSubTab("tutor")}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            🤖 AI Epistemic Tutor
          </button>
          <button
            className={subTab === "flashcards" ? "" : "alt"}
            onClick={() => setSubTab("flashcards")}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            🗂️ 3D Flashcards
          </button>
          <button
            className={subTab === "timer" ? "" : "alt"}
            onClick={() => setSubTab("timer")}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            ⏱️ Pomodoro Timer
          </button>
        </div>

        <div className="mu" style={{ fontSize: "0.85rem" }}>
          Daily Progress: <b>{progress.min || 0} / {progress.goal || 30} min</b> · {progress.streak || 0}🔥 Streak
        </div>
      </div>

      {/* Sub-view Content */}
      {subTab === "tutor" && <AITutorView />}
      {subTab === "flashcards" && <FlashcardsView />}
      {subTab === "timer" && <StudyTimerView />}
    </div>
  );
}
