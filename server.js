// Connection: server.js is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Runs the Express app, authentication, document storage, generic AI proxy, and offline tutor fallback.
/**
 * ============================================================
 * EduNerd – Backend API Server
 * Version : 1.3.2
 * Stack   : Node.js + Express
 * Storage : Flat JSON file (data.json) — swap for PostgreSQL/
 *           MongoDB when scaling beyond a single machine.
 * Auth    : JWT (30-day tokens) + optional Google OAuth
 * AI      : Gemini 1.5 Flash proxy; offline fallback engine
 *           activates automatically when no API key is set.
 * ============================================================
 */

"use strict";

// ══════════════════════════════════════════════════════════
// 1. ENVIRONMENT & CONSTANTS
// ══════════════════════════════════════════════════════════

require("dotenv").config();

const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const fs      = require("fs");
const path    = require("path");

const PORT   = process.env.PORT            || 3000;
const SECRET = process.env.JWT_SECRET      || "change-me-in-production";
const KEY    = process.env.GEMINI_API_KEY  || "";
const MODEL  = process.env.GEMINI_MODEL    || "gemini-1.5-flash";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GID    = process.env.GOOGLE_CLIENT_ID || "";

/** Gemini REST base URL (v1beta). */
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
let ACTIVE_GROQ_MODEL = "";
const GROQ_TEXT_MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"];
const GROQ_MODEL_CHOICES = [
  { id: "openai/gpt-oss-20b", label: "GPT OSS 20B" },
  { id: "openai/gpt-oss-120b", label: "GPT OSS 120B" },
  { id: "whisper-large-v3", label: "Whisper Large V3 (audio transcription only)", audioOnly: true }
];

async function getGroqAvailableModels() {
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { authorization: `Bearer ${GROQ_KEY}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || "Groq model discovery failed.");
  return new Set((payload.data || []).map(model => model.id));
}

async function detectGroqModel(preferred) {
  const available = await getGroqAvailableModels();
  const model = preferred
    ? (available.has(preferred) ? preferred : null)
    : [process.env.GROQ_MODEL || "openai/gpt-oss-20b", ...GROQ_TEXT_MODELS].find(candidate => available.has(candidate));
  if (!model) throw new Error("This Groq account has no supported text generation model available.");
  ACTIVE_GROQ_MODEL = model;
  return model;
}

/** Path to the local flat-file database. */
const DB_FILE = path.join(__dirname, "data.json");

// ══════════════════════════════════════════════════════════
// 2. DATABASE – in-memory + debounced disk persistence
// ══════════════════════════════════════════════════════════

/** In-memory database object. Shape: { users: {}, col: {} } */
let DB = { users: {}, col: {} };

// Load from disk on startup (gracefully handle corrupt files)
try {
  if (fs.existsSync(DB_FILE)) {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    DB = {
      users: (parsed && typeof parsed.users === "object" && parsed.users) ? parsed.users : {},
      col:   (parsed && typeof parsed.col   === "object" && parsed.col)   ? parsed.col   : {}
    };
  }
} catch (err) {
  console.warn("⚠️  Could not parse data.json — starting with empty database:", err.message);
  DB = { users: {}, col: {} };
}

/** Debounce timer handle for disk writes. */
let _persistTimer;

/**
 * Schedule a debounced write of DB to disk (≤250 ms delay).
 * This avoids thrashing the disk on rapid successive writes.
 */
const persist = () => {
  clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2), "utf8");
    } catch (err) {
      console.error("❌ Failed to persist DB:", err.message);
    }
  }, 250);
};

/**
 * Synchronously flush DB to disk — called on process shutdown
 * to prevent data loss during graceful termination.
 */
const flushSync = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2), "utf8");
  } catch (err) {
    console.error("❌ Final flush failed:", err.message);
  }
};

process.on("SIGINT",  () => { flushSync(); process.exit(0); });
process.on("SIGTERM", () => { flushSync(); process.exit(0); });

// ══════════════════════════════════════════════════════════
// 3. EXPRESS APP – middleware & static files
// ══════════════════════════════════════════════════════════

const app = express();

// Parse JSON bodies up to 14 MB (to support base64 photo uploads)
app.use(express.json({ limit: "14mb" }));

// Serve the entire public/ directory as static files
app.use(express.static(path.join(__dirname, "public")));

// ══════════════════════════════════════════════════════════
// 4. AUTH UTILITIES
// ══════════════════════════════════════════════════════════

/**
 * Sign a JWT for the given user ID.
 * @param {string} uid - The user's unique identifier.
 * @returns {string} A signed JWT valid for 30 days.
 */
const signToken = (uid) => jwt.sign({ uid }, SECRET, { expiresIn: "30d" });

/**
 * Express middleware: require a valid Bearer JWT.
 * Sets req.uid on success; responds 401 on failure.
 */
const requireAuth = (req, res, next) => {
  try {
    const raw = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!raw) throw new Error("No token");
    req.uid = jwt.verify(raw, SECRET).uid;
    next();
  } catch {
    res.status(401).json({ error: "Please sign in again" });
  }
};

/**
 * Express middleware: permissive auth for AI endpoints.
 * Authenticated users get their UID; unauthenticated callers
 * receive a deterministic guest ID derived from their IP.
 */
const softAuth = (req, res, next) => {
  try {
    const raw = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (raw) {
      req.uid = jwt.verify(raw, SECRET).uid;
      return next();
    }
  } catch { /* fall through to guest ID */ }

  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local").toString();
  req.uid = "guest_" + ip.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  next();
};

// ══════════════════════════════════════════════════════════
// 5. ROUTES: AUTH (register, login, Google OAuth)
// ══════════════════════════════════════════════════════════

/**
 * POST /api/register
 * Create a new account with email + password.
 * Body: { email, password, name? }
 */
app.post("/api/register", async (req, res) => {
  const { email, password, name } = req.body || {};

  if (!/^\S+@\S+\.\S+$/.test(email || "") || (password || "").length < 6) {
    return res.status(400).json({ error: "Enter a valid email and a password of 6+ characters" });
  }

  const e = email.toLowerCase().trim();
  if (DB.users[e]) {
    return res.status(409).json({ error: "Account already exists. Log in instead." });
  }

  const uid = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  DB.users[e] = {
    uid,
    hash: await bcrypt.hash(password, 10),
    name: String(name || "").slice(0, 40)
  };

  persist();
  res.json({ token: signToken(uid), uid, profile: { email: e, name: DB.users[e].name } });
});

/**
 * POST /api/login
 * Sign in with email + password.
 * Body: { email, password }
 */
app.post("/api/login", async (req, res) => {
  const { email = "", password = "" } = req.body || {};
  const e = email.toLowerCase().trim();
  const u = DB.users[e];

  if (!u || !u.hash || !(await bcrypt.compare(password, u.hash))) {
    return res.status(401).json({ error: "Wrong email or password" });
  }

  res.json({ token: signToken(u.uid), uid: u.uid, profile: { email: e, name: u.name || "" } });
});

/**
 * POST /api/google
 * Exchange a Google ID-token credential for an EduNerd JWT.
 * Requires GOOGLE_CLIENT_ID to be set in .env
 * Body: { credential: <id_token> }
 */
app.post("/api/google", async (req, res) => {
  if (!GID) {
    return res.status(500).json({ error: "Server has no GOOGLE_CLIENT_ID configured" });
  }

  try {
    const tokenInfoUrl = "https://oauth2.googleapis.com/tokeninfo?id_token="
      + encodeURIComponent((req.body || {}).credential || "");

    const r = await fetch(tokenInfoUrl);
    const g = await r.json();

    if (!r.ok || g.aud !== GID || String(g.email_verified) !== "true") {
      return res.status(401).json({ error: "Google sign-in failed — token rejected" });
    }

    const e = g.email.toLowerCase();
    let u = DB.users[e];
    if (!u) {
      u = DB.users[e] = { uid: "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) };
    }

    u.profile = { name: g.name || "", picture: g.picture || "", email: e };
    persist();

    res.json({ token: signToken(u.uid), uid: u.uid, profile: u.profile });
  } catch {
    res.status(502).json({ error: "Could not reach Google — check network" });
  }
});

// ══════════════════════════════════════════════════════════
// 6. ROUTES: SYSTEM / INFO
// ══════════════════════════════════════════════════════════

/**
 * GET /api/config
 * Returns public configuration the frontend needs on startup.
 * (Google Client ID and AI key availability flag)
 */
app.get("/api/config", async (req, res) => {
  let model = MODEL;
  let groqModels = GROQ_MODEL_CHOICES.map(choice => ({ ...choice, available: false }));
  if (GROQ_KEY) {
    try {
      const available = await getGroqAvailableModels();
      groqModels = groqModels.map(choice => ({ ...choice, available: !choice.audioOnly && available.has(choice.id) }));
      model = ACTIVE_GROQ_MODEL && available.has(ACTIVE_GROQ_MODEL)
        ? ACTIVE_GROQ_MODEL
        : GROQ_TEXT_MODELS.find(candidate => available.has(candidate)) || "Groq model unavailable";
    } catch { model = ACTIVE_GROQ_MODEL || "Groq model unavailable"; }
  }
  res.json({
    googleClientId: GID || null,
    hasAiKey: Boolean(KEY || GROQ_KEY),
    aiProvider: GROQ_KEY ? "Groq" : KEY ? "Gemini" : "Offline",
    model,
    groqModels
  });
});

/**
 * GET /api/health
 * Health-check endpoint. Useful for monitoring and smoke tests.
 */
app.get("/api/health", (req, res) => {
  res.json({
    status:        "ok",
    app:           "EduNerd",
    version:       "1.3.2",
    uptime:        Math.round(process.uptime()),
    aiProvider:    GROQ_KEY ? `Groq (${ACTIVE_GROQ_MODEL || "model autodetected on request"})` : KEY ? `Gemini (${MODEL})` : "Built-in Smart Tutor (Offline / Fallback Ready)",
    hasGoogleAuth: Boolean(GID),
    usersCount:    Object.keys(DB.users).length
  });
});

/** Generate exam questions through Groq without exposing its key to the browser. */
app.post("/api/generate-paper", softAuth, async (req, res) => {
  const { examName, classLevel, competitionLevel, count, testKind, model: requestedModel } = req.body || {};
  const safeCount = Math.max(1, Math.min(50, Number.parseInt(count, 10) || 10));
  const parsedClass = Number.parseInt(classLevel, 10);
  const safeClassLevel = [8, 9, 10, 11, 12].includes(parsedClass) ? parsedClass : 10;
  const safeCompetitionLevel = ["Foundation", "Intermediate", "Advanced"].includes(competitionLevel)
    ? competitionLevel
    : "Intermediate";
  if (!examName || !["mock", "pyq", "sample"].includes(testKind)) {
    return res.status(400).json({ error: "Exam and valid paper type are required." });
  }
  if (!GROQ_KEY) return res.status(503).json({ error: "Paper generation service is not configured." });
  if (requestedModel && !GROQ_TEXT_MODELS.includes(requestedModel)) {
    return res.status(400).json({ error: "Choose a text generation model. Whisper is for audio transcription and cannot create mock questions." });
  }

  try {
    let model;
    try { model = await detectGroqModel(requestedModel); }
    catch (error) {
      if (requestedModel) return res.status(400).json({ error: `${requestedModel} is not available to this Groq API key.` });
      throw error;
    }
    const authHeaders = { authorization: `Bearer ${GROQ_KEY}` };
    const systemPrompt = [
      "Write accurate educational multiple-choice questions at the requested level.",
      "Return exactly one JSON object with this shape:",
      '{"questions":[{"q":"question text","o":["option A","option B","option C","option D"],"a":0,"t":"topic"}]}',
      "The a value is the zero-based index of the correct answer (0, 1, 2, or 3).",
      "Every question must have exactly four string options, one correct answer, and a topic.",
      "Match the specified school class and exam syllabus; do not use concepts above the requested class level.",
      "Foundation means direct foundational concepts; Intermediate means moderate application and one or two reasoning steps; Advanced means challenging multi-step exam-level reasoning.",
      "Keep each question concise (under 30 words) and each answer choice under 12 words.",
      "Do not use markdown fences, comments, trailing commas, or text outside the JSON object."
    ].join(" ");
    const userPrompt = `Create exactly ${safeCount} original ${testKind === "pyq" ? "PYQ-style practice" : testKind === "sample" ? "sample paper" : "mock test"} questions for ${examName}, appropriate for Class ${safeClassLevel}, at ${safeCompetitionLevel} competition difficulty. Apply the definition of this difficulty from the system instructions. Do not claim these are verbatim official past questions.`;
    let lastError = "Question generation failed.";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const retryHint = attempt > 0
        ? ` Previous output was invalid. Return exactly ${safeCount} questions in the required JSON object. Check that the JSON is complete and valid.`
        : "";
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders },
        body: JSON.stringify({
          model,
          temperature: attempt === 0 ? 0.5 : 0.2,
          max_tokens: Math.min(32000, Math.max(2500, safeCount * 600)),
          ...(attempt === 0 ? { response_format: { type: "json_object" } } : {}),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt + retryHint }
          ]
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = payload.error?.message || `Groq request failed (${response.status}).`;
        if (response.status === 429 || payload.error?.type === "rate_limit_exceeded") {
          const match = lastError.match(/try again in ([\d.]+)s/i);
          const waitSeconds = match ? Math.ceil(Number(match[1])) + 1 : 10;
          if (attempt === 0 && waitSeconds <= 20) {
            await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
            continue;
          }
          return res.status(429).json({
            error: `Groq is temporarily rate-limited. Please retry in about ${Math.min(waitSeconds, 60)} seconds.`,
            retryAfterSeconds: Math.min(waitSeconds, 60)
          });
        }
        if (attempt < 2) continue;
        break;
      }

      const content = payload.choices?.[0]?.message?.content || "";
      let parsed;
      try {
        const cleaned = content.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
        try { parsed = JSON.parse(cleaned); }
        catch {
          const firstObject = cleaned.indexOf("{");
          const firstArray = cleaned.indexOf("[");
          const useArray = firstArray >= 0 && (firstObject < 0 || firstArray < firstObject);
          const start = useArray ? firstArray : firstObject;
          const end = cleaned.lastIndexOf(useArray ? "]" : "}");
          if (start < 0 || end <= start) throw new Error("No JSON data in model response.");
          parsed = JSON.parse(cleaned.slice(start, end + 1));
        }
      } catch (err) {
        lastError = err.message;
        continue;
      }
      const questions = (Array.isArray(parsed) ? parsed : parsed.questions || []).filter(q =>
        q && typeof q.q === "string" && Array.isArray(q.o) && q.o.length === 4 &&
        q.o.every(option => typeof option === "string") && Number.isInteger(q.a) && q.a >= 0 && q.a < 4
      ).slice(0, safeCount);
      if (questions.length === safeCount) return res.json({ questions, model });
      lastError = `The model returned ${questions.length} valid questions; ${safeCount} are required.`;
    }

    console.warn("Groq paper generation failed:", lastError);
    return res.status(502).json({ error: `Could not create a valid paper. ${lastError}` });
  } catch (err) {
    console.warn("Paper generation error:", err.message);
    res.status(502).json({ error: "Could not generate the paper right now." });
  }
});

// ══════════════════════════════════════════════════════════
// 7. ROUTES: GENERIC DOCUMENT STORE (/api/db)
// ══════════════════════════════════════════════════════════

/**
 * Check whether a requested collection path is allowed for a given user.
 * Rules:
 *  - Must only contain safe characters (word chars, dash, dot, slash)
 *  - Paths under data/users/<uid>/ are private to that user
 *  - All other paths (e.g. "posts", "board") are accessible to any signed-in user
 *
 * @param {string} p   - Collection path from request body
 * @param {string} uid - Current authenticated user ID
 * @returns {boolean}
 */
const isPathAllowed = (p, uid) =>
  /^[\w\-./]+$/.test(p) &&
  (!p.startsWith("data/users/") ||
    p === "data/users/" + uid ||
    p.startsWith("data/users/" + uid + "/"));

/**
 * POST /api/db
 * Firestore-like document store. Supports: get, set, add, delete, list.
 * Body: { op, path, id?, data?, order?, dir?, limit? }
 *
 * Security:
 *  - "set" on likes/board collections only allowed for own UID as document ID
 *  - "delete" on posts/comments only allowed by the original author
 *  - Data payloads capped at 300 KB
 */
app.post("/api/db", requireAuth, (req, res) => {
  const { op, path: p = "", id, data, order, dir, limit } = req.body || {};

  if (!isPathAllowed(p, req.uid)) {
    return res.status(403).json({ error: "Access denied to this path" });
  }

  // Ensure the collection bucket exists in memory
  const col = DB.col[p] = DB.col[p] || {};

  // Reject oversized payloads
  if (data && JSON.stringify(data).length > 300_000) {
    return res.status(413).json({ error: "Payload too large (max 300 KB)" });
  }

  // ── GET a single document ──
  if (op === "get") {
    return res.json({ exists: id in col, data: col[id] });
  }

  // ── SET (overwrite) a document ──
  if (op === "set") {
    // Likes and leaderboard entries must be keyed by own UID
    if ((/^posts\/[\w-]+\/likes$/.test(p) || p === "board") && id !== req.uid) {
      return res.status(403).json({ error: "You can only write your own entry" });
    }
    col[id] = data;
    persist();
    return res.json({ ok: 1 });
  }

  // ── ADD a document with an auto-generated ID ──
  if (op === "add") {
    if (p === "board") {
      return res.status(403).json({ error: "Use 'set' to update leaderboard entries" });
    }

    const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const doc = { ...data };

    // Server-side sanitisation for community posts
    if (p === "posts") {
      doc.uid  = req.uid;
      doc.text = String(doc.text || "").slice(0, 500);
      doc.ts   = Date.now();
      doc.name = String(doc.name || "Student").slice(0, 40);
      doc.cat  = ["General", "Doubt", "Tip", "Resource"].includes(doc.cat) ? doc.cat : "General";
    }

    // Server-side sanitisation for post comments
    if (/^posts\/[\w-]+\/comments$/.test(p)) {
      doc.uid  = req.uid;
      doc.text = String(doc.text || "").slice(0, 300);
      doc.ts   = Date.now();
      doc.name = String(doc.name || "Student").slice(0, 40);
    }

    col[newId] = doc;
    persist();
    return res.json({ id: newId });
  }

  // ── DELETE a document ──
  if (op === "delete") {
    const doc = col[id];

    // Authors-only for posts and comments
    if ((p === "posts" || /^posts\/[\w-]+\/comments$/.test(p)) && doc && doc.uid !== req.uid) {
      return res.status(403).json({ error: "You can only delete your own content" });
    }
    // Own-entry-only for likes and leaderboard
    if ((/^posts\/[\w-]+\/likes$/.test(p) || p === "board") && id !== req.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Cascade-delete a post's likes and comments sub-collections
    if (p === "posts") {
      delete DB.col["posts/" + id + "/likes"];
      delete DB.col["posts/" + id + "/comments"];
    }

    delete col[id];
    persist();
    return res.json({ ok: 1 });
  }

  // ── LIST documents in a collection ──
  if (op === "list") {
    let docs = Object.entries(col).map(([docId, docData]) => ({ id: docId, data: docData }));

    if (order) {
      docs.sort((x, y) => {
        const vx = x.data ? x.data[order] : 0;
        const vy = y.data ? y.data[order] : 0;
        if (vx === vy) return 0;
        return (vx > vy ? 1 : -1) * (dir === "desc" ? -1 : 1);
      });
    }

    return res.json({ docs: docs.slice(0, Math.min(limit || 100, 100)) });
  }

  res.status(400).json({ error: "Unknown operation. Use: get | set | add | delete | list" });
});

// ══════════════════════════════════════════════════════════
// 8. OFFLINE / FALLBACK SMART TUTOR
// ══════════════════════════════════════════════════════════

/**
 * Generate a helpful AI-style response without any external API.
 * Used when: no GEMINI_API_KEY is set, or when Gemini returns an error.
 *
 * @param {string}  lastText - The user's last message
 * @param {boolean} json     - True if caller expects a JSON array of MCQ objects
 * @returns {string} A markdown or JSON string response
 */
const offlineTutor = (lastText, json) => {
  // JSON mode: return a dynamic, scaled MCQ bank using Fisher-Yates shuffle
  if (json || lastText.includes("multiple-choice") || lastText.includes("JSON")) {
    // 1. Extract classLevel & competitionLevel parameters dynamically from prompt context
    const classMatch = lastText.match(/class\s*(\d+)/i);
    const classLevel = classMatch ? parseInt(classMatch[1], 10) : 10;
    
    let competitionLevel = "Intermediate";
    const lowerText = lastText.toLowerCase();
    if (lowerText.includes("jee") || lowerText.includes("advanced") || lowerText.includes("gate")) {
      competitionLevel = "Advanced";
    } else if (lowerText.includes("neet") || lowerText.includes("medical")) {
      competitionLevel = "NEET";
    } else if (lowerText.includes("olympiad") || lowerText.includes("ntse")) {
      competitionLevel = "Olympiad";
    } else if (lowerText.includes("upsc") || lowerText.includes("ssc") || lowerText.includes("cgl")) {
      competitionLevel = "UPSC/SSC";
    } else if (classLevel <= 8 || lowerText.includes("foundation")) {
      competitionLevel = "Foundation";
    }

    // 2. Dynamic procedural question generators with randomized numbers
    const dynamicFactories = [
      () => {
        const m = Math.floor(Math.random() * 12) + 2;
        const a = Math.floor(Math.random() * 6) + 2;
        const f = m * a;
        const opts = [`${f} N`, `${f + m} N`, `${f + 12} N`, `${m + a} N`].sort(() => Math.random() - 0.5);
        return { q: `A mass of ${m} kg accelerates at ${a} m/s². What net force acts on it?`, o: opts, a: opts.indexOf(`${f} N`), t: "Mechanics" };
      },
      () => {
        const v = Math.floor(Math.random() * 6) + 2;
        const r = Math.floor(Math.random() * 15) + 5;
        const i = (v * r);
        const opts = [`${i} V`, `${i + 4} V`, `${Math.max(2, i - 4)} V`, `${i * 2} V`].sort(() => Math.random() - 0.5);
        return { q: `If a circuit carries ${v} A across a resistor of ${r} Ω, what is the voltage?`, o: opts, a: opts.indexOf(`${i} V`), t: "Electricity" };
      },
      () => {
        const n = Math.floor(Math.random() * 3) + 2;
        const x = Math.floor(Math.random() * 3) + 2;
        const ans = n * Math.pow(x, n - 1);
        const opts = [String(ans), String(ans + n), String(ans * 2), String(ans + 3)].sort(() => Math.random() - 0.5);
        return { q: `Evaluate d/dx (x^${n}) at x = ${x}.`, o: opts, a: opts.indexOf(String(ans)), t: "Calculus" };
      },
      () => {
        const pOH = Math.floor(Math.random() * 5) + 2;
        const pH = 14 - pOH;
        const opts = [String(pH), String(pOH), String(pH + 2), String(Math.max(1, pH - 3))].sort(() => Math.random() - 0.5);
        return { q: `An aqueous solution has a pOH of ${pOH}. What is its pH at 25°C?`, o: opts, a: opts.indexOf(String(pH)), t: "Chemistry" };
      }
    ];

    // 3. Scaled question bank matching competitionLevel and classLevel
    const tierBank = (competitionLevel === "Advanced" || competitionLevel === "NEET" || classLevel >= 11) ? [
      { q: "What is the hybridisation of xenon in XeF₄?", o: ["sp³d²", "sp³d", "sp³", "dsp²"], a: 0, t: "Chemical Bonding" },
      { q: "In DNA replication, which enzyme synthesizes new DNA in 5' to 3' direction?", o: ["DNA Polymerase III", "DNA Ligase", "Helicase", "Primase"], a: 0, t: "Molecular Genetics" },
      { q: "What is the SI unit of magnetic flux density?", o: ["Tesla", "Weber", "Henry", "Gauss"], a: 0, t: "Electromagnetism" },
      { q: "Under Article 32 of the Constitution, which writ releases an unlawfully detained person?", o: ["Habeas Corpus", "Mandamus", "Certiorari", "Quo Warranto"], a: 0, t: "Polity" }
    ] : [
      { q: "Which organelle is considered the powerhouse of the cell?", o: ["Mitochondria", "Nucleus", "Ribosome", "Golgi"], a: 0, t: "Cell Biology" },
      { q: "What is the chemical formula for sodium chloride?", o: ["NaCl", "KCl", "CaCl₂", "Na₂SO₄"], a: 0, t: "Chemistry" },
      { q: "What is the speed of light in vacuum?", o: ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10⁵ m/s", "3 × 10⁷ m/s"], a: 0, t: "Physics" },
      { q: "What is the capital city of Karnataka?", o: ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru"], a: 0, t: "Geography" }
    ];

    // Generate procedural dynamic questions
    const dynamicItems = dynamicFactories.map(fn => fn());
    const combined = [...dynamicItems, ...tierBank];

    // 4. Fisher-Yates shuffle algorithm on question pool
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = combined[i];
      combined[i] = combined[j];
      combined[j] = temp;
    }

    return JSON.stringify(combined.slice(0, 6));
  }

  const q = lastText.toLowerCase();

  // Topic-specific responses
  if (q.includes("newton")) {
    return [
      "### Newton's Three Laws of Motion\n",
      "1. **First Law (Inertia):** A body at rest or in uniform motion continues so unless acted on by a net external force.",
      "2. **Second Law (F = ma):** The rate of change of momentum is directly proportional to the applied force. $F = ma$",
      "3. **Third Law (Action & Reaction):** For every action there is an equal and opposite reaction."
    ].join("\n");
  }

  if (q.includes("plan") || q.includes("7-day") || q.includes("schedule")) {
    return [
      "### 📅 7-Day High Impact Revision Plan\n",
      "- **Day 1:** Mock diagnostics & identify weak areas.",
      "- **Day 2–3:** High-yield PYQ solving (Physics & Chemistry).",
      "- **Day 4:** Formula revision & error log analysis.",
      "- **Day 5:** Timed subject mock test.",
      "- **Day 6:** Mixed doubt resolution with the AI tutor.",
      "- **Day 7:** Active recall, light revision, full sleep! 🌙"
    ].join("\n");
  }

  // Generic helpful response
  return [
    "### 💡 EduNerd Tutor\n",
    "Here's how to tackle this:\n",
    "1. **Core Principle:** Break the topic into fundamental building blocks.",
    "2. **Identify Formulas:** Write down all relevant formulas and units.",
    "3. **Solve Step-by-step:** Work through one solved example.",
    "4. **Practice:** Solve 2–3 variations on your own without notes.\n",
    "Ask me any specific concept, math problem, or revision schedule!"
  ].join("\n");
};

// ══════════════════════════════════════════════════════════
// 9. ROUTES: GEMINI AI PROXY (/api/ai)
// ══════════════════════════════════════════════════════════

/**
 * Per-user rate-limit tracker: stores timestamps of recent AI requests.
 * @type {Record<string, number[]>}
 */
const rateLimitMap = {};

/**
 * POST /api/ai
 * Proxy user messages to Gemini 1.5 Flash.
 * Falls back to the offline tutor when no API key is configured,
 * when Gemini returns an error, or when the rate limit is exceeded.
 *
 * Rate limit: 25 requests per 60 seconds per user/IP.
 *
 * Body: {
 *   messages: Array<{ role: "user"|"assistant", content: string }>,
 *   images?:  Array<{ type: string, data: string (base64) }>,
 *   json?:    boolean  — if true, request Gemini JSON output mode
 * }
 */
app.post("/api/ai", softAuth, async (req, res) => {
  // ── Rate limiting ──
  const now = Date.now();
  const userHits = (rateLimitMap[req.uid] = (rateLimitMap[req.uid] || []).filter(t => now - t < 60_000));

  if (userHits.length >= 25) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute." });
  }
  userHits.push(now);

  // ── Build Gemini-format content array ──
  const { messages = [], images = [], json } = req.body || {};

  const contents = messages.slice(-20).map(m => ({
    role:  m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content || "").slice(0, 8000) }]
  }));

  if (!contents.length || contents[contents.length - 1].role !== "user") {
    return res.status(400).json({ error: "Messages array must end with a user message" });
  }

  const lastText = contents[contents.length - 1].parts[0]?.text || "";

  // ── Offline fallback when no API key is configured ──
  if (!KEY) {
    return res.json({ text: offlineTutor(lastText, json) });
  }

  // ── Attach inline image data (base64) to the last user message ──
  if (images.length) {
    contents[contents.length - 1].parts.unshift(
      ...images.slice(0, 3).map(img => ({
        inline_data: {
          mime_type: String(img.type || "image/jpeg"),
          data:      String(img.data)
        }
      }))
    );
  }

  // ── Call Gemini API ──
  try {
    // Normalise model name (handle legacy alias)
    const targetModel = MODEL === "gemini-3.5-flash" ? "gemini-1.5-flash" : MODEL;
    const url = `${GEMINI_BASE}/models/${encodeURIComponent(targetModel)}:generateContent`;

    const apiResponse = await fetch(url, {
      method:  "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": KEY },
      body:    JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: json ? 8000 : 4000,
          ...(json ? { responseMimeType: "application/json" } : {})
        }
      })
    });

    const apiJson = await apiResponse.json().catch(() => ({}));

    // On API error (quota exceeded, invalid model, etc.) fall back gracefully
    if (!apiResponse.ok) {
      console.warn("⚠️  Gemini API error:", apiJson.error?.message || apiResponse.status);
      return res.json({ text: offlineTutor(lastText, json) });
    }

    // Extract generated text from Gemini response structure
    const candidate = apiJson.candidates && apiJson.candidates[0];
    const text = candidate?.content?.parts
      ? candidate.content.parts.map(p => p.text || "").join("")
      : "";

    if (!text) {
      return res.json({ text: offlineTutor(lastText, json) });
    }

    res.json({ text });
  } catch (err) {
    console.warn("⚠️  AI fetch exception:", err.message);
    res.json({ text: offlineTutor(lastText, json) });
  }
});

// ══════════════════════════════════════════════════════════
// 10. GLOBAL ERROR HANDLER
// ══════════════════════════════════════════════════════════

/**
 * Express error-handling middleware.
 * Handles body-parser errors (e.g. oversized photo) and other
 * unhandled synchronous route errors.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const message = err.type === "entity.too.large"
    ? "Photo is too large (max 14 MB)"
    : "Internal server error";
  res.status(err.status || 500).json({ error: message });
});

// ══════════════════════════════════════════════════════════
// 11. SPA FALLBACK – serve index.html for unknown routes
// ══════════════════════════════════════════════════════════

/**
 * Catch-all GET handler.
 * Returns index.html for any route not matched above,
 * enabling client-side routing in the SPA.
 */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ══════════════════════════════════════════════════════════
// 12. START SERVER
// ══════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log("\n" + "═".repeat(52));
  console.log(`🚀  EduNerd is live at   → http://localhost:${PORT}`);
  console.log(`📡  Health check         → http://localhost:${PORT}/api/health`);
  console.log(`🤖  AI provider          → ${KEY ? `Gemini (${MODEL})` : "Offline tutor (no API key)"}`);
  console.log(`🗄️   Database            → ${DB_FILE}`);
  console.log("═".repeat(52) + "\n");
});
