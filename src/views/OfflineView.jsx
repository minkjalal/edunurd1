// Connection: src/views/OfflineView.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Explains and exposes local-only study capabilities when remote APIs are unavailable.
/**
 * EduNerd - Offline Packs Manager View
 * =====================================
 * Access tests and resources saved locally on this device without network connectivity:
 * - Launch offline quiz sessions
 * - Delete saved test packs
 * - Quick jump to the rich notes editor
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { generateOfflineTutorResponse } from "../utils/offlineTutor";

export default function OfflineView() {
  const { progress, saveProgress, startQuiz, navigateTo } = useApp();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);

  const packs = progress.packs || {};
  const packKeys = Object.keys(packs);

  const handleDeletePack = key => {
    const updated = { ...packs };
    delete updated[key];
    saveProgress({ packs: updated });
  };

  const handleAskOffline = event => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    setAnswer(generateOfflineTutorResponse(trimmed));
  };

  return (
    <div className="pg">
      <h1>Offline</h1>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>🧠 Offline Tutor</h2>
        <p className="mu">
          This tutor runs entirely in your browser. It does not call FastAPI, Groq, Gemini, or any external service.
        </p>
        <form onSubmit={handleAskOffline} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input
            value={question}
            onChange={event => setQuestion(event.target.value)}
            placeholder="Ask about Newton's laws, speed, photosynthesis…"
            aria-label="Offline tutor question"
            maxLength={4096}
            style={{ flex: 1, minWidth: "220px" }}
          />
          <button type="submit">Ask locally</button>
          <button type="button" className="alt" onClick={() => { setQuestion(""); setAnswer(null); }}>
            Clear
          </button>
        </form>
        {answer && (
          <div className="card" role="status" style={{ marginTop: "12px", whiteSpace: "pre-wrap" }}>
            <b>{answer.model_used}</b>
            <div style={{ marginTop: "8px", lineHeight: 1.55 }}>{answer.final_answer}</div>
            <div className="mu" style={{ marginTop: "10px" }}>{answer.audit_explanation}</div>
          </div>
        )}
      </div>
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
