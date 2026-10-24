// Connection: src/features/people-chat/CommunityPeopleChatNav.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Provides navigation between community people-chat tabs.
/**
 * People & Chat - Community Header Navigation Tab (CommunityPeopleChatNav.jsx)
 * ============================================================================
 * Placed at the top of Community view.
 * Reversible: If PEOPLE_CHAT_ENABLED is false, returns null and renders nothing.
 */

import React from "react";
import { PEOPLE_CHAT_ENABLED } from "./flags";

export default function CommunityPeopleChatNav({ activeTab = "posts", onSelectTab }) {
  if (!PEOPLE_CHAT_ENABLED) return null;

  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--in)",
        padding: "4px",
        borderRadius: "14px",
        border: "1px solid var(--bd)",
        marginBottom: "16px",
        gap: "4px"
      }}
    >
      <button
        type="button"
        className={activeTab === "posts" ? "" : "alt"}
        onClick={() => onSelectTab("posts")}
        style={{
          border: activeTab === "posts" ? "none" : "none",
          padding: "8px 16px",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: 600
        }}
      >
        📋 Discussions &amp; Doubts
      </button>
      <button
        type="button"
        className={activeTab === "chat" ? "" : "alt"}
        onClick={() => onSelectTab("chat")}
        style={{
          border: activeTab === "chat" ? "none" : "none",
          padding: "8px 16px",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: 600
        }}
      >
        💬 People &amp; Chat
      </button>
    </div>
  );
}
