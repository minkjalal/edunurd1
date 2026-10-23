/**
 * EduNerd - Web Audio API Chime Utility
 * =====================================
 * Generates an 880 Hz harmonic notification tone without relying on external audio assets.
 */
export function playChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 880; // A5 note
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);

    osc.start();
    osc.stop(ctx.currentTime + 1);
  } catch {
    // Audio context may be restricted by autoplay policy
  }
}
