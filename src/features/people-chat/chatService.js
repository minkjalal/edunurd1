/**
 * People & Chat - Data & Storage Service (chatService.js)
 * =======================================================
 * Uses the existing dbHandle document collection store to manage:
 * - chat_profiles (User profiles with visibility controls)
 * - chat_conversations (Private pairwise thread metadata)
 * - chat_messages (Private pairwise chat messages)
 * - chat_blocks (Blocked users)
 * - chat_reports (Moderation logs)
 */

import { escapeHtml, redactPII, checkRateLimit, MAX_MESSAGE_LENGTH } from "./safety";

export const getConversationId = (uid1, uid2) => {
  return [String(uid1), String(uid2)].sort().join("__");
};

/**
 * Fetch or initialize current user's chat profile.
 */
export async function getMyProfile(dbHandle, uid, defaultName = "Student") {
  if (!dbHandle || !uid) return null;
  try {
    const snap = await dbHandle.collection("chat_profiles").doc(uid).get();
    if (snap && snap.exists && snap.data) {
      return snap.data();
    }
    // Return sensible default profile if not set yet
    return {
      uid,
      name: defaultName,
      avatar: "🎓",
      classOrExam: "Class 10",
      bio: "Preparing with EduNerd!",
      isVisible: true,
      updatedAt: Date.now()
    };
  } catch (err) {
    console.error("Failed to fetch chat profile:", err);
    return null;
  }
}

/**
 * Save user profile.
 */
export async function saveMyProfile(dbHandle, uid, profileData) {
  if (!dbHandle || !uid) throw new Error("Database not connected");

  const cleanBio = redactPII(String(profileData.bio || "").slice(0, 150));
  const cleanName = redactPII(String(profileData.name || "Student").slice(0, 40));
  const cleanClass = String(profileData.classOrExam || "General").slice(0, 40);

  const payload = {
    uid,
    name: cleanName,
    avatar: String(profileData.avatar || "🎓").slice(0, 8),
    classOrExam: cleanClass,
    bio: cleanBio,
    isVisible: Boolean(profileData.isVisible),
    updatedAt: Date.now()
  };

  await dbHandle.collection("chat_profiles").doc(uid).set(payload);
  return payload;
}

/**
 * List all profiles that have set isVisible = true.
 */
export async function getVisiblePeople(dbHandle, currentUid) {
  if (!dbHandle) return [];
  try {
    const snap = await dbHandle.collection("chat_profiles").limit(100).get();
    const blockedList = await getBlockedUsers(dbHandle, currentUid);

    return (snap.docs || [])
      .map(d => d.data())
      .filter(p => p && p.uid && p.uid !== currentUid && p.isVisible !== false)
      .filter(p => !blockedList.includes(p.uid));
  } catch (err) {
    console.error("Failed to load visible people:", err);
    return [];
  }
}

/**
 * List all conversations where current user is a participant.
 */
export async function getConversations(dbHandle, currentUid) {
  if (!dbHandle || !currentUid) return [];
  try {
    const snap = await dbHandle.collection("chat_conversations").orderBy("lastTs", "desc").limit(50).get();
    const blockedList = await getBlockedUsers(dbHandle, currentUid);

    return (snap.docs || [])
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c => Array.isArray(c.participants) && c.participants.includes(currentUid))
      .filter(c => {
        const otherId = c.participants.find(id => id !== currentUid);
        return !blockedList.includes(otherId);
      });
  } catch (err) {
    console.error("Failed to load conversations:", err);
    return [];
  }
}

/**
 * Fetch messages for a specific conversation.
 * Privacy check: Caller must be a participant.
 */
export async function getConversationMessages(dbHandle, convId, currentUid) {
  if (!dbHandle || !convId || !currentUid) return [];
  try {
    const parts = convId.split("__");
    if (!parts.includes(currentUid)) {
      throw new Error("Unauthorized access to private conversation.");
    }

    const snap = await dbHandle.collection(`chat_conversations/${convId}/messages`).orderBy("ts", "asc").limit(100).get();
    return (snap.docs || []).map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Failed to load messages:", err);
    return [];
  }
}

/**
 * Send a private message in a conversation.
 */
export async function sendDirectMessage(dbHandle, convId, senderUid, recipientUid, rawText, senderMeta = {}) {
  if (!dbHandle || !convId || !senderUid || !recipientUid) {
    throw new Error("Missing parameters for message delivery.");
  }

  // Rate-limiting check
  if (!checkRateLimit(senderUid)) {
    throw new Error("You are sending messages too quickly. Please wait a moment.");
  }

  const cleanText = redactPII(String(rawText || "").trim().slice(0, MAX_MESSAGE_LENGTH));
  if (!cleanText) {
    throw new Error("Message cannot be empty.");
  }

  const ts = Date.now();
  const msgDoc = {
    convId,
    senderId: senderUid,
    recipientId: recipientUid,
    text: cleanText,
    ts
  };

  // 1. Add message to private thread
  await dbHandle.collection(`chat_conversations/${convId}/messages`).add(msgDoc);

  // 2. Update conversation thread summary
  const convRef = dbHandle.collection("chat_conversations").doc(convId);
  const convSnap = await convRef.get();
  const existing = convSnap && convSnap.exists ? convSnap.data() : {};

  const participants = [senderUid, recipientUid];
  const pNames = {
    ...(existing.pNames || {}),
    [senderUid]: senderMeta.name || "Student",
    [recipientUid]: senderMeta.recipientName || "Student"
  };
  const pAvatars = {
    ...(existing.pAvatars || {}),
    [senderUid]: senderMeta.avatar || "🎓",
    [recipientUid]: senderMeta.recipientAvatar || "🎓"
  };

  await convRef.set({
    id: convId,
    participants,
    pNames,
    pAvatars,
    lastMsg: cleanText.slice(0, 80),
    lastSenderId: senderUid,
    lastTs: ts
  });

  return msgDoc;
}

/**
 * Safety: Block a user.
 */
export async function blockUser(dbHandle, currentUid, targetUid) {
  if (!dbHandle || !currentUid || !targetUid) return;
  await dbHandle.collection(`chat_blocks/${currentUid}/users`).doc(targetUid).set({
    blockedUid: targetUid,
    ts: Date.now()
  });
}

/**
 * Fetch blocked user IDs for current user.
 */
export async function getBlockedUsers(dbHandle, currentUid) {
  if (!dbHandle || !currentUid) return [];
  try {
    const snap = await dbHandle.collection(`chat_blocks/${currentUid}/users`).get();
    return (snap.docs || []).map(d => d.id);
  } catch {
    return [];
  }
}

/**
 * Safety: Report a user for inappropriate conduct.
 */
export async function reportUser(dbHandle, reporterUid, reportedUid, reason) {
  if (!dbHandle) return;
  await dbHandle.collection("chat_reports").add({
    reporterUid,
    reportedUid,
    reason: escapeHtml(String(reason || "Inappropriate conduct").slice(0, 300)),
    ts: Date.now()
  });
}
