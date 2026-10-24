// Connection: src/utils/communityModeration.js is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Detects abusive language, sanitizes content, and enforces cohort message policy.
/**
 * Community Hub moderation utilities.
 *
 * This file owns the browser-side policy used by the Discord-style Community
 * Hub. The Hub currently keeps public-channel messages in localStorage, so
 * moderation must happen before a message is added to that local history.
 * A production multi-user service must enforce this same policy on its server
 * as well; client-side checks alone cannot protect a remote shared database.
 */

/** The UI and its input both use this limit to keep stored community posts bounded. */
export const MAX_COMMUNITY_MESSAGE_LENGTH = 500;

/**
 * Cohort-A/B are normalized by AppContext to Junior/Teen, but accept both
 * spellings so policy remains correct for migrated sessions and older storage.
 */
const YOUTH_COHORTS = new Set(["junior", "teen", "cohort-a", "cohort-b"]);

/**
 * Each expression has word boundaries so academic words that merely contain a
 * matching letter sequence are not blocked. Separators and repeated letters
 * are accepted to catch common evasion such as "f u c k", "f***k", "fuuuck",
 * and "d1ck" without displaying the matched term back to the learner.
 */
const ABUSE_RULES = [
  {
    category: "explicit profanity",
    pattern: /(?:^|[^a-z0-9])f+[\W_]*(?:(?:u+|v+)[\W_]*)?c+[\W_]*k+(?:e+[\W_]*r+)?(?=$|[^a-z0-9])/i
  },
  {
    category: "sexual profanity",
    pattern: /(?:^|[^a-z0-9])d+[\W_]*(?:i+|!+|\|+)[\W_]*c+[\W_]*k+(?=$|[^a-z0-9])/i
  },
  {
    category: "explicit profanity",
    pattern: /(?:^|[^a-z0-9])s+h+[\W_]*(?:i+|!+|\|+)[\W_]*t+(?=$|[^a-z0-9])/i
  },
  {
    category: "profanity",
    // Explicitly blocked by the Community Hub policy. Word boundaries keep
    // this from hiding ordinary words that only contain the same letters.
    pattern: /(?:^|[^a-z0-9])h+e+l+l+(?=$|[^a-z0-9])/i
  },
  {
    category: "profanity",
    // "duck" is included because it was reported in the youth chat as a
    // prohibited term; the boundary avoids matching words such as "ducky".
    pattern: /(?:^|[^a-z0-9])d+u+c+k+(?=$|[^a-z0-9])/i
  },
  {
    category: "abusive insult",
    // Match the requested compound insult, including repeated letters or
    // punctuation used to evade a simple exact-string filter.
    pattern: /(?:^|[^a-z0-9])m+o+t+h+e+r+[\W_]*f+[\W_]*(?:(?:u+|v+)[\W_]*)?c+[\W_]*k+(?:e+[\W_]*r+)?(?=$|[^a-z0-9])/i
  },
  {
    category: "abusive insult",
    pattern: /(?:^|[^a-z0-9])b+[\W_]*(?:i+|!+|\|+)[\W_]*t+c+h+(?=$|[^a-z0-9])/i
  },
  {
    category: "abusive insult",
    pattern: /(?:^|[^a-z0-9])a+s+s+h+o+l+e+(?=$|[^a-z0-9])/i
  },
  {
    category: "sexual profanity",
    pattern: /(?:^|[^a-z0-9])c+u+n+t+(?=$|[^a-z0-9])/i
  },
  {
    category: "sexual profanity",
    pattern: /(?:^|[^a-z0-9])s+l+u+t+(?=$|[^a-z0-9])/i
  },
  {
    category: "sexual profanity",
    pattern: /(?:^|[^a-z0-9])w+h+o+r+e+(?=$|[^a-z0-9])/i
  },
  {
    category: "abusive insult",
    pattern: /(?:^|[^a-z0-9])b+a+s+t+a+r+d+(?=$|[^a-z0-9])/i
  }
];

/**
 * Normalize Unicode, remove invisible characters, and translate only the
 * common leetspeak substitutions that are safe to change globally. Punctuation
 * stays in place because the detector uses it to recognize spaced-out words.
 */
function normalizeForDetection(text) {
  const source = String(text ?? "");
  const unicodeSafe = typeof source.normalize === "function" ? source.normalize("NFKD") : source;
  return unicodeSafe
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[0]/g, "o")
    .replace(/[1]/g, "i")
    .replace(/[5$]/g, "s")
    .replace(/[7+]/g, "t");
}

/** Return true when the sender belongs to a cohort protected by the profanity rule. */
export function requiresYouthLanguageFilter(cohort) {
  return YOUTH_COHORTS.has(String(cohort ?? "").trim().toLowerCase());
}

/**
 * Redact private contact information for every cohort. Seniors keep their own
 * language policy, but contact details and unsolicited invite links are still
 * hidden before any message is stored or rendered.
 */
export function sanitizeCommunityText(text) {
  let cleaned = String(text ?? "").trim().slice(0, MAX_COMMUNITY_MESSAGE_LENGTH);
  cleaned = cleaned.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED PHONE]");
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED EMAIL]");
  cleaned = cleaned.replace(/(discord\.gg|t\.me|chat\.whatsapp\.com|zoom\.us)\/[a-zA-Z0-9]+/gi, "[REDACTED LINK]");
  return cleaned;
}

/**
 * Detect abusive wording without returning the matched term to the UI. Keeping
 * only categories avoids teaching or echoing the language back to minors.
 */
export function detectAbusiveLanguage(text) {
  const normalized = normalizeForDetection(text);
  const categories = [...new Set(
    ABUSE_RULES.filter(rule => rule.pattern.test(normalized)).map(rule => rule.category)
  )];

  return {
    hasAbusiveLanguage: categories.length > 0,
    categories
  };
}

/**
 * Evaluate a proposed post before it enters the Community Hub's message list.
 * Junior and Teen users are stopped with a clear warning; Senior users retain
 * the requested unrestricted language policy while still receiving PII cleanup.
 */
export function moderateCommunityMessage(text, cohort) {
  const sanitizedText = sanitizeCommunityText(text);
  const detection = detectAbusiveLanguage(sanitizedText);
  const mustBlock = requiresYouthLanguageFilter(cohort) && detection.hasAbusiveLanguage;

  if (mustBlock) {
    return {
      allowed: false,
      text: "",
      categories: detection.categories,
      warning: "This message was not sent. Cohorts A and B cannot post abusive language."
    };
  }

  return {
    allowed: true,
    text: sanitizedText,
    categories: detection.categories,
    warning: ""
  };
}

/**
 * Younger users must never render an abusive message that was created by an
 * unrestricted Senior profile or left in old browser storage. Senior viewers
 * retain access to all messages under the requested Cohort-C policy.
 */
export function isCommunityMessageVisibleToCohort(messageText, viewerCohort) {
  return !requiresYouthLanguageFilter(viewerCohort) || !detectAbusiveLanguage(messageText).hasAbusiveLanguage;
}
