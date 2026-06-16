// Web Audio API Sound Synthesizer
let audioCtx = null;
let isMuted = false;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const toggleMute = () => {
  isMuted = !isMuted;
  localStorage.setItem('anagram_magic_muted', isMuted ? 'true' : 'false');
  return isMuted;
};

export const getMuteStatus = () => {
  const saved = localStorage.getItem('anagram_magic_muted');
  if (saved !== null) {
    isMuted = saved === 'true';
  }
  return isMuted;
};

// Play synthesized sound effects
export const playSound = (type) => {
  if (isMuted) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
      case 'click': {
        // High-pitched tactile click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }
      case 'remove': {
        // Lower pitch tactile click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }
      case 'select_letter': {
        // Magical synthetic plink
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }
      case 'tick': {
        // Wooden clock tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }
      case 'tick_warning': {
        // Urgent warning tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1300, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
      case 'success': {
        // Beautiful rising major chord chime
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          gain.gain.setValueAtTime(0, now + idx * 0.06);
          gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.06 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.06 + 0.4);

          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.42);
        });
        break;
      }
      case 'fail': {
        // Downward sliding low buzzer
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(120, now);
        osc1.frequency.linearRampToValueAtTime(70, now + 0.35);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(122, now);
        osc2.frequency.linearRampToValueAtTime(71, now + 0.35);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.36);
        osc2.stop(now + 0.36);
        break;
      }
      case 'conundrum_solved': {
        // Rapid magical run
        const notes = [587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98]; // D5 to G6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);

          gain.gain.setValueAtTime(0, now + idx * 0.04);
          gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.04 + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.04 + 0.35);

          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.37);
        });
        break;
      }
      case 'win': {
        // Triumphant trumpet fanfare chords
        const chords = [
          [261.63, 329.63, 392.00], // C4, E4, G4
          [349.23, 440.00, 523.25], // F4, A4, C5
          [392.00, 493.88, 587.33], // G4, B4, D5
          [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
        ];

        chords.forEach((chord, step) => {
          const startTime = now + step * 0.15;
          const duration = step === 3 ? 0.8 : 0.13;
          chord.forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.005, startTime + duration);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.02);
          });
        });
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error('Audio synthesis failed:', error);
  }
};
