// Connection: src/views/StudyTimerView.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Runs Pomodoro phases, ambient sounds, reminders, and study-minute recording.
/**
 * Anti Gravity 2.0 - Study Timer (Pomodoro) View (StudyTimerView.jsx)
 * ===================================================================
 * Manages timed focus blocks and recovery intervals:
 * - Circular SVG progress countdown gauge with tap-to-toggle
 * - Sound alerts via Web Audio oscillator (playChime)
 * - Phase 4: Robust Ambient Audio Engine (Rain, Cafe, Alpha Waves, Forest) with audioRef
 * - Classic four-focus-session cycle with an automatic long break
 * - Browser notifications for stretch & hydration reminders
 * - Synchronizes accumulated study minutes with user progress and XP
 */

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { formatTimeMMSS } from "../utils/helpers";
import { playChime } from "../utils/sound";

// ── PHASE 4: Verified Audio Sources Dictionary ──
const AUDIO_SOURCES = {
  rain: "https://actions.google.com/sounds/v1/weather/rain_on_roof.ogg",
  cafe: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
  alpha: "https://actions.google.com/sounds/v1/science_fiction/ringing_ambient_background.ogg",
  forest: "https://actions.google.com/sounds/v1/weather/forest_wind_summer.ogg"
};

const AMBIENT_SOUND_BUTTONS = [
  { id: "rain", label: "🌧️ Rain" },
  { id: "cafe", label: "☕ Cafe" },
  { id: "alpha", label: "🌊 Alpha Waves" },
  { id: "forest", label: "🌲 Forest" },
  { id: "off", label: "🔇 Mute Ambience" }
];

export default function StudyTimerView({ embedded = false }) {
  const { progress, saveProgress, recordStudyMinutes, resetTodayStudyProgress, checkDailyGoal, awardXP, setTimerOverlay, showToast } = useApp();

  const [timerMode, setTimerMode] = useState("f"); // 'f' = focus, 'b' = short break, 'l' = long break
  const [isRunning, setIsRunning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(() => (progress?.tf || 30) * 60);
  const [pomodoroSessions, setPomodoroSessions] = useState(() => Math.max(0, Number(progress?.pomodoroSessions) || 0));

  // ── PHASE 4: Ambient Audio State Machine with useRef(new Audio()) ──
  const [activeSound, setActiveSound] = useState(null);
  const [ambientVolume, setAmbientVolume] = useState(() => {
    try {
      const stored = Number(localStorage.getItem("edunerd_ambient_volume"));
      return Number.isFinite(stored) ? Math.max(0, Math.min(1, stored)) : 0.35;
    } catch {
      return 0.35;
    }
  });
  const audioRef = useRef(null);
  const audioRequestRef = useRef(0);

  const timerRef = useRef(null);
  const endTimestampRef = useRef(0);

  const focusDuration = progress?.tf || 30;
  const breakDuration = progress?.tb || 5;
  const longBreakDuration = progress?.tl || 15;
  const durationForMode = mode => mode === "f" ? focusDuration : mode === "l" ? longBreakDuration : breakDuration;
  const targetDurationSeconds = durationForMode(timerMode) * 60;
  const presets = timerMode === "f" ? [15, 25, 30, 45, 60] : timerMode === "l" ? [15, 20, 30] : [5, 10, 15, 20];
  const cycleProgress = pomodoroSessions % 4;

  // Create the media element after mount so the controls work in every browser
  // and never leave a playing audio node behind after navigation.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = true;
    audio.volume = ambientVolume;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = ambientVolume;
    try { localStorage.setItem("edunerd_ambient_volume", String(ambientVolume)); } catch {}
  }, [ambientVolume]);

  // Recalculate remaining seconds when mode changes if stopped
  useEffect(() => {
    if (!isRunning) {
      setSecondsRemaining(targetDurationSeconds);
    }
  }, [timerMode, focusDuration, breakDuration, longBreakDuration, isRunning]);

  // Main countdown interval
  useEffect(() => {
    if (isRunning) {
      endTimestampRef.current = Date.now() + secondsRemaining * 1000;
      timerRef.current = setInterval(() => {
        const left = Math.max(0, Math.round((endTimestampRef.current - Date.now()) / 1000));
        setSecondsRemaining(left);

        if (left <= 0) {
          clearInterval(timerRef.current);
          setIsRunning(false);
          handleTimerCompleted();
        }
      }, 250);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  // PHASE 4: Ambient sound cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
      }
    };
  }, []);

  // PHASE 4: Ambient Sound Playback Toggle Handler
  const handleToggleSound = async soundKey => {
    const audio = audioRef.current;
    const requestId = ++audioRequestRef.current;

    if (activeSound === soundKey || !soundKey || soundKey === "off") {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute("src");
        audio.load();
      }
      setActiveSound(null);
      showToast("🔇 Ambient sound muted");
      return;
    }

    if (!audio || !AUDIO_SOURCES[soundKey]) return;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = AUDIO_SOURCES[soundKey];
      audio.loop = true;
      audio.volume = ambientVolume;
      audio.load();
      // This call happens directly from the user's button click. Awaiting it
      // lets the UI distinguish real playback from a blocked or failed source.
      await audio.play();
      if (requestId !== audioRequestRef.current) return;
      setActiveSound(soundKey);
      const btn = AMBIENT_SOUND_BUTTONS.find(b => b.id === soundKey);
      showToast(`Playing ${btn?.label || soundKey}`);
    } catch (err) {
      if (requestId !== audioRequestRef.current) return;
      setActiveSound(null);
      showToast("This ambient track could not start. Click the sound button again to retry.");
      console.warn("Audio setup error:", err);
    }
  };

  const handleTimerCompleted = () => {
    playChime();
    const wasFocus = timerMode === "f";
    const completed = wasFocus ? pomodoroSessions + 1 : pomodoroSessions;
    const nextMode = wasFocus ? (completed % 4 === 0 ? "l" : "b") : "f";
    const nextBreakDuration = nextMode === "l" ? longBreakDuration : breakDuration;

    if (wasFocus) {
      const addedMinutes = focusDuration;
      if (recordStudyMinutes) {
        recordStudyMinutes(addedMinutes, "pomodoro");
      } else {
        // Compatibility fallback for an older context bundle.
        const newTotal = (progress?.min || 0) + addedMinutes;
        if (checkDailyGoal) checkDailyGoal(newTotal);
        saveProgress({ min: newTotal });
      }
      saveProgress({ fm: (progress?.fm || 0) + addedMinutes });
      if (awardXP) awardXP(addedMinutes, "focus session");
    }

    if (setTimerOverlay) {
      setTimerOverlay({
        open: true,
        title: wasFocus ? "Time's up!" : "Break over!",
        message: wasFocus
          ? `You studied for ${focusDuration} minutes. Take a ${nextBreakDuration}-minute rest: stretch, drink water, rest your eyes.`
          : "Ready for the next focus session?"
      });
    }

    // After four focus sessions, schedule a restorative long break.
    if (wasFocus) {
      setPomodoroSessions(completed);
      saveProgress({ pomodoroSessions: completed });
    } else if (timerMode === "l") {
      setPomodoroSessions(0);
      saveProgress({ pomodoroSessions: 0 });
    }
    setTimerMode(nextMode);
    setSecondsRemaining(durationForMode(nextMode) * 60);
  };

  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      if (secondsRemaining <= 0) {
        setSecondsRemaining(targetDurationSeconds);
      }
      setIsRunning(true);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsRemaining(targetDurationSeconds);
  };

  const resetTodayProgress = () => {
    resetTimer();
    if (resetTodayStudyProgress) resetTodayStudyProgress();
  };

  const skipTimer = () => {
    setIsRunning(false);
    const nextMode = timerMode === "f" ? "b" : "f";
    setTimerMode(nextMode);
    setSecondsRemaining(durationForMode(nextMode) * 60);
  };

  const adjustDuration = delta => {
    const key = timerMode === "f" ? "tf" : timerMode === "l" ? "tl" : "tb";
    const current = durationForMode(timerMode);
    const nextVal = Math.max(1, Math.min(180, current + delta));
    saveProgress({ [key]: nextVal });
    if (!isRunning) setSecondsRemaining(nextVal * 60);
  };

  const setSpecificDuration = val => {
    const key = timerMode === "f" ? "tf" : timerMode === "l" ? "tl" : "tb";
    saveProgress({ [key]: val });
    if (!isRunning) setSecondsRemaining(val * 60);
  };

  // Gauge calculation
  const circumference = 276.5;
  const strokeOffset = circumference * (1 - Math.min(1, secondsRemaining / targetDurationSeconds));

  return (
    <div className={embedded ? "" : "pg"}>
      <h1>⏱️ Study timer</h1>

      <div className="row" style={{ justifyContent: "center" }}>
        <button
          className={timerMode === "f" ? "" : "alt"}
          onClick={() => { setIsRunning(false); setTimerMode("f"); }}
        >
          🎯 Focus
        </button>
        <button
          className={timerMode === "b" ? "" : "alt"}
          onClick={() => { setIsRunning(false); setTimerMode("b"); }}
        >
          ☕ Break
        </button>
        <button
          className={timerMode === "l" ? "" : "alt"}
          onClick={() => { setIsRunning(false); setTimerMode("l"); }}
        >
          🌿 Long break
        </button>
      </div>

      {/* Circular Progress Gauge */}
      <div
        id="tw"
        onClick={toggleTimer}
        style={{ textAlign: "center", margin: "10px 0", cursor: "pointer" }}
      >
        <svg viewBox="0 0 110 110" width="190" height="190" className={isRunning ? "trun" : ""}>
          <g transform="rotate(-90 55 55)">
            <circle cx="55" cy="55" r="44" fill="none" stroke="var(--bd)" strokeWidth="8" />
            <circle
              id="tr"
              cx="55"
              cy="55"
              r="44"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              style={{
                stroke: timerMode === "f" ? "var(--ac2)" : "var(--g)",
                transition: "stroke-dashoffset 0.4s linear"
              }}
            />
          </g>
          <text
            x="55"
            y="61"
            textAnchor="middle"
            fill="var(--tx)"
            fontSize="21"
            fontWeight="700"
            fontFamily="system-ui"
          >
            {formatTimeMMSS(secondsRemaining)}
          </text>
        </svg>
        <div className="mu" id="tm">
          {timerMode === "f" ? "🎯 Focus time" : timerMode === "l" ? "🌿 Long break" : "☕ Break time"}
        </div>
        <div className="mu" style={{ fontSize: "12px" }}>Tap gauge to start or pause</div>
      </div>

      {/* Main Controls */}
      <div className="row" style={{ justifyContent: "center" }}>
        <button className="alt" onClick={() => adjustDuration(-5)}>−5</button>
        <button id="t1" style={{ minWidth: "110px" }} onClick={toggleTimer}>
          {isRunning ? "⏸ Pause" : "▶ Start"}
        </button>
        <button className="alt" onClick={() => adjustDuration(5)}>+5</button>
      </div>

      <div className="row" style={{ justifyContent: "center", marginTop: "8px" }}>
        <button className="alt" onClick={resetTimer}>↺ Reset</button>
        <button className="alt" onClick={skipTimer}>⏭ Skip</button>
      </div>
      <div className="row" style={{ justifyContent: "center", marginTop: "8px" }}>
        <button className="alt" onClick={resetTodayProgress} style={{ color: "#fca5a5", borderColor: "rgba(248,113,113,0.4)" }}>
          ↺ Reset today&apos;s goal progress
        </button>
      </div>

      <div className="mu" style={{ textAlign: "center", fontSize: "12px", marginTop: "10px" }}>
        {timerMode === "l" ? "✅ Four focus sessions complete · take a longer recovery break" : `Cycle progress: ${cycleProgress}/4 focus sessions`}
      </div>

      {/* ── PHASE 4: Ambient Sound Selector (Integrated below Reset/Skip) ── */}
      <div style={{ marginTop: "18px", marginBottom: "8px", textAlign: "center" }}>
        <div className="mu" style={{ fontSize: "12px", marginBottom: "6px" }}>🎧 Ambient Focus Sounds</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
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
        <div className="row" style={{ justifyContent: "center", gap: "8px", marginTop: "10px" }}>
          <span className="mu" style={{ fontSize: "12px" }}>Volume</span>
          <input
            aria-label="Ambient sound volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={ambientVolume}
            onChange={e => setAmbientVolume(Number(e.target.value))}
            style={{ width: "150px", accentColor: "#22d3ee" }}
          />
          <span className="mu" style={{ fontSize: "12px", minWidth: "34px" }}>{Math.round(ambientVolume * 100)}%</span>
        </div>
      </div>

      {/* Preset Chips */}
      <div style={{ marginTop: "12px" }}>
        {presets.map(p => (
          <button
            key={p}
            className="chip"
            style={{ borderColor: durationForMode(timerMode) === p ? "var(--ac2)" : undefined }}
            onClick={() => setSpecificDuration(p)}
          >
            {p} min
          </button>
        ))}
      </div>

      {!embedded && (
        <>
          <div className="row" style={{ justifyContent: "space-between", marginTop: "14px" }}>
            <span className="mu">{timerMode === "f" ? "Focus" : timerMode === "l" ? "Long break" : "Break"} length</span>
            <b>{durationForMode(timerMode)} min</b>
          </div>
          <input
            type="range"
            min="1"
            max={timerMode === "f" ? 120 : timerMode === "l" ? 60 : 30}
            value={durationForMode(timerMode)}
            onChange={e => setSpecificDuration(+e.target.value)}
            style={{ width: "100%", accentColor: "#8b5cf6" }}
          />

          <div className="row" style={{ justifyContent: "space-between", marginTop: "12px" }}>
            <span className="mu">Daily goal</span>
            <b>{progress?.goal || 30} min</b>
          </div>
          <input
            type="range"
            min="10"
            max="720"
            step="5"
            value={progress?.goal || 30}
            onChange={e => saveProgress({ goal: +e.target.value })}
            style={{ width: "100%", accentColor: "#22d3ee" }}
          />
          <div className="row" style={{ justifyContent: "flex-end", marginTop: "6px", gap: "6px" }}>
            <label className="mu" style={{ fontSize: "12px" }}>
              Exact minutes:
              <input
                aria-label="Exact daily goal in minutes"
                type="number"
                min="10"
                max="720"
                step="5"
                value={progress?.goal || 30}
                onChange={e => saveProgress({ goal: Math.max(10, Math.min(720, Number(e.target.value) || 10)) })}
                style={{ width: "74px", marginLeft: "6px", padding: "4px 6px" }}
              />
            </label>
          </div>

          <div className="row" style={{ justifyContent: "space-between", marginTop: "12px" }}>
            <span className="mu">🔔 Hydration alert every</span>
            <b>{progress?.rm || 10} min</b>
          </div>
          <input
            type="range"
            min="1"
            max="60"
            value={progress?.rm || 10}
            onChange={e => saveProgress({ rm: +e.target.value })}
            style={{ width: "100%", accentColor: "#f472b6" }}
          />

          <div className="row" style={{ marginTop: "10px" }}>
            <button
              className={progress?.rn ? "" : "alt"}
              onClick={() => {
                const nextState = progress?.rn ? 0 : 1;
                if (nextState && "Notification" in window && Notification.permission === "default") {
                  Notification.requestPermission();
                }
                saveProgress({ rn: nextState });
              }}
            >
              {progress?.rn ? "🔔 Reminders on" : "🔕 Reminders off"}
            </button>
            <button
              className="alt"
              onClick={() => {
                playChime();
                if (showToast) showToast("Stretch, drink water & rest your eyes! 💧");
              }}
            >
              Test
            </button>
          </div>
        </>
      )}

      <div className="mu" style={{ marginTop: "10px", fontSize: "13px" }}>
        Today's Focus: {progress?.min || 0} / {progress?.goal || 30} min
      </div>
    </div>
  );
}
