/**
 * EduNerd - 3D Flashcards & Active Recall View
 * ============================================
 * Features:
 * - 3D CSS perspective card flip animation
 * - Built-in STEM and Polity mastery decks
 * - Spaced repetition review tracking & custom card creation
 * - Generative AI flashcard builder powered by the local FastAPI/Groq proxy
 */

import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { FLASHCARD_PRESETS, FLASHCARD_DECK_NAMES } from "../constants/flashcards";
import { triggerConfettiBurst } from "../utils/confetti";

export default function FlashcardsView() {
  const { progress, saveProgress, awardXP, showToast, pushFlashcards } = useApp();

  const [activeDeck, setActiveDeck] = useState("All");
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Custom card creation state
  const [customQuestion, setCustomQuestion] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");

  // AI generator state
  const [aiTopic, setAiTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const autoGenerateStarted = useRef(false);

  // Compute active deck cards
  const customCards = (progress.fc || []).map(c => Object.assign({ t: "Custom" }, c));
  let deck = [];
  if (activeDeck === "Custom") {
    deck = customCards;
  } else if (activeDeck === "All") {
    Object.keys(FLASHCARD_PRESETS).forEach(k => {
      deck = deck.concat(FLASHCARD_PRESETS[k]);
    });
    deck = deck.concat(customCards);
  } else {
    deck = (FLASHCARD_PRESETS[activeDeck] || []).concat(customCards.filter(c => c.t === activeDeck));
  }

  const safeIndex = cardIndex >= deck.length ? Math.max(0, deck.length - 1) : cardIndex;
  const currentCard = deck[safeIndex] || {
    q: "No cards in this deck yet.",
    a: "Tap '+ Add Custom Card' or '✨ AI Generate' below to add cards!",
    t: "Empty"
  };

  const isMastered = (progress.fcm || []).includes(currentCard.q);

  const handleNext = () => {
    setIsFlipped(false);
    setCardIndex(prev => (prev + 1) % Math.max(1, deck.length));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCardIndex(prev => (prev - 1 + deck.length) % Math.max(1, deck.length));
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setCardIndex(Math.floor(Math.random() * deck.length));
  };

  const handleMastered = e => {
    const masteredList = progress.fcm || [];
    if (!masteredList.includes(currentCard.q)) {
      saveProgress({ fcm: [...masteredList, currentCard.q] });
      awardXP(5, "flashcard mastered");
      showToast("🌟 Mastered card: +5 XP!");
    }
    triggerConfettiBurst(e.clientX, e.clientY, 16);
    handleNext();
  };

  const handleNeedsReview = () => {
    const masteredList = (progress.fcm || []).filter(item => item !== currentCard.q);
    const weakList = progress.weak || [];
    const updatedWeak = currentCard.t && !weakList.includes(currentCard.t)
      ? [...weakList, currentCard.t]
      : weakList;

    saveProgress({ fcm: masteredList, weak: updatedWeak });
    showToast("Flagged for review 📖");
    handleNext();
  };

  const handleAddCustom = () => {
    const q = customQuestion.trim();
    const a = customAnswer.trim();
    if (!q || !a) return showToast("Please fill both Question and Answer!");

    const updatedCustom = [...(progress.fc || []), { q, a, t: "Custom" }];
    saveProgress({ fc: updatedCustom });
    showToast("Flashcard created ✓");
    setCustomQuestion("");
    setCustomAnswer("");
    setActiveDeck("Custom");
    setCardIndex(updatedCustom.length - 1);
  };

  const handleAIGenerate = async (topicOverride = "") => {
    const topic = String(topicOverride || aiTopic).trim();
    if (!topic) return showToast("Please enter a topic to generate cards!");

    setGenerating(true);
    setGenerationError("");
    try {
      const response = await fetch("http://127.0.0.1:8000/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, count: 3 })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || "Could not generate flashcards. Please try again.");

      const newCards = Array.isArray(payload.cards)
        ? payload.cards
          .filter(item => item && item.front && item.back)
          .map(item => ({ ...item, topic }))
        : [];
      if (!newCards.length) throw new Error("Groq did not return any usable flashcards. Please try again.");

      const firstNewCardIndex = (progress.fc || []).length;
      pushFlashcards(newCards);
      setActiveDeck("Custom");
      setCardIndex(firstNewCardIndex);
      setIsFlipped(false);
      setAiTopic("");
      showToast(`Created ${newCards.length} cards for ${topic} ✨`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not generate flashcards. Please try again.";
      setGenerationError(message);
      showToast(message);
    } finally {
      setGenerating(false);
    }
  };

  // Study-plan flashcard links open this view with a topic. Generate the deck
  // immediately so the learner sees new cards instead of an empty generator.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const requestedTopic = (params.get("topic") || "").trim();
    if (params.get("tab") !== "flashcards" || !requestedTopic || autoGenerateStarted.current) return;
    autoGenerateStarted.current = true;
    setAiTopic(requestedTopic);
    handleAIGenerate(requestedTopic);
  }, []);

  return (
    <div className="pg">
      <h1>🗂️ Study Flashcards</h1>
      <p className="mu">Active recall & spaced repetition. Tap the card to flip between question and answer.</p>

      {/* Deck Selector Chips */}
      <div style={{ margin: "10px 0", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {FLASHCARD_DECK_NAMES.map(d => (
          <button
            key={d}
            className="chip"
            style={{ borderColor: activeDeck === d ? "var(--ac2)" : undefined }}
            onClick={() => {
              setActiveDeck(d);
              setCardIndex(0);
              setIsFlipped(false);
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* 3D Flashcard Stage */}
      <div className="card" style={{ marginTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="mu">
            Card {deck.length ? safeIndex + 1 : 0} of {deck.length} ·{" "}
            <b style={{ color: "var(--ac2)" }}>{currentCard.t || "Concept"}</b>
          </span>
          <span
            className="badge"
            style={{
              background: isMastered ? "rgba(34,197,94,0.2)" : "rgba(139,92,246,0.2)",
              color: isMastered ? "var(--g)" : "var(--ac2)"
            }}
          >
            {isMastered ? "✅ Mastered" : "🎯 Learning"}
          </span>
        </div>

        <div className="fc-box">
          <div
            className={`fc-card ${isFlipped ? "flipped" : ""}`}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className="fc-face fc-front">
              <div className="mu" style={{ fontSize: "12px", marginBottom: "8px" }}>
                QUESTION / CONCEPT (Tap to flip)
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", lineHeight: "1.4" }}>
                {currentCard.q}
              </div>
              <div style={{ marginTop: "14px", fontSize: "26px" }}>🔄</div>
            </div>

            <div className="fc-face fc-back">
              <div className="mu" style={{ fontSize: "12px", marginBottom: "8px" }}>
                ANSWER / EXPLANATION (Tap to flip)
              </div>
              <div style={{ fontSize: "18px", fontWeight: "600", color: "var(--tx)", lineHeight: "1.5" }}>
                {currentCard.a}
              </div>
              <div style={{ marginTop: "14px", fontSize: "26px" }}>✨</div>
            </div>
          </div>
        </div>

        {/* Deck Navigation Buttons */}
        <div className="row" style={{ justifyContent: "center", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
          <button className="alt" onClick={handlePrev}>‹ Prev</button>
          <button className="alt" onClick={() => setIsFlipped(!isFlipped)}>🔄 Flip Card</button>
          <button className="alt" onClick={handleNext}>Next ›</button>
          <button className="alt" onClick={handleShuffle}>🎲 Shuffle</button>
        </div>

        {/* Spaced Repetition Grading */}
        <div className="row" style={{ justifyContent: "center", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
          <button className="alt" onClick={handleNeedsReview} style={{ color: "var(--o)" }}>
            ⚠️ Needs Review
          </button>
          <button onClick={handleMastered} style={{ background: "linear-gradient(135deg,var(--g),#15803d)" }}>
            ✅ Got it! (+5 XP)
          </button>
        </div>
      </div>

      {/* Creation & Generation Grid */}
      <h2>Quick Card Actions</h2>
      <div className="grid">
        <div className="card">
          <b>➕ Add Custom Card</b>
          <input
            type="text"
            placeholder="Front: Question or Term"
            value={customQuestion}
            onChange={e => setCustomQuestion(e.target.value)}
            style={{ marginTop: "8px" }}
          />
          <input
            type="text"
            placeholder="Back: Answer or Definition"
            value={customAnswer}
            onChange={e => setCustomAnswer(e.target.value)}
            style={{ marginTop: "6px" }}
          />
          <button onClick={handleAddCustom} style={{ marginTop: "10px", width: "100%" }}>
            Save Card
          </button>
        </div>

        <div className="card">
          <b>✨ AI Flashcard Generator</b>
          <p className="mu" style={{ fontSize: "12px", margin: "4px 0 8px" }}>
            Generate instant recall cards on any topic (e.g. Thermodynamics, Optics, Photosynthesis).
          </p>
          <input
            type="text"
            placeholder="Topic name"
            value={aiTopic}
            onChange={e => {
              setAiTopic(e.target.value);
              if (generationError) setGenerationError("");
            }}
            onKeyDown={e => { if (e.key === "Enter") handleAIGenerate(); }}
            maxLength={200}
            aria-describedby={generationError ? "flashcard-generation-error" : undefined}
          />
          <button
            className="alt"
            disabled={generating}
            onClick={handleAIGenerate}
            style={{ marginTop: "8px", width: "100%" }}
          >
            {generating ? "Generating…" : "✨ Generate Cards"}
          </button>
          {generationError && (
            <p id="flashcard-generation-error" role="alert" style={{ color: "#fca5a5", fontSize: "12px", margin: "8px 0 0" }}>
              {generationError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
