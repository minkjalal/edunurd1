// Connection: src/views/ClassZoneView.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Presents class-specific subjects, exams, and generated practice activities.
/**
 * EduNerd - Class Zone View (Grades 1 to 12)
 * ==========================================
 * Curricula coverage from Class 1 through Class 12 across:
 * - Mathematics, Science, Social Science, Languages
 * - Senior secondary streams: Physics, Chemistry, Biology, Economics, Accountancy
 */

import React, { useState } from "react";
import { getSubjectsByClass, EXAM_PRESETS } from "../constants/exams";
import { makeYouTubeLectureUrl } from "../utils/helpers";
import { useApp } from "../context/AppContext";
import { generateDynamicQuestions } from "../utils/questionGenerator";

export default function ClassZoneView() {
  const { startQuiz } = useApp();

  const [activeGrade, setActiveGrade] = useState(10);
  const [activeSubject, setActiveSubject] = useState("Maths");
  const [questionCount, setQuestionCount] = useState(10);
  const [customCount, setCustomCount] = useState("");

  const subjects = getSubjectsByClass(activeGrade);
  const resolvedSubject = subjects.includes(activeSubject) ? activeSubject : subjects[0];
  const topicLabel = `Class ${activeGrade} ${resolvedSubject}`;

  const handleStartPractice = () => {
    let count = questionCount;
    if (customCount && !isNaN(parseInt(customCount))) {
      count = Math.max(1, Math.min(50, parseInt(customCount)));
    }

    // Dynamic question generation scaled by classLevel and subject
    const dynamicQuestions = generateDynamicQuestions({
      classLevel: activeGrade,
      competitionLevel: "School",
      count,
      subject: resolvedSubject
    });

    startQuiz(topicLabel, dynamicQuestions);
  };

  return (
    <div className="pg">
      <h1>Class zone</h1>
      <p className="mu">Class 1 to 12. Pick your grade, then choose a subject.</p>

      {/* Grade Selector Grid */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => (
          <button
            key={grade}
            className={activeGrade === grade ? "" : "alt"}
            onClick={() => {
              setActiveGrade(grade);
              setActiveSubject(getSubjectsByClass(grade)[0]);
            }}
          >
            {grade}
          </button>
        ))}
      </div>

      <h2>Class {activeGrade} subjects</h2>
      <div>
        {subjects.map(sub => (
          <button
            key={sub}
            className={resolvedSubject === sub ? "" : "alt"}
            onClick={() => setActiveSubject(sub)}
            style={{ margin: "0 6px 6px 0" }}
          >
            {sub}
          </button>
        ))}
      </div>

      <h2>{topicLabel}</h2>

      {/* Question Count Selector */}
      <div className="card">
        <b>How many questions?</b>
        <div className="row" style={{ marginTop: "8px", flexWrap: "wrap" }}>
          {[5, 10, 20].map(n => (
            <button
              key={n}
              className={questionCount === n && !customCount ? "" : "alt"}
              onClick={() => {
                setQuestionCount(n);
                setCustomCount("");
              }}
            >
              {n}
            </button>
          ))}
          <input
            type="text"
            inputMode="numeric"
            placeholder="Custom (1-50)"
            value={customCount}
            onChange={e => setCustomCount(e.target.value)}
            style={{ maxWidth: "140px" }}
          />
        </div>
      </div>

      <div className="card">
        <button onClick={handleStartPractice}>📝 Practice questions</button>
      </div>

      <div className="card">
        <b>Videos &amp; Lectures</b>
        <div style={{ marginTop: "6px" }}>
          <a
            className="chip"
            href={makeYouTubeLectureUrl(topicLabel)}
            target="_blank"
            rel="noopener noreferrer"
          >
            ▶️ Watch {topicLabel} lectures on YouTube
          </a>
        </div>
      </div>
    </div>
  );
}
