/**
 * Anti Gravity 2.0 - Rewards, Badges & Leaderboard View (RewardsView.jsx)
 * =======================================================================
 * Visualizes:
 * - Current user level and next-level dynamic progress gauge
 * - Daily XP earning limit (400 XP cap)
 * - Interactive "How to Earn XP" responsive mini-card grid wired to app routing
 * - Achievement badges with lock/unlock status and offline downloads
 * - Global cloud leaderboard queried from backend collection 'board'
 */

import React, { useState, useEffect, useContext } from "react";
import { useApp } from "../context/AppContext";
import { BADGES } from "../constants/badges";
import { calculateLevel, getLevelBaseXP, calculateLevelProgress, getAvatarColor } from "../utils/helpers";

const TODAY_DATE_STR = new Date().toDateString();

/** Escape static badge labels before placing them in a downloadable SVG. */
function escapeSvgText(value) {
  return String(value || "").replace(/[&<>\"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;"
  }[char]));
}

/** Create a small offline SVG certificate so unlocked badges can be saved. */
function downloadBadge(badge) {
  const title = escapeSvgText(badge.title);
  const description = escapeSvgText(badge.desc);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
    <defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#17112b"/><stop offset="1" stop-color="#102b3d"/></linearGradient></defs>
    <rect width="900" height="600" rx="36" fill="url(#bg)"/>
    <circle cx="450" cy="205" r="116" fill="#8b5cf6" opacity=".25" stroke="#22d3ee" stroke-width="5"/>
    <text x="450" y="250" text-anchor="middle" font-size="100">${escapeSvgText(badge.icon)}</text>
    <text x="450" y="370" text-anchor="middle" fill="#f8fafc" font-family="Arial, sans-serif" font-size="40" font-weight="700">${title}</text>
    <text x="450" y="420" text-anchor="middle" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="22">${description}</text>
    <text x="450" y="510" text-anchor="middle" fill="#22d3ee" font-family="Arial, sans-serif" font-size="18">EduNerd achievement</text>
  </svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${badge.id}-badge.svg`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// ── Structured & Actionable XP Earning Rules ──
const XP_RULES = [
  { xp: "+10 XP", label: "per correct answer", icon: "🎯", route: "/tutor" },
  { xp: "+20 XP", label: "for completing a test", icon: "📝", route: "/tutor" },
  { xp: "+50 XP", label: "for a 100% score", icon: "💯", route: "/tutor" },
  { xp: "+1 XP", label: "per minute of focus study", icon: "⏱️", route: "/study" },
  { xp: "+25 XP", label: "for daily goal reached", icon: "🔥", route: "/dashboard" },
  { xp: "+5 XP", label: "for community posts", icon: "💬", route: "/community" },
  { xp: "+20 XP", label: "for each badge unlocked", icon: "🎖️", route: "/rewards" }
];

export default function RewardsView() {
  const { mode, uid, dbHandle, progress, xp, level, dailyXP, navigateTo } = useApp();

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // FIX 1: Real Dynamic State Bindings
  const currentXP = xp !== undefined ? xp : (progress?.xp || 0);
  const currentLevel = level !== undefined ? level : calculateLevel(currentXP);
  const currentDailyXP = dailyXP !== undefined ? dailyXP : (progress?.dxd === TODAY_DATE_STR ? progress?.dx || 0 : 0);

  const currentLevelBaseXP = getLevelBaseXP(currentLevel);
  const nextLevelXP = getLevelBaseXP(currentLevel + 1);
  const xpNeeded = Math.max(0, nextLevelXP - currentXP);

  // Dynamic progress bar percentage calculation
  const levelProgress = Math.min(100, Math.max(0,
    nextLevelXP > currentLevelBaseXP
      ? Math.round(((currentXP - currentLevelBaseXP) / (nextLevelXP - currentLevelBaseXP)) * 100)
      : Math.round((currentXP / nextLevelXP) * 100)
  ));

  const unlockedBadges = BADGES.filter(badge => {
    try { return Boolean(progress?.bdg?.[badge.id] || badge.test(progress, currentLevel)); } catch { return false; }
  });
  const unlockedBadgesCount = unlockedBadges.length;
  const dailyGoalDays = Object.keys(progress?.dailyGoalDays || {}).length;
  const videoWatchDays = Object.keys(progress?.videoWatchDays || {}).filter(day => (progress.videoWatchDays[day] || 0) >= 60).length;

  const fetchLeaderboard = async () => {
    if (mode !== "cloud" || !dbHandle || !uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      // Sync own entry first
      await dbHandle.collection("board").doc(uid).set({
        name: progress.name || "Student",
        xp: currentXP,
        lv: currentLevel,
        ts: Date.now()
      });

      // Fetch top 20 rankings
      const result = await dbHandle.collection("board").orderBy("xp", "desc").limit(20).get();
      setLeaderboard((result.docs || []).map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setLoadError("Could not load leaderboard: " + (err.message || err.code || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [mode, dbHandle, uid]);

  return (
    <div className="pg">
      <h1>🎖️ Rewards</h1>

      {/* FIX 1: Dynamic Level Summary Card */}
      <div className="card" style={{ textAlign: "center" }}>
        <div className="mu">Level</div>
        <div className="big" style={{ fontSize: "44px" }}>{currentLevel}</div>
        <div className="mu">
          {currentXP} XP · {xpNeeded} XP to level {currentLevel + 1}
        </div>
        <div className="pbar">
          <i
            style={{
              "--a": "0%",
              "--b": `${levelProgress}%`,
              width: `${levelProgress}%`,
              transition: "width 0.4s ease"
            }}
          />
        </div>
        <div className="mu">
          Today: {currentDailyXP} / 400 XP
        </div>
      </div>

      {/* "How to Earn XP" Section */}
      <h2>How to Earn XP</h2>
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: "16px",
          marginBottom: "16px"
        }}
      >
        {XP_RULES.map((rule, idx) => (
          <div
            key={idx}
            onClick={() => {
              if (rule.route) navigateTo(rule.route);
            }}
            title={rule.route ? `Go to ${rule.route} to earn ${rule.xp}` : undefined}
            className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
            }}
          >
            <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{rule.icon}</span>
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: "#38bdf8",
                  background: "rgba(56, 189, 248, 0.15)",
                  padding: "2px 6px",
                  borderRadius: "4px"
                }}
              >
                {rule.xp}
              </span>
              <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                {rule.label}
              </span>
            </div>
            {rule.route && (
              <span style={{ fontSize: "0.8rem", color: "#64748b", marginLeft: "auto" }}>→</span>
            )}
          </div>
        ))}
      </div>

      {/* Daily Cap Warning Badge */}
      <div
        className="text-blue-400 bg-blue-400/10 px-4 py-2 rounded-full inline-block mt-4"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          borderRadius: "9999px",
          background: "rgba(56, 189, 248, 0.1)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          color: "#38bdf8",
          fontSize: "0.875rem",
          fontWeight: 600,
          marginTop: "16px",
          marginBottom: "24px"
        }}
      >
        <span>⚡</span>
        <span>Daily XP is capped at 400 XP.</span>
      </div>

      {/* Badges Grid */}
      <h2>Badges ({unlockedBadgesCount}/{BADGES.length})</h2>
      <div className="card" style={{ marginBottom: "14px", borderColor: "rgba(34, 211, 238, 0.3)" }}>
        <b>🎯 Daily-goal days: {dailyGoalDays} · 📺 Educational video days: {videoWatchDays}</b>
        <p className="mu" style={{ margin: "6px 0 0", fontSize: "12px" }}>
          Reach your custom daily goal once to earn the First goal day badge. Watch at least one minute in the embedded player on a day to earn the video badges.
        </p>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
        {BADGES.map(b => {
          const isUnlocked = Boolean(progress.bdg && progress.bdg[b.id]) || unlockedBadges.includes(b);
          return (
            <div
              key={b.id}
              className="card"
              style={{
                textAlign: "center",
                opacity: isUnlocked ? 1 : 0.45
              }}
            >
              <div style={{ fontSize: "30px", filter: isUnlocked ? "none" : "grayscale(1)" }}>
                {b.icon}
              </div>
              <b>{b.title}</b>
              <div className="mu" style={{ fontSize: "12px" }}>{b.desc}</div>
              {isUnlocked && (
                <button
                  className="alt"
                  style={{ marginTop: "10px", padding: "5px 8px", fontSize: "11px" }}
                  onClick={() => downloadBadge(b)}
                >
                  ⬇ Download badge
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Leaderboard Section */}
      <h2>Global Leaderboard</h2>
      <div className="row" style={{ marginBottom: "8px" }}>
        <button className="alt" onClick={fetchLeaderboard}>↻ Refresh</button>
      </div>

      {mode !== "cloud" ? (
        <div className="card">
          <b>Sign in to join the leaderboard</b>
          <p className="mu">
            Your XP is stored locally on this device. Sign in to cloud mode to compete with other learners.
          </p>
        </div>
      ) : loading ? (
        <div className="card mu">Loading leaderboard…</div>
      ) : loadError ? (
        <div className="card warn">{loadError}</div>
      ) : (
        <div>
          {leaderboard.map((entry, idx) => {
            const isMe = entry.id === uid;
            return (
              <div
                key={entry.id || idx}
                className="card row"
                style={{ borderColor: isMe ? "var(--ac2)" : undefined }}
              >
                <b style={{ width: "34px" }}>
                  {idx < 3 ? ["🥇", "🥈", "🥉"][idx] : `#${idx + 1}`}
                </b>
                <span
                  style={{
                    display: "inline-flex",
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    background: getAvatarColor(entry.name),
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    flex: "none"
                  }}
                >
                  {(entry.name || "?")[0].toUpperCase()}
                </span>
                <div style={{ flex: 1 }}>
                  <b>{entry.name || "Student"}{isMe ? " (you)" : ""}</b>
                  <div className="mu">Level {entry.lv || 1}</div>
                </div>
                <b>{entry.xp || 0} XP</b>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
