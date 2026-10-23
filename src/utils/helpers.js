/**
 * EduNerd - Helper Functions & State Utilities
 * ============================================
 */

/** Returns today's formatted date string e.g. "2026-10-15" */
export const formatYMD = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Formats seconds into MM:SS display */
export const formatTimeMMSS = sec => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/**
 * Level & XP Formulas
 * Level = 1 + floor(sqrt(XP / 50))
 * Base XP for level L = (L - 1)^2 * 50
 */
export const calculateLevel = xp => Math.floor(Math.sqrt((xp || 0) / 50)) + 1;
export const getLevelBaseXP = lv => (lv - 1) * (lv - 1) * 50;
export const calculateLevelProgress = xp => {
  const curLv = calculateLevel(xp);
  const startXP = getLevelBaseXP(curLv);
  const nextXP = getLevelBaseXP(curLv + 1);
  return Math.round(((xp || 0) - startXP) / (nextXP - startXP) * 100);
};

/** Relative time formatting (e.g. "5m ago", "2h ago") */
export const getRelativeTime = timestamp => {
  const mins = Math.floor((Date.now() - timestamp) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

/** Deterministic HSL avatar color from name */
export const getAvatarColor = name => {
  let hash = 0;
  for (const char of String(name || "Student")) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return `hsl(${hash} 60% 45%)`;
};

/** YouTube lecture search link helper */
export const makeYouTubeLectureUrl = name =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " lecture")}`;

/** Google search link helper */
export const googleSearchUrl = q =>
  `https://www.google.com/search?q=${encodeURIComponent(q)}`;

/** Downscale large user images to max 1280px on canvas before AI transmission */
export async function downscaleImageFile(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise(resolve =>
      canvas.toBlob(blob => resolve(blob || file), "image/jpeg", 0.82)
    );
  } catch {
    return file;
  }
}
