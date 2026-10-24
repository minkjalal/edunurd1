// Connection: src/features/people-chat/DirectChatTab.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Renders one-to-one conversation history and message controls.
/**
 * People & Chat - Direct Private Chat Component (DirectChatTab.jsx)
 * =================================================================
 * Features:
 * - Conversation list with last message and unread count.
 * - Private chat screen with relative/absolute timestamps.
 * - Live polling (every 3 seconds) ensuring new messages appear within a few seconds.
 * - Safety features: Block and Report buttons.
 * - Message length limit (500 chars), rate-limiting, text-only enforcement.
 * - Strict pairwise isolation: only the two participants can view messages.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  getConversations,
  getConversationMessages,
  sendDirectMessage,
  blockUser,
  reportUser,
  getConversationId
} from "./chatService";
import { MAX_MESSAGE_LENGTH } from "./safety";
import { getRelativeTime } from "../../utils/helpers";

export default function DirectChatTab({ dbHandle, uid, currentName = "Student", activePartner, onBackToDirectory }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Auto-scroll messages to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Initial Conversation Setup
  const loadConversations = async () => {
    if (!dbHandle || !uid) return;
    try {
      const list = await getConversations(dbHandle, uid);
      setConversations(list);

      // If activePartner was passed from the directory, select or initialize that thread
      if (activePartner && activePartner.uid && !selectedConv) {
        const targetConvId = getConversationId(uid, activePartner.uid);
        const existing = list.find(c => c.id === targetConvId);
        if (existing) {
          setSelectedConv(existing);
        } else {
          // Virtual new conversation
          setSelectedConv({
            id: targetConvId,
            participants: [uid, activePartner.uid],
            pNames: { [uid]: currentName, [activePartner.uid]: activePartner.name || "Student" },
            pAvatars: { [uid]: "🎓", [activePartner.uid]: activePartner.avatar || "🎓" },
            lastMsg: "",
            lastTs: Date.now()
          });
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [dbHandle, uid, activePartner]);

  // 2. Load Messages for Selected Conversation
  const loadMessages = async () => {
    if (!dbHandle || !selectedConv || !uid) return;
    try {
      const msgs = await getConversationMessages(dbHandle, selectedConv.id, uid);
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  useEffect(() => {
    loadMessages();
    // 3. Live Polling every 3 seconds to receive new messages within seconds
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [selectedConv, dbHandle, uid]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Determine other participant's details
  const getOtherParticipant = conv => {
    if (!conv || !conv.participants) return { uid: "", name: "Student", avatar: "🎓" };
    const otherUid = conv.participants.find(p => p !== uid) || "";
    const otherName = (conv.pNames && conv.pNames[otherUid]) || "Student";
    const otherAvatar = (conv.pAvatars && conv.pAvatars[otherUid]) || "🎓";
    return { uid: otherUid, name: otherName, avatar: otherAvatar };
  };

  const currentOther = selectedConv ? getOtherParticipant(selectedConv) : null;

  // Handle Send Message
  const handleSend = async e => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || sending || !selectedConv || !currentOther) return;

    setSending(true);
    setErrorMsg("");

    try {
      await sendDirectMessage(dbHandle, selectedConv.id, uid, currentOther.uid, text, {
        name: currentName,
        recipientName: currentOther.name,
        recipientAvatar: currentOther.avatar
      });
      setInputText("");
      await loadMessages();
      await loadConversations();
    } catch (err) {
      setErrorMsg(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  // Safety: Block User
  const handleBlock = async () => {
    if (!currentOther || !window.confirm(`Block ${currentOther.name}? You will no longer receive messages from this student.`)) return;
    try {
      await blockUser(dbHandle, uid, currentOther.uid);
      setSelectedConv(null);
      await loadConversations();
    } catch (err) {
      alert("Failed to block user: " + err.message);
    }
  };

  // Safety: Report User
  const handleReportSubmit = async () => {
    if (!currentOther || !reportReason.trim()) return;
    try {
      await reportUser(dbHandle, uid, currentOther.uid, reportReason.trim());
      setReportModalOpen(false);
      setReportReason("");
      alert("Thank you. The report has been logged for moderator review.");
    } catch (err) {
      alert("Failed to submit report: " + err.message);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: selectedConv ? "300px 1fr" : "1fr",
        gap: "14px",
        marginTop: "14px",
        minHeight: "520px"
      }}
    >
      {/* ── LEFT: CONVERSATIONS SIDEBAR ── */}
      <div className="card" style={{ padding: "12px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <b>Private Chats</b>
          <button className="alt" onClick={onBackToDirectory} style={{ fontSize: "12px", padding: "4px 8px" }}>
            + New Chat
          </button>
        </div>

        {!conversations.length ? (
          <div className="mu" style={{ fontSize: "13px", textAlign: "center", padding: "30px 10px" }}>
            No direct messages yet. Browse the People directory to start a chat!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto" }}>
            {conversations.map(conv => {
              const other = getOtherParticipant(conv);
              const isSelected = selectedConv && selectedConv.id === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    background: isSelected ? "var(--ca)" : "var(--in)",
                    border: `1px solid ${isSelected ? "var(--ac2)" : "var(--bd)"}`,
                    transition: "all 0.2s"
                  }}
                >
                  <span style={{ fontSize: "22px" }}>{other.avatar}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b style={{ fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {other.name}
                      </b>
                      {conv.lastTs && (
                        <span className="mu" style={{ fontSize: "11px" }}>
                          {getRelativeTime(conv.lastTs)}
                        </span>
                      )}
                    </div>
                    <div
                      className="mu"
                      style={{
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {conv.lastMsg || "Tap to chat"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RIGHT: ACTIVE CHAT SCREEN ── */}
      {selectedConv && currentOther ? (
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "560px",
            padding: "0",
            overflow: "hidden"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              background: "var(--hd)",
              borderBottom: "1px solid var(--bd)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>{currentOther.avatar}</span>
              <div>
                <b style={{ fontSize: "15px", display: "block" }}>{currentOther.name}</b>
                <span className="mu" style={{ fontSize: "11px" }}>🔒 Private 1-on-1 Chat</span>
              </div>
            </div>

            {/* Safety Actions */}
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="alt"
                onClick={() => setReportModalOpen(true)}
                title="Report user for inappropriate behavior"
                style={{ fontSize: "12px", padding: "4px 8px", color: "var(--o)" }}
              >
                🚩 Report
              </button>
              <button
                className="alt"
                onClick={handleBlock}
                title="Block this student"
                style={{ fontSize: "12px", padding: "4px 8px", color: "var(--r)" }}
              >
                🚫 Block
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}
          >
            {!messages.length ? (
              <div className="mu" style={{ textAlign: "center", margin: "auto", fontSize: "13px" }}>
                Say hello to {currentOther.name}! Keep discussions friendly, respectful, and focused on learning.
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderId === uid;

                return (
                  <div
                    key={msg.id || msg.ts}
                    style={{
                      alignSelf: isMe ? "flex-end" : "flex-start",
                      maxWidth: "75%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start"
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "14px",
                        background: isMe ? "var(--ac)" : "var(--in)",
                        color: "var(--tx)",
                        border: `1px solid ${isMe ? "transparent" : "var(--bd)"}`,
                        wordBreak: "break-word",
                        fontSize: "14px"
                      }}
                    >
                      {msg.text}
                    </div>
                    <span className="mu" style={{ fontSize: "10px", marginTop: "3px" }}>
                      {getRelativeTime(msg.ts)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSend}
            style={{
              padding: "12px",
              borderTop: "1px solid var(--bd)",
              background: "var(--in)",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}
          >
            {errorMsg && (
              <div style={{ color: "var(--r)", fontSize: "12px" }}>
                ⚠️ {errorMsg}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder={`Message ${currentOther.name}… (text only)`}
                maxLength={MAX_MESSAGE_LENGTH}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" disabled={sending || !inputText.trim()}>
                {sending ? "…" : "Send"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span className="mu">Messages update automatically within seconds.</span>
              <span className="mu">{inputText.length}/{MAX_MESSAGE_LENGTH}</span>
            </div>
          </form>
        </div>
      ) : (
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="mu" style={{ textAlign: "center" }}>
            Select a conversation on the left or tap <b>+ New Chat</b> to search students.
          </div>
        </div>
      )}

      {/* Safety Report Modal */}
      {reportModalOpen && (
        <div className="ov" style={{ display: "flex" }}>
          <div className="card" style={{ maxWidth: "420px", width: "90%" }}>
            <h3>🚩 Report Student</h3>
            <p className="mu" style={{ fontSize: "13px" }}>
              Please describe why you are reporting {currentOther?.name}. Reports are monitored to maintain a safe learning environment.
            </p>
            <textarea
              rows={4}
              placeholder="e.g. Inappropriate language, spam, or misconduct…"
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              style={{
                width: "100%",
                marginTop: "10px",
                padding: "8px",
                borderRadius: "8px",
                background: "var(--in)",
                color: "var(--tx)",
                border: "1px solid var(--bd)"
              }}
            />
            <div className="row" style={{ marginTop: "12px", justifyContent: "flex-end" }}>
              <button className="alt" onClick={() => setReportModalOpen(false)}>Cancel</button>
              <button onClick={handleReportSubmit}>Submit Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
