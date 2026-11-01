/**
 * Offline synthetic chime using Web Audio API
 * Generates a clean, calm, harmonic bell tone without external media files or network calls.
 */
export function playFocusChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic bell frequencies (D5 and A5)
    const freqs = [587.33, 880.0];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Soft attack and smooth exponential decay
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2 / (idx + 1), now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.5);
    });
  } catch (err) {
    // AudioContext might be blocked before first user interaction
    console.debug('Synthetic chime suppressed:', err);
  }
}
