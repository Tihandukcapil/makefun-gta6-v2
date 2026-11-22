// Sound, all synthesized with WebAudio — no audio files. Three radio stations
// (slow synthwave arpeggios at different tempos), engine hum, siren, gunshots,
// cash and mission jingles. Everything is guarded: no gesture yet, no sound.
import { RADIO } from './config.js';

export function createAudio() {
  let ctx = null;
  let radioNodes = null;
  let station = 0;
  let sirenOn = false;
  let sirenNodes = null;
  let engineNodes = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      return true;
    } catch { return false; }
  }

  function tone(freq, dur, type, gain, when = 0) {
    if (!ctx || muted) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain || 0.08, ctx.currentTime + when);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + when);
      o.stop(ctx.currentTime + when + dur + 0.05);
    } catch { /* audio is decoration, never fatal */ }
  }

  const SCALES = [
    [220, 261.6, 329.6, 392, 440, 523.3],
    [196, 233.1, 293.7, 349.2, 392, 466.2],
    [174.6, 220, 261.6, 311.1, 349.2, 415.3],
  ];

  function startRadio() {
    if (!ensure() || radioNodes) return;
    try {
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      gain.connect(ctx.destination);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = SCALES[station][0];
      osc.connect(gain);
      osc.start();
      radioNodes = { osc, gain, step: 0, timer: null };
      radioNodes.timer = window.setInterval(() => {
        if (!radioNodes || muted) return;
        const scale = SCALES[station];
        radioNodes.step = (radioNodes.step + 1) % scale.length;
        radioNodes.osc.frequency.setTargetAtTime(scale[radioNodes.step], ctx.currentTime, 0.08);
      }, 340 - station * 40);
    } catch { radioNodes = null; }
  }

  function stopRadio() {
    if (!radioNodes) return;
    try { window.clearInterval(radioNodes.timer); radioNodes.osc.stop(); } catch { /* noop */ }
    radioNodes = null;
  }

  function startSiren() {
    if (!ensure() || sirenOn) return;
    sirenOn = true;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      g.gain.value = 0.02;
      o.connect(g).connect(ctx.destination);
      o.start();
      sirenNodes = { o, g, hi: true };
      sirenNodes.timer = window.setInterval(() => {
        if (!sirenNodes) return;
        sirenNodes.hi = !sirenNodes.hi;
        sirenNodes.o.frequency.setTargetAtTime(sirenNodes.hi ? 880 : 660, ctx.currentTime, 0.05);
      }, 420);
    } catch { sirenOn = false; }
  }

  function stopSiren() {
    if (!sirenNodes) { sirenOn = false; return; }
    try { window.clearInterval(sirenNodes.timer); sirenNodes.o.stop(); } catch { /* noop */ }
    sirenNodes = null;
    sirenOn = false;
  }

  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {}); startRadio(); },
    setStation(next) { station = ((next % RADIO.length) + RADIO.length) % RADIO.length; if (radioNodes) { stopRadio(); startRadio(); } return station; },
    stationName() { return RADIO[station].name; },
    stationShow() { return RADIO[station].show; },
    setSiren(on) { if (on) startSiren(); else stopSiren(); },
    setEngine(running, speed) {
      if (!ensure()) return;
      if (!running) {
        if (engineNodes) { try { engineNodes.o.stop(); } catch { /* noop */ } engineNodes = null; }
        return;
      }
      if (!engineNodes) {
        try {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.type = 'sawtooth'; g.gain.value = 0.015;
          o.connect(g).connect(ctx.destination); o.start();
          engineNodes = { o, g };
        } catch { return; }
      }
      engineNodes.o.frequency.setTargetAtTime(60 + Math.abs(speed) * 3.2, ctx.currentTime, 0.1);
    },
    shoot() { tone(180, 0.12, 'square', 0.12); tone(90, 0.18, 'sawtooth', 0.08, 0.02); },
    cash() { tone(880, 0.1, 'sine', 0.1); tone(1318, 0.22, 'sine', 0.1, 0.09); },
    missionDone() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.11)); },
    busted() { [392, 311, 233].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.09, i * 0.16)); },
    steal() { tone(330, 0.08, 'square', 0.08); tone(494, 0.14, 'square', 0.08, 0.07); },
    toggleMute() { muted = !muted; if (muted) { stopRadio(); stopSiren(); } else startRadio(); return muted; },
  };
}
