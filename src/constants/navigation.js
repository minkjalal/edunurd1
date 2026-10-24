// Connection: src/constants/navigation.js is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Defines the menu items used by the drawer and route shell.
/**
 * Anti Gravity 2.0 - Core Navigation Definitions
 * ================================================
 * Deterministic route paths matching the Master Architecture:
 * - /dashboard (Home Cockpit)
 * - /study (AI Epistemic Tutor + 3D Flashcards + Timer)
 * - /community (Discord-style Cohort Hub)
 * - /resources (STEM Video Explorer & 10-Year PYQ Archive)
 * - /vl (Interactive Simulations)
 * - /rw (Rewards & Leaderboards)
 */

export const MENU_ITEMS = [
  { id: "/dashboard",  icon: "🏠", label: "Dashboard" },
  { id: "/study",      icon: "🤖", image: "/study-ingenia-logo.png", label: "Study Engine (AI Tutor)" },
  { id: "/community",  icon: "💬", label: "Community Hub (Discord)" },
  { id: "/resources",  icon: "📚", label: "Educational Resources" },
  { id: "/offline",    icon: "🧠", label: "Offline Study Mode" },
  { id: "/vl",         icon: "🔬", label: "Visual Simulations" },
  { id: "/rw",         icon: "🎖️", label: "Rewards & Streaks" },
  { id: "/comp",       icon: "🏆", label: "Mock Competitions" }
];
