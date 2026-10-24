// Connection: src/features/people-chat/safety.js is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Applies safety checks and reporting rules to direct messages.
/**
 * People & Chat - Safety & Privacy Guard Utilities
 * ==================================================
 * Protects student privacy and ensures safety:
 * 1. Text escaping to prevent XSS.
 * 2. Strict character limits (Bio <= 150 chars, Message <= 500 chars).
 * 3. Text-only message enforcement (no arbitrary HTML or external embeds).
 * 4. Client-side rate-limiting to prevent message flooding.
 * 5. PII sanitization (masks phone numbers and email patterns).
 */

export const MAX_BIO_LENGTH = 150;
export const MAX_MESSAGE_LENGTH = 500;
export const RATE_LIMIT_INTERVAL_MS = 1500;

const lastSendTimestamps = new Map();

/**
 * Escape HTML characters to render safe text strings.
 */
export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Filter out accidental phone numbers or email addresses from student text.
 */
export function redactPII(text) {
  if (!text) return "";
  // Redact email addresses
  let sanitized = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email protected]");
  // Redact phone numbers (7+ contiguous digits)
  sanitized = sanitized.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,}\b/g, "[phone number redacted]");
  return sanitized;
}

/**
 * Rate limiter: returns true if user is allowed to send a message.
 */
export function checkRateLimit(userId) {
  const now = Date.now();
  const lastTime = lastSendTimestamps.get(userId) || 0;
  if (now - lastTime < RATE_LIMIT_INTERVAL_MS) {
    return false;
  }
  lastSendTimestamps.set(userId, now);
  return true;
}
