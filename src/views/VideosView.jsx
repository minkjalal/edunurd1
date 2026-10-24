// Connection: src/views/VideosView.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Renders focused video learning activities and playback destinations.
/**
 * EduNerd - Video Lectures & Education Apps View
 * ==============================================
 * Connects learners with YouTube lecture searches and external learning platforms:
 * - Real-time query generator
 * - Priority listing for user's identified weak topics
 * - Curated app shortcuts (PW, Unacademy, Khan Academy, NPTEL)
 */

import React, { useState } from "react";
import { APPS } from "../constants/platforms";
import { EXAMS_LIST } from "../constants/exams";
import { makeYouTubeLectureUrl } from "../utils/helpers";
import { useApp } from "../context/AppContext";

export default function VideosView() {
  const { progress } = useApp();
  const [searchTopic, setSearchTopic] = useState("");

  const weakTopics = progress.weak ? progress.weak.slice(-6) : [];

  return (
    <div className="pg">
      <h1>Video lectures</h1>
      <p className="mu">Search any topic or exam to discover curated YouTube lectures and education app resources.</p>

      <div className="row">
        <input
          type="text"
          placeholder="🔍 e.g. Thermodynamics, Organic Chemistry, SSC CGL Maths"
          value={searchTopic}
          onChange={e => setSearchTopic(e.target.value)}
        />
      </div>

      <div className="card" style={{ marginTop: "10px" }}>
        {searchTopic.trim() ? (
          <div>
            <b>{searchTopic}</b>
            <div style={{ marginTop: "8px" }}>
              <a
                className="chip"
                href={makeYouTubeLectureUrl(searchTopic)}
                target="_blank"
                rel="noopener noreferrer"
              >
                ▶️ Watch lectures on YouTube
              </a>
              <a
                className="chip"
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(searchTopic + " full course playlist")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                📺 Full course playlist
              </a>
            </div>
          </div>
        ) : (
          <div className="mu">Type a topic above to view instant lecture links.</div>
        )}
      </div>

      <h2>Recommended Platforms</h2>
      <div className="card">
        {APPS.map(app => (
          <a
            key={app.name}
            className="chip"
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {app.name}
          </a>
        ))}
      </div>

      {weakTopics.length > 0 && (
        <>
          <h2>Your Weak Topics</h2>
          {weakTopics.map(topic => (
            <div key={topic} className="card">
              <b>{topic}</b>
              <div style={{ marginTop: "6px" }}>
                <a
                  className="chip"
                  href={makeYouTubeLectureUrl(topic)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ▶️ Watch lectures
                </a>
              </div>
            </div>
          ))}
        </>
      )}

      <h2>Competitive Exams Directory</h2>
      {EXAMS_LIST.map(exam => (
        <details key={exam} className="card">
          <summary><b>{exam}</b></summary>
          <div style={{ marginTop: "8px" }}>
            <a
              className="chip"
              href={makeYouTubeLectureUrl(exam + " exam")}
              target="_blank"
              rel="noopener noreferrer"
            >
              ▶️ {exam} lectures
            </a>
          </div>
        </details>
      ))}
    </div>
  );
}
