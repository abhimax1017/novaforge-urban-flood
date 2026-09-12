// Web Audio API Emergency Siren & Alarm Synthesizer for Community Disaster Alerts

let audioCtx: AudioContext | null = null;
let isPlaying = false;
let osc1: OscillatorNode | null = null;
let osc2: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let lfo: OscillatorNode | null = null;
let lfoGain: GainNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Starts the continuous emergency community warning siren.
 * Sweeps frequencies between 460Hz and 880Hz with civil disaster alarm modulation.
 */
export function startEmergencyAlarm(volume: number = 0.4): boolean {
  try {
    const ctx = getAudioContext();
    if (isPlaying) return true;

    // Master Gain
    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.min(0.8, Math.max(0.05, volume)), ctx.currentTime + 0.3);
    gainNode.connect(ctx.destination);

    // Primary Siren Oscillator (Sawtooth wave for penetrating siren timbre)
    osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(650, ctx.currentTime);

    // Secondary Harmonic Oscillator (Square wave for civic warning horn texture)
    osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(650 * 1.5, ctx.currentTime); // 975 Hz harmonic

    // Low Frequency Oscillator (LFO) to modulate the siren pitch up and down (wail effect)
    lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.45, ctx.currentTime); // ~2.2 second wail cycle

    lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(220, ctx.currentTime); // +/- 220 Hz pitch sweep

    // Modulate osc1 and osc2 frequencies
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    // Secondary oscillator slightly quieter
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.35, ctx.currentTime);
    osc2.connect(osc2Gain);

    osc1.connect(gainNode);
    osc2Gain.connect(gainNode);

    osc1.start();
    osc2.start();
    lfo.start();

    isPlaying = true;
    return true;
  } catch (error) {
    console.warn('Failed to start audio alarm:', error);
    return false;
  }
}

/**
 * Smoothly stops the emergency siren.
 */
export function stopEmergencyAlarm(): void {
  if (!isPlaying || !audioCtx || !gainNode) {
    isPlaying = false;
    return;
  }

  try {
    const ctx = audioCtx;
    // Ramp down gain to prevent clicking
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

    setTimeout(() => {
      try {
        osc1?.stop();
        osc2?.stop();
        lfo?.stop();
        osc1?.disconnect();
        osc2?.disconnect();
        lfo?.disconnect();
        lfoGain?.disconnect();
        gainNode?.disconnect();
      } catch (e) {
        // Ignored
      }
      osc1 = null;
      osc2 = null;
      lfo = null;
      lfoGain = null;
      gainNode = null;
      isPlaying = false;
    }, 450);
  } catch (err) {
    isPlaying = false;
  }
}

/**
 * Plays a quick double-chirp test tone for siren testing
 */
export function playAlertChirp(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const chirpGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

    chirpGain.gain.setValueAtTime(0.3, now);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(chirpGain);
    chirpGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch (e) {
    console.warn('Audio chirp test failed:', e);
  }
}

/**
 * Plays an urgent two-pulse threshold breach acoustic warning tone.
 * Specifically triggered on hydrodynamic / critical infrastructure breaches.
 */
export function playThresholdBreachAlert(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Beep 1 (High tone 880 Hz)
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, now);
    g1.gain.setValueAtTime(0.25, now);
    g1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc1.connect(g1);
    g1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Beep 2 (Critical warning tone 1046 Hz)
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(1046.5, now + 0.25);
    g2.gain.setValueAtTime(0.3, now + 0.25);
    g2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.warn('Threshold breach alert tone failed:', e);
  }
}

export function isAlarmPlaying(): boolean {
  return isPlaying;
}
