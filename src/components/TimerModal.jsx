/**
 * EduNerd - Timer Completion Modal
 * ================================
 * Congratulatory dialog presented when a study focus session or break interval finishes.
 */

import React from "react";
import { useApp } from "../context/AppContext";

export default function TimerModal() {
  const { timerOverlay, setTimerOverlay } = useApp();

  if (!timerOverlay.open) return null;

  return (
    <div className="ov">
      <div className="card">
        <div style={{ fontSize: "48px" }}>⏰</div>
        <h1>{timerOverlay.title || "Time's up!"}</h1>
        <p className="mu">{timerOverlay.message}</p>
        <button onClick={() => setTimerOverlay({ open: false, title: "", message: "" })}>
          OK, resting 🌿
        </button>
      </div>
    </div>
  );
}
