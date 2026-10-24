// Connection: src/features/chatbot-mascot/ChatbotMascot.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Renders the optional animated mascot and its conversational controls.
/**
 * EduNerd - Chatbot Mascot Component (ChatbotMascot.jsx)
 * =======================================================
 * Pure inline SVG + CSS 3D-style robot mascot:
 * - Visually faithful to the reference character (cream/white helmet & body, glossy visor,
 *   large round teal-green eyes with dark pupils and specular highlights, small smiling mouth,
 *   round headphone ears with glowing blue rim and curved speaker horn with curly cable,
 *   chest control panel with row of 4 pulsing teal LEDs and 2 rotary dials, 2 ribbed wheels).
 * - Floating speech bubble above head with 3 sequential dots.
 * - Reactive behaviors:
 *   * Idle: Gentle floating physics, random blinks, pulsing LEDs.
 *   * Cursor tracking: Eyeballs smoothly follow user cursor/pointer.
 *   * Typing: Looks towards input box, bubble dots sequence actively.
 *   * Thinking: Faster bubble pulse, wheel treads spin.
 *   * Answered: Happy bounce, glowing bright smile.
 *   * Listening: Speaker horn emits cyan soundwaves with glowing rim.
 *   * Error: Confused head-tilt and puzzled expression.
 * - Respects CHATBOT_MASCOT_ENABLED flag (returns null if disabled).
 */

import React, { useRef } from "react";
import { PREVIOUS_MASCOT_ENABLED } from "./flags";
import { useMascotObserver } from "./mascotObserver";

export default function ChatbotMascot() {
  if (!PREVIOUS_MASCOT_ENABLED) return null;

  const mascotRef = useRef(null);
  const {
    mascotState,
    pupilOffset,
    isHovered,
    setIsHovered,
    isBouncing,
    triggerBounce
  } = useMascotObserver(mascotRef);

  // Dynamic eye adjustment when typing (glances slightly down-right towards input)
  const effectivePupilX = mascotState === "typing" ? 2.5 : pupilOffset.x;
  const effectivePupilY = mascotState === "typing" ? 4.5 : pupilOffset.y;

  return (
    <div
      ref={mascotRef}
      className={`ag-mascot-wrapper ${isBouncing ? "ag-mascot-bounce" : ""} ${
        mascotState === "thinking" ? "ag-mascot-thinking" : ""
      } ${mascotState === "listening" ? "ag-mascot-listening" : ""} ${
        mascotState === "answered" ? "ag-mascot-answered" : ""
      }`}
      onMouseEnter={() => {
        setIsHovered(true);
        triggerBounce();
      }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={triggerBounce}
      title="EduNerd AI Tutor Mascot (tap me!)"
    >
      <div className={`ag-mascot-floating ${mascotState === "error" ? "ag-mascot-confused" : ""}`}>
        <svg
          width="200"
          height="195"
          viewBox="0 0 240 230"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* 3D Cream/White Body Gradient */}
            <linearGradient id="ag-body-cream" x1="60" y1="40" x2="160" y2="190" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#f8fafc" />
              <stop offset="75%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Arm & Joint Gradient */}
            <linearGradient id="ag-arm-grad" x1="40" y1="135" x2="65" y2="170" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Glossy Obsidian Glass Visor Gradient */}
            <linearGradient id="ag-visor-glass" x1="65" y1="55" x2="155" y2="135" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="50%" stopColor="#0b1329" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Teal-Green Glowing Eye Gradient */}
            <radialGradient id="ag-teal-eye" cx="45%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#5eead4" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="85%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#042f2e" />
            </radialGradient>

            {/* Deep Pupil Gradient */}
            <radialGradient id="ag-pupil" cx="40%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#091817" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            {/* Glossy Blue Speech Bubble Gradient */}
            <linearGradient id="ag-bubble-grad" x1="140" y1="8" x2="210" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Speaker Horn Gradient */}
            <linearGradient id="ag-horn-grad" x1="175" y1="75" x2="215" y2="95" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>

            {/* Wheel Tread Gradient */}
            <linearGradient id="ag-wheel-rubber" x1="60" y1="175" x2="80" y2="215" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>

            {/* Eye Clip Paths for Smooth Blinking */}
            <clipPath id="ag-clip-eye-left">
              <circle cx="92" cy="94" r={isHovered ? "17" : "15"} />
            </clipPath>
            <clipPath id="ag-clip-eye-right">
              <circle cx="128" cy="94" r={isHovered ? "17" : "15"} />
            </clipPath>
          </defs>

          {/* ══════════ 1. FLOATING SPEECH BUBBLE WITH 3 SEQUENTIAL DOTS ══════════ */}
          <g className="ag-mascot-bubble">
            {/* Bubble Balloon */}
            <path
              d="M 148 14 Q 148 6 158 6 L 198 6 Q 208 6 208 16 L 208 26 Q 208 36 198 36 L 175 36 L 164 47 L 167 36 L 158 36 Q 148 36 148 26 Z"
              fill="url(#ag-bubble-grad)"
              stroke="#60a5fa"
              strokeWidth="1.2"
            />
            {/* Glossy Curved Highlight */}
            <path
              d="M 154 11 Q 178 8 202 11"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
            />
            {/* Three Animated White Dots */}
            <circle cx="168" cy="21" r="3.2" fill="#ffffff" className="ag-dot-1" />
            <circle cx="178" cy="21" r="3.2" fill="#ffffff" className="ag-dot-2" />
            <circle cx="188" cy="21" r="3.2" fill="#ffffff" className="ag-dot-3" />
          </g>

          {/* ══════════ 2. CHUNKY RIBBED WHEELS ══════════ */}
          {/* Left Wheel */}
          <g>
            {/* Outer Ribbed Tire */}
            <ellipse
              cx="74"
              cy="195"
              rx="17"
              ry="21"
              fill="url(#ag-wheel-rubber)"
              stroke="#475569"
              strokeWidth="4"
              strokeDasharray="6 3.5"
              className={mascotState === "thinking" ? "ag-mascot-wheel-spinning" : ""}
            />
            {/* Wheel Rim */}
            <ellipse cx="74" cy="195" rx="10" ry="13" fill="#090d16" stroke="#0ea5e9" strokeWidth="2" />
            {/* Center Bolt */}
            <circle cx="74" cy="195" r="3.5" fill="#38bdf8" />
          </g>

          {/* Right Wheel */}
          <g>
            {/* Outer Ribbed Tire */}
            <ellipse
              cx="146"
              cy="195"
              rx="17"
              ry="21"
              fill="url(#ag-wheel-rubber)"
              stroke="#475569"
              strokeWidth="4"
              strokeDasharray="6 3.5"
              className={mascotState === "thinking" ? "ag-mascot-wheel-spinning" : ""}
            />
            {/* Wheel Rim */}
            <ellipse cx="146" cy="195" rx="10" ry="13" fill="#090d16" stroke="#0ea5e9" strokeWidth="2" />
            {/* Center Bolt */}
            <circle cx="146" cy="195" r="3.5" fill="#38bdf8" />
          </g>

          {/* ══════════ 3. BODY & ARMS ══════════ */}
          {/* Rounded Cream/White Body */}
          <path
            d="M 68 138 C 65 186, 155 186, 152 138 Z"
            fill="url(#ag-body-cream)"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          {/* Ambient Body Core Shadow */}
          <path
            d="M 72 165 C 85 184, 135 184, 148 165 C 138 178, 82 178, 72 165 Z"
            fill="#94a3b8"
            opacity="0.35"
          />

          {/* Left Arm (Animated Wave on Hover / Tap) */}
          <g className={isHovered ? "ag-mascot-waving" : ""}>
            <path
              d="M 62 142 C 45 146, 38 162, 48 168 C 55 172, 64 162, 64 152 Z"
              fill="url(#ag-arm-grad)"
              stroke="#cbd5e1"
              strokeWidth="1.8"
            />
            {/* Cute Rounded Hand / Paw */}
            <circle cx="45" cy="165" r="5" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
          </g>

          {/* Right Arm (Resting pod) */}
          <g>
            <path
              d="M 158 142 C 175 146, 182 162, 172 168 C 165 172, 156 162, 156 152 Z"
              fill="url(#ag-arm-grad)"
              stroke="#cbd5e1"
              strokeWidth="1.8"
            />
            <circle cx="175" cy="165" r="5" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
          </g>

          {/* ══════════ 4. CHEST CONTROL PANEL ══════════ */}
          {/* Bezel */}
          <rect
            x="86"
            y="148"
            width="48"
            height="26"
            rx="6"
            fill="#090d16"
            stroke="#334155"
            strokeWidth="1.6"
          />
          {/* Row of 4 Tiny Glowing Teal LEDs */}
          <circle cx="94" cy="155" r="2.2" fill="#2dd4bf" className="ag-chest-led-1" />
          <circle cx="104" cy="155" r="2.2" fill="#2dd4bf" className="ag-chest-led-2" />
          <circle cx="116" cy="155" r="2.2" fill="#2dd4bf" className="ag-chest-led-3" />
          <circle cx="126" cy="155" r="2.2" fill="#2dd4bf" className="ag-chest-led-4" />

          {/* Two Rotary Dials */}
          {/* Left Dial */}
          <circle cx="98" cy="165" r="4.2" fill="#1e293b" stroke="#0d9488" strokeWidth="1.2" />
          <line x1="98" y1="165" x2="100.5" y2="162.5" stroke="#2dd4bf" strokeWidth="1.2" strokeLinecap="round" />
          {/* Right Dial */}
          <circle cx="122" cy="165" r="4.2" fill="#1e293b" stroke="#0d9488" strokeWidth="1.2" />
          <line x1="122" y1="165" x2="120" y2="162" stroke="#2dd4bf" strokeWidth="1.2" strokeLinecap="round" />

          {/* ══════════ 5. HEADPHONES, HORN & CURLY CABLE ══════════ */}
          {/* Left Headphone Ear */}
          <g>
            <circle cx="50" cy="95" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="2.5" />
            <circle cx="50" cy="95" r="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          </g>

          {/* Right Headphone Ear with Glowing Blue Rim */}
          <g>
            <circle
              cx="170"
              cy="95"
              r="15"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="3.2"
              className={mascotState === "listening" ? "ag-horn-listening" : ""}
            />
            <circle cx="170" cy="95" r="8.5" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.5" />

            {/* Curved Speaker Horn */}
            <path
              d="M 176 89 Q 194 80 205 73 L 209 84 Q 194 94 178 97 Z"
              fill="url(#ag-horn-grad)"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            {/* Horn Flare Rim Opening */}
            <ellipse
              cx="207"
              cy="79"
              rx="4"
              ry="7.5"
              fill="#0284c7"
              stroke="#38bdf8"
              strokeWidth="1.6"
              transform="rotate(-26 207 79)"
            />

            {/* Sound Wave Emissions (Active during Mic Listening) */}
            {mascotState === "listening" && (
              <g>
                <path
                  d="M 215 72 A 8 8 0 0 1 219 86"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  className="ag-mascot-soundwave-1"
                />
                <path
                  d="M 221 68 A 14 14 0 0 1 228 91"
                  stroke="#22d3ee"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  className="ag-mascot-soundwave-2"
                />
              </g>
            )}

            {/* Curly Cable Connecting Horn/Ear to Body */}
            <path
              d="M 172 108 Q 185 116 178 126 Q 169 135 180 144 Q 174 150 160 151"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>

          {/* ══════════ 6. BIG ROUNDED HEAD & GLOSSY VISOR ══════════ */}
          {/* Cream/White Head Helmet */}
          <rect
            x="50"
            y="46"
            width="120"
            height="96"
            rx="46"
            fill="url(#ag-body-cream)"
            stroke="#cbd5e1"
            strokeWidth="2.4"
          />

          {/* Top Head Specular Highlight */}
          <ellipse cx="110" cy="54" rx="38" ry="6" fill="#ffffff" opacity="0.65" />

          {/* Glossy Obsidian Glass Visor */}
          <rect
            x="60"
            y="58"
            width="100"
            height="76"
            rx="34"
            fill="url(#ag-visor-glass)"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* Specular Curved Reflection on Glass Visor */}
          <path
            d="M 68 76 C 85 64, 135 64, 152 76 C 145 70, 75 70, 68 76 Z"
            fill="#ffffff"
            opacity="0.25"
          />

          {/* ══════════ 7. TWO LARGE ROUND TEAL-GREEN EYES ══════════ */}
          {/* Left Eye */}
          <g>
            {/* Outer Teal Iris */}
            <circle
              cx="92"
              cy="94"
              r={isHovered ? "17" : "15"}
              fill="url(#ag-teal-eye)"
            />
            {/* Pupil Tracking with Clamped Vector */}
            <circle
              cx={92 + effectivePupilX}
              cy={94 + effectivePupilY}
              r={isHovered ? "9.5" : "8"}
              fill="url(#ag-pupil)"
            />
            {/* White Specular Highlights (Anime / Gloss glints) */}
            <circle
              cx={92 + effectivePupilX - 3.2}
              cy={94 + effectivePupilY - 3.2}
              r="2.8"
              fill="#ffffff"
            />
            <circle
              cx={92 + effectivePupilX + 2.8}
              cy={94 + effectivePupilY + 2.8}
              r="1.4"
              fill="#ffffff"
              opacity="0.85"
            />

            {/* Eyelid for Blinking (Clipped to Iris) */}
            <g clipPath="url(#ag-clip-eye-left)">
              <rect
                x="72"
                y="76"
                width="40"
                height="36"
                fill="#0b1329"
                className="ag-mascot-eye-lid"
              />
            </g>
          </g>

          {/* Right Eye */}
          <g>
            {/* Outer Teal Iris */}
            <circle
              cx="128"
              cy="94"
              r={isHovered ? "17" : "15"}
              fill="url(#ag-teal-eye)"
            />
            {/* Pupil Tracking with Clamped Vector */}
            <circle
              cx={128 + effectivePupilX}
              cy={94 + effectivePupilY}
              r={isHovered ? "9.5" : "8"}
              fill="url(#ag-pupil)"
            />
            {/* White Specular Highlights */}
            <circle
              cx={128 + effectivePupilX - 3.2}
              cy={94 + effectivePupilY - 3.2}
              r="2.8"
              fill="#ffffff"
            />
            <circle
              cx={128 + effectivePupilX + 2.8}
              cy={94 + effectivePupilY + 2.8}
              r="1.4"
              fill="#ffffff"
              opacity="0.85"
            />

            {/* Eyelid for Blinking (Clipped to Iris) */}
            <g clipPath="url(#ag-clip-eye-right)">
              <rect
                x="108"
                y="76"
                width="40"
                height="36"
                fill="#0b1329"
                className="ag-mascot-eye-lid"
              />
            </g>
          </g>

          {/* ══════════ 8. SMALL SMILING MOUTH ══════════ */}
          {mascotState === "answered" ? (
            /* Broad Happy Smile */
            <path
              d="M 103 115 Q 110 125 117 115"
              stroke="#34d399"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
              filter="drop-shadow(0 0 3px #10b981)"
            />
          ) : mascotState === "error" ? (
            /* Confused / Puzzled Expression */
            <path
              d="M 104 118 Q 107 113 110 117 Q 113 121 116 116"
              stroke="#f59e0b"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            /* Friendly Small Smile */
            <path
              d="M 105 116 Q 110 122 115 116"
              stroke="#2dd4bf"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </svg>
      </div>

      {/* Ground Ambient Glow Shadow */}
      <div className="ag-mascot-shadow" />
    </div>
  );
}
