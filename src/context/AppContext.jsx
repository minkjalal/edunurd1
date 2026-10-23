/**
 * Anti Gravity 2.0 - Central Application State (AppContext.jsx)
 * ==============================================================
 * Central state provider managing:
 * - Age-gated authentication & cohort assignment (Junior, Teen, Senior)
 * - Listens for backend gamification_triggers (student_accuracy_score, xp_awarded, prompt_community_share)
 * - Manages 3D Flashcard array, allowing flashcard_export to push new cards directly into state
 * - Deterministic client routing (/login, /dashboard, /study, /community, /resources)
 * - Session hydration and localStorage persistence without flicker
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { BADGES } from "../constants/badges";
import { calculateLevel } from "../utils/helpers";
import { triggerConfettiBurst } from "../utils/confetti";

const AppContext = createContext(null);

const TODAY_DATE_STR = new Date().toDateString();

/**
 * Use a fresh local date label whenever study time is recorded. The previous
 * implementation captured one date at module load, so a tab left open across
 * midnight could keep adding yesterday's minutes to today's goal.
 */
function getTodayLabel() {
  return new Date().toDateString();
}

/**
 * Badge predicates live in one place so every activity path (timer, manual
 * logging, and YouTube playback) unlocks the same persistent badge state.
 */
function applyBadgeUnlocks(state) {
  const badges = { ...(state?.bdg || {}) };
  const level = calculateLevel(state?.xp || 0);
  BADGES.forEach(badge => {
    try {
      if (!badges[badge.id] && badge.test(state, level)) badges[badge.id] = true;
    } catch {
      // A malformed legacy progress record must not break the whole app.
    }
  });
  return { ...state, bdg: badges };
}

/** Mark one calendar day as complete without duplicating it in history. */
function markDailyGoalReached(state, today) {
  if (state.dailyGoalReachedDate === today && state.dailyGoalDays?.[today]) return state;
  return {
    ...state,
    dailyGoalReachedDate: today,
    dailyGoalDays: { ...(state.dailyGoalDays || {}), [today]: true }
  };
}

// Helper to extract clean path from window.location.hash
function getHashPath() {
  const hash = window.location.hash || "";
  const cleaned = hash.replace(/^#\/?/, "").split("?")[0].trim();
  return cleaned ? `/${cleaned}` : "/dashboard";
}

export function computeAgeCohort(ageNum) {
  if (ageNum >= 8 && ageNum <= 12) return "Junior";
  if (ageNum >= 13 && ageNum <= 17) return "Teen";
  if (ageNum >= 18) return "Senior";
  return "Teen";
}

export function normalizeCohort(c) {
  if (c === "Junior" || c === "Cohort-A") return "Junior";
  if (c === "Senior" || c === "Cohort-C") return "Senior";
  return "Teen";
}

// ── Default Mock Global Leaderboard Data ──
export const DEFAULT_GLOBAL_LEADERBOARD = [
  { id: 1, name: "Alex P.", xp: 14250, level: 42, streak: 28 },
  { id: 2, name: "Sarah W.", xp: 13800, level: 39, streak: 21 },
  { id: 3, name: "Rohan_JEE", xp: 12450, level: 35, streak: 18 },
  { id: 4, name: "Dr_Elena", xp: 11900, level: 34, streak: 40 },
  { id: 5, name: "Ananya", xp: 10850, level: 31, streak: 25 }
];

export function AppProvider({ children }) {
  // ── 1. User Profile & Age Cohort State ──
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const stored = localStorage.getItem("ag2_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.cohort = normalizeCohort(parsed.cohort || parsed.age_cohort);
        parsed.age_cohort = parsed.cohort;
        return parsed;
      }
    } catch {}
    return null;
  });

  const ageCohort = userProfile?.age_cohort || "Teen";

  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem("en_mode") || (userProfile ? "guest" : "");
    } catch {
      return "";
    }
  });

  const [uid, setUid] = useState(() => {
    try {
      return localStorage.getItem("en_uid") || (userProfile?.uid || "");
    } catch {
      return "";
    }
  });

  const [dbHandle, setDbHandle] = useState(null);
  const [syncStatus, setSyncStatus] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  // ── 2. Epistemic Gamification Trigger States ──
  const [studentAccuracyScore, setStudentAccuracyScore] = useState(85);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [pendingCommunityShare, setPendingCommunityShare] = useState(null);

  // ── 2b. Global Leaderboard State (PHASE 1) ──
  const [globalLeaderboard, setGlobalLeaderboard] = useState(() => {
    try {
      const stored = localStorage.getItem("ag2_leaderboard");
      return stored ? JSON.parse(stored) : DEFAULT_GLOBAL_LEADERBOARD;
    } catch {
      return DEFAULT_GLOBAL_LEADERBOARD;
    }
  });

  // ── 3. 3D Flashcards State ──
  const [flashcards, setFlashcards] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("sp") || "null");
      return stored?.fc || [
        { q: "What is Newton's Third Law?", a: "For every action, there is an equal and opposite reaction (F_A = -F_B).", t: "Physics" },
        { q: "What is the primary role of ChromaDB?", a: "AI-native open-source vector store for nearest-neighbor semantic search.", t: "Computer Science" }
      ];
    } catch {
      return [];
    }
  });

  // Push new cards from backend flashcard_export directly into state
  const pushFlashcards = useCallback((exportedCards) => {
    if (!Array.isArray(exportedCards) || !exportedCards.length) return;

    const mapped = exportedCards
      .filter(c => c && (c.front || c.q) && (c.back || c.a))
      .map(c => ({
        q: String(c.front || c.q).trim(),
        a: String(c.back || c.a).trim(),
        t: c.topic || c.t || "AI Export"
      }))
      .filter(c => c.q && c.a);

    if (!mapped.length) return;

    // `progress.fc` is the deck rendered by FlashcardsView. Keep it and the
    // shared flashcard state in sync so backend-created cards appear at once
    // and survive a refresh.
    setFlashcards(prev => [...prev, ...mapped]);
    setProgress(prev => {
      const updated = [...(prev.fc || []), ...mapped];
      const next = { ...prev, fc: updated };
      try { localStorage.setItem("sp", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // ── 4. Deterministic Routing State ──
  const [currentRoute, setCurrentRoute] = useState(() => {
    const p = getHashPath();
    return p === "/login" ? "/login" : (mode ? p : "/login");
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null);

  // ── 5. Theme State ──
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("en_theme") || "dark"; } catch { return "dark"; }
  });

  // ── 6. Toasts & Timer Overlay ──
  const [toasts, setToasts] = useState([]);
  const [timerOverlay, setTimerOverlay] = useState({ open: false, title: "", message: "" });

  const showToast = useCallback((message) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, text: message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── 7. User Progress (XP, Streaks, Daily caps) ──
  const [progress, setProgress] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("sp") || "null");
      let merged = Object.assign({
        name: userProfile?.username || "",
        goal: 30,
        min: 0,
        studySecondsToday: 0,
        videoWatchDays: {},
        dailyGoalReachedDate: "",
        dailyGoalDays: {},
        streak: 1,
        best: {},
        weak: [],
        day: TODAY_DATE_STR,
        hit: "",
        ev: {},
        packs: {},
        notes: "",
        tf: 30,
        tb: 5,
        tl: 15,
        pomodoroSessions: 0,
        rn: 1,
        rm: 10,
        xp: 0,
        bdg: {},
        fm: 0,
        qc: 0,
        tc: 0,
        pc: 0,
        pf: 0,
        dx: 0,
        dxd: "",
        fc: flashcards,
        fcm: []
      }, stored || {});
      // Reset only the current-day counters. Historical video-watch days and
      // unlocked badges remain available for streaks and reward downloads.
      if (merged.day !== getTodayLabel()) {
        merged.day = getTodayLabel();
        merged.min = 0;
        merged.studySecondsToday = 0;
        merged.dailyGoalReachedDate = "";
      }
      // Migrate an already-completed current-day goal into the new reward
      // history so existing learners receive the first-goal badge on refresh.
      if (merged.min >= (Number(merged.goal) || 30)) {
        merged = markDailyGoalReached(merged, getTodayLabel());
      }
      return applyBadgeUnlocks(merged);
    } catch {
      return applyBadgeUnlocks({
        name: userProfile?.username || "", goal: 30, min: 0, studySecondsToday: 0, videoWatchDays: {}, dailyGoalReachedDate: "", dailyGoalDays: {}, streak: 1, best: {}, weak: [], day: TODAY_DATE_STR,
        hit: "", ev: {}, packs: {}, notes: "", tf: 30, tb: 5, tl: 15, pomodoroSessions: 0, rn: 1, rm: 10, xp: 0,
        bdg: {}, fm: 0, qc: 0, tc: 0, pc: 0, pf: 0, dx: 0, dxd: "", fc: flashcards, fcm: []
      });
    }
  });

  // ── 7a. Weak Topics State & Handlers ──
  const [weakTopics, setWeakTopics] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("sp") || "null");
      if (stored?.weak && Array.isArray(stored.weak) && stored.weak.length > 0) {
        return stored.weak;
      }
      return ["Thermodynamics", "Organic Chemistry", "Differential Equations"];
    } catch {
      return ["Thermodynamics", "Organic Chemistry", "Differential Equations"];
    }
  });

  const addWeakTopic = useCallback((topic) => {
    const trimmed = (topic || "").trim().slice(0, 50);
    if (!trimmed) return;
    setWeakTopics(prev => {
      if (prev.includes(trimmed)) return prev;
      const updated = [...prev, trimmed];
      try {
        const stored = JSON.parse(localStorage.getItem("sp") || "{}");
        stored.weak = updated;
        localStorage.setItem("sp", JSON.stringify(stored));
      } catch {}
      setProgress(p => ({ ...p, weak: updated }));
      return updated;
    });
    showToast(`Added weak topic: "${trimmed}"`);
  }, [showToast]);

  const removeWeakTopic = useCallback((topic) => {
    setWeakTopics(prev => {
      const updated = prev.filter(t => t !== topic);
      try {
        const stored = JSON.parse(localStorage.getItem("sp") || "{}");
        stored.weak = updated;
        localStorage.setItem("sp", JSON.stringify(stored));
      } catch {}
      setProgress(p => ({ ...p, weak: updated }));
      return updated;
    });
    showToast(`Removed weak topic: "${topic}"`);
  }, [showToast]);

  // ── 7b. Notes & Scratchpad State ──
  const [notes, setNotes] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("sp") || "null");
      return stored?.notes || "";
    } catch {
      return "";
    }
  });

  const updateNotes = useCallback((text) => {
    setNotes(text);
    try {
      const stored = JSON.parse(localStorage.getItem("sp") || "{}");
      stored.notes = text;
      localStorage.setItem("sp", JSON.stringify(stored));
    } catch {}
    setProgress(p => ({ ...p, notes: text }));
  }, []);

  const checkDailyGoal = useCallback((minutes) => {
    const goal = progress?.goal || 30;
    if (minutes < goal) return;
    setProgress(prev => {
      const today = getTodayLabel();
      const base = prev.day === today
        ? prev
        : { ...prev, day: today, min: 0, studySecondsToday: 0, dailyGoalReachedDate: "" };
      if (base.dailyGoalReachedDate === today) return base;
      const next = applyBadgeUnlocks(markDailyGoalReached(base, today));
      try { localStorage.setItem("sp", JSON.stringify(next)); } catch {}
      showToast("🎯 Daily study goal achieved! Awesome consistency!");
      return next;
    });
  }, [progress?.goal, showToast]);

  /**
   * Record real elapsed learning time in seconds. YouTube playback calls this
   * while its player is in PLAYING state; the timer and manual dashboard log
   * use the minute wrapper below. Keeping the source separate lets rewards
   * count distinct video-watch days without changing the daily goal math.
   */
  const recordStudySeconds = useCallback((seconds, source = "study") => {
    const increment = Math.min(3600, Math.max(0, Math.floor(Number(seconds) || 0)));
    if (!increment) return;

    setProgress(prev => {
      const today = getTodayLabel();
      const sameDay = prev.day === today;
      const base = sameDay
        ? prev
        : { ...prev, day: today, min: 0, studySecondsToday: 0, dailyGoalReachedDate: "" };
      // Legacy sessions only stored whole minutes, so use them as a safe
      // baseline until the new second-accurate counter has caught up.
      const currentSeconds = Math.max(
        Number(base.studySecondsToday) || 0,
        (Number(base.min) || 0) * 60
      );
      const nextSeconds = currentSeconds + increment;
      const next = {
        ...base,
        day: today,
        studySecondsToday: nextSeconds,
        min: Math.floor(nextSeconds / 60)
      };

      if (source === "youtube") {
        const watchDays = { ...(base.videoWatchDays || {}) };
        watchDays[today] = (Number(watchDays[today]) || 0) + increment;
        next.videoWatchDays = watchDays;
      }

      if (next.min >= (Number(next.goal) || 30) && next.dailyGoalReachedDate !== today) {
        Object.assign(next, markDailyGoalReached(next, today));
        showToast("🎯 Daily study goal achieved! Awesome consistency!");
      }

      const unlockedBefore = base.bdg || {};
      const unlockedNext = applyBadgeUnlocks(next);
      const newlyUnlocked = BADGES.filter(badge => !unlockedBefore[badge.id] && unlockedNext.bdg[badge.id]);
      newlyUnlocked.forEach(badge => showToast(`🏅 Badge unlocked: ${badge.title}`));

      try { localStorage.setItem("sp", JSON.stringify(unlockedNext)); } catch {}
      return unlockedNext;
    });
  }, [showToast]);

  /** Minute-friendly wrapper used by the dashboard and completed focus blocks. */
  const recordStudyMinutes = useCallback((minutes, source = "study") => {
    recordStudySeconds(Number(minutes) * 60, source);
  }, [recordStudySeconds]);

  /**
   * Reset only today's live study counters. Historical streaks, video-watch
   * dates, XP, and earned badges remain intact so a reset cannot erase the
   * learner's long-term record. Clearing today's video entry lets the learner
   * replay a video and count a fresh watch session toward today's goal.
   */
  const resetTodayStudyProgress = useCallback(() => {
    setProgress(prev => {
      const today = getTodayLabel();
      const dailyGoalDays = { ...(prev.dailyGoalDays || {}) };
      delete dailyGoalDays[today];
      const videoWatchDays = { ...(prev.videoWatchDays || {}) };
      delete videoWatchDays[today];
      const next = {
        ...prev,
        day: today,
        min: 0,
        studySecondsToday: 0,
        dailyGoalReachedDate: "",
        dailyGoalDays,
        videoWatchDays,
      };
      try { localStorage.setItem("sp", JSON.stringify(next)); } catch {}
      return next;
    });
    showToast("↺ Today's study timer and goal progress were reset. You can study again.");
  }, [showToast]);

  // ── 8. Award XP System & Centralized Gamification Dispatcher ──
  const awardXP = useCallback((points, reason = "study activity") => {
    const amount = typeof points === "number" ? points : (parseInt(points, 10) || 0);
    if (amount <= 0) return;

    setProgress(prev => {
      let dailyXP = prev.dx || 0;
      let dailyXPDate = prev.dxd;

      if (dailyXPDate !== TODAY_DATE_STR) {
        dailyXPDate = TODAY_DATE_STR;
        dailyXP = 0;
      }

      // Strictly enforce daily 400 XP cap
      const allowedPoints = Math.min(amount, Math.max(0, 400 - dailyXP));
      if (allowedPoints <= 0) {
        showToast("Daily XP cap (400 XP) reached for today. Excellent focus!");
        return prev;
      }

      const prevLevel = calculateLevel(prev.xp || 0);
      const newTotalXP = (prev.xp || 0) + allowedPoints;
      const newDailyXP = dailyXP + allowedPoints;

      showToast(`+${allowedPoints} XP · ${reason}`);

      const intermediate = {
        ...prev,
        xp: newTotalXP,
        dx: newDailyXP,
        dxd: dailyXPDate
      };

      const nextLevel = calculateLevel(intermediate.xp);
      if (nextLevel > prevLevel) {
        showToast(`🎉 Level up! You are now level ${nextLevel}`);
        triggerConfettiBurst(window.innerWidth / 2, window.innerHeight / 3, 60);
      }

      try {
        localStorage.setItem("sp", JSON.stringify(intermediate));
      } catch {}

      return intermediate;
    });
  }, [showToast]);

  // ── 9. Ingest Epistemic Backend Gamification Triggers ──
  const applyGamificationTriggers = useCallback((triggers, queryTopic = "Concept") => {
    if (!triggers) return;
    const score = triggers.student_accuracy_score ?? 85;
    const xp = triggers.xp_awarded ?? 50;
    const share = Boolean(triggers.prompt_community_share);

    setStudentAccuracyScore(score);
    setXpAwarded(xp);

    if (xp > 0) {
      awardXP(xp, `Accuracy score: ${score}% on ${queryTopic.slice(0, 20)}`);
    }

    if (share) {
      setPendingCommunityShare({
        text: `💡 **Mastered Insight on ${queryTopic.slice(0, 40)}**\nAccuracy: ${score}%\nFormulated with first-principles reasoning.`
      });
      showToast("🌟 Elite reasoning (>90%)! Prompting community share.");
    }
  }, [awardXP, showToast]);

  // ── 10. Navigation Handler with Route Guarding ──
  const navigateTo = useCallback((targetRoute) => {
    const target = targetRoute.startsWith("/") ? targetRoute : `/${targetRoute}`;
    const queryIndex = target.indexOf("?");
    const routePath = queryIndex >= 0 ? target.slice(0, queryIndex) : target;
    const query = queryIndex >= 0 ? target.slice(queryIndex) : "";
    let clean = routePath;
    if (clean === "/home") clean = "/dashboard";
    if (clean === "/fc" || clean === "/ai" || clean === "/timer" || clean === "/tutor") clean = "/study";
    if (clean === "/comm") clean = "/community";
    if (clean === "/vid" || clean === "/pyq") clean = "/resources";

    if (!mode && clean !== "/login") {
      clean = "/login";
    } else if (mode && clean === "/login") {
      clean = "/dashboard";
    }

    window.location.hash = `#${clean}${query}`;
    setCurrentRoute(clean);
    setActiveQuiz(null);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [mode]);

  useEffect(() => {
    const handleHashChange = () => {
      const p = getHashPath();
      if (!mode && p !== "/login") {
        navigateTo("/login");
      } else if (mode && p === "/login") {
        navigateTo("/dashboard");
      } else {
        setCurrentRoute(p);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [mode, navigateTo]);

  useEffect(() => {
    const initialPath = getHashPath();
    if (!mode) {
      navigateTo("/login");
    } else if (initialPath === "/login") {
      navigateTo("/dashboard");
    } else {
      navigateTo(initialPath);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("en_theme", theme); } catch {}
  }, [theme]);

  const saveProgress = useCallback(async (updater) => {
    setProgress(prev => {
      const today = getTodayLabel();
      const current = prev.day === today
        ? prev
        : { ...prev, day: today, min: 0, studySecondsToday: 0, dailyGoalReachedDate: "" };
      let next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      // Keep second-accurate and legacy minute fields coherent when older
      // controls still write `min` directly.
      if (next.min !== undefined) {
        next.studySecondsToday = Math.max(
          Number(next.studySecondsToday) || 0,
          (Number(next.min) || 0) * 60
        );
      }
      if (next.min >= (Number(next.goal) || 30) && next.dailyGoalReachedDate !== today) {
        next = markDailyGoalReached(next, today);
        showToast("🎯 Daily study goal achieved! Awesome consistency!");
      }
      const newlyUnlocked = BADGES.filter(badge => !(current.bdg || {})[badge.id]);
      next = applyBadgeUnlocks(next);
      newlyUnlocked
        .filter(badge => next.bdg[badge.id])
        .forEach(badge => showToast(`🏅 Badge unlocked: ${badge.title}`));
      if (next.weak && Array.isArray(next.weak)) {
        setWeakTopics(next.weak);
      }
      if (next.notes !== undefined) {
        setNotes(next.notes);
      }
      try {
        localStorage.setItem("sp", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [showToast]);

  const loginUser = useCallback(async ({ email, username, password, age, cohort }) => {
    const resolvedCohort = normalizeCohort(cohort || computeAgeCohort(age));
    const profile = {
      uid: "u_" + Date.now().toString(36),
      username,
      email,
      age,
      cohort: resolvedCohort,
      age_cohort: resolvedCohort,
      xp: progress.xp || 0,
      streak: progress.streak || 1
    };

    setUserProfile(profile);
    setMode("cloud");
    setUid(profile.uid);

    try {
      localStorage.setItem("ag2_profile", JSON.stringify(profile));
      localStorage.setItem("en_mode", "cloud");
      localStorage.setItem("en_uid", profile.uid);
    } catch {}

    saveProgress({ name: username });
    showToast(`Welcome ${username}! Assigned to ${resolvedCohort} cohort.`);
    navigateTo("/dashboard");
  }, [progress, saveProgress, showToast, navigateTo]);

  const guestLogin = useCallback(({ username, age, cohort }) => {
    const resolvedCohort = normalizeCohort(cohort || computeAgeCohort(age));
    const profile = {
      uid: "guest_" + Math.floor(Math.random() * 9000 + 1000),
      username,
      email: "guest@antigravity.local",
      age,
      cohort: resolvedCohort,
      age_cohort: resolvedCohort,
      xp: progress.xp || 0,
      streak: progress.streak || 1
    };

    setUserProfile(profile);
    setMode("guest");
    setUid(profile.uid);

    try {
      localStorage.setItem("ag2_profile", JSON.stringify(profile));
      localStorage.setItem("en_mode", "guest");
      localStorage.setItem("en_uid", profile.uid);
    } catch {}

    saveProgress({ name: username });
    showToast(`🚀 Guest mode active in ${resolvedCohort} cohort`);
    navigateTo("/dashboard");
  }, [progress, saveProgress, showToast, navigateTo]);

  const signOut = useCallback(() => {
    setMode("");
    setUid("");
    setUserProfile(null);
    setDbHandle(null);
    localStorage.removeItem("en_mode");
    localStorage.removeItem("en_uid");
    localStorage.removeItem("ag2_profile");
    navigateTo("/login");
  }, [navigateTo]);

  const startQuiz = useCallback((examKey, questions) => {
    if (!Array.isArray(questions) || questions.length === 0) {
      showToast("No questions are available to display.");
      return;
    }
    setActiveQuiz({ examKey, questions });
  }, [showToast]);

  const closeQuiz = useCallback(() => {
    setActiveQuiz(null);
  }, []);

  const currentXP = progress?.xp || 0;
  const currentLevel = calculateLevel(currentXP);
  const currentDailyXP = progress?.dxd === TODAY_DATE_STR ? (progress?.dx || 0) : 0;

  const value = {
    userProfile,
    ageCohort,
    age_cohort: ageCohort,
    mode, setMode,
    uid, setUid,
    currentRoute,
    navigateTo,
    navigate: navigateTo,
    isHydrated,
    dbHandle, setDbHandle,
    syncStatus,
    drawerOpen, setDrawerOpen,
    activeQuiz, setActiveQuiz,
    startQuiz, closeQuiz,
    theme, setTheme,
    toasts, showToast, removeToast,
    timerOverlay, setTimerOverlay,
    progress, setProgress,
    saveProgress,
    xp: currentXP,
    level: currentLevel,
    dailyXP: currentDailyXP,
    currentXP,
    currentLevel,
    awardXP,
    recordStudySeconds,
    recordStudyMinutes,
    resetTodayStudyProgress,
    loginUser,
    guestLogin,
    signOut,
    student_accuracy_score: studentAccuracyScore,
    xp_awarded: xpAwarded,
    applyGamificationTriggers,
    flashcards,
    pushFlashcards,
    pendingCommunityShare,
    setPendingCommunityShare,
    weakTopics,
    addWeakTopic,
    removeWeakTopic,
    notes,
    updateNotes,
    checkDailyGoal,
    globalLeaderboard,
    setGlobalLeaderboard
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
}
