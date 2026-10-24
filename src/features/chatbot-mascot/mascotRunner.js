// Connection: src/features/chatbot-mascot/mascotRunner.js is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Starts and stops mascot observation in the application lifecycle.
/**
 * Chatbot Mascot Outside-In Mount Runner (mascotRunner.js)
 * ========================================================
 * Self-contained mount coordinator:
 * - Loads chatbot-mascot.js
 * - Respects CHATBOT_MASCOT_ENABLED flag
 * - Calls ChatbotMascot.mount with selectors: { input: "#q", log: "#log" }
 * - Automatically handles React SPA lifecycle (mounts when #ai-tutor-mascot enters DOM,
 *   destroys when leaving)
 * - Zero touch to existing chat logic!
 */

import "./chatbot-mascot.js";
import { CHATBOT_MASCOT_ENABLED } from "./flags.js";

if (typeof window !== "undefined") {
  let activeBot = null;

  const tryMount = () => {
    if (!CHATBOT_MASCOT_ENABLED) {
      if (activeBot) {
        activeBot.destroy();
        activeBot = null;
      }
      return;
    }

    const container = document.getElementById("ai-tutor-mascot");
    if (container && !activeBot && window.ChatbotMascot) {
      activeBot = window.ChatbotMascot.mount(container, {
        input: "#q",
        log: "#log"
      });
    } else if (!container && activeBot) {
      activeBot.destroy();
      activeBot = null;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryMount);
  } else {
    tryMount();
  }

  // React SPA navigation observer: attaches when user switches to AI Tutor
  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(tryMount);
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
