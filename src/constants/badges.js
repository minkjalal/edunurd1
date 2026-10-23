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
  { id: "l5",      icon: "⭐", title: "Rising star",   desc: "Reach level 5",             test: (s, lv) => lv >= 5 }
];
