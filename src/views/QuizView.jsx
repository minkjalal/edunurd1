// Connection: src/views/QuizView.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Runs quiz questions, answer selection, scoring, and review feedback.
/**
 * EduNerd - Stepped Quiz & Examination Runner
 * ============================================
 * Handles live test execution:
 * - Real-time question progress bar
 * - Option selection with immediate feedback animations
 * - Explanatory breakdown and next-question progression
 * - Confetti celebrations on correct answers
 * - Automated score calculations, XP distribution, weak topic logging, and offline pack storage
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { triggerConfettiBurst } from "../utils/confetti";

export default function QuizView() {
  const { activeQuiz, closeQuiz, progress, saveProgress, awardXP, navigateTo, showToast } = useApp();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongTopics, setWrongTopics] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);

  if (!activeQuiz) return null;

  const { examKey, questions } = activeQuiz;
  const currentQ = questions[currentIndex];

  const handleSelectOption = (optIdx, e) => {
    if (hasAnswered) return;
    setSelectedOption(optIdx);
    setHasAnswered(true);

    const isCorrect = optIdx === currentQ[2];
    if (isCorrect) {
      setScore(prev => prev + 1);
      triggerConfettiBurst(e.clientX, e.clientY, 20);
    } else {
      const topic = currentQ[3] || "General";
      setWrongTopics(prev => (prev.includes(topic) ? prev : [...prev, topic]));
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setHasAnswered(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setIsCompleted(true);
    const finalScore = score + (selectedOption === currentQ[2] ? 1 : 0);
    const total = questions.length;
    const ratio = finalScore / total;
    const percentage = Math.round(ratio * 100);

    // Update personal bests
    const bests = { ...(progress.best || {}) };
    if (bests[examKey] == null || percentage > bests[examKey]) {
      bests[examKey] = percentage;
    }

    // Accumulate weak topics
    const existingWeak = progress.weak || [];
    const mergedWeak = [...existingWeak];
    wrongTopics.forEach(t => {
      if (t && !mergedWeak.includes(t)) mergedWeak.push(t);
    });

    const updatedTotalQuestions = (progress.qc || 0) + finalScore;
    const updatedTestsCount = (progress.tc || 0) + 1;
    const updatedPerfectCount = (progress.pf || 0) + (ratio >= 1 ? 1 : 0);

    saveProgress({
      best: bests,
      weak: mergedWeak,
      qc: updatedTotalQuestions,
      tc: updatedTestsCount,
      pf: updatedPerfectCount
    });

    // Award XP
    const earnedXP = finalScore * 10 + 20 + (ratio >= 1 ? 50 : 0);
    awardXP(earnedXP, "test complete");

    if (ratio >= 1) {
      triggerConfettiBurst(window.innerWidth / 2, window.innerHeight / 3, 70);
    }
  };

  const handleSaveOffline = () => {
    const packs = { ...(progress.packs || {}) };
    packs[examKey] = questions;
    saveProgress({ packs });
    setSavedOffline(true);
    showToast("Pack saved for offline practice ✓");
  };

  // ── Results Card ──
  if (isCompleted) {
    const total = questions.length;
    const ratio = score / total;
    const color = ratio >= 1 ? "var(--g)" : ratio >= 0.5 ? "var(--o)" : "var(--r)";
    const statusMsg = ratio >= 1
      ? "All correct! 🌟"
      : ratio >= 0.5
        ? "Good, but keep practising 💪"
        : "Needs work. Revise these topics 📖";

    return (
      <div className="pg">
        <div className="card" style={{ borderColor: color, textAlign: "center" }}>
          <div className="big" style={{ color, fontSize: "44px" }}>{score}/{total}</div>
          <h1>{examKey}</h1>
          <p style={{ color }}>{statusMsg}</p>
          {wrongTopics.length > 0 && (
            <p className="mu">Added to revise: {wrongTopics.join(", ")}</p>
          )}

          <div className="row" style={{ justifyContent: "center", marginTop: "14px", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={closeQuiz}>Back</button>
            <button className="alt" onClick={handleSaveOffline}>
              {savedOffline ? "Saved ✓" : "💾 Save offline"}
            </button>
            <button
              className="alt"
              onClick={() => {
                closeQuiz();
                navigateTo("vid");
              }}
            >
              ▶️ Watch lectures
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Stepped Question Evaluation View ──
  return (
    <div className="pg">
      <div className="card">
        <div className="mu">{examKey} · {currentIndex + 1}/{questions.length}</div>
        <div className="pbar">
          <i
            style={{
              "--a": `${(currentIndex / questions.length) * 100}%`,
              "--b": `${((currentIndex + 1) / questions.length) * 100}%`
            }}
          />
        </div>

        <h1>{currentQ[0]}</h1>

        {/* Options */}
        {currentQ[1].map((optText, optIdx) => {
          let optClass = "opt";
          if (hasAnswered) {
            if (optIdx === currentQ[2]) optClass += " good";
            else if (optIdx === selectedOption) optClass += " bad";
          }

          return (
            <button
              key={optIdx}
              className={optClass}
              disabled={hasAnswered}
              onClick={e => handleSelectOption(optIdx, e)}
            >
              <b>{String.fromCharCode(65 + optIdx)}.</b> {optText}
            </button>
          );
        })}

        {/* Feedback Section */}
        {hasAnswered && (
          <div style={{ marginTop: "14px" }}>
            <p style={{ color: selectedOption === currentQ[2] ? "var(--g)" : "var(--r)", fontWeight: 700 }}>
              {selectedOption === currentQ[2]
                ? "✅ Correct!"
                : `❌ Wrong. Correct answer: ${currentQ[1][currentQ[2]]}`}
            </p>
            <button onClick={handleNext}>
              {currentIndex + 1 < questions.length ? "Next" : "See result"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
