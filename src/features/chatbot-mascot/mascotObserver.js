/**
 * EduNerd - Chatbot Mascot Observer Hook (mascotObserver.js)
 * ==========================================================
 * Non-invasive DOM & MutationObserver hook:
 * - Observes #q input field for typing events
 * - Observes #log container for AI thinking / answered / error states
 * - Observes microphone button for voice listening state
 * - Tracks pointer coordinates for smooth eyeball pupil tracking
 * 
 * Satisfies Hard Rule 3: Zero modifications to existing chat logic!
 */

import { useState, useEffect, useRef } from "react";

export function useMascotObserver(mascotRef) {
  const [mascotState, setMascotState] = useState("idle"); // 'idle' | 'typing' | 'thinking' | 'answered' | 'listening' | 'error'
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  const resetTimerRef = useRef(null);
  const typingTimerRef = useRef(null);

  // 1. Smooth Pointer / Eye Tracking within a safe 7px radius
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!mascotRef.current) return;
      const rect = mascotRef.current.getBoundingClientRect();
      const mascotCenterX = rect.left + rect.width / 2;
      const mascotCenterY = rect.top + rect.height / 2;

      const deltaX = e.clientX - mascotCenterX;
      const deltaY = e.clientY - mascotCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      const maxRadius = 7; // max pupil displacement in SVG units
      const scale = distance > 0 ? Math.min(maxRadius, distance * 0.025) / distance : 0;

      setPupilOffset({
        x: Math.round(deltaX * scale * 10) / 10,
        y: Math.round(deltaY * scale * 10) / 10
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [mascotRef]);

  // 2. Non-invasive DOM listeners for chat events
  useEffect(() => {
    let logObserver = null;
    let micObserver = null;

    const setupObservers = () => {
      const inputEl = document.getElementById("q");
      const logEl = document.getElementById("log");

      // A. Input Typing Observation
      if (inputEl) {
        const onInput = (e) => {
          if (e.target.value.trim().length > 0) {
            setMascotState((prev) => (prev === "thinking" ? prev : "typing"));
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => {
              setMascotState((prev) => (prev === "typing" ? "idle" : prev));
            }, 1800);
          } else {
            setMascotState((prev) => (prev === "typing" ? "idle" : prev));
          }
        };

        const onFocus = () => {
          if (inputEl.value.trim().length > 0) {
            setMascotState((prev) => (prev === "thinking" ? prev : "typing"));
          }
        };

        const onBlur = () => {
          setMascotState((prev) => (prev === "typing" ? "idle" : prev));
        };

        inputEl.addEventListener("input", onInput);
        inputEl.addEventListener("focus", onFocus);
        inputEl.addEventListener("blur", onBlur);
      }

      // B. Chat Log Mutation Observation (Detects "…" thinking & AI responses / errors)
      if (logEl) {
        logObserver = new MutationObserver(() => {
          const aiMsgs = logEl.querySelectorAll(".msg.ai");
          const lastAiMsg = aiMsgs[aiMsgs.length - 1];

          if (lastAiMsg) {
            const text = (lastAiMsg.textContent || "").trim();
            if (text === "…") {
              setMascotState("thinking");
            } else if (text.length > 0) {
              const isError = text.includes("⚠️") || /error|failed|blocked/i.test(text);
              setMascotState(isError ? "error" : "answered");

              if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
              resetTimerRef.current = setTimeout(() => {
                setMascotState("idle");
              }, 3800);
            }
          }
        });

        logObserver.observe(logEl, { childList: true, subtree: true, characterData: true });
      }

      // C. Microphone Button Observation
      const micButton = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent && (btn.textContent.includes("🎤") || btn.textContent.includes("🔴"))
      );

      if (micButton) {
        micObserver = new MutationObserver(() => {
          const isListening = micButton.textContent && micButton.textContent.includes("🔴");
          if (isListening) {
            setMascotState("listening");
          } else {
            setMascotState((prev) => (prev === "listening" ? "idle" : prev));
          }
        });
        micObserver.observe(micButton, { childList: true, subtree: true, characterData: true });
      }
    };

    // Slight delay to ensure target elements exist in DOM
    const initTimer = setTimeout(setupObservers, 250);

    return () => {
      clearTimeout(initTimer);
      if (logObserver) logObserver.disconnect();
      if (micObserver) micObserver.disconnect();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const triggerBounce = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 750);
  };

  return {
    mascotState,
    pupilOffset,
    isHovered,
    setIsHovered,
    isBouncing,
    triggerBounce
  };
}
