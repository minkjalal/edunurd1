/**
 * Anti Gravity 2.0 - Unified High-Density Cockpit (DashboardView.jsx)
 * ===================================================================
 * Features:
 * 1. Responsive 3-Column Layout (eliminating vertical stacking sprawl)
 * 2. Dynamic Gemini Flash Study Plan (fetched from /api/study-plan on mount)
 * 3. Fully wired Quick Notes & Scratchpad (synced with AppContext)
 * 4. Interactive Weak Topics Tracker (add/remove chips with animated tags)
 * 5. Visual Learning & Epistemic AI Tutor Quick Launches
 * 6. Daily Goal Circular Progress Gauge & Streak Counter
 */

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { calculateLevel, calculateLevelProgress, formatYMD, getAvatarColor } from "../utils/helpers";

const API_BASE = "http://localhost:8000";

// Fallback study plans if backend is initializing or network is unavailable
const DEFAULT_STUDY_PLANS = {
  Junior: [
    { time: "15 mins", topic: "Solar System", task: "Interactive Planet Orbit Simulator & Gravity Observation", pedagogy: "Flipped Classroom" },
    { time: "20 mins", topic: "Basic Fractions", task: "Visual Pizza Slicing Math Challenge & Self-Check", pedagogy: "Active Recall" },
    { time: "10 mins", topic: "Plant Biology", task: "Explain Photosynthesis to the AI Robot Tutor", pedagogy: "The Protégé Effect" }
  ],
  Teen: [
    { time: "20 mins", topic: "Thermodynamics", task: "First-Principles Derivation of Carnot Cycle Efficiency", pedagogy: "Feynman Technique" },
    { time: "30 mins", topic: "Calculus", task: "Solve 5 High-Yield Previous Year Integration Problems", pedagogy: "Active Recall" },
    { time: "15 mins", topic: "Electromagnetism", task: "Isolate & Eliminate single biggest doubt on Lenz's Law", pedagogy: "The Muddiest Point" }
  ],
  Senior: [
    { time: "25 mins", topic: "Quantum Mechanics", task: "Hermitian Operators & Wavefunction Collapse Rigorous Derivation", pedagogy: "Feynman Technique" },
    { time: "30 mins", topic: "Organic Synthesis", task: "Stereospecific Retrosynthetic Analysis & Mechanism Audit", pedagogy: "Active Recall" },
    { time: "20 mins", topic: "Advanced Physics", task: "Epistemic Debate: Boundary Conditions in Noether Symmetries", pedagogy: "Think-Pair-Share" }
  ]
};

export default function DashboardView() {
  const {
    userProfile,
    ageCohort,
    mode,
    progress,
    saveProgress,
    checkDailyGoal,
    navigateTo,
    syncStatus,
    weakTopics,
    addWeakTopic,
    removeWeakTopic,
    notes,
    updateNotes,
    student_accuracy_score,
    globalLeaderboard
  } = useApp();

  const [newTopicInput, setNewTopicInput] = useState("");
  const [studyPlan, setStudyPlan] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planSource, setPlanSource] = useState("fetching"); // "gemini" | "local" | "fetching"

  const todayStr = formatYMD(new Date());
  const dailyGoal = progress?.goal || 30;
  const currentMinutes = progress?.min || 0;
  const progressRatio = Math.min(1, currentMinutes / Math.max(1, dailyGoal));
  const circumference = 2 * Math.PI * 45;

  // Fallback demo leaderboard if context or cloud is initializing
  const demoLeaderboard = [
    { id: 1, name: "Alex P.", xp: 14250, level: 42, streak: 28 },
    { id: 2, name: "Sarah W.", xp: 13800, level: 39, streak: 21 },
    { id: 3, name: "Rohan_JEE", xp: 12450, level: 35, streak: 18 },
    { id: 4, name: "Dr_Elena", xp: 11900, level: 34, streak: 40 },
    { id: 5, name: "Ananya", xp: 10850, level: 31, streak: 25 }
  ];
  const resolvedLeaderboard = (globalLeaderboard && globalLeaderboard.length > 0)
    ? globalLeaderboard
    : demoLeaderboard;

  // Mini-calendar date setup
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // ── 1. Fetch Dynamic Study Plan from Backend (Gemini Flash) ──
  const fetchStudyPlan = useCallback(async () => {
    setLoadingPlan(true);
    const resolvedCohort = ageCohort || "Teen";
    const currentStreak = progress?.streak || 1;
    const currentWeak = weakTopics && weakTopics.length ? weakTopics : (progress?.weak || []);

    try {
      // Primary: POST /api/study-plan
      const response = await fetch(`${API_BASE}/api/study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age_cohort: resolvedCohort,
          streak: currentStreak,
          weak_topics: currentWeak
        })
      });

      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.study_plan;
        if (items && items.length > 0) {
          setStudyPlan(items);
          setPlanSource("gemini");
          setLoadingPlan(false);
          return;
        }
      }

      // Secondary Fallback: GET /api/study-plan
      const getRes = await fetch(
        `${API_BASE}/api/study-plan?cohort=${encodeURIComponent(resolvedCohort)}&streak=${currentStreak}&weak=${encodeURIComponent(currentWeak.join(","))}`
      );
      if (getRes.ok) {
        const getData = await getRes.json();
        const getItems = Array.isArray(getData) ? getData : getData.study_plan;
        if (getItems && getItems.length > 0) {
          setStudyPlan(getItems);
          setPlanSource("gemini");
          setLoadingPlan(false);
          return;
        }
      }
    } catch (err) {
      console.warn("[DashboardView] Backend study plan fetch error, using cohort fallback:", err);
    }

    // Deterministic cohort-based fallback
    const fallbackList = DEFAULT_STUDY_PLANS[resolvedCohort] || DEFAULT_STUDY_PLANS.Teen;
    setStudyPlan(fallbackList);
    setPlanSource("local");
    setLoadingPlan(false);
  }, [ageCohort, progress?.streak, progress?.weak, weakTopics]);

  useEffect(() => {
    fetchStudyPlan();
  }, [fetchStudyPlan]);

  // ── 2. Handlers ──
  const handleAddStudyTime = () => {
    const updated = currentMinutes + 10;
    if (checkDailyGoal) checkDailyGoal(updated);
    saveProgress({ min: updated });
  };

  const handleAddTopicSubmit = (e) => {
    e.preventDefault();
    const trimmed = newTopicInput.trim();
    if (!trimmed) return;
    if (addWeakTopic) {
      addWeakTopic(trimmed);
    } else {
      const current = progress.weak || [];
      if (!current.includes(trimmed)) {
        saveProgress({ weak: [...current, trimmed] });
      }
    }
    setNewTopicInput("");
  };

  const handleRemoveTopic = (t) => {
    if (removeWeakTopic) {
      removeWeakTopic(t);
    } else {
      const current = progress.weak || [];
      saveProgress({ weak: current.filter(x => x !== t) });
    }
  };

  const resolvedName = userProfile?.username || progress?.name || "Scholar";
  const userCohort = ageCohort || userProfile?.cohort || "Teen";
  const userLevel = calculateLevel(progress?.xp || 0);
  const levelProgress = calculateLevelProgress(progress?.xp || 0);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "4px 8px 32px" }}>
      
      {/* ── TOP HERO BAR: Profile & At-a-Glance Metrics ── */}
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px",
          padding: "16px 20px",
          marginBottom: "16px",
          background: "linear-gradient(135deg, rgba(29, 16, 56, 0.75), rgba(19, 19, 28, 0.85))",
          border: "1px solid rgba(139, 92, 246, 0.35)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #8b5cf6, #22d3ee)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              boxShadow: "0 0 16px rgba(139, 92, 246, 0.5)"
            }}
          >
            🎓
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700 }}>
                Welcome back, {resolvedName}!
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: userCohort === "Junior" ? "rgba(34, 197, 94, 0.2)" : userCohort === "Senior" ? "rgba(139, 92, 246, 0.25)" : "rgba(34, 211, 238, 0.2)",
                  color: userCohort === "Junior" ? "#4ade80" : userCohort === "Senior" ? "#c084fc" : "#22d3ee",
                  border: `1px solid ${userCohort === "Junior" ? "#22c55e" : userCohort === "Senior" ? "#8b5cf6" : "#06b6d4"}`
                }}
              >
                Cohort: {userCohort}
              </span>
            </div>
            <div className="mu" style={{ fontSize: "13px", marginTop: "2px" }}>
              {mode === "cloud" ? "☁️ Cloud Synced" : "⚡ Local Session"} · Dual-Agent Epistemic Verification Active
              {syncStatus && <span style={{ color: "var(--o)", marginLeft: "8px" }}>⚠️ {syncStatus}</span>}
            </div>
          </div>
        </div>

        {/* Quick Stat Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          {/* Streak */}
          <div style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", padding: "6px 14px", borderRadius: "12px", border: "1px solid var(--bd)" }}>
            <div style={{ fontSize: "11px", color: "var(--mu)", textTransform: "uppercase", fontWeight: 600 }}>Streak</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f59e0b" }}>{progress?.streak || 1} 🔥</div>
          </div>

          {/* Level & XP */}
          <div style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", padding: "6px 14px", borderRadius: "12px", border: "1px solid var(--bd)" }}>
            <div style={{ fontSize: "11px", color: "var(--mu)", textTransform: "uppercase", fontWeight: 600 }}>Level {userLevel}</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#a855f7" }}>{progress?.xp || 0} XP</div>
          </div>

          {/* Epistemic Accuracy */}
          <div style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", padding: "6px 14px", borderRadius: "12px", border: "1px solid var(--bd)" }}>
            <div style={{ fontSize: "11px", color: "var(--mu)", textTransform: "uppercase", fontWeight: 600 }}>Accuracy</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#22c55e" }}>{student_accuracy_score || 85}%</div>
          </div>
        </div>
      </div>

      {/* ── 3-COLUMN RESPONSIVE COCKPIT GRID ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "16px",
          alignItems: "start"
        }}
      >

        {/* ═════════════════════════════════════════════════════════════
            COLUMN 1: ACTION TILES, LEVEL REWARDS & SHORTCUTS
            ═════════════════════════════════════════════════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          
          {/* AI Epistemic Tutor Launch Card */}
          <button
            className="tile"
            onClick={() => navigateTo("/study")}
            style={{
              padding: "16px",
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.22), rgba(34, 211, 238, 0.15))",
              border: "1px solid rgba(139, 92, 246, 0.4)",
              borderRadius: "16px",
              display: "flex",
              gap: "14px",
              alignItems: "center",
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(139, 92, 246, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                flexShrink: 0
              }}
            >
              🤖
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: "16px", color: "var(--tx)" }}>Epistemic AI Tutor</b>
                <span style={{ fontSize: "11px", background: "rgba(139, 92, 246, 0.3)", padding: "2px 6px", borderRadius: "6px", color: "#c084fc" }}>
                  Dual-Agent
                </span>
              </div>
              <div className="mu" style={{ fontSize: "13px", marginTop: "2px", lineHeight: "1.3" }}>
                Zero-tolerance verification, Socratic questioning & 3D flashcards
              </div>
            </div>
          </button>

          {/* Visual Learning Launch Card */}
          <button
            className="tile"
            onClick={() => navigateTo("/vl")}
            style={{
              padding: "16px",
              background: "linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(16, 185, 129, 0.15))",
              border: "1px solid rgba(34, 211, 238, 0.35)",
              borderRadius: "16px",
              display: "flex",
              gap: "14px",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(34, 211, 238, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                flexShrink: 0
              }}
            >
              🔬
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: "16px", color: "var(--tx)" }}>Visual Learning Hub</b>
                <span style={{ fontSize: "11px", background: "rgba(34, 211, 238, 0.25)", padding: "2px 6px", borderRadius: "6px", color: "#22d3ee" }}>
                  11 Sims
                </span>
              </div>
              <div className="mu" style={{ fontSize: "13px", marginTop: "2px", lineHeight: "1.3" }}>
                Interactive STEM simulations for Physics, Math, Chemistry & Biology
              </div>
            </div>
          </button>

          {/* Level Progress & Rewards Card */}
          <div
            className="card"
            style={{
              padding: "16px",
              margin: 0,
              cursor: "pointer"
            }}
            onClick={() => navigateTo("/rewards")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>🎖️</span>
                <b style={{ fontSize: "15px" }}>Level {userLevel} Scholar</b>
              </div>
              <span className="mu" style={{ fontSize: "12px", color: "#a855f7" }}>
                {levelProgress}% to Level {userLevel + 1}
              </span>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "8px",
                overflow: "hidden",
                margin: "8px 0"
              }}
            >
              <div
                style={{
                  width: `${levelProgress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #8b5cf6, #22d3ee)",
                  borderRadius: "8px",
                  transition: "width 0.4s ease"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span className="mu">{progress?.xp || 0} XP earned</span>
              <span style={{ color: "var(--ac2)", fontWeight: 600 }}>View Leaderboard →</span>
            </div>
          </div>

          {/* Today's Focus Gauge & Quick Actions */}
          <div className="card" style={{ padding: "16px", margin: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <b style={{ fontSize: "15px" }}>Daily Study Focus</b>
              <button
                onClick={handleAddStudyTime}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "8px",
                  background: "rgba(34, 211, 238, 0.15)",
                  color: "var(--ac2)",
                  border: "1px solid rgba(34, 211, 238, 0.3)",
                  cursor: "pointer"
                }}
              >
                +10 min Log
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <svg style={{ width: "76px", height: "76px", flexShrink: 0 }} viewBox="0 0 110 110">
                <g transform="rotate(-90 55 55)">
                  <circle cx="55" cy="55" r="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                  <circle
                    cx="55"
                    cy="55"
                    r="45"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progressRatio)}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                  />
                </g>
              </svg>
              <div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                  {currentMinutes} / {dailyGoal} min
                </div>
                <div className="mu" style={{ fontSize: "12px", marginTop: "2px" }}>
                  {progressRatio >= 1 ? "🎯 Daily goal achieved! Masterclass!" : `${Math.max(0, dailyGoal - currentMinutes)} min remaining today`}
                </div>
              </div>
            </div>

            {/* Fast Navigation Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "14px" }}>
              <button
                className="tile"
                onClick={() => navigateTo("/community")}
                style={{ padding: "10px", textAlign: "center", borderRadius: "10px" }}
              >
                <div style={{ fontSize: "18px" }}>💬</div>
                <b style={{ fontSize: "12px", marginTop: "2px" }}>Cohort Chat</b>
              </button>
              <button
                className="tile"
                onClick={() => navigateTo("/resources")}
                style={{ padding: "10px", textAlign: "center", borderRadius: "10px" }}
              >
                <div style={{ fontSize: "18px" }}>📺</div>
                <b style={{ fontSize: "12px", marginTop: "2px" }}>Videos & PYQ</b>
              </button>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            COLUMN 2: DYNAMIC GEMINI FLASH STUDY PLAN & NOTES
            ═════════════════════════════════════════════════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          
          {/* Dynamic AI Study Plan Card */}
          <div
            className="card"
            style={{
              padding: "18px",
              margin: 0,
              background: "var(--card)",
              border: "1px solid var(--bd)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>⚡</span>
                <b style={{ fontSize: "16px" }}>Today's AI Study Plan</b>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: planSource === "gemini" ? "rgba(34, 197, 94, 0.2)" : "rgba(245, 158, 11, 0.2)",
                    color: planSource === "gemini" ? "#4ade80" : "#fbbf24"
                  }}
                >
                  {loadingPlan ? "GENERATING..." : planSource === "gemini" ? "GEMINI FLASH" : "OFFLINE PLAN"}
                </span>

                <button
                  onClick={fetchStudyPlan}
                  disabled={loadingPlan}
                  title="Regenerate Plan with Gemini Flash"
                  style={{
                    background: "none",
                    border: "1px solid var(--bd)",
                    color: "var(--tx)",
                    borderRadius: "8px",
                    padding: "3px 8px",
                    fontSize: "12px",
                    cursor: loadingPlan ? "not-allowed" : "pointer"
                  }}
                >
                  {loadingPlan ? "⏳" : "🔄"}
                </button>
              </div>
            </div>

            {/* Study Plan Cards List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {studyPlan.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    transition: "border-color 0.2s, transform 0.15s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: "rgba(139, 92, 246, 0.2)",
                          color: "#c084fc",
                          border: "1px solid rgba(139, 92, 246, 0.3)"
                        }}
                      >
                        ⏱️ {item.time}
                      </span>
                      <b style={{ fontSize: "14px", color: "var(--tx)" }}>{item.topic}</b>
                    </div>

                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--ac2)",
                        background: "rgba(34, 211, 238, 0.12)",
                        padding: "2px 7px",
                        borderRadius: "6px"
                      }}
                    >
                      {item.pedagogy || "Feynman"}
                    </span>
                  </div>

                  <div style={{ fontSize: "13px", color: "var(--tx)", opacity: 0.9, lineHeight: "1.4" }}>
                    {item.task}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "12px", textAlign: "right" }}>
              <button
                onClick={() => navigateTo("/study")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ac2)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0
                }}
              >
                Launch Study Session with this plan →
              </button>
            </div>
          </div>

          {/* Quick Notes Scratchpad (Fully Wired) */}
          <div
            className="card"
            style={{
              padding: "18px",
              margin: 0,
              background: "var(--card)",
              border: "1px solid var(--bd)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>📝</span>
                <b style={{ fontSize: "15px" }}>Study Notes & Scratchpad</b>
              </div>
              <span className="mu" style={{ fontSize: "11px" }}>
                Auto-saved
              </span>
            </div>

            <textarea
              value={notes || ""}
              onChange={e => updateNotes ? updateNotes(e.target.value) : saveProgress({ notes: e.target.value })}
              placeholder="Jot down formulas, breakthrough insights, or questions to ask the AI Tutor..."
              style={{
                width: "100%",
                minHeight: "120px",
                maxHeight: "220px",
                padding: "10px 12px",
                borderRadius: "10px",
                background: "rgba(0,0,0,0.25)",
                color: "var(--tx)",
                border: "1px solid var(--bd)",
                fontFamily: "inherit",
                fontSize: "13.5px",
                lineHeight: "1.5",
                resize: "vertical"
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <span className="mu" style={{ fontSize: "11px" }}>
                {(notes || "").length} characters
              </span>
              {(notes || "").length > 0 && (
                <button
                  onClick={() => updateNotes ? updateNotes("") : saveProgress({ notes: "" })}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--mu)",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  Clear Notes
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            COLUMN 3: IDENTIFIED WEAK TOPICS & MINI CALENDAR
            ═════════════════════════════════════════════════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          
          {/* Identified Weak Topics Tracker (Fully Wired Chips) */}
          <div
            className="card"
            style={{
              padding: "18px",
              margin: 0,
              background: "var(--card)",
              border: "1px solid var(--bd)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>🎯</span>
                <b style={{ fontSize: "15px" }}>Identified Weak Topics</b>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 7px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#f87171",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  fontWeight: 700
                }}
              >
                {(weakTopics || progress?.weak || []).length} Flagged
              </span>
            </div>

            <div className="mu" style={{ fontSize: "12px", marginBottom: "12px", lineHeight: "1.3" }}>
              Feed these topics directly into Gemini Flash for targeted drills:
            </div>

            {/* Interactive Chip List */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", minHeight: "48px", marginBottom: "14px" }}>
              {(weakTopics || progress?.weak || []).length === 0 ? (
                <div className="mu" style={{ fontSize: "12px", fontStyle: "italic", padding: "6px 0" }}>
                  No weak topics flagged yet. Add below or take AI quizzes!
                </div>
              ) : (
                (weakTopics || progress?.weak || []).map((t, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "14px",
                      background: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: "#fca5a5",
                      fontSize: "12px",
                      fontWeight: 500
                    }}
                  >
                    <span>{t}</span>
                    <button
                      onClick={() => handleRemoveTopic(t)}
                      title={`Remove ${t}`}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#fca5a5",
                        cursor: "pointer",
                        padding: "0 2px",
                        fontSize: "13px",
                        lineHeight: 1,
                        opacity: 0.8
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "0.8"}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Add Weak Topic Input */}
            <form onSubmit={handleAddTopicSubmit} style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="e.g. Electromagnetism, Redox"
                value={newTopicInput}
                onChange={e => setNewTopicInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid var(--bd)",
                  color: "var(--tx)",
                  fontSize: "13px"
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "var(--ac)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                Add
              </button>
            </form>
          </div>

          {/* Mini Calendar Schedule Card */}
          <div
            className="card"
            style={{
              padding: "18px",
              margin: 0,
              background: "var(--card)",
              border: "1px solid var(--bd)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>📅</span>
                <b style={{ fontSize: "15px" }}>
                  {new Date(year, month, 1).toLocaleString("default", { month: "long" })} {year}
                </b>
              </div>
              <button
                onClick={() => navigateTo("/calendar")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ac2)",
                  fontSize: "12px",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                Full Calendar →
              </button>
            </div>

            <div className="cal" style={{ gap: "2px" }}>
              {["S", "M", "T", "W", "T", "F", "S"].map(d => (
                <b key={d} style={{ fontSize: "11px", color: "var(--mu)", padding: "2px 0" }}>{d}</b>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <i key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${year}-${month + 1}-${dayNum}`;
                const hasEvent = progress?.ev && progress.ev[dateKey];
                const isToday = dateKey === todayStr;

                return (
                  <button
                    key={dateKey}
                    className={`day ${hasEvent ? "has" : ""} ${isToday ? "td" : ""}`}
                    style={{
                      padding: "6px 0",
                      fontSize: "12px",
                      borderRadius: "6px"
                    }}
                    onClick={() => navigateTo("/calendar")}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════
              GLOBAL LEADERBOARD CARD (PHASE 2)
              ═════════════════════════════════════════════════════════════ */}
          <div
            className="card"
            style={{
              padding: "18px",
              margin: 0,
              background: "var(--card)",
              border: "1px solid var(--bd)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>🏆</span>
                <b style={{ fontSize: "15px" }}>Global Leaderboard</b>
              </div>
              <button
                onClick={() => navigateTo("/rewards")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ac2)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0
                }}
              >
                View Full Standings →
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {resolvedLeaderboard.slice(0, 5).map((user, idx) => {
                const rank = idx + 1;
                const isTop1 = rank === 1;
                const isTop2 = rank === 2;
                const isTop3 = rank === 3;
                const medal = isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : `#${rank}`;
                const rankColor = isTop1 ? "#fbbf24" : isTop2 ? "#e2e8f0" : isTop3 ? "#f97316" : "#94a3b8";
                const rankBg = isTop1
                  ? "rgba(245, 158, 11, 0.12)"
                  : isTop2
                  ? "rgba(226, 232, 240, 0.08)"
                  : isTop3
                  ? "rgba(249, 115, 22, 0.08)"
                  : "rgba(255, 255, 255, 0.03)";
                const rankBorder = isTop1
                  ? "rgba(245, 158, 11, 0.3)"
                  : isTop2
                  ? "rgba(226, 232, 240, 0.2)"
                  : isTop3
                  ? "rgba(249, 115, 22, 0.2)"
                  : "rgba(255, 255, 255, 0.06)";

                const isMe = user.name === userProfile?.username || user.name === progress?.name;

                return (
                  <div
                    key={user.id || idx}
                    className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3 mb-2"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background: isMe ? "rgba(168, 85, 247, 0.15)" : rankBg,
                      border: `1px solid ${isMe ? "rgba(168, 85, 247, 0.35)" : rankBorder}`,
                      marginBottom: "4px",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {/* Left: Rank, Avatar & Name */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: isTop1 || isTop2 || isTop3 ? "15px" : "12px",
                          fontWeight: 700,
                          color: rankColor,
                          width: "22px",
                          textAlign: "center",
                          flexShrink: 0
                        }}
                      >
                        {medal}
                      </span>

                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background: getAvatarColor(user.name),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "12px",
                          color: "#ffffff",
                          flexShrink: 0
                        }}
                      >
                        {(user.name || "?")[0].toUpperCase()}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "12.5px",
                            fontWeight: 600,
                            color: "var(--tx)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {user.name} {isMe && <span style={{ color: "var(--ac2)", fontSize: "11px" }}>(you)</span>}
                        </div>
                        <div className="mu" style={{ fontSize: "10.5px" }}>
                          Level {user.level || 1} {user.streak ? `· ${user.streak}🔥` : ""}
                        </div>
                      </div>
                    </div>

                    {/* Right: XP Badge */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 700,
                          color: isTop1 ? "#fbbf24" : "var(--ac2)",
                          background: isTop1 ? "rgba(245, 158, 11, 0.15)" : "rgba(34, 211, 238, 0.1)",
                          padding: "2px 7px",
                          borderRadius: "6px",
                          border: `1px solid ${isTop1 ? "rgba(245, 158, 11, 0.25)" : "rgba(34, 211, 238, 0.18)"}`
                        }}
                      >
                        {(user.xp || 0).toLocaleString()} XP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
