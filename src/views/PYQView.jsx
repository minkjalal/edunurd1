// Connection: src/views/PYQView.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Renders previous-year question browsing and practice routes.
/**
 * EduNerd - PYQ & Sample Papers View
 * ==================================
 * 10-year official question paper archive generator:
 * - Direct Google queries formatted with 'filetype:pdf'
 * - Board exams: CBSE, ICSE / ISC, State Boards
 * - Competitive exams with generative AI practice tests
 */

import React, { useState } from "react";
import { EXAMS_LIST, PAST_YEARS, getSubjectsByClass } from "../constants/exams";
import { googleSearchUrl, makeYouTubeLectureUrl } from "../utils/helpers";
import { useApp } from "../context/AppContext";
import { generateDynamicQuestions } from "../utils/questionGenerator";

export default function PYQView() {
  const { startQuiz } = useApp();

  const [archiveParams] = useState(() => new URLSearchParams(window.location.hash.split("?")[1] || ""));
  const requestedTopic = archiveParams.get("topic") || "";
  const requestedExam = archiveParams.get("exam") || "";
  const initialClass = Number(archiveParams.get("class")) || 10;
  const topicSuggestsComputerScience = /computer|program|algorithm|coding|software/i.test(requestedTopic);
  const [category, setCategory] = useState(archiveParams.has("exam") ? "exam" : "school"); // 'school' | 'exam'
  const [selectedClass, setSelectedClass] = useState(initialClass);
  const [selectedBoard, setSelectedBoard] = useState("CBSE");
  const [selectedSubject, setSelectedSubject] = useState(topicSuggestsComputerScience ? "Computer Science" : "Maths");
  const [selectedExam, setSelectedExam] = useState(requestedExam);
  const [examSearch, setExamSearch] = useState("");

  const subjects = getSubjectsByClass(selectedClass);
  // Computer Science is not in every school preset, but a generated JEE plan
  // can target it. Keep it selectable so the paper search contains the topic.
  const availableSubjects = topicSuggestsComputerScience && !subjects.includes("Computer Science")
    ? [...subjects, "Computer Science"]
    : subjects;
  const resolvedSubject = availableSubjects.includes(selectedSubject) ? selectedSubject : availableSubjects[0];

  const resolvedTitle = category === "school"
    ? `Class ${selectedClass} ${selectedBoard} ${resolvedSubject}`
    : selectedExam ? `${selectedExam} ${resolvedSubject}` : selectedExam;

  const examKind = selectedClass === 10 || selectedClass === 12 ? "board" : "annual exam";

  const handleStartAITest = (kind) => {
    // Generate dynamic questions scaled by classLevel and competitionLevel
    const dynamicQuestions = generateDynamicQuestions({
      classLevel: selectedClass,
      competitionLevel: category === "exam" ? selectedExam : selectedBoard,
      count: 10,
      subject: resolvedSubject,
      examName: resolvedTitle,
      testKind: kind
    });
    startQuiz(`${resolvedTitle} (${kind.toUpperCase()})`, dynamicQuestions);
  };

  return (
    <div className="pg">
      <h1>PYQ &amp; sample papers</h1>

      {/* Mode Switcher */}
      <div className="row">
        <button
          className={category === "school" ? "" : "alt"}
          onClick={() => { setCategory("school"); setSelectedExam(""); }}
        >
          🎒 Class 9–12
        </button>
        <button
          className={category === "exam" ? "" : "alt"}
          onClick={() => setCategory("exam")}
        >
          🏆 Competitive exams
        </button>
      </div>

      {category === "school" ? (
        <>
          <h2>Select Class</h2>
          <div>
            {[9, 10, 11, 12].map(c => (
              <button
                key={c}
                className={selectedClass === c ? "" : "alt"}
                onClick={() => setSelectedClass(c)}
                style={{ margin: "0 6px 6px 0" }}
              >
                {c}
              </button>
            ))}
          </div>

          <h2>Select Board</h2>
          <div>
            {["CBSE", "ICSE / ISC", "State board"].map(b => (
              <button
                key={b}
                className={selectedBoard === b ? "" : "alt"}
                onClick={() => setSelectedBoard(b)}
                style={{ margin: "0 6px 6px 0" }}
              >
                {b}
              </button>
            ))}
          </div>

          <h2>Select Subject</h2>
          <div>
            {availableSubjects.map(s => (
              <button
                key={s}
                className={resolvedSubject === s ? "" : "alt"}
                onClick={() => setSelectedSubject(s)}
                style={{ margin: "0 6px 6px 0" }}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      ) : !selectedExam ? (
        <div style={{ marginTop: "14px" }}>
          <div className="row">
            <input
              type="text"
              placeholder="🔍 Search competitive exams…"
              value={examSearch}
              onChange={e => setExamSearch(e.target.value)}
            />
          </div>
          <div style={{ marginTop: "10px" }}>
            {EXAMS_LIST.filter(e => e.toLowerCase().includes(examSearch.toLowerCase())).map(exam => (
              <button
                key={exam}
                className="tile card"
                onClick={() => setSelectedExam(exam)}
              >
                <b>{exam}</b>
                <span className="mu">10 years of papers &amp; official PDF links</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button className="alt" onClick={() => setSelectedExam("")} style={{ marginTop: "12px" }}>
          ‹ All exams
        </button>
      )}

      {resolvedTitle && (
        <>
          <h1 style={{ marginTop: "16px" }}>{resolvedTitle}</h1>

          <div className="card">
            <button onClick={() => handleStartAITest("pyq")}>✨ AI PYQ-style practice</button>{" "}
            <button className="alt" onClick={() => handleStartAITest("sample")}>✨ AI sample paper</button>
          </div>

          <h2>Last 10 Years Official Papers</h2>
          <p className="mu">One-click Google search queries targeting official PDF files.</p>
          {PAST_YEARS.map(yr => (
            <div key={yr} className="card">
              <b>{yr} · {resolvedTitle}</b>
              <div style={{ marginTop: "6px" }}>
                <a
                  className="chip"
                  href={googleSearchUrl(`${resolvedTitle} ${yr} ${examKind} question paper filetype:pdf`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📄 PYQ PDF
                </a>
                <a
                  className="chip"
                  href={googleSearchUrl(`${resolvedTitle} ${yr} sample paper filetype:pdf`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📝 Sample paper PDF
                </a>
                <a
                  className="chip"
                  href={googleSearchUrl(`${resolvedTitle} ${yr} answer key marking scheme filetype:pdf`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🔑 Answer key PDF
                </a>
                <a
                  className="chip"
                  href={makeYouTubeLectureUrl(`${resolvedTitle} ${yr} paper solution`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ▶️ Video solution
                </a>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
