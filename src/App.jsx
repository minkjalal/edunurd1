// Connection: src/App.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Composes global providers and selects the active hash-based application view.
/**
 * Anti Gravity 2.0 - Root Application Shell & Deterministic Router (App.jsx)
 * =========================================================================
 * Establishes a deterministic client-side routing tree:
 * - /login: Public auth portal (with mandatory age & cohort assignment)
 * - /dashboard: Protected home hub (streaks, daily goal ring, XP level, shortcuts)
 * - /study: Unified AI Epistemic Tutor, 3D Flashcards, and Focus Pomodoro
 * - /community: Discord-style age-gated study hub (Cohort-A, Cohort-B, Cohort-C)
 * - /resources: Educational video explorer & 10-year PYQ archive
 *
 * Eliminates rerouting loops and blank screens with hydration gating.
 */

import React, { useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";

import Header from "./components/Header";
import NavigationDrawer from "./components/NavigationDrawer";
import AmbientBackground from "./components/AmbientBackground";
import ToastContainer from "./components/ToastContainer";
import TimerModal from "./components/TimerModal";

import LoginView from "./views/LoginView";
import DashboardView from "./views/DashboardView";
import StudyView from "./views/StudyView";
import CommunityView from "./views/CommunityView";
import ResourcesView from "./views/ResourcesView";
import VisualLearningView from "./views/VisualLearningView";
import RewardsView from "./views/RewardsView";
import CompetitionView from "./views/CompetitionView";
import CalendarView from "./views/CalendarView";
import QuizView from "./views/QuizView";
import OfflineView from "./views/OfflineView";
import NotesView from "./views/NotesView";

function MainContentRouter() {
  const { mode, currentRoute, activeQuiz, isHydrated } = useApp();

  // Wait for session hydration to prevent redirect flickers or blank screens
  if (!isHydrated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="mu" style={{ fontSize: "0.95rem" }}>Initializing Edunurd…</div>
      </div>
    );
  }

  // Route Guard: Unauthenticated users are strictly routed to /login
  if (!mode || currentRoute === "/login") {
    return <LoginView />;
  }

  // Active quiz session runner
  if (activeQuiz) {
    return <QuizView />;
  }

  // Primary Deterministic Route Tree
  switch (currentRoute) {
    case "/dashboard":
      return <DashboardView />;

    case "/study":
    case "/tutor":
      return <StudyView />;

    case "/community":
      return <CommunityView />;

    case "/resources":
      return <ResourcesView />;

    case "/offline":
      return <OfflineView />;

    case "/notes":
      return <NotesView />;

    case "/vl":
    case "/visual-learning":
      return <VisualLearningView />;

    case "/rewards":
    case "/rw":
      return <RewardsView />;

    case "/competition":
    case "/comp":
      return <CompetitionView />;

    case "/calendar":
    case "/cal":
      return <CalendarView />;

    default:
      return <DashboardView />;
  }
}

function AppShell() {
  const { mode } = useApp();

  // Global button ripple feedback
  useEffect(() => {
    const handlePointerDown = e => {
      const btn = e.target.closest("button, .day, .tile");
      if (!btn || btn.disabled) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "rp";
      ripple.style.cssText = `left:${e.clientX - rect.left - 20}px;top:${e.clientY - rect.top - 20}px`;
      btn.append(ripple);
      setTimeout(() => ripple.remove(), 600);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <>
      {/* Background Interactive Particles */}
      <AmbientBackground />

      {/* Main Navigation Header (Rendered when authenticated) */}
      {mode && <Header />}

      {/* Slide-out Navigation Drawer (Rendered when authenticated) */}
      {mode && <NavigationDrawer />}

      {/* Floating Viewport Toasts */}
      <ToastContainer />

      {/* Time Up Alert Modal */}
      <TimerModal />

      {/* Primary Application Container */}
      <main id="app">
        <MainContentRouter />
      </main>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
