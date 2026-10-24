// Connection: src/views/CommunityView.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Renders cohort-aware community channels, moderation, audio, and local history.
/**
 * Anti Gravity 2.0 - Discord-Style Community Hub (CommunityView.jsx)
 * =================================================================
 * Master Implementation:
 * - Phase 1: Far-Left Subject Server Rail (Physics, Chemistry, Math) with unlocked access & active indicators.
 * - Phase 2: Text channels restored to #general-discourse, #advanced-theory, #epistemic-audits, #breakthroughs.
 *            Message history strictly isolated and filtered by activeChannelId & activeServerId.
 * - Phase 3: Dynamic Voice Room member counts ({room.activeStudents?.length || 0} + user connection sync).
 * - Phase 4: Robust Ambient Audio state machine (pause -> src -> load -> loop -> play) with mute capability.
 */

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { calculateLevel, getAvatarColor } from "../utils/helpers";
import {
  MAX_COMMUNITY_MESSAGE_LENGTH,
  isCommunityMessageVisibleToCohort,
  moderateCommunityMessage,
  sanitizeCommunityText
} from "../utils/communityModeration";

/**
 * Backwards-compatible sanitizer export for code that only needs PII/link
 * redaction. The actual send paths below use `moderateCommunityMessage` so a
 * blocked Cohort-A/B post never reaches storage, the chat stream, or XP logic.
 */
export function filterContentForSafety(text) {
  return sanitizeCommunityText(text);
}

// ── PHASE 1: Academic Subject Servers (Far-Left Server Rail) ──
const SUBJECT_SERVERS = [
  {
    id: "physics",
    name: "Physics",
    short: "P",
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.25)",
    border: "#3b82f6",
    icon: "⚛️",
    topic: "Mechanics, Electromagnetism, Quantum & Relativity"
  },
  {
    id: "chemistry",
    name: "Chemistry",
    short: "C",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.25)",
    border: "#10b981",
    icon: "🧪",
    topic: "Organic Mechanisms, Thermodynamics, Kinetics & Bonding"
  },
  {
    id: "math",
    name: "Math",
    short: "M",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.25)",
    border: "#f59e0b",
    icon: "📐",
    topic: "Calculus, Linear Algebra, Probability & Real Analysis"
  }
];

// ── PHASE 2: Standard Pedagogical Text Channels ──
const TEXT_CHANNELS = [
  { id: "general-discourse", name: "general-discourse", topic: "General academic discussions & peer queries", icon: "💬" },
  { id: "advanced-theory", name: "advanced-theory", topic: "Deep dives, mathematical derivations & olympiad theory", icon: "🔬" },
  { id: "epistemic-audits", name: "epistemic-audits", topic: "Socratic cross-examinations & concept stress-testing", icon: "⚖️" },
  { id: "breakthroughs", name: "breakthroughs", topic: "AI Tutor breakthrough shares & eureka moments", icon: "✨" }
];

// ── Seed Messages Seeded per Subject Server & Channel ──
const SEED_MESSAGES = [
  {
    id: "m1",
    serverId: "physics",
    channelId: "general-discourse",
    author: "Rohan_JEE",
    role: "Aspirant",
    level: 8,
    streak: 14,
    text: "For rotational dynamics: how do you quickly find the moment of inertia of a truncated cone about its central axis?",
    time: "11:05 AM"
  },
  {
    id: "m2",
    serverId: "physics",
    channelId: "advanced-theory",
    author: "Ananya",
    role: "Top Contributor",
    level: 11,
    streak: 21,
    text: "Slice it into elemental disks of radius r(y) and thickness dy, then integrate dI = 0.5 * dm * r(y)^2 from y=0 to h.",
    time: "11:12 AM"
  },
  {
    id: "m3",
    serverId: "physics",
    channelId: "epistemic-audits",
    author: "Priya_M",
    role: "Scholar",
    level: 9,
    streak: 15,
    text: "Audit challenge: Prove why the entropy of an isolated thermodynamic system never decreases without invoking microstate statistics.",
    time: "11:25 AM"
  },
  {
    id: "m4",
    serverId: "chemistry",
    channelId: "general-discourse",
    author: "Dev_K",
    role: "Scholar",
    level: 5,
    streak: 4,
    text: "What's the best intuition for remembering SN1 vs SN2 solvent preferences?",
    time: "11:30 AM"
  },
  {
    id: "m5",
    serverId: "chemistry",
    channelId: "advanced-theory",
    author: "Dr_Elena",
    role: "Mentor",
    level: 15,
    streak: 40,
    text: "SN1 prefers Polar Protic (stabilizes carbocation intermediate), SN2 prefers Polar Aprotic (doesn't solvate nucleophile, maximizing its reactivity).",
    time: "11:36 AM"
  },
  {
    id: "m6",
    serverId: "math",
    channelId: "general-discourse",
    author: "Kabir",
    role: "Scholar",
    level: 6,
    streak: 9,
    text: "When evaluating the Gaussian integral e^(-x^2) dx from -inf to inf, polar coordinate conversion makes it so clean!",
    time: "11:45 AM"
  },
  {
    id: "m7",
    serverId: "math",
    channelId: "breakthroughs",
    author: "Ananya",
    role: "Top Contributor",
    level: 11,
    streak: 21,
    text: "✨ [AI Tutor Breakthrough Shared]\n\nSquare the Gaussian integral to I^2 = integral over dx dy, convert to r dr dtheta and it reduces to pi, so I = sqrt(pi)!",
    time: "11:52 AM"
  }
];

/**
 * Restore only valid message arrays from browser storage. A valid JSON object
 * is not necessarily a valid message list; without this guard, a damaged saved
 * value would make `.filter()` fail and blank the Community Hub.
 */
function loadStoredCommunityMessages() {
  try {
    const stored = localStorage.getItem("ag2_chat_messages_v3");
    const parsed = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? parsed.filter(message => message && typeof message === "object") : SEED_MESSAGES;
  } catch {
    return SEED_MESSAGES;
  }
}

/**
 * Date.now alone can collide when a user posts or shares twice in one
 * millisecond. The random suffix keeps React keys and local history stable.
 */
function createCommunityMessageId(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${suffix}`;
}

// ── Voice & Study Rooms with Dynamic Students Array ──
const VOICE_ROOMS = [
  {
    id: "v1",
    name: "Focus Lounge (25m)",
    type: "pomodoro",
    activeStudents: [
      { name: "Dev_K", level: 5, streak: 4 },
      { name: "Priya_M", level: 9, streak: 15 },
      { name: "Zaid_Physics", level: 7, streak: 8 }
    ]
  },
  {
    id: "v2",
    name: "Silent Library",
    type: "silent",
    activeStudents: [
      { name: "Aarav", level: 3, streak: 5 },
      { name: "Ananya", level: 11, streak: 21 },
      { name: "Kabir", level: 5, streak: 7 },
      { name: "Maya", level: 6, streak: 12 }
    ]
  }
];

// ── PHASE 4: Verified Ambient Audio Dictionary ──
const AUDIO_SOURCES = {
  rain: "https://actions.google.com/sounds/v1/weather/rain_heavy.ogg",
  cafe: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
  alpha: "https://actions.google.com/sounds/v1/science_fiction/force_field_hum.ogg",
  forest: "https://actions.google.com/sounds/v1/ambiences/forest_birds.ogg"
};

const AMBIENT_SOUND_BUTTONS = [
  { id: "rain", label: "🌧️ Rain" },
  { id: "cafe", label: "☕ Cafe" },
  { id: "alpha", label: "🌊 Alpha Waves" },
  { id: "forest", label: "🌲 Forest" },
  { id: "off", label: "🔇 Mute Ambience" }
];

export default function CommunityView() {
  const { userProfile, age_cohort, progress, awardXP, showToast, pendingCommunityShare, setPendingCommunityShare } = useApp();

  const userCohort = age_cohort || userProfile?.age_cohort || userProfile?.cohort || "Teen";
  const userLevel = calculateLevel(progress?.xp || 0);

  // ── PHASE 1: Active Subject Server State (Far-Left Server Rail) ──
  const [activeServerId, setActiveServerId] = useState("physics");

  // ── PHASE 2: Active Text Channel State ──
  const [activeChannelId, setActiveChannelId] = useState("general-discourse");

  const [messages, setMessages] = useState(loadStoredCommunityMessages);

  const [inputText, setInputText] = useState("");
  // This inline alert accompanies the toast so a blocked post is accessible
  // even if the transient toast has already faded from the screen.
  const [moderationNotice, setModerationNotice] = useState("");

  // ── PHASE 3: Voice Room Dynamic State ──
  const [activeVoiceRoom, setActiveVoiceRoom] = useState(null);

  // ── PHASE 4: Ambient Audio State Machine ──
  const [activeSound, setActiveSound] = useState(null);
  const audioRef = useRef(new Audio());

  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Modal State for Breakthrough Shares
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDraft, setShareDraft] = useState("");

  const chatEndRef = useRef(null);

  // Active helpers
  const activeServer = SUBJECT_SERVERS.find(s => s.id === activeServerId) || SUBJECT_SERVERS[0];
  const activeChannel = TEXT_CHANNELS.find(c => c.id === activeChannelId) || TEXT_CHANNELS[0];

  // Auto-scroll chat when channel messages update
  useEffect(() => {
    if (!activeVoiceRoom) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeChannelId, activeServerId, activeVoiceRoom]);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("ag2_chat_messages_v3", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Pomodoro countdown timer when in active voice/focus session
  useEffect(() => {
    if (!activeVoiceRoom || !isTimerRunning) return;
    const interval = setInterval(() => {
      setPomodoroSeconds(prev => {
        if (prev <= 1) {
          if (showToast) showToast("⏰ 25-minute Focus Session complete! +15 XP awarded");
          if (awardXP) awardXP(15, "Completed Pomodoro Focus Session");
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeVoiceRoom, isTimerRunning, awardXP, showToast]);

  // PHASE 4: Ambient sound cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // PHASE 4: Audio State Machine Toggle Handler
  const handleToggleSound = (soundKey) => {
    if (activeSound === soundKey || !soundKey || soundKey === "off") {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setActiveSound(null);
      if (showToast) showToast("🔇 Ambient sound muted");
      return;
    }

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = AUDIO_SOURCES[soundKey];
        audioRef.current.load();
        audioRef.current.loop = true;
        audioRef.current.play().catch(e => console.warn("Audio autoplay blocked or failed:", e));
        setActiveSound(soundKey);
        if (showToast) {
          const btn = AMBIENT_SOUND_BUTTONS.find(b => b.id === soundKey);
          showToast(`Playing ${btn?.label || soundKey}`);
        }
      } catch (err) {
        console.warn("Audio setup error:", err);
      }
    }
  };

  // Auto-open share modal if an AI Tutor breakthrough occurred
  useEffect(() => {
    if (pendingCommunityShare) {
      setShareDraft(pendingCommunityShare.text || "");
      setShowShareModal(true);
    }
  }, [pendingCommunityShare]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ── PHASE 2: Send Message Tagged with channelId & serverId ──
  const handleSendMessage = (e) => {
    e?.preventDefault();
    const raw = String(inputText || "").trim().slice(0, MAX_COMMUNITY_MESSAGE_LENGTH);
    if (!raw) return;

    // Run the cohort policy before creating a message. A blocked Youth-cohort
    // post is deliberately not appended, persisted, or rewarded with XP.
    const moderation = moderateCommunityMessage(raw, userCohort);
    if (!moderation.allowed) {
      setInputText("");
      setModerationNotice(moderation.warning);
      showToast(`⚠️ ${moderation.warning}`);
      return;
    }

    const newMsg = {
      id: createCommunityMessageId("msg"),
      serverId: activeServerId,
      channelId: activeChannelId,
      author: userProfile?.username || progress.name || "Student",
      role: `Level ${userLevel}`,
      cohort: userCohort,
      level: userLevel,
      streak: progress.streak || 1,
      text: moderation.text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText("");
    setModerationNotice("");
    awardXP(5, `Shared message in #${activeChannel.name}`);
  };

  const handlePublishShare = () => {
    const raw = String(shareDraft || "").trim().slice(0, MAX_COMMUNITY_MESSAGE_LENGTH);
    if (!raw) return;

    // AI Tutor shares use the same enforcement point as ordinary chat messages
    // so the modal cannot bypass the Cohort-A/B language policy.
    const moderation = moderateCommunityMessage(raw, userCohort);
    if (!moderation.allowed) {
      setShareDraft("");
      setShowShareModal(false);
      setPendingCommunityShare(null);
      setModerationNotice(moderation.warning);
      showToast(`⚠️ ${moderation.warning}`);
      return;
    }

    const shareMsg = {
      id: createCommunityMessageId("share"),
      serverId: activeServerId,
      channelId: activeChannelId,
      author: userProfile?.username || progress.name || "Student",
      role: "Breakthrough Scholar",
      cohort: userCohort,
      level: userLevel,
      streak: progress.streak || 1,
      text: `✨ **[AI Tutor Breakthrough Shared]**\n\n${moderation.text}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, shareMsg]);
    setShowShareModal(false);
    setPendingCommunityShare(null);
    setModerationNotice("");
    awardXP(25, "Shared insight with community");
    showToast(`🎉 Insight published to #${activeChannel.name}! +25 XP`);
  };

  // ── PHASE 2: Filter by location and the reader's cohort-safety policy ──
  const filteredMessages = messages.filter(
    msg => (
      (msg.channelId || "general-discourse") === activeChannelId &&
      (!msg.serverId || msg.serverId === activeServerId) &&
      isCommunityMessageVisibleToCohort(msg.text, userCohort)
    )
  );

  const cohortPeers = [
    { name: userProfile?.username || "You", level: userLevel, status: "online", streak: progress.streak || 1 },
    { name: "Dev_K", level: 5, status: "studying", streak: 4 },
    { name: "Priya_M", level: 9, status: "in-lounge", streak: 15 },
    { name: "Zaid_Physics", level: 7, status: "online", streak: 8 }
  ];

  const currentRoomObj = VOICE_ROOMS.find(r => r.id === activeVoiceRoom);

  return (
    <div className="pg" style={{ padding: "0 10px 20px 10px" }}>
      {/* Discord Window Shell */}
      <div
        style={{
          display: "flex",
          height: "82vh",
          background: "#0f111a",
          borderRadius: "16px",
          border: "1px solid var(--bd)",
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)"
        }}
      >
        {/* ══════════════════════════════════════════════════════════
           PHASE 1: FAR-LEFT SERVER RAIL (Subject Hubs: P, C, M)
           ══════════════════════════════════════════════════════════ */}
        <div
          style={{
            width: "68px",
            background: "#08090e",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "14px 0",
            gap: "12px",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            userSelect: "none"
          }}
        >
          {/* Global AG2 Community Hub Crest */}
          <div
            title={`Edunurd Academic Servers`}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem",
              boxShadow: "0 0 16px rgba(168, 85, 247, 0.4)",
              cursor: "pointer"
            }}
          >
            🛡️
          </div>

          <div style={{ width: "32px", height: "2px", background: "rgba(255,255,255,0.1)", borderRadius: "2px" }} />

          {/* Unlocked Subject Servers: Physics, Chemistry, Math */}
          {SUBJECT_SERVERS.map(server => {
            const isActive = activeServerId === server.id;
            return (
              <div
                key={server.id}
                onClick={() => {
                  setActiveServerId(server.id);
                  setActiveVoiceRoom(null); // Return from voice room to channel view on server change
                }}
                title={`${server.name} Server (${server.topic})`}
                style={{
                  position: "relative",
                  width: "48px",
                  height: "48px",
                  borderRadius: isActive ? "16px" : "50%",
                  background: isActive ? server.bg : "rgba(255,255,255,0.04)",
                  border: isActive ? `2px solid ${server.border}` : "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: 800,
                  color: isActive ? "#ffffff" : "#94a3b8",
                  boxShadow: isActive ? `0 0 18px ${server.border}88` : "none",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              >
                {/* Discord-style left active pill */}
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      left: "-10px",
                      width: "4px",
                      height: "32px",
                      borderRadius: "0 4px 4px 0",
                      background: server.border,
                      boxShadow: `0 0 8px ${server.border}`
                    }}
                  />
                )}
                <span>{server.short}</span>
              </div>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════
           SECONDARY SIDEBAR: Text Channels & Voice Lounges
           ══════════════════════════════════════════════════════════ */}
        <div
          style={{
            width: "220px",
            background: "#121420",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            padding: "12px"
          }}
        >
          {/* Server Header */}
          <div style={{ paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "16px" }}>{activeServer.icon}</span>
              <b style={{ fontSize: "0.95rem", color: "#fff" }}>{activeServer.name} Hub</b>
            </div>
            <span
              className="badge"
              style={{
                fontSize: "10px",
                background: "rgba(34, 197, 94, 0.15)",
                color: "var(--g)",
                marginTop: "4px",
                display: "inline-block"
              }}
            >
              ● {userCohort} Cohort Verified
            </span>
          </div>

          {/* Text Channels List (PHASE 2: Restored Pedagogical Channels) */}
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
            Text Channels
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
            {TEXT_CHANNELS.map(ch => {
              const isSelected = !activeVoiceRoom && activeChannelId === ch.id;

              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChannelId(ch.id);
                    setActiveVoiceRoom(null); // Return from voice room to chat
                  }}
                  title={ch.topic}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: isSelected ? "rgba(168, 85, 247, 0.18)" : "transparent",
                    color: isSelected ? "#fff" : "#94a3b8",
                    border: isSelected ? "1px solid rgba(168, 85, 247, 0.35)" : "1px solid transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: isSelected ? 600 : 400,
                    transition: "all 0.15s ease"
                  }}
                >
                  <span>{ch.icon}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    #{ch.name}
                  </span>
                </button>
              );
            })}

            {/* Voice & Study Rooms (PHASE 3: Dynamic Member Count) */}
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginTop: "14px", marginBottom: "6px" }}>
              Voice &amp; Study Rooms
            </div>
            {VOICE_ROOMS.map(room => {
              const isConnected = activeVoiceRoom === room.id;
              // Dynamic member count: includes current user when connected
              const memberCount = (room.activeStudents?.length || 0) + (isConnected ? 1 : 0);

              return (
                <button
                  key={room.id}
                  onClick={() => {
                    if (isConnected) {
                      setActiveVoiceRoom(null);
                      showToast(`Disconnected from ${room.name}`);
                    } else {
                      setActiveVoiceRoom(room.id);
                      showToast(`Connected to ${room.name} 🎧`);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: isConnected ? "rgba(34, 197, 94, 0.2)" : "transparent",
                    color: isConnected ? "var(--g)" : "#94a3b8",
                    border: isConnected ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: isConnected ? 600 : 400,
                    transition: "all 0.15s ease"
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{isConnected ? "🟢" : "🔊"}</span>
                    <span>{room.name}</span>
                  </span>
                  <span className="badge" style={{ fontSize: "10px", background: isConnected ? "rgba(34, 197, 94, 0.3)" : "rgba(255,255,255,0.06)" }}>
                    {memberCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* User Profile Mini Bar */}
          <div
            style={{
              padding: "10px",
              background: "rgba(0,0,0,0.3)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: getAvatarColor(userProfile?.username || "You"),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "12px"
              }}
            >
              {(userProfile?.username || "Y")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: "12px", display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                {userProfile?.username || progress.name || "Student"}
              </b>
              <span className="mu" style={{ fontSize: "10px" }}>
                Level {userLevel} · {progress.streak || 1}🔥
              </span>
            </div>
          </div>
        </div>

        {/* ── CENTER COLUMN: ACTIVE STUDY SESSION OR CHANNEL CHAT ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#161926", position: "relative" }}>
          
          {activeVoiceRoom ? (
            /* ══════════════════════════════════════════════════════════
               PHASE 3 & 4: ACTIVE STUDY SESSION & AMBIENT AUDIO
               ══════════════════════════════════════════════════════════ */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#11131f" }}>
              {/* Study Room Top Navigation */}
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(0,0,0,0.2)"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "20px" }}>🎧</span>
                    <b style={{ fontSize: "1.1rem" }}>{currentRoomObj?.name || "Active Study Room"}</b>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: "rgba(34, 197, 94, 0.2)",
                        color: "#4ade80",
                        border: "1px solid rgba(34, 197, 94, 0.3)"
                      }}
                    >
                      ● Connected · RTC Study Mesh
                    </span>
                  </div>
                  <span className="mu" style={{ fontSize: "12px", marginTop: "2px", display: "block" }}>
                    Spatial Audio &amp; Synchronized Pomodoro Focus Timer Active
                  </span>
                </div>

                {/* Disconnect / Leave Room Button */}
                <button
                  onClick={() => {
                    setActiveVoiceRoom(null);
                    showToast("Disconnected from study session");
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.2)",
                    color: "#f87171",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span>❌</span>
                  <span>Leave Room</span>
                </button>
              </div>

              {/* Study Room Body: Pomodoro & Ambient Sound Stage */}
              <div
                style={{
                  flex: 1,
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "20px"
                }}
              >
                {/* Large Pomodoro Display */}
                <div
                  style={{
                    padding: "24px 48px",
                    borderRadius: "24px",
                    background: "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15) 0%, rgba(15, 17, 26, 0.8) 70%)",
                    border: "1px solid rgba(139, 92, 246, 0.3)",
                    textAlign: "center",
                    boxShadow: "0 0 40px rgba(139, 92, 246, 0.15)"
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ac2)", letterSpacing: "2px", textTransform: "uppercase" }}>
                    {isTimerRunning ? "Deep Focus Block" : "Timer Paused"}
                  </div>

                  <div style={{ fontSize: "3.8rem", fontWeight: 800, color: "#fff", letterSpacing: "2px", margin: "8px 0" }}>
                    {formatTime(pomodoroSeconds)}
                  </div>

                  {/* Timer Controls */}
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                    <button
                      onClick={() => setIsTimerRunning(prev => !prev)}
                      style={{
                        padding: "8px 18px",
                        borderRadius: "10px",
                        background: isTimerRunning ? "rgba(245, 158, 11, 0.2)" : "rgba(34, 197, 94, 0.25)",
                        color: isTimerRunning ? "#fbbf24" : "#4ade80",
                        border: `1px solid ${isTimerRunning ? "rgba(245, 158, 11, 0.4)" : "rgba(34, 197, 94, 0.4)"}`,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {isTimerRunning ? "⏸️ Pause" : "▶️ Resume"}
                    </button>
                    <button
                      onClick={() => {
                        setPomodoroSeconds(25 * 60);
                        setIsTimerRunning(false);
                      }}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.06)",
                        color: "#fff",
                        border: "1px solid var(--bd)",
                        cursor: "pointer"
                      }}
                    >
                      🔄 Reset (25m)
                    </button>
                    <button
                      onClick={() => {
                        setPomodoroSeconds(5 * 60);
                        setIsTimerRunning(true);
                      }}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: "rgba(34, 211, 238, 0.15)",
                        color: "var(--ac2)",
                        border: "1px solid rgba(34, 211, 238, 0.3)",
                        cursor: "pointer"
                      }}
                    >
                      ☕ 5m Break
                    </button>
                  </div>
                </div>

                {/* PHASE 4: Ambient Study Track Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                  <span className="mu" style={{ fontSize: "12px", marginRight: "4px" }}>Ambient Sound:</span>
                  {AMBIENT_SOUND_BUTTONS.map(sound => (
                    <button
                      key={sound.id}
                      onClick={() => handleToggleSound(sound.id)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        background: activeSound === sound.id ? "rgba(139, 92, 246, 0.3)" : "rgba(255,255,255,0.04)",
                        color: activeSound === sound.id ? "#c084fc" : "#94a3b8",
                        border: `1px solid ${activeSound === sound.id ? "#a855f7" : "rgba(255,255,255,0.08)"}`,
                        cursor: "pointer",
                        fontWeight: activeSound === sound.id ? 600 : 400,
                        transition: "all 0.15s ease"
                      }}
                    >
                      {sound.label}
                    </button>
                  ))}
                </div>

                {/* Connected Peers in Study Room */}
                <div style={{ width: "100%", maxWidth: "560px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px", textAlign: "center" }}>
                    Active Students in Session ({(currentRoomObj?.activeStudents?.length || 0) + 1})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                    {/* User Card */}
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "12px",
                        background: "rgba(139, 92, 246, 0.12)",
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        gap: "6px"
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: getAvatarColor(userProfile?.username || "You"),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "13px",
                          fontWeight: 700,
                          position: "relative"
                        }}
                      >
                        {(userProfile?.username || "Y")[0].toUpperCase()}
                        <span
                          style={{
                            position: "absolute",
                            bottom: "-2px",
                            right: "-2px",
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: isMuted ? "#ef4444" : "#22c55e",
                            border: "2px solid #11131f"
                          }}
                        />
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 600 }}>{userProfile?.username || "You"} (You)</div>
                      <span className="mu" style={{ fontSize: "10px" }}>{isMuted ? "Muted" : "Active"}</span>
                    </div>

                    {/* Room Peers */}
                    {(currentRoomObj?.activeStudents || []).map((peer, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "10px",
                          borderRadius: "12px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          gap: "6px"
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: getAvatarColor(peer.name),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "13px",
                            fontWeight: 700,
                            position: "relative"
                          }}
                        >
                          {peer.name[0].toUpperCase()}
                          <span
                            style={{
                              position: "absolute",
                              bottom: "-2px",
                              right: "-2px",
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: "#22c55e",
                              border: "2px solid #11131f"
                            }}
                          />
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>{peer.name}</div>
                        <span className="mu" style={{ fontSize: "10px" }}>Focusing...</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Study Room Audio Controls Bottom Bar */}
              <div
                style={{
                  padding: "12px 20px",
                  background: "#0c0e18",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  justifyContent: "center",
                  gap: "14px"
                }}
              >
                <button
                  onClick={() => {
                    setIsMuted(prev => !prev);
                    showToast(!isMuted ? "Microphone muted" : "Microphone unmuted");
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    background: isMuted ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.08)",
                    color: isMuted ? "#f87171" : "#fff",
                    border: "1px solid var(--bd)",
                    cursor: "pointer",
                    fontSize: "0.85rem"
                  }}
                >
                  {isMuted ? "🔇 Mic Muted" : "🎙️ Mic On"}
                </button>

                <button
                  onClick={() => {
                    setIsDeafened(prev => !prev);
                    showToast(!isDeafened ? "Deafened audio" : "Undeafened audio");
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    background: isDeafened ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.08)",
                    color: isDeafened ? "#f87171" : "#fff",
                    border: "1px solid var(--bd)",
                    cursor: "pointer",
                    fontSize: "0.85rem"
                  }}
                >
                  {isDeafened ? "🔇 Audio Deafened" : "🎧 Sound On"}
                </button>
              </div>
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════════
               PHASE 2: STANDARD TEXT CHAT VIEW (#general-discourse, etc.)
               ══════════════════════════════════════════════════════════ */
            <>
              {/* Channel Header Bar */}
              <div
                style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: activeServer.border,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginRight: "8px"
                    }}
                  >
                    {activeServer.name}
                  </span>
                  <b style={{ fontSize: "1rem" }}>#{activeChannel.name}</b>
                  <span className="mu" style={{ marginLeft: "10px", fontSize: "0.82rem" }}>
                    {activeChannel.topic}
                  </span>
                </div>
                {pendingCommunityShare && (
                  <button
                    className="chip"
                    onClick={() => setShowShareModal(true)}
                    style={{ background: "rgba(168,85,247,0.2)", color: "#c084fc", borderColor: "#a855f7" }}
                  >
                    ✨ Share AI Insight
                  </button>
                )}
              </div>

              {/* Messages Stream (Filtered Strictly by activeChannelId & activeServerId) */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px"
                }}
              >
                {filteredMessages.length === 0 ? (
                  <div style={{ textAlign: "center", margin: "auto", color: "var(--mu)", fontSize: "0.9rem" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>💬</div>
                    <b>Welcome to #{activeChannel.name} in {activeServer.name}!</b>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem" }}>
                      This channel is dedicated to {activeChannel.topic}. Start the discussion below!
                    </p>
                  </div>
                ) : (
                  filteredMessages.map(msg => (
                    <div key={msg.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: getAvatarColor(msg.author),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "13px",
                          flex: "none"
                        }}
                      >
                        {msg.author[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "2px" }}>
                          <b style={{ fontSize: "0.92rem" }}>{msg.author}</b>
                          <span
                            className="badge"
                            style={{
                              fontSize: "10px",
                              padding: "1px 6px",
                              background: "rgba(168,85,247,0.15)",
                              color: "var(--ac2)"
                            }}
                          >
                            {msg.role}
                          </span>
                          <span className="mu" style={{ fontSize: "11px" }}>{msg.streak}🔥 streak</span>
                          <span className="mu" style={{ fontSize: "11px" }}>{msg.time}</span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.92rem",
                            lineHeight: "1.5",
                            color: "#e2e8f0",
                            whiteSpace: "pre-wrap"
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input Box */}
              <div
                style={{
                  padding: "14px 18px",
                  background: "#121420",
                  borderTop: "1px solid rgba(255,255,255,0.06)"
                }}
              >
                <form
                  onSubmit={handleSendMessage}
                  style={{ display: "flex", gap: "10px" }}
                >
                  <input
                    type="text"
                    maxLength={MAX_COMMUNITY_MESSAGE_LENGTH}
                    aria-describedby={moderationNotice ? "community-moderation-notice" : undefined}
                    placeholder={`Message #${activeChannel.name} in ${activeServer.name} (Safety filtered)…`}
                    value={inputText}
                    onChange={e => {
                      setInputText(e.target.value);
                      if (moderationNotice) setModerationNotice("");
                    }}
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      color: "#fff",
                      fontSize: "0.92rem"
                    }}
                  />
                  <button type="submit" style={{ padding: "0 18px", fontWeight: 600 }}>
                    Send
                  </button>
                </form>
                {moderationNotice && (
                  <p
                    id="community-moderation-notice"
                    role="alert"
                    style={{ margin: "9px 2px 0", color: "#fbbf24", fontSize: "12px", lineHeight: "1.4" }}
                  >
                    ⚠️ {moderationNotice}
                  </p>
                )}
              </div>
            </>
          )}

        </div>

        {/* Right Rail: Active Peers */}
        <div
          style={{
            width: "200px",
            background: "#121420",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Online in {userCohort} ({cohortPeers.length})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {cohortPeers.map((peer, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: getAvatarColor(peer.name),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700
                  }}
                >
                  {peer.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {peer.name}
                  </div>
                  <div className="mu" style={{ fontSize: "10px" }}>
                    Lv {peer.level} · {peer.streak}🔥
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "16px", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "10px" }}>
            <b style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--ac2)", display: "block", marginBottom: "4px" }}>
              Cohort Goal
            </b>
            <div style={{ fontSize: "12px", color: "#e2e8f0" }}>
              Solve 50 active recall cards together today.
            </div>
          </div>
        </div>
      </div>

      {/* Community Share Modal (Triggered by AI Tutor breakthrough) */}
      {showShareModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "24px",
              background: "#161926",
              border: "1px solid var(--ac2)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "1.4rem" }}>🌟</span>
              <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Share Your AI Tutor Breakthrough</h2>
            </div>
            <p className="mu" style={{ fontSize: "0.85rem", margin: "4px 0 14px 0" }}>
              Your accuracy was verified at <b>&gt;90%</b>! Share your logic with your {userCohort} peers in #{activeChannel.name} to earn +25 XP.
            </p>
            <textarea
              rows={5}
              maxLength={MAX_COMMUNITY_MESSAGE_LENGTH}
              value={shareDraft}
              onChange={e => {
                setShareDraft(e.target.value);
                if (moderationNotice) setModerationNotice("");
              }}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "10px",
                padding: "10px",
                color: "#fff",
                fontFamily: "inherit",
                fontSize: "0.9rem"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
              <button
                className="alt"
                onClick={() => {
                  setShowShareModal(false);
                  setPendingCommunityShare(null);
                }}
              >
                Skip for now
              </button>
              <button onClick={handlePublishShare}>
                Post to #{activeChannel.name} (+25 XP)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
