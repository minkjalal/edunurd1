// Connection: start-all.js is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Starts the FastAPI engine, main web server, and community sidecar as coordinated child processes.
/**
 * =============================================================================
 * EduNerd - Unified Local Hosting Runner (start-all.js)
 * =============================================================================
 * Concurrently spawns:
 * 1. FastAPI epistemic engine (Port 8000)
 * 2. EduNerd Main App (Port 3000, or PORT from the environment)
 * 3. Community Real-Time Chat Sidecar (Port 3001)
 *
 * Usage:
 *   node start-all.js
 *   or: npm run start:all
 * =============================================================================
 */

"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Prefer an explicit interpreter, then discover the bundled Windows Python
// layout used by this project, and finally fall back to the platform command.
// This prevents npm run start:all from silently omitting FastAPI when the
// Windows Store python.exe alias is not a real interpreter.
function resolvePythonExecutable() {
  const configured = process.env.EDUNERD_PYTHON || process.env.PYTHON;
  if (configured) return configured;

  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || "";
    const candidates = [
      path.join(localAppData, "Python", "pythoncore-3.14-64", "python.exe"),
      path.join(localAppData, "Programs", "Python", "Python312", "python.exe"),
      path.join(localAppData, "Programs", "Python", "Python311", "python.exe")
    ];
    const installed = candidates.find(candidate => fs.existsSync(candidate));
    if (installed) return installed;
  }

  return process.platform === "win32" ? "python.exe" : "python3";
}

console.log("\n========================================================");
console.log("   🎓 EduNerd - Starting Local Development Environment   ");
console.log("========================================================\n");

// 1. Spawn FastAPI epistemic engine (Port 8000).
const backendProcess = spawn(resolvePythonExecutable(), [path.join(__dirname, "backend", "server.py")], {
  cwd: __dirname,
  env: { ...process.env, PORT: process.env.FASTAPI_PORT || "8000" },
  stdio: "inherit",
  shell: false
});

backendProcess.on("error", (error) => {
  console.error(`❌ FastAPI could not start: ${error.message}`);
  console.error("   Set EDUNERD_PYTHON to the full path of a Python 3.10+ interpreter and restart.");
});

// 2. Spawn Main App (Port 3000 or PORT from the environment).
const mainProcess = spawn(process.execPath, [path.join(__dirname, "server.js")], {
  cwd: __dirname,
  env: process.env,
  stdio: "inherit",
  shell: false
});

// 3. Spawn Sidecar Chat Server (Port 3001).
const chatProcess = spawn(process.execPath, [path.join(__dirname, "sidecar", "chat-server.js")], {
  cwd: __dirname,
  env: process.env,
  stdio: "inherit",
  shell: false
});

function handleExit(code) {
  console.log("\n🛑 Stopping all EduNerd services...");
  try { backendProcess.kill(); } catch (e) {}
  try { mainProcess.kill(); } catch (e) {}
  try { chatProcess.kill(); } catch (e) {}
  process.exit(code || 0);
}

process.on("SIGINT", () => handleExit(0));
process.on("SIGTERM", () => handleExit(0));

backendProcess.on("close", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ FastAPI engine exited with code ${code}`);
  }
});

mainProcess.on("close", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Main application exited with code ${code}`);
  }
});

chatProcess.on("close", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Chat sidecar exited with code ${code}`);
  }
});
