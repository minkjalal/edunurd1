// Connection: src/components/RobotEyes.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Animates the tutor robot expression in response to tutor state.
/**
 * =============================================================================
 * EduNerd - Reactive Robot Eyes Animated Component (RobotEyes.jsx)
 * =============================================================================
 * Lightweight SVG & CSS animated eyes for the AI Tutor:
 * - Default natural blinking animation (3.5s loop).
 * - Reactive state triggers:
 *   1. 'idle': Gentle cyan glow, periodic blinking.
 *   2. 'thinking' / 'processing': High-intensity neon violet scanning animation.
 *   3. 'happy' / 'glowing': Emerald glowing crescents with celebratory bounce.
 *   4. 'confused' / 'encouraging': Warm amber tilted eyes with comforting pulse.
 * =============================================================================
 */

import React from "react";

export default function RobotEyes({ expression = "idle" }) {
  // Normalize expression key
  const mood = (expression || "idle").toLowerCase();
  const isThinking = mood === "thinking" || mood === "processing";
  const isHappy = mood === "happy" || mood === "glowing" || mood === "success";
  const isConfused = mood === "confused" || mood === "encouraging" || mood === "mistake";

  // Dynamic glow and accent color based on expression
  let eyeColor = "#22d3ee";       // Default idle cyan
  let filterColor = "rgba(34, 211, 238, 0.4)";
  let moodLabel = "AI Tutor Online";
  let moodIcon = "✨";

  if (isThinking) {
    eyeColor = "#a855f7";         // Neon violet
    filterColor = "rgba(168, 85, 247, 0.55)";
    moodLabel = "Thinking & Processing...";
    moodIcon = "⚡";
  } else if (isHappy) {
    eyeColor = "#22c55e";         // Emerald green
    filterColor = "rgba(34, 197, 94, 0.55)";
    moodLabel = "Brilliant! Excellent work!";
    moodIcon = "🌟";
  } else if (isConfused) {
    eyeColor = "#f59e0b";         // Warm amber
    filterColor = "rgba(245, 158, 11, 0.55)";
    moodLabel = "Let's break this doubt down!";
    moodIcon = "💡";
  }

  return (
    <div
      className="ag-robot-visor-container"
      style={{
        width: "100%",
        maxWidth: "520px",
        margin: "0 auto 16px",
        padding: "14px 20px",
        background: "linear-gradient(180deg, #12131f 0%, #0c0d16 100%)",
        border: `1px solid ${filterColor}`,
        borderRadius: "20px",
        boxShadow: `0 8px 32px -4px rgba(0, 0, 0, 0.6), 0 0 16px -2px ${filterColor}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none"
      }}
    >
      <style>{`
        /* Base Blinking Animation */
        @keyframes agRobotBlink {
          0%, 88%, 94%, 100% {
            transform: scaleY(1);
          }
          91% {
            transform: scaleY(0.08);
          }
        }

        /* Thinking Scan Pulse */
        @keyframes agRobotThinkingPulse {
          0%, 100% {
            transform: scale(0.92) translateX(-4px);
            filter: drop-shadow(0 0 8px #a855f7);
          }
          50% {
            transform: scale(1.06) translateX(4px);
            filter: drop-shadow(0 0 16px #ec4899);
          }
        }

        /* Happy Celebratory Bounce */
        @keyframes agRobotHappyBounce {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-5px) scale(1.08);
          }
        }

        /* Confused / Encouraging Tilt */
        @keyframes agRobotConfusedTilt {
          0%, 100% {
            transform: rotate(0deg) scale(0.96);
          }
          50% {
            transform: rotate(-3deg) scale(1.02);
          }
        }

        .ag-eye-left, .ag-eye-right {
          transform-origin: center;
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .ag-eye-idle {
          animation: agRobotBlink 3.6s infinite ease-in-out;
        }

        .ag-eye-thinking {
          animation: agRobotThinkingPulse 1.2s infinite ease-in-out;
        }

        .ag-eye-happy {
          animation: agRobotHappyBounce 0.8s infinite ease-in-out;
        }

        .ag-eye-confused {
          animation: agRobotConfusedTilt 1.8s infinite ease-in-out;
        }
      `}</style>

      {/* SVG Face Visor */}
      <svg
        viewBox="0 0 200 64"
        style={{
          width: "160px",
          height: "52px",
          overflow: "visible"
        }}
      >
        <defs>
          <filter id="ag-eye-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Visor Screen Background Track */}
        <rect
          x="10"
          y="8"
          width="180"
          height="48"
          rx="24"
          fill="#06070a"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1.5"
        />

        {/* Left Eye */}
        <g
          className={`ag-eye-left ${
            isThinking
              ? "ag-eye-thinking"
              : isHappy
              ? "ag-eye-happy"
              : isConfused
              ? "ag-eye-confused"
              : "ag-eye-idle"
          }`}
          style={{ transformOrigin: "64px 32px" }}
        >
          {isHappy ? (
            // Smiling crescent arc for happy/glowing performance
            <path
              d="M 48 36 Q 64 16 80 36"
              fill="none"
              stroke={eyeColor}
              strokeWidth="7"
              strokeLinecap="round"
              filter="url(#ag-eye-glow)"
            />
          ) : isThinking ? (
            // Focused horizontal scanning capsule
            <rect
              x="50"
              y="27"
              width="28"
              height="10"
              rx="5"
              fill={eyeColor}
              filter="url(#ag-eye-glow)"
            />
          ) : isConfused ? (
            // Questioning / tilted encouraging pupil
            <g transform="rotate(-10 64 32)">
              <ellipse
                cx="64"
                cy="32"
                rx="14"
                ry="17"
                fill={eyeColor}
                filter="url(#ag-eye-glow)"
              />
              <circle cx="68" cy="28" r="4.5" fill="#ffffff" />
            </g>
          ) : (
            // Default friendly rounded glowing eye
            <g>
              <ellipse
                cx="64"
                cy="32"
                rx="14"
                ry="16"
                fill={eyeColor}
                filter="url(#ag-eye-glow)"
              />
              <circle cx="67" cy="28" r="4.5" fill="#ffffff" />
              <circle cx="60" cy="37" r="2" fill="#ffffff" opacity="0.7" />
            </g>
          )}
        </g>

        {/* Right Eye */}
        <g
          className={`ag-eye-right ${
            isThinking
              ? "ag-eye-thinking"
              : isHappy
              ? "ag-eye-happy"
              : isConfused
              ? "ag-eye-confused"
              : "ag-eye-idle"
          }`}
          style={{ transformOrigin: "136px 32px" }}
        >
          {isHappy ? (
            // Smiling crescent arc for happy/glowing performance
            <path
              d="M 120 36 Q 136 16 152 36"
              fill="none"
              stroke={eyeColor}
              strokeWidth="7"
              strokeLinecap="round"
              filter="url(#ag-eye-glow)"
            />
          ) : isThinking ? (
            // Focused horizontal scanning capsule
            <rect
              x="122"
              y="27"
              width="28"
              height="10"
              rx="5"
              fill={eyeColor}
              filter="url(#ag-eye-glow)"
            />
          ) : isConfused ? (
            // Slightly raised, encouraging supportive pupil
            <g transform="rotate(8 136 32)">
              <ellipse
                cx="136"
                cy="30"
                rx="15"
                ry="18"
                fill={eyeColor}
                filter="url(#ag-eye-glow)"
              />
              <circle cx="140" cy="26" r="4.5" fill="#ffffff" />
            </g>
          ) : (
            // Default friendly rounded glowing eye
            <g>
              <ellipse
                cx="136"
                cy="32"
                rx="14"
                ry="16"
                fill={eyeColor}
                filter="url(#ag-eye-glow)"
              />
              <circle cx="139" cy="28" r="4.5" fill="#ffffff" />
              <circle cx="132" cy="37" r="2" fill="#ffffff" opacity="0.7" />
            </g>
          )}
        </g>
      </svg>

      {/* Reactive Mood Status Badge */}
      <div
        style={{
          marginTop: "8px",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          color: eyeColor,
          display: "flex",
          alignItems: "center",
          gap: "5px"
        }}
      >
        <span>{moodIcon}</span>
        <span>{moodLabel}</span>
      </div>
    </div>
  );
}
