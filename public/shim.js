// Connection: public/shim.js is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Adapts browser data calls to the local Express API contract.
/**
 * ============================================================
 * EduNerd – Client Bridge (shim.js)
 * ============================================================
 * This module runs in the browser and bridges the single-page
 * frontend (index.html) to the Express backend API.
 *
 * It exposes ONE global object: window.claude
 * The frontend treats this object as an abstract backend,
 * so the same HTML can run against any compatible backend.
 *
 * Public API surface (window.claude):
 * ┌─────────────────────────────────────────────────────────┐
 * │ claude.login(email, pw, reg?, name?)  → profile         │
 * │ claude.googleLogin(credential)        → profile         │
 * │ claude.logout()                       → void            │
 * │ claude.use("user")                    → { id() }        │
 * │ claude.use("db")                      → { collection() }│
 * │ claude.use("sample")                  → sample()        │
 * │ claude.use("downloads")               → { save() }      │
 * └─────────────────────────────────────────────────────────┘
 *
 * Database API (claude.use("db").collection(path)):
 * ┌─────────────────────────────────────────────────────────┐
 * │ col.orderBy(field, dir).limit(n).get() → { docs }       │
 * │ col.doc(id).get()                      → snapshot       │
 * │ col.doc(id).set(data)                  → { ok }         │
 * │ col.doc(id).delete()                   → { ok }         │
 * │ col.add(data)                          → { id }         │
 * └─────────────────────────────────────────────────────────┘
 *
 * window.EN_LOCAL = true  (signals "local-mode" to the frontend)
 * ============================================================
 */
(function () {
  "use strict";

  // ══════════════════════════════════════════════════════
  // 1. STATE – JWT token persisted across page loads
  // ══════════════════════════════════════════════════════

  /** @type {string|null} Current JWT (null when signed out) */
  let tok = localStorage.getItem("en_token");

  /** @type {string|null} Current user ID */
  let uid = localStorage.getItem("en_uid");

  // ══════════════════════════════════════════════════════
  // 2. CORE HTTP HELPER
  // ══════════════════════════════════════════════════════

  /**
   * Make an authenticated POST request to the backend.
   * Automatically attaches the Bearer token when signed in.
   * On a 401 response, clears the stored token (session expired).
   *
   * @param {string} url  - Relative URL, e.g. "/api/login"
   * @param {object} body - JSON-serialisable request body
   * @returns {Promise<object>} Parsed JSON response
   * @throws {Error} With .code = HTTP status on non-2xx responses
   */
  const api = async (url, body) => {
    const headers = { "Content-Type": "application/json" };
    if (tok) headers["Authorization"] = "Bearer " + tok;

    const response = await fetch(url, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body || {})
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Clear expired/revoked token automatically
      if (response.status === 401 && tok) {
        tok = uid = null;
        localStorage.removeItem("en_token");
        localStorage.removeItem("en_uid");
      }
      const err = new Error(json.error || `Request failed (${response.status})`);
      err.code = response.status;
      throw err;
    }

    return json;
  };

  // ══════════════════════════════════════════════════════
  // 3. SIGN-IN MODAL (lazy, on-demand)
  // ══════════════════════════════════════════════════════

  /**
   * Show a floating sign-in / register modal.
   * Resolves when the user successfully authenticates,
   * rejects when they cancel.
   *
   * @returns {Promise<void>}
   */
  const showLoginModal = () => new Promise((resolve, reject) => {
    // ── Build modal DOM ──
    const overlay = document.createElement("div");
    overlay.style.cssText = [
      "position:fixed;inset:0;z-index:100",
      "background:rgba(0,0,0,.85);backdrop-filter:blur(6px)",
      "display:flex;align-items:center;justify-content:center;padding:20px"
    ].join(";");

    const inputStyle = [
      "width:100%;padding:11px;margin:6px 0;border-radius:12px",
      "border:1px solid #23233a;background:#0d0d14",
      "color:#f1f1f8;font:inherit;box-sizing:border-box"
    ].join(";");

    const btnStyle = [
      "padding:11px 16px;border:0;border-radius:12px",
      "background:linear-gradient(135deg,#8b5cf6,#6366f1)",
      "color:#fff;font:inherit;margin:4px 4px 0 0;cursor:pointer"
    ].join(";");

    overlay.innerHTML = `
      <div style="background:#13131c;border:1px solid #23233a;border-radius:20px;
                  padding:24px;max-width:360px;width:100%;color:#f1f1f8;
                  font:16px system-ui;box-shadow:0 12px 36px rgba(0,0,0,0.5)">
        <h2 style="margin:0 0 10px;font-size:20px">Sign in to EduNerd</h2>
        <p style="font-size:13px;color:#8d8da6;margin-top:0">
          Save your progress across devices and access the community.
        </p>
        <input id="se" type="email"    placeholder="Email address"            autocomplete="email"            style="${inputStyle}">
        <input id="sp" type="password" placeholder="Password (6+ characters)" autocomplete="current-password" style="${inputStyle}">
        <p id="sm" style="color:#f59e0b;font-size:13px;margin:6px 0;min-height:18px"></p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button id="sl" style="${btnStyle}">Log in</button>
          <button id="sr" style="${btnStyle};background:#1e1e2d;border:1px solid #23233a">Create account</button>
          <button id="sc" style="${btnStyle};background:transparent;border:1px solid transparent;color:#8d8da6">Cancel</button>
        </div>
      </div>`;

    document.body.append(overlay);

    const $ = (sel) => overlay.querySelector(sel);

    /**
     * Attempt login or registration.
     * @param {string} endpoint - "/api/login" or "/api/register"
     */
    const attempt = (endpoint) => async () => {
      const email    = $("#se").value.trim();
      const password = $("#sp").value;

      if (!email || !password) {
        $("#sm").textContent = "Please fill in both fields.";
        return;
      }

      try {
        $("#sm").textContent = "Connecting…";
        const result = await api(endpoint, { email, password });

        // Persist credentials
        tok = result.token;
        uid = result.uid;
        localStorage.setItem("en_token", tok);
        localStorage.setItem("en_uid", uid);

        overlay.remove();
        resolve();
      } catch (err) {
        $("#sm").textContent = err.message;
      }
    };

    $("#sl").onclick = attempt("/api/login");
    $("#sr").onclick = attempt("/api/register");
    $("#sc").onclick = () => { overlay.remove(); reject(new Error("Sign-in cancelled")); };
  });

  /**
   * Ensure the user is signed in, prompting if necessary.
   * @returns {Promise<void>}
   */
  const ensureSignedIn = async () => {
    if (!tok) await showLoginModal();
  };

  // ══════════════════════════════════════════════════════
  // 4. DATABASE API – Firestore-compatible wrapper
  // ══════════════════════════════════════════════════════

  /**
   * Create a document snapshot object (mimics Firestore DocumentSnapshot).
   *
   * @param {string}  id     - Document ID
   * @param {boolean} exists - Whether the document exists
   * @param {*}       data   - Raw document data
   * @returns {{ id, exists, data: () => * }}
   */
  const makeSnapshot = (id, exists, data) => ({
    id,
    exists,
    data: () => data
  });

  /**
   * Build a chainable query object for a collection path.
   * Supports .orderBy(), .limit(), .get() — mimics Firestore Query.
   *
   * @param {string} collPath - Collection path, e.g. "posts"
   * @param {object} opts     - Accumulated query options
   * @returns {Query}
   */
  const buildQuery = (collPath, opts) => ({
    /**
     * Sort documents by a field.
     * @param {string} field - Field name to sort by
     * @param {string} dir   - "asc" or "desc"
     */
    orderBy: (field, dir) => buildQuery(collPath, { ...opts, order: field, dir }),

    /**
     * Cap results to N documents.
     * @param {number} n
     */
    limit: (n) => buildQuery(collPath, { ...opts, limit: n }),

    /**
     * Execute the query.
     * @returns {Promise<{ docs: Snapshot[] }>}
     */
    get: async () => {
      const result = await api("/api/db", { op: "list", path: collPath, ...opts });
      return { docs: (result.docs || []).map(d => makeSnapshot(d.id, true, d.data)) };
    }
  });

  /**
   * Get a collection reference — the main entry point for the DB API.
   *
   * @param {string} collPath - Collection path, e.g. "data/users/<uid>"
   * @returns {CollectionRef}
   */
  const collection = (collPath) => Object.assign(buildQuery(collPath, {}), {
    /**
     * Get a reference to a specific document within this collection.
     * @param {string} docId
     * @returns {DocumentRef}
     */
    doc: (docId) => ({
      /** Fetch this document. */
      get:    async ()     => {
        const r = await api("/api/db", { op: "get", path: collPath, id: docId });
        return makeSnapshot(docId, r.exists, r.data);
      },
      /** Overwrite this document with new data. */
      set:    (data)       => api("/api/db", { op: "set",    path: collPath, id: docId, data }),
      /** Delete this document. */
      delete: ()           => api("/api/db", { op: "delete", path: collPath, id: docId })
    }),

    /**
     * Add a new document with an auto-generated ID.
     * @param {object} data
     * @returns {Promise<{ id: string }>}
     */
    add: async (data) => {
      const result = await api("/api/db", { op: "add", path: collPath, data });
      return { id: result.id };
    }
  });

  // ══════════════════════════════════════════════════════
  // 5. AI PROXY – sample() helper
  // ══════════════════════════════════════════════════════

  /**
   * Convert a browser File/Blob to a base64 object suitable for the AI API.
   *
   * @param {File} file - Image file from an <input type="file">
   * @returns {Promise<{ type: string, data: string }|null>}
   */
  const fileToBase64 = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload  = () => resolve({ type: file.type || "image/jpeg", data: String(reader.result).split(",")[1] });
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

  /**
   * Send a chat turn to the AI and stream the response.
   * Mirrors a simplified version of the Anthropic/Claude SDK interface
   * so the frontend doesn't need to know about the backend provider.
   *
   * @param {Array<{ role: string, content: string }>} messages - Conversation history
   * @param {{ images?: File[], onText?: (chunk) => void, cache?: boolean }} opts
   * @returns {Promise<{ text: string }>}
   */
  const sample = async (messages, opts = {}) => {
    let images = [];

    // Convert any attached image files to base64
    if (opts.images && Array.isArray(opts.images)) {
      const converted = await Promise.all(opts.images.map(fileToBase64));
      images = converted.filter(Boolean);
    }

    const result = await api("/api/ai", { messages, images });

    // Fire the onText callback if provided (simulates streaming)
    if (opts.onText) opts.onText({ text: result.text, delta: result.text });

    return { text: result.text || "" };
  };

  /**
   * Convenience wrapper: send a single prompt and expect a parsed JSON response.
   * Strips Markdown code fences that Gemini sometimes wraps around JSON.
   *
   * @param {string} prompt - Natural-language prompt requesting JSON output
   * @returns {Promise<Array|object>} Parsed JSON, or [] on parse failure
   */
  sample.json = async (prompt) => {
    const result = await api("/api/ai", {
      messages: [{ role: "user", content: prompt }],
      json: true
    });

    // Strip optional ```json ... ``` fences from the response
    const raw   = String(result.text || "").replace(/```json|```/g, "").trim();
    const match = raw.match(/[\[{][\s\S]*[\]}]/);

    try {
      return JSON.parse(match ? match[0] : raw);
    } catch (err) {
      console.warn("⚠️  JSON parse failed for AI output:", err.message);
      return [];
    }
  };

  // ══════════════════════════════════════════════════════
  // 6. PUBLIC API – window.claude
  // ══════════════════════════════════════════════════════

  /** Signal to the frontend that we are running in local (non-Firebase) mode. */
  window.EN_LOCAL = true;

  /**
   * The main bridge object exposed to the EduNerd frontend.
   * The frontend accesses backend features exclusively through this object.
   */
  window.claude = {

    /**
     * Sign in with email + password, or register a new account.
     *
     * @param {string}  email    - User's email address
     * @param {string}  pw       - Password (≥ 6 characters)
     * @param {boolean} [reg]    - If true, create a new account
     * @param {string}  [name]   - Display name (registration only)
     * @returns {Promise<{ email, name, picture? }>} Profile object
     */
    login: async (email, pw, reg, name) => {
      const endpoint = reg ? "/api/register" : "/api/login";
      const result   = await api(endpoint, { email, password: pw, name });

      tok = result.token;
      uid = result.uid;
      localStorage.setItem("en_token", tok);
      localStorage.setItem("en_uid", uid);

      return result.profile;
    },

    /**
     * Exchange a Google One-Tap credential for an EduNerd session.
     *
     * @param {string} credential - Google ID token from the GSI callback
     * @returns {Promise<{ email, name, picture? }>} Profile object
     */
    googleLogin: async (credential) => {
      const result = await api("/api/google", { credential });

      tok = result.token;
      uid = result.uid;
      localStorage.setItem("en_token", tok);
      localStorage.setItem("en_uid", uid);

      return result.profile;
    },

    /**
     * Sign the current user out and clear local credentials.
     */
    logout: () => {
      tok = uid = null;
      localStorage.removeItem("en_token");
      localStorage.removeItem("en_uid");
    },

    /**
     * Retrieve a named service handle.
     *
     * @param {"user"|"db"|"sample"|"downloads"} name
     * @returns {Promise<object|null>}
     *
     * "user"      → { id: async () => uid }
     * "db"        → { collection: (path) => CollectionRef }
     * "sample"    → sample() function (with .json method)
     * "downloads" → { save: ({ filename, data }) => Promise<void> }
     */
    use: async (name) => {
      // ── User service: returns current user ID ──
      if (name === "user") {
        await ensureSignedIn();
        return { id: async () => uid };
      }

      // ── Database service: Firestore-compatible collection API ──
      if (name === "db") {
        await ensureSignedIn();
        return { collection };
      }

      // ── AI service: send messages and receive generated text ──
      if (name === "sample") {
        return sample;
      }

      // ── Download service: trigger browser file download ──
      if (name === "downloads") {
        return {
          /**
           * Trigger a file download in the user's browser.
           * @param {{ filename: string, data: Blob|string }} options
           */
          save: async ({ filename, data }) => {
            const blob = data instanceof Blob ? data : new Blob([data], { type: "text/html" });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = filename || "edunerd-notes.html";
            document.body.append(a);
            a.click();
            setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
          }
        };
      }

      return null;
    }
  };

})();
