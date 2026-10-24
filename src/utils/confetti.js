// Connection: src/utils/confetti.js is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Provides the celebration animation used by achievement actions.
/**
 * EduNerd - Confetti Animation Utility
 * =====================================
 * Triggers a celebratory particle burst on achievements, level-ups, and correct answers.
 *
 * @param {number} x - Origin X coordinate in viewport pixels
 * @param {number} y - Origin Y coordinate in viewport pixels
 * @param {number} [count=24] - Number of particle shards
 */
export function triggerConfettiBurst(x, y, count = 24) {
  const burstColors = ["#8b5cf6", "#22d3ee", "#22c55e", "#f59e0b", "#ef4444", "#ffffff"];

  for (let i = 0; i < count; i++) {
    const shard = document.createElement("u");
    const angle = Math.random() * 6.283;
    const velocity = 40 + Math.random() * 100;

    shard.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 6px;
      height: 6px;
      border-radius: 2px;
      background: ${burstColors[i % burstColors.length]};
      pointer-events: none;
      z-index: 9999;
    `;

    document.body.append(shard);

    shard.animate([
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      {
        transform: `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity + 40}px) rotate(${Math.random() * 540}deg) scale(0.4)`,
        opacity: 0
      }
    ], {
      duration: 900,
      easing: "cubic-bezier(.2,.7,.3,1)"
    }).onfinish = () => shard.remove();
  }
}
