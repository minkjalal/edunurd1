/**
 * People & Chat - Main Feature View (PeopleChatView.jsx)
 * =======================================================
 * Manages the sub-views:
 * 1. People Directory (Search & discover student peers)
 * 2. Direct Private Chat (1-on-1 private messaging with live polling)
 * 3. My Profile (Manage public display name, avatar, class/exam, bio, privacy)
 */

import React, { useState } from "react";
import ProfileTab from "./ProfileTab";
import PeopleDirectoryTab from "./PeopleDirectoryTab";
import DirectChatTab from "./DirectChatTab";
import { useApp } from "../../context/AppContext";

export default function PeopleChatView() {
  const { mode, uid, dbHandle, progress, showToast } = useApp();
  const [activeSubView, setActiveSubView] = useState("directory"); // 'directory' | 'chat' | 'profile'
  const [chatPartner, setChatPartner] = useState(null);

  if (mode !== "cloud" || !dbHandle) {
    return (
      <div className="card" style={{ marginTop: "14px" }}>
        <b>Sign in to use People &amp; Chat</b>
        <p className="mu" style={{ fontSize: "13px", marginTop: "6px" }}>
          Private 1-on-1 messaging and student directory access require a cloud account. Sign in using the navigation menu.
        </p>
      </div>
    );
  }

  const handleStartChatWith = partner => {
    setChatPartner(partner);
    setActiveSubView("chat");
  };

  return (
    <div style={{ marginTop: "12px" }}>
      {/* Sub-navigation Tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
        <button
          className={activeSubView === "directory" ? "" : "alt"}
          onClick={() => setActiveSubView("directory")}
        >
          👥 People Directory
        </button>
        <button
          className={activeSubView === "chat" ? "" : "alt"}
          onClick={() => setActiveSubView("chat")}
        >
          💬 Private Chat
        </button>
        <button
          className={activeSubView === "profile" ? "" : "alt"}
          onClick={() => setActiveSubView("profile")}
        >
          👤 My Profile
        </button>
      </div>

      {/* Sub-view Content */}
      {activeSubView === "directory" && (
        <PeopleDirectoryTab
          dbHandle={dbHandle}
          uid={uid}
          onStartChat={handleStartChatWith}
        />
      )}

      {activeSubView === "chat" && (
        <DirectChatTab
          dbHandle={dbHandle}
          uid={uid}
          currentName={progress.name || "Student"}
          activePartner={chatPartner}
          onBackToDirectory={() => setActiveSubView("directory")}
        />
      )}

      {activeSubView === "profile" && (
        <ProfileTab
          dbHandle={dbHandle}
          uid={uid}
          currentName={progress.name || "Student"}
          onProfileSaved={() => showToast && showToast("Profile updated!")}
        />
      )}
    </div>
  );
}
