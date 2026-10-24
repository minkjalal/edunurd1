// Connection: start-all.js is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Starts the main web server and community chat sidecar as coordinated child processes.
/**
 * =============================================================================
 * EduNerd - Unified Local Hosting Runner (start-all.js)
 * =============================================================================
 * Concurrently spawns:
 * 1. EduNerd Main App (Port 3000)
 * 2. Community Real-Time Chat Sidecar (Port 3001)
 *
 * Usage:
 *   node start-all.js
 *   or: npm run start:all
 * =============================================================================
 */

"use strict";

const { spawn } = require("child_process");
const path = require("path");

console.log("\n========================================================");
console.log("   🎓 EduNerd - Starting Local Development Environment   ");
console.log("========================================================\n");

// 1. Spawn Main App (Port 3000)
const mainProcess = spawn(process.execPath, [path.join(__dirname, "server.js")], {
  stdio: "inherit",
  shell: false
});

// 2. Spawn Sidecar Chat Server (Port 3001)
const chatProcess = spawn(process.execPath, [path.join(__dirname, "sidecar", "chat-server.js")], {
  stdio: "inherit",
  shell: false
});

function handleExit(code) {
  console.log("\n🛑 Stopping all EduNerd services...");
  try { mainProcess.kill(); } catch (e) {}
  try { chatProcess.kill(); } catch (e) {}
  process.exit(code || 0);
}

process.on("SIGINT", () => handleExit(0));
process.on("SIGTERM", () => handleExit(0));

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
