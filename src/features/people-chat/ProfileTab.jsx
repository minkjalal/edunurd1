// Connection: src/features/people-chat/ProfileTab.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Displays and edits the current learner profile in people chat.
/**
 * People & Chat - Profile Editor Component (ProfileTab.jsx)
 * ==========================================================
 * Strict Privacy & Safety:
 * - Display name, avatar emoji, class/exam, and bio (<= 150 chars).
 * - "Visible to others" privacy switch.
 * - NEVER asks for or shows email, phone, or address.
 */

import React, { useState, useEffect } from "react";
import { getMyProfile, saveMyProfile } from "./chatService";
import { MAX_BIO_LENGTH } from "./safety";

const AVATAR_OPTIONS = ["🎓", "🚀", "🔬", "🧠", "📚", "💡", "⚡", "🌟", "🎨", "🐱", "🦊", "🐼", "🦁", "🦉"];
const CLASS_EXAM_OPTIONS = [
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11 (PCM)", "Class 11 (PCB)", "Class 12 (PCM)", "Class 12 (PCB)",
  "JEE Aspirant", "NEET Aspirant", "UPSC / Civil Services", "SSC CGL / Govt Exams", "Banking Exams", "GATE / Engineering", "General Study"
];

export default function ProfileTab({ dbHandle, uid, currentName = "Student", onProfileSaved }) {
  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState("🎓");
  const [classOrExam, setClassOrExam] = useState("Class 10");
  const [bio, setBio] = useState("Preparing with EduNerd!");
  const [isVisible, setIsVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    async function load() {
      if (!dbHandle || !uid) return;
      const prof = await getMyProfile(dbHandle, uid, currentName);
      if (prof) {
        if (prof.name) setName(prof.name);
        if (prof.avatar) setAvatar(prof.avatar);
        if (prof.classOrExam) setClassOrExam(prof.classOrExam);
        if (prof.bio != null) setBio(prof.bio);
        if (typeof prof.isVisible === "boolean") setIsVisible(prof.isVisible);
      }
    }
    load();
  }, [dbHandle, uid, currentName]);

  const handleSave = async e => {
    e?.preventDefault();
    if (!name.trim()) {
      setStatusMsg("⚠️ Please enter a display name.");
      return;
    }

    setSaving(true);
    setStatusMsg("");

    try {
      const updated = await saveMyProfile(dbHandle, uid, {
        name: name.trim(),
        avatar,
        classOrExam,
        bio: bio.trim(),
        isVisible
      });
      setStatusMsg("✅ Profile saved successfully!");
      if (onProfileSaved) onProfileSaved(updated);
      setTimeout(() => setStatusMsg(""), 3500);
    } catch (err) {
      setStatusMsg("❌ Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h2>👤 My Student Profile</h2>
      <p className="mu" style={{ fontSize: "13px" }}>
        Customize how other students see you in the community directory.
      </p>

      {/* Safety & Minor Privacy Notice */}
      <div
        style={{
          background: "rgba(34, 211, 238, 0.08)",
          border: "1px solid rgba(34, 211, 238, 0.25)",
          borderRadius: "12px",
          padding: "10px 14px",
          margin: "12px 0 16px",
          fontSize: "12px",
          color: "var(--ac2)"
        }}
      >
        🔒 <b>Zero PII Protected:</b> Your phone number, email address, and location are never requested, stored, or revealed.
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Avatar Picker */}
        <div>
          <label style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
            Choose Avatar:
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {AVATAR_OPTIONS.map(emo => (
              <button
                type="button"
                key={emo}
                className={avatar === emo ? "" : "alt"}
                style={{
                  fontSize: "22px",
                  padding: "6px 12px",
                  borderRadius: "10px",
                  borderColor: avatar === emo ? "var(--ac2)" : undefined
                }}
                onClick={() => setAvatar(emo)}
              >
                {emo}
              </button>
            ))}
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>
            Display Name:
          </label>
          <input
            type="text"
            maxLength={40}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. StudyBuddy_Arjun"
            required
            style={{ width: "100%" }}
          />
        </div>

        {/* Class or Target Exam */}
        <div>
          <label style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>
            Class or Target Exam:
          </label>
          <select
            value={classOrExam}
            onChange={e => setClassOrExam(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "12px",
              border: "1px solid var(--bd)",
              background: "var(--in)",
              color: "var(--tx)",
              font: "inherit"
            }}
          >
            {CLASS_EXAM_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Short Bio with 150-char strict limit */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <label style={{ fontWeight: 600, fontSize: "13px" }}>Short Bio:</label>
            <span className="mu" style={{ fontSize: "12px" }}>
              {bio.length}/{MAX_BIO_LENGTH}
            </span>
          </div>
          <textarea
            rows={3}
            maxLength={MAX_BIO_LENGTH}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="e.g. Aiming for JEE 2027. Love physics mechanics and problem solving!"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "12px",
              border: "1px solid var(--bd)",
              background: "var(--in)",
              color: "var(--tx)",
              font: "inherit",
              resize: "none"
            }}
          />
        </div>

        {/* Visibility Switch */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--in)",
            padding: "12px 14px",
            borderRadius: "12px",
            border: "1px solid var(--bd)"
          }}
        >
          <div>
            <b style={{ fontSize: "14px", display: "block" }}>Visible to other students</b>
            <span className="mu" style={{ fontSize: "12px" }}>
              When enabled, your profile appears in the community People directory.
            </span>
          </div>
          <input
            type="checkbox"
            checked={isVisible}
            onChange={e => setIsVisible(e.target.checked)}
            style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "var(--ac)" }}
          />
        </div>

        {/* Status Feedback */}
        {statusMsg && (
          <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>
            {statusMsg}
          </div>
        )}

        <button type="submit" disabled={saving} style={{ alignSelf: "flex-start", marginTop: "6px" }}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
