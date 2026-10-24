// Connection: src/constants/badges.js is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Defines badge metadata and thresholds consumed by progress and rewards logic.
/**
 * EduNerd - Achievement Badges & Gamification Constants
 * =====================================================
 * Badges array containing:
 * [id, emoji, title, description, predicateFn(state)]
 */

export const BADGES = [
  { id: "first",   icon: "🎯", title: "First test",    desc: "Finish a test",             test: s => (s.tc || 0) >= 1 },
  { id: "five",    icon: "📝", title: "Test machine",  desc: "Finish 5 tests",            test: s => (s.tc || 0) >= 5 },
  { id: "perfect", icon: "💯", title: "Perfectionist", desc: "Score 100% on a test",      test: s => (s.pf || 0) >= 1 },
  { id: "sharp",   icon: "🧠", title: "Sharp mind",    desc: "50 correct answers",        test: s => (s.qc || 0) >= 50 },
  { id: "f1",      icon: "⏱️", title: "Hour of focus", desc: "Study 60 minutes",          test: s => (s.fm || 0) >= 60 },
  { id: "f5",      icon: "🔥", title: "Deep worker",   desc: "Study 300 minutes",         test: s => (s.fm || 0) >= 300 },
  { id: "s3",      icon: "📅", title: "On a roll",     desc: "3-day streak",              test: s => (s.streak || 0) >= 3 },
  { id: "s7",      icon: "🚀", title: "Unstoppable",   desc: "7-day streak",              test: s => (s.streak || 0) >= 7 },
  { id: "post",    icon: "💬", title: "Voice",         desc: "Post in the community",     test: s => (s.pc || 0) >= 1 },
  { id: "l5",      icon: "⭐", title: "Rising star",   desc: "Reach level 5",             test: (s, lv) => lv >= 5 },
  // Daily-goal completion is recorded by calendar date, so a 10-minute goal
  // and a multi-hour goal both produce the same first-day achievement.
  { id: "goal1",   icon: "🌟", title: "First goal day", desc: "Reach your daily goal on 1 day", test: s => Object.keys(s.dailyGoalDays || {}).length >= 1 },
  // Distinct calendar days with at least one minute of embedded educational
  // YouTube playback. The history is stored in progress.videoWatchDays.
  { id: "video1",  icon: "📺", title: "First watch day", desc: "Watch an educational video on 1 day", test: s => Object.keys(s.videoWatchDays || {}).filter(day => (s.videoWatchDays[day] || 0) >= 60).length >= 1 },
  { id: "video10", icon: "🏆", title: "Video scholar",    desc: "Watch educational videos on 10 days", test: s => Object.keys(s.videoWatchDays || {}).filter(day => (s.videoWatchDays[day] || 0) >= 60).length >= 10 }
];
