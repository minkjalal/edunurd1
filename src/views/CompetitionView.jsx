/**
 * EduNerd - Competition Zone View
 * ================================
 * Catalog of 35+ Indian competitive entrance exams (JEE, NEET, UPSC, SSC, GATE, Banking).
 * Enables starting mock tests, PYQ simulations, and AI-generated sample papers.
 */

import React, { useEffect, useState } from "react";
import { EXAMS_LIST } from "../constants/exams";
import { makeYouTubeLectureUrl } from "../utils/helpers";
import { useApp } from "../context/AppContext";
import { fisherYatesShuffle } from "../utils/questionGenerator";

export default function CompetitionView() {
  const { progress, startQuiz, showToast, navigateTo } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [customCountInput, setCustomCountInput] = useState("");
  const [preparingTest, setPreparingTest] = useState(false);
  const [selectedClassLevel, setSelectedClassLevel] = useState(10);
  const [selectedCompetitionLevel, setSelectedCompetitionLevel] = useState("Advanced");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-oss-20b");
  const [modelOptions, setModelOptions] = useState([
    { id: "openai/gpt-oss-20b", label: "GPT OSS 20B", available: true },
    { id: "openai/gpt-oss-120b", label: "GPT OSS 120B", available: true },
    { id: "whisper-large-v3", label: "Whisper Large V3 (audio transcription only)", audioOnly: true, available: false }
  ]);
  const [generationError, setGenerationError] = useState("");

  const filteredExams = EXAMS_LIST.filter(e =>
    e.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config").then(response => response.json()).then(config => {
      if (cancelled || !Array.isArray(config.groqModels)) return;
      setModelOptions(config.groqModels);
      const initialModel = config.groqModels.find(option => option.id === config.model && option.available);
      if (initialModel) setSelectedModel(initialModel.id);
      else {
        const availableModel = config.groqModels.find(option => option.available && !option.audioOnly);
        if (availableModel) setSelectedModel(availableModel.id);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleStartExam = async (examName, testKind, classLevelParam, competitionLevelParam) => {
    setPreparingTest(true);
    setGenerationError("");

    let count = questionCount;
    if (customCountInput && !isNaN(parseInt(customCountInput))) {
      count = Math.max(1, Math.min(50, parseInt(customCountInput)));
    }

    // Dynamic parameter resolution
    const classLevel = classLevelParam || progress.grade || 10;
    const competitionLevel = competitionLevelParam || examName || "Advanced";

    try {
      const response = await fetch("/api/generate-paper", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ examName, classLevel, competitionLevel, count, testKind, model: selectedModel })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Paper generation unavailable");
      const questionsList = fisherYatesShuffle(payload.questions.map(q => [q.q, q.o, q.a, q.t || "General"]));
      setPreparingTest(false);
      startQuiz(`${examName} (${testKind.toUpperCase()} · ${payload.model || "Groq AI"})`, questionsList);
    } catch (error) {
      setGenerationError(error.message || "AI generation failed. Please try again.");
      showToast(error.message || "AI paper generation failed. Please try again.");
      setPreparingTest(false);
      return;
    }
  };

  if (selectedExam) {
    const personalBest = progress.best ? progress.best[selectedExam] : null;

    return (
      <div className="pg">
        <button className="alt" onClick={() => setSelectedExam("")}>
          ‹ All exams
        </button>
        <h1 style={{ marginTop: "10px" }}>{selectedExam}</h1>
        <p className="mu">Personal Best: {personalBest != null ? `${personalBest}%` : "-"}</p>

        {/* Question Count Selector */}
        <div className="card">
          {preparingTest && <p className="mu" role="status">Generating {selectedCompetitionLevel.toLowerCase()} {selectedExam} paper with AI…</p>}
          {generationError && <p className="mu" role="status" style={{ color: "var(--er, #f87171)" }}>{generationError}</p>}
          <b>How many questions?</b>
          <div className="row" style={{ marginTop: "8px", flexWrap: "wrap" }}>
            {[5, 10, 20].map(n => (
              <button
                key={n}
                className={questionCount === n && !customCountInput ? "" : "alt"}
                onClick={() => {
                  setQuestionCount(n);
                  setCustomCountInput("");
                }}
              >
                {n}
              </button>
            ))}
            <input
              type="text"
              inputMode="numeric"
              placeholder="Custom (1-50)"
              value={customCountInput}
              onChange={e => setCustomCountInput(e.target.value)}
              style={{ maxWidth: "140px" }}
            />
          </div>
        </div>

        {/* Dynamic Scaling Parameters: Class Level & Competition Level */}
        <div className="card">
          <b>Target Level &amp; Difficulty</b>
          <div className="row" style={{ marginTop: "8px", flexWrap: "wrap", gap: "6px" }}>
            <span className="mu" style={{ fontSize: "12px", width: "100%" }}>Class Level:</span>
            {[8, 9, 10, 11, 12].map(cl => (
              <button
                key={cl}
                className={selectedClassLevel === cl ? "" : "alt"}
                onClick={() => setSelectedClassLevel(cl)}
              >
                Class {cl}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: "10px", flexWrap: "wrap", gap: "6px" }}>
            <span className="mu" style={{ fontSize: "12px", width: "100%" }}>Competition Level:</span>
            {["Foundation", "Intermediate", "Advanced"].map(lvl => (
              <button
                key={lvl}
                className={selectedCompetitionLevel === lvl ? "" : "alt"}
                onClick={() => setSelectedCompetitionLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
          <div style={{ marginTop: "14px" }}>
            <label htmlFor="paper-model" className="mu" style={{ display: "block", fontSize: "12px", marginBottom: "6px" }}>AI model:</label>
            <select
              id="paper-model"
              value={selectedModel}
              onChange={event => setSelectedModel(event.target.value)}
              disabled={preparingTest}
              style={{ width: "100%", maxWidth: "420px", padding: "10px", borderRadius: "12px", border: "1px solid var(--bd)", background: "var(--in)", color: "var(--tx)", font: "inherit" }}
            >
              {modelOptions.map(option => (
                <option key={option.id} value={option.id} disabled={option.audioOnly || !option.available}>
                  {option.label}{option.audioOnly ? " — not for question generation" : !option.available ? " — unavailable for this API key" : ""}
                </option>
              ))}
            </select>
            <p className="mu" style={{ fontSize: "12px", margin: "6px 0 0" }}>Questions follow the selected class and difficulty level.</p>
          </div>
        </div>

        <div className="card">
          <button disabled={preparingTest} onClick={() => handleStartExam(selectedExam, "mock", selectedClassLevel, selectedCompetitionLevel)}>
            📝 Mock test
          </button>{" "}
          <button disabled={preparingTest} onClick={() => navigateTo(`/resources?tab=pyq&exam=${encodeURIComponent(selectedExam)}&class=${selectedClassLevel}&kind=pyq`)}>
            📜 PYQ
          </button>{" "}
          <button className="alt" disabled={preparingTest} onClick={() => navigateTo(`/resources?tab=pyq&exam=${encodeURIComponent(selectedExam)}&class=${selectedClassLevel}&kind=sample`)}>
            📄 Sample paper
          </button>
        </div>

        <h2>Lectures & Videos</h2>
        <div className="card">
          <a
            className="chip"
            href={makeYouTubeLectureUrl(selectedExam + " exam")}
            target="_blank"
            rel="noopener noreferrer"
          >
            ▶️ Search {selectedExam} lectures on YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="pg">
      <h1>Competition zone</h1>
      <p className="mu">{EXAMS_LIST.length} exams supported. Search or pick one to practice.</p>

      <div className="row">
        <input
          type="text"
          placeholder="🔍 Search exams (JEE, NEET, SSC, Bank, GATE…)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div style={{ marginTop: "10px" }}>
        {filteredExams.map(examName => (
          <button
            key={examName}
            className="tile card"
            onClick={() => setSelectedExam(examName)}
          >
            <b>{examName}</b>
            <span className="mu">Mock · PYQ · Sample Papers · Lectures</span>
          </button>
        ))}
        {!filteredExams.length && <div className="mu">No exam found.</div>}
      </div>
    </div>
  );
}
