/**
 * Anti Gravity 2.0 - Age-Gated Authentication & Onboarding View (LoginView.jsx)
 * ==============================================================================
 * Mandatory age verification and automatic cohort assignment:
 * - Cohort-A (Ages 8–12): Junior Learners
 * - Cohort-B (Ages 13–17): Secondary / High School
 * - Cohort-C (Ages 18+): University / Advanced
 *
 * Guarantees zero-flicker session state hydration into localStorage and AppContext.
 */

import React, { useState } from "react";
import BrandLogo from "../components/BrandLogo";
import { useApp } from "../context/AppContext";

export function computeAgeCohort(ageNum) {
  if (ageNum >= 8 && ageNum <= 12) return "Cohort-A";
  if (ageNum >= 13 && ageNum <= 17) return "Cohort-B";
  if (ageNum >= 18) return "Cohort-C";
  return null;
}

export function getCohortDetails(cohort) {
  switch (cohort) {
    case "Cohort-A":
      return {
        label: "Junior Learner (Ages 8–12)",
        badgeColor: "rgba(34, 197, 94, 0.2)",
        textColor: "var(--g)",
        desc: "Strict safety filters, guided study channels, visual flashcards."
      };
    case "Cohort-B":
      return {
        label: "Secondary / High School (Ages 13–17)",
        badgeColor: "rgba(168, 85, 247, 0.2)",
        textColor: "var(--ac2)",
        desc: "Moderated peer study, collaborative problem-solving, exam prep."
      };
    case "Cohort-C":
      return {
        label: "University / Advanced (Ages 18+)",
        badgeColor: "rgba(59, 130, 246, 0.2)",
        textColor: "#60a5fa",
        desc: "Full peer discourse, advanced university topics, research explorer."
      };
    default:
      return null;
  }
}

export default function LoginView() {
  const { loginUser, guestLogin } = useApp();

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("15"); // sensible default
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedAge = parseInt(age, 10);
  const detectedCohort = !isNaN(parsedAge) ? computeAgeCohort(parsedAge) : null;
  const cohortMeta = detectedCohort ? getCohortDetails(detectedCohort) : null;

  const validateAge = () => {
    if (isNaN(parsedAge) || parsedAge < 8 || parsedAge > 100) {
      setErrorMessage("Please enter a valid age between 8 and 100 years.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage("");

    if (!validateAge()) return;

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    const displayName = username.trim() || email.split("@")[0];
    setLoading(true);

    try {
      await loginUser({
        email: email.trim(),
        username: displayName,
        password,
        age: parsedAge,
        cohort: detectedCohort,
        isRegister
      });
    } catch (err) {
      setErrorMessage(err.message || "Authentication failed. Please try again.");
      setLoading(false);
    }
  };

  const handleGuestEntry = () => {
    setErrorMessage("");
    if (!validateAge()) return;

    const guestName = username.trim() || `Explorer_${Math.floor(Math.random() * 9000 + 1000)}`;
    guestLogin({
      username: guestName,
      age: parsedAge,
      cohort: detectedCohort
    });
  };

  return (
    <div className="pg" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "85vh" }}>
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "2rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
          border: "1px solid var(--bd)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
          <BrandLogo size={68} />
          <h1 style={{ fontSize: "1.8rem", margin: "10px 0 4px 0" }}>Edunurd</h1>
          <p className="mu" style={{ fontSize: "0.88rem" }}>
            AI Tutor &amp; Gamified Study Platform
          </p>
        </div>

        {errorMessage && (
          <div className="warn" style={{ marginBottom: "14px", fontSize: "0.85rem" }}>
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Display Name Input */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>
              Student Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. Maya Chen"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          {/* Mandatory Age Input with Real-Time Cohort Preview */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                Student Age <span style={{ color: "var(--r)" }}>*</span>
              </label>
              {cohortMeta && (
                <span
                  className="badge"
                  style={{
                    background: cohortMeta.badgeColor,
                    color: cohortMeta.textColor,
                    fontSize: "11px",
                    fontWeight: 700
                  }}
                >
                  {detectedCohort}
                </span>
              )}
            </div>
            <input
              type="number"
              min="8"
              max="100"
              placeholder="Age (8–100)"
              value={age}
              onChange={e => setAge(e.target.value)}
              required
              style={{ width: "100%" }}
            />
            {cohortMeta ? (
              <div style={{ fontSize: "11px", color: cohortMeta.textColor, marginTop: "4px" }}>
                🛡️ {cohortMeta.label}: {cohortMeta.desc}
              </div>
            ) : (
              <div style={{ fontSize: "11px", color: "var(--r)", marginTop: "4px" }}>
                Allowed range: 8–100 years.
              </div>
            )}
          </div>

          {/* Email Input */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>
              Email Address <span style={{ color: "var(--r)" }}>*</span>
            </label>
            <input
              type="email"
              placeholder="student@example.com"
              value={email}
              autoComplete="email"
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: "100%" }}
            />
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>
              Password (6+ characters) <span style={{ color: "var(--r)" }}>*</span>
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              autoComplete="current-password"
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: "100%" }}
            />
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading || !detectedCohort}
            style={{ width: "100%", padding: "10px", fontSize: "0.95rem", fontWeight: 600 }}
          >
            {loading ? "Authenticating…" : isRegister ? "Create Account & Assign Cohort" : "Sign In"}
          </button>
        </form>

        {/* Toggle Login / Register */}
        <div style={{ textAlign: "center", marginTop: "12px" }}>
          <button
            className="alt"
            style={{ border: "none", background: "none", fontSize: "0.85rem", color: "var(--ac2)", cursor: "pointer" }}
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMessage("");
            }}
          >
            {isRegister ? "Already have an account? Sign In" : "Need an account? Create one"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", margin: "16px 0", color: "var(--bd)" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--bd)" }} />
          <span className="mu" style={{ padding: "0 10px", fontSize: "12px" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "var(--bd)" }} />
        </div>

        {/* Guest Access (Strictly Age-Verified) */}
        <button
          className="alt"
          disabled={!detectedCohort}
          onClick={handleGuestEntry}
          style={{ width: "100%", padding: "9px", fontSize: "0.9rem" }}
        >
          🚀 Instant Access as Guest ({detectedCohort || "Verify Age"})
        </button>

        <p className="mu" style={{ fontSize: "11px", textAlign: "center", marginTop: "14px", lineHeight: "1.4" }}>
          Protected by Epistemic Safety &amp; Age-Gated Content Moderation Protocols.
        </p>
      </div>
    </div>
  );
}
