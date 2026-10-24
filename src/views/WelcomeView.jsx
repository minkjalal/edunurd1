// Connection: src/views/WelcomeView.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Renders the authenticated welcome and feature-launch surface.
/**
 * EduNerd - Welcome & Onboarding View
 * ===================================
 * Entry screen providing:
 * - Email / Password authentication (login and register)
 * - Google One-Tap authentication (via GSI client library)
 * - Guest mode instant access
 * - Smooth branded entrance animation
 */

import React, { useState, useEffect } from "react";
import BrandLogo from "../components/BrandLogo";
import { useApp } from "../context/AppContext";

export default function WelcomeView() {
  const { setMode, setUid, setDbHandle, setProgress, navigateTo } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // Initialize Google Sign-in button if Client ID is configured
  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(config => {
        if (!config.googleClientId) return;

        const loadGoogleScript = () => {
          if (window.google && window.google.accounts) {
            setupGoogleButton(config.googleClientId);
            return;
          }
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.onload = () => setupGoogleButton(config.googleClientId);
          document.head.append(script);
        };

        const setupGoogleButton = (clientId) => {
          const container = document.getElementById("google-signin-btn");
          if (!container || !window.google) return;

          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: res => handleAuth(false, res.credential)
          });

          window.google.accounts.id.renderButton(container, {
            theme: "filled_black",
            size: "large",
            shape: "pill",
            text: "continue_with",
            width: Math.min(300, container.clientWidth || 300)
          });
        };

        loadGoogleScript();
      })
      .catch(() => {});
  }, []);

  const handleGuestEntry = () => {
    setMode("guest");
    localStorage.setItem("en_mode", "guest");
    if (name) {
      setProgress(prev => ({ ...prev, name }));
    }
    triggerIntro();
  };

  const handleAuth = async (isRegister, googleCredential) => {
    setLoading(true);
    setErrorMessage("");

    try {
      if (!window.claude) throw new Error("Client bridge (shim.js) not loaded");

      let profile = null;
      if (googleCredential) {
        profile = await window.claude.googleLogin(googleCredential);
      } else {
        if (!email.trim() || password.length < 6) {
          throw new Error("Enter a valid email and password of 6+ characters");
        }
        profile = await window.claude.login(email.trim(), password, isRegister, name);
      }

      const userSvc = await window.claude.use("user");
      const dbSvc = await window.claude.use("db");
      if (!userSvc || !dbSvc) throw new Error("Cloud database unavailable");

      const currentUid = await userSvc.id();
      setUid(currentUid);
      setDbHandle(dbSvc);
      setMode("cloud");
      localStorage.setItem("en_mode", "cloud");
      localStorage.setItem("en_uid", currentUid);

      // Hydrate user progress from cloud
      try {
        const snapshot = await dbSvc.collection("data/users/" + currentUid).doc("progress").get();
        const data = (snapshot && typeof snapshot.data === "function" ? snapshot.data() : snapshot && snapshot.data) || {};
        setProgress(prev => ({
          ...prev,
          ...data,
          name: name || data.name || profile?.name || prev.name,
          email: profile?.email || prev.email,
          pic: profile?.picture || prev.pic
        }));
      } catch {
        if (profile) {
          setProgress(prev => ({ ...prev, name: profile.name, email: profile.email, pic: profile.picture }));
        }
      }

      triggerIntro();
    } catch (err) {
      setErrorMessage(err.message || "Authentication failed");
      setLoading(false);
    }
  };

  const triggerIntro = () => {
    setShowIntro(true);
    setTimeout(() => {
      setShowIntro(false);
      navigateTo("home");
    }, 2800);
  };

  return (
    <>
      {showIntro ? (
        <div id="intro" onClick={() => { setShowIntro(false); navigateTo("home"); }}>
          <BrandLogo size={150} animated />
          <h1 style={{ fontSize: "32px", margin: "14px 0 0" }}>
            {"EduNerd".split("").map((ch, idx) => (
              <span
                key={idx}
                className="lt"
                style={{
                  animationDelay: `${1 + idx * 0.06}s`,
                  color: idx > 2 ? "var(--ac2)" : undefined
                }}
              >
                {ch}
              </span>
            ))}
          </h1>
          <div className="mu" style={{ animation: "letterUp 0.6s 1.9s backwards" }}>
            Study smarter, every day
          </div>
          <div className="ib"><i /></div>
        </div>
      ) : (
        <div
          className="card"
          style={{
            marginTop: "7vh",
            textAlign: "center",
            maxWidth: "480px",
            marginLeft: "auto",
            marginRight: "auto"
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <BrandLogo size={76} />
          </div>
          <h1>EduNerd</h1>
          <p className="mu">Plan, practise, and learn with your interactive AI tutor.</p>

          <div className="row" style={{ margin: "12px 0" }}>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <input
            type="email"
            className="fi"
            placeholder="Email address"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="fi"
            placeholder="Password (6+ characters)"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <p>
            <button
              style={{ width: "100%" }}
              disabled={loading}
              onClick={() => handleAuth(false)}
            >
              {loading ? "Connecting…" : "Log in"}
            </button>
          </p>

          <p>
            <button
              className="alt"
              style={{ width: "100%" }}
              disabled={loading}
              onClick={() => handleAuth(true)}
            >
              Create account
            </button>
          </p>

          <div className="mu" style={{ textAlign: "center", margin: "8px 0" }}>or</div>

          <div id="google-signin-btn" style={{ display: "flex", justifyContent: "center", margin: "8px 0" }} />

          <p>
            <button
              className="alt"
              style={{ width: "100%" }}
              onClick={handleGuestEntry}
            >
              Continue as guest
            </button>
          </p>

          <p className="mu" style={{ fontSize: "12px" }}>
            Use email and password to sync your progress to cloud. Guest data stays on this device.
          </p>

          {errorMessage && <p className="warn">{errorMessage}</p>}
        </div>
      )}
    </>
  );
}
