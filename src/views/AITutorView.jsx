/**
 * Anti Gravity 2.0 - Epistemic AI Tutor View
 * ===========================================
 * Integrates with FastAPI Epistemic Dual-Agent Backend (:8000/api/tutor)
 * Features:
 * - Direct REST API integration with real-time audit trail
 * - Zero-tolerance schema ingestion (status, confidence, audit_explanation, flashcards, XP)
 * - Automatic XP distribution and streak reinforcement
 * - 3D Flashcard auto-export to Flashcards deck
 * - Community breakthrough trigger for accuracy > 90%
 * - Voice input via Web Speech API (en-IN)
 * - Reactive RobotEyes states (thinking, happy, confused, idle)
 */

import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import RobotEyes from "../components/RobotEyes";

const API_BASE_URL = "http://localhost:8000";

function shouldPromoteAuditAnswer(content, explanation) {
  const tutorText = String(content || "");
  const auditText = String(explanation || "");
  const promptLike = /\b(?:walk me through|what is your (?:baseline )?hypothesis|what do you think|before we (?:define|start|jump)|to establish your analytical baseline|how does applying .{0,100} mathematically necessitate|try to explain)\b/i.test(tutorText);
  const solutionLike = /(?:=|therefore|because|theorem|conservation|force|derived|arises|implies|solution|step)/i.test(auditText);
  return promptLike && auditText.length >= 120 && solutionLike;
}

function cleanPromotedAnswer(text) {
  return String(text || "").replace(/^\s*(?:audit\s+notes?|audit\s+summary)\s*:\s*/i, "").trim();
}

function prepareMathText(value) {
  return String(value || "")
    .replace(/\\(?:left|right)\b/g, "")
    .replace(/\\(?:mathbf|mathrm|mathit|text)\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)")
    .replace(/\\dot\s*\{([^{}]*)\}/g, "$1\u0307")
    .replace(/\\nabla\b/g, "∇")
    .replace(/\\partial\b/g, "∂")
    .replace(/\\Delta\b/g, "Δ")
    .replace(/\\lambda\b/g, "λ")
    .replace(/\\mu\b/g, "μ")
    .replace(/\\pi\b/g, "π")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\cdot\b/g, "·")
    .replace(/\\times\b/g, "×")
    .replace(/\\rightarrow\b|\\to\b/g, "→")
    .replace(/\\Rightarrow\b/g, "⇒")
    .replace(/\\leq\b/g, "≤")
    .replace(/\\geq\b/g, "≥")
    .replace(/\\neq\b/g, "≠")
    .replace(/\\pm\b/g, "±")
    .replace(/\\sum\b/g, "∑")
    .replace(/\\;/g, " ")
    .replace(/\\,/g, " ");
}

function renderMathExpression(source, keyPrefix = "math") {
  const expression = prepareMathText(source);
  const nodes = [];
  let literal = "";
  let index = 0;
  let nodeIndex = 0;
  const flush = () => {
    if (literal) {
      nodes.push(literal);
      literal = "";
    }
  };

  while (index < expression.length) {
    const char = expression[index];
    if (/[A-Za-z0-9∇∂∑Δλμπ]/.test(char)) {
      const start = index;
      const letters = /[A-Za-z]/.test(char);
      const digits = /[0-9]/.test(char);
      if (letters || digits) {
        while (index < expression.length && (letters ? /[A-Za-z]/.test(expression[index]) : /[0-9]/.test(expression[index]))) index += 1;
      } else {
        index += 1;
      }
      const base = expression.slice(start, index);
      let subscript = null;
      let superscript = null;

      while (expression[index] === "_" || expression[index] === "^") {
        const kind = expression[index++];
        let script = "";
        if (expression[index] === "{") {
          const scriptStart = ++index;
          let depth = 1;
          while (index < expression.length && depth > 0) {
            if (expression[index] === "{") depth += 1;
            if (expression[index] === "}") depth -= 1;
            index += 1;
          }
          script = expression.slice(scriptStart, depth === 0 ? index - 1 : index);
        } else {
          const scriptStart = index;
          while (index < expression.length && /[A-Za-z0-9+\-]/.test(expression[index])) index += 1;
          if (index === scriptStart && index < expression.length) index += 1;
          script = expression.slice(scriptStart, index);
        }
        if (kind === "_") subscript = script;
        else superscript = script;
      }

      if (subscript !== null || superscript !== null) {
        flush();
        nodes.push(
          <span key={`${keyPrefix}-${nodeIndex++}`}>
            {base}
            {subscript !== null && <sub style={{ fontSize: "0.72em", lineHeight: 0, verticalAlign: "sub" }}>{renderMathExpression(subscript, `${keyPrefix}-sub`)}</sub>}
            {superscript !== null && <sup style={{ fontSize: "0.72em", lineHeight: 0, verticalAlign: "super" }}>{renderMathExpression(superscript, `${keyPrefix}-sup`)}</sup>}
          </span>
        );
      } else {
        literal += base;
      }
    } else {
      literal += char;
      index += 1;
    }
  }

  flush();
  return nodes;
}

function TutorText({ text }) {
  const parts = String(text || "").split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`strong-${index}`}><TutorText text={part.slice(2, -2)} /></strong>;
    }
    const isMath =
      (part.startsWith("$$") && part.endsWith("$$")) ||
      (part.startsWith("$") && part.endsWith("$")) ||
      (part.startsWith("\\(") && part.endsWith("\\)")) ||
      (part.startsWith("\\[") && part.endsWith("\\]"));
    if (isMath) {
      const delimiters = part.startsWith("$$") || part.startsWith("\\[") ? 2 : 1;
      return <span key={`formula-${index}`} className="tutor-math">{renderMathExpression(part.slice(delimiters, -delimiters), `formula-${index}`)}</span>;
    }
    return <React.Fragment key={`text-${index}`}>{renderMathExpression(part, `text-${index}`)}</React.Fragment>;
  });
}

export default function AITutorView() {
  const { userProfile, applyGamificationTriggers, pushFlashcards, showToast, setPendingCommunityShare } = useApp();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [busy, setBusy] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [robotExpression, setRobotExpression] = useState("idle");
  const [backendOnline, setBackendOnline] = useState(null);
  const [tutorMode, setTutorMode] = useState("dual-agent");
  const [selectedGroqModel, setSelectedGroqModel] = useState("openai/gpt-oss-20b");

  const logEndRef = useRef(null);
  const expressionTimerRef = useRef(null);

  // Check backend health on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`, { method: "GET" })
      .then(res => res.json())
      .then(data => {
        setBackendOnline(data.status === "ok" && data.groq_active === true);
        if (Array.isArray(data.groq_tutor_models) && data.groq_tutor_models.length) {
          setSelectedGroqModel(current => data.groq_tutor_models.includes(current)
            ? current
            : data.groq_tutor_models[0]);
        }
      })
      .catch(() => {
        setBackendOnline(false);
      });
  }, []);

  // Auto-scroll chat log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // Clean up expression timer
  useEffect(() => {
    return () => {
      if (expressionTimerRef.current) clearTimeout(expressionTimerRef.current);
    };
  }, []);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (busy || !query) return;

    setRobotExpression("thinking");
    setBusy(true);
    setInputText("");

    const userMessage = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      if (tutorMode === "offline") {
        processTutorVerdict(generateOfflineTutorResponse(query), query);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          age_cohort: "Senior",
          provider: "groq",
          primary_model: selectedGroqModel
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `FastAPI returned ${res.status}.`);
      }

      processTutorVerdict(await res.json(), query);
    } catch (err) {
      console.warn("Tutor request failed:", err);
      const message = err?.message || "The tutor request failed. Check that FastAPI and Groq are available.";
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `I couldn't generate an audited answer: ${message}\n\nSwitch to Offline mode for a local solution framework, or retry when FastAPI and Groq are available.`,
        audit: { status: "Unavailable", confidence: 0, explanation: "No model answer was returned, so no accuracy check was performed.", sources: [] },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }]);
      setBusy(false);
      setRobotExpression("confused");
    }
  };

  const processTutorVerdict = (verdict, query) => {
    const {
      status,
      confidence_score,
      final_answer,
      audit_explanation,
      contradictions,
      verified_sources,
      flashcard_export,
      gamification_triggers,
      model_used
    } = verdict;

    const assistantMessage = {
      role: "assistant",
      content: final_answer || "Concept analyzed by epistemic auditor.",
      audit: {
        status: status || "Accepted",
        confidence: confidence_score ?? 0,
        explanation: audit_explanation,
        contradictions,
        sources: verified_sources || []
      },
      modelUsed: model_used || (tutorMode === "offline" ? "Offline mode" : selectedGroqModel),
      requestedModel: tutorMode === "offline" ? "Offline mode" : selectedGroqModel,
      flashcards: flashcard_export || [],
      gamification: gamification_triggers || { student_accuracy_score: 0, xp_awarded: 0, prompt_community_share: false },
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, assistantMessage]);
    setBusy(false);

    // 1. Robot Expression feedback
    if (status === "Accepted" && (confidence_score || 0) >= 80) {
      setRobotExpression("happy");
    } else if (status === "Questioned") {
      setRobotExpression("confused");
    } else {
      setRobotExpression("confused");
    }

    if (expressionTimerRef.current) clearTimeout(expressionTimerRef.current);
    expressionTimerRef.current = setTimeout(() => setRobotExpression("idle"), 4500);

    // 2. Gamification: Award XP and ingest accuracy score
    if (gamification_triggers && (gamification_triggers.xp_awarded || 0) > 0) {
      applyGamificationTriggers(gamification_triggers, query);
    }

    // 3. Auto-populate 3D Flashcards Deck
    if (Array.isArray(flashcard_export) && flashcard_export.length) {
      pushFlashcards(flashcard_export);
      showToast(`🗂️ Exported ${flashcard_export.length} 3D Flashcard(s) to your study deck!`);
    }

    // 4. Community Share Trigger
    if (gamification_triggers?.prompt_community_share) {
      setPendingCommunityShare({
        text: `💡 **Study Insight on "${query.slice(0, 45)}"**\n\n${final_answer.slice(0, 280)}…`
      });
      showToast("🌟 Elite accuracy (>90%)! Prompted to share with your cohort.");
    }
  };

  const handleSpeechInput = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast("Voice recognition is not supported in this browser.");
      return;
    }

    const rec = new SpeechRec();
    rec.lang = "en-IN";

    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);

    rec.onresult = e => {
      const transcript = e.results[0][0].transcript;
      setInputText(transcript);
      handleSendMessage(transcript);
    };

    rec.onerror = () => setIsListening(false);

    try { rec.start(); } catch {}
  };

  return (
    <div className="pg">
      {/* Robot Eyes strictly at top */}
      <RobotEyes expression={robotExpression} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div>
          <h1 style={{ margin: 0 }}>Edunurd Tutor</h1>
          <div className="mu" style={{ fontSize: "0.85rem" }}>
            {tutorMode === "offline"
              ? "Offline Study Assistant"
              : `Dual-Agent Epistemic Auditor · Senior Mode · ${selectedGroqModel}`}
          </div>
        </div>

        {/* Backend Connectivity Status Pill */}
        <span
          className="badge"
          style={{
            fontSize: "11px",
            background: backendOnline ? "rgba(34, 197, 94, 0.15)" : "rgba(245, 158, 11, 0.15)",
            color: backendOnline ? "var(--g)" : "var(--o)",
            border: `1px solid ${backendOnline ? "rgba(34, 197, 94, 0.3)" : "rgba(245, 158, 11, 0.3)"}`
          }}
        >
          {backendOnline === null
            ? "Checking FastAPI :8000…"
            : backendOnline
              ? "🟢 FastAPI :8000 · Groq configured"
              : "🟠 FastAPI/Groq unavailable"}
        </span>
      </div>

      <div className="card" style={{ marginBottom: "14px", padding: "14px 16px" }}>
        <div className="row" style={{ gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <b style={{ marginRight: "4px" }}>Tutor mode</b>
          <button
            className={tutorMode === "offline" ? "" : "alt"}
            disabled={busy}
            aria-pressed={tutorMode === "offline"}
            onClick={() => setTutorMode("offline")}
          >
            Offline
          </button>
          <button
            className={tutorMode === "dual-agent" ? "" : "alt"}
            disabled={busy}
            aria-pressed={tutorMode === "dual-agent"}
            onClick={() => setTutorMode("dual-agent")}
          >
            Dual-Agent · Senior Mode
          </button>
          {tutorMode === "dual-agent" && (
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
              <span className="mu" style={{ fontSize: "12px" }}>Groq model</span>
              <select
                aria-label="Groq tutor model"
                value={selectedGroqModel}
                onChange={e => setSelectedGroqModel(e.target.value)}
                disabled={busy}
                style={{ minWidth: "190px", padding: "10px 12px", color: "var(--tx)", background: "var(--bg2)", border: "1px solid var(--bd)", borderRadius: "12px" }}
              >
                <option value="openai/gpt-oss-20b">openai/gpt-oss-20b</option>
                <option value="openai/gpt-oss-120b">openai/gpt-oss-120b</option>
              </select>
            </label>
          )}
        </div>
        <div className="mu" style={{ fontSize: "11px", marginTop: "9px" }}>
          Online mode sends the current question and draft answer to FastAPI/Groq; saved chat history is not sent. The second pass checks consistency, not external sources, and cannot guarantee correctness.
        </div>
      </div>

      {/* Chat Log */}
      <div id="log" style={{ minHeight: "450px", marginBottom: "16px" }}>
        {!messages.length && (
          <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>✦</div>
            <b>Welcome, {userProfile?.username || "Student"}!</b>
            <p className="mu" style={{ maxWidth: "500px", margin: "6px auto 14px auto" }}>
              I am your Edunurd Tutor. I answer with clear, checkable steps and adapt to your question.
              Psychology questions receive supportive general information, not a diagnosis.
            </p>

            <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
              {[
                "Explain Newton's third law with first principles",
                "What is the difference between speed and velocity?",
                "Test me on projectile motion formulas",
                "Why can't large language models guarantee zero hallucinations?"
              ].map(t => (
                <button
                  key={t}
                  className="chip"
                  onClick={() => handleSendMessage(t)}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  ⚡ {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const auditIsTheAnswer = !isUser && shouldPromoteAuditAnswer(msg.content, msg.audit?.explanation);
          const visibleAnswer = auditIsTheAnswer ? cleanPromotedAnswer(msg.audit.explanation) : msg.content;
          return (
            <div
              key={idx}
              className={`msg ${isUser ? "me" : "ai"}`}
              style={{ width: isUser ? undefined : "100%", maxWidth: isUser ? "88%" : "100%", boxSizing: "border-box" }}
            >
              {msg.audit ? (
                <>
                  <section
                    aria-label="Tutor answer"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "18px clamp(16px, 3vw, 26px)",
                      borderRadius: "16px",
                      background: "rgba(18, 18, 30, 0.94)",
                      border: "1px solid var(--bd)",
                      color: "var(--tx)"
                    }}
                  >
                    <div style={{ color: "var(--ac2)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", marginBottom: "8px" }}>
                      ANSWER
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: "1.75", fontSize: "clamp(16px, 1.8vw, 18px)" }}>
                      <TutorText text={visibleAnswer} />
                    </div>
                  </section>

                  <details
                    style={{
                      width: "min(100%, 680px)",
                      boxSizing: "border-box",
                      marginTop: "8px",
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.28)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#94a3b8",
                      fontSize: "12px"
                    }}
                  >
                    <summary style={{ cursor: "pointer", color: "var(--mu)", fontWeight: 600 }}>
                      {auditIsTheAnswer ? "Tutor prompt and compact audit notes" : "Compact audit notes and supporting details"}
                    </summary>
                    <div style={{ paddingTop: "10px" }}>
                      {msg.modelUsed && (
                        <div className="mu" style={{ marginBottom: "8px" }}>
                          Model used: {msg.modelUsed}{msg.requestedModel && msg.requestedModel !== msg.modelUsed ? " · selected model unavailable; fallback applied" : ""}
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              fontWeight: 700,
                              fontSize: "10px",
                              textTransform: "uppercase",
                              background: msg.audit.status === "Accepted" ? "rgba(34, 197, 94, 0.2)" : msg.audit.status === "Questioned" ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)",
                              color: msg.audit.status === "Accepted" ? "var(--g)" : msg.audit.status === "Questioned" ? "var(--o)" : "var(--r)",
                              border: `1px solid ${msg.audit.status === "Accepted" ? "var(--g)" : msg.audit.status === "Questioned" ? "var(--o)" : "var(--r)"}`
                            }}
                          >
                            Audit: {msg.audit.status}
                          </span>
                          <span className="mu">Confidence: {msg.audit.confidence}%</span>
                        </div>
                        {msg.gamification?.xp_awarded > 0 && (
                          <span style={{ color: "var(--ac2)", fontWeight: 700 }}>
                            +{msg.gamification.xp_awarded} XP awarded
                          </span>
                        )}
                      </div>

                      {auditIsTheAnswer && msg.content && (
                        <div style={{ lineHeight: "1.5", marginBottom: "8px" }}>
                          <b>Tutor prompt:</b><br />
                          <TutorText text={msg.content} />
                        </div>
                      )}
                      {!auditIsTheAnswer && msg.audit.explanation && (
                        <div style={{ lineHeight: "1.5", marginBottom: "8px" }}>
                          <b>Audit summary:</b> <TutorText text={msg.audit.explanation} />
                        </div>
                      )}
                      {msg.audit.contradictions?.filter(Boolean).length > 0 && (
                        <div style={{ lineHeight: "1.5", marginBottom: "8px" }}>
                          <b>Points to review:</b> {msg.audit.contradictions.filter(Boolean).join(" ")}
                        </div>
                      )}
                      {msg.flashcards?.length > 0 && (
                        <div style={{ color: "#38bdf8", marginTop: "4px", overflowWrap: "anywhere" }}>
                          🗂️ <b>3D Flashcard:</b> <TutorText text={msg.flashcards[0].front} />
                        </div>
                      )}
                    </div>
                  </details>
                </>
              ) : (
                <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.6", overflowWrap: "anywhere" }}>
                  <TutorText text={msg.content} />
                </div>
              )}

              <div className="mu" style={{ fontSize: "10px", marginTop: "4px", textAlign: isUser ? "right" : "left" }}>
                {msg.timestamp}
              </div>
            </div>
          );
        })}

        {busy && (
          <div className="msg ai">
            <span style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
              <span className="dot" style={{ animation: "pulse 1s infinite" }}>●</span>
              <span className="dot" style={{ animation: "pulse 1s 0.2s infinite" }}>●</span>
              <span className="dot" style={{ animation: "pulse 1s 0.4s infinite" }}>●</span>
              <span style={{ fontSize: "12px", color: "var(--ac2)", marginLeft: "6px" }}>
                Auditing facts &amp; synthesizing pedagogical response…
              </span>
            </span>
          </div>
        )}
        <div ref={logEndRef} />
      </div>

      {/* Action Input Bar */}
      <div className="row" style={{ gap: "8px" }}>
        <button
          className="alt"
          onClick={handleSpeechInput}
          title="Voice Input (Speech to Text)"
          style={{ color: isListening ? "var(--r)" : undefined }}
        >
          {isListening ? "🔴 Listening…" : "🎤"}
        </button>

        <input
          id="q"
          type="text"
          placeholder="Ask a doubt or explain your logic…"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSendMessage(); }}
          style={{ flex: 1 }}
        />

        <button disabled={busy} onClick={() => handleSendMessage()}>
          Send
        </button>
      </div>
    </div>
  );
}

// Offline mode provides an honest reasoning scaffold without inventing an answer.
function generateOfflineTutorResponse(query) {
  return {
    status: "Questioned",
    confidence_score: 0,
    final_answer: `**Offline mode**\n\nI received: “${query}”\n\nI don’t have a language model or verified reference source available in Offline mode, so I won’t guess at a factual answer. Use this checkable approach:\n\n1. Identify exactly what the question asks you to find or explain.\n2. List the given information and any assumptions.\n3. Choose a rule, definition, or formula that applies to those givens.\n4. Work through one step at a time, showing units or evidence.\n5. Substitute the result back into the question and check that it answers what was asked.\n\nChoose Dual-Agent · Senior Mode to request a model-generated answer and second-pass consistency check.`,
    audit_explanation: "No external model or sources were used in Offline mode; factual correctness could not be assessed.",
    contradictions: [],
    verified_sources: [],
    flashcard_export: [],
    gamification_triggers: {
      student_accuracy_score: 0,
      xp_awarded: 0,
      prompt_community_share: false
    }
  };
}
