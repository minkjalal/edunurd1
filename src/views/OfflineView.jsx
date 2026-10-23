/**
 * EduNerd - Offline Packs Manager View
 * =====================================
 * Access tests and resources saved locally on this device without network connectivity:
 * - Launch offline quiz sessions
 * - Delete saved test packs
 * - Quick jump to the rich notes editor
 */

import React from "react";
import { useApp } from "../context/AppContext";

export default function OfflineView() {
  const { progress, saveProgress, startQuiz, navigateTo } = useApp();

  const packs = progress.packs || {};
  const packKeys = Object.keys(packs);

  const handleDeletePack = key => {
    const updated = { ...packs };
    delete updated[key];
    saveProgress({ packs: updated });
  };

  return (
    <div className="pg">
      <h1>Offline</h1>
      <div className="card">
        <b>Videos cannot be stored directly inside this browser</b>
        <p className="mu">
          Standard web browsers cannot download complete YouTube or external app video files. Use the native download button in YouTube, Physics Wallah, or Unacademy. You can save question packs and notes here for offline practice.
        </p>
      </div>

      <h2>Saved Question Packs</h2>
      {packKeys.length > 0 ? (
        packKeys.map(name => (
          <div key={name} className="card row" style={{ justifyContent: "space-between" }}>
            <div>
              <b>{name}</b>
              <div className="mu">{packs[name].length} questions</div>
            </div>
            <span>
              <button onClick={() => startQuiz(name, packs[name])}>Practice</button>{" "}
              <button className="alt" onClick={() => handleDeletePack(name)}>✕</button>
            </span>
          </div>
        ))
      ) : (
        <div className="card mu">
          No packs saved yet. Complete a test in Competition or Class zone and tap “Save offline”.
        </div>
      )}

      <h2>Saved Notes</h2>
      <div className="card">
        <button className="alt" onClick={() => navigateTo("notes")}>
          Open notes editor
        </button>
      </div>
    </div>
  );
}
