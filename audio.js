// Все звуки синтезируются в браузере: аудиофайлов нет.

let ctx = null;
let out = null;
let analyser = null;
let voiceBus = null; // голос персонажа (по нему двигается рот)
let fxBus = null;    // гудки, рингтон
let noise = null;
let ringTimer = null;

// Короткая тишина в обычном <audio>. На iPhone/iPad проигрывание такого
// элемента переводит звук приложения в режим «плеер»: Web Audio начинает
// звучать и в веб-приложении на главном экране, и при включённом «Без звука».
let silentEl = null;
function silentAudio() {
  if (!silentEl) {
    const rate = 8000, n = rate / 4; // 0,25 с тишины, WAV 8 бит
    const b = new Uint8Array(44 + n);
    const v = new DataView(b.buffer);
    const str = (o, s) => [...s].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate, true);
    v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    str(36, 'data'); v.setUint32(40, n, true);
    b.fill(128, 44);
    silentEl = document.createElement('audio');
    silentEl.setAttribute('playsinline', '');
    silentEl.preload = 'auto';
    silentEl.src = URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  if (silentEl.paused) silentEl.play().catch(() => {});
}

export function unlockAudio() {
  if (!ctx || ctx.state !== 'running') silentAudio();
  if (!ctx) {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 4;
    out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(comp);
    comp.connect(ctx.destination);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    newBuses();
  }
  if (ctx.state !== 'running') ctx.resume();
}

export const audioReady = () => !!ctx && ctx.state === 'running';

function newBuses() {
  voiceBus = ctx.createGain();
  voiceBus.connect(analyser);
  voiceBus.connect(out);
  fxBus = ctx.createGain();
  fxBus.connect(out);
}

// Мгновенно глушит всё, что уже запланировано (при «положить трубку»).
export function stopAll() {
  stopRingtone();
  if (!ctx) return;
  for (const bus of [voiceBus, fxBus]) {
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
    setTimeout(() => bus.disconnect(), 300);
  }
  newBuses();
}

const buf = new Float32Array(512);
export function voiceLevel() {
  if (!analyser) return 0;
  analyser.getFloatTimeDomainData(buf);
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- мягкие «маримба»-ноты ----------

function pluck(freq, t, { dur = 0.6, vol = 0.25, bus = fxBus } = {}) {
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  o.type = 'sine';
  o2.type = 'sine';
  o.frequency.value = freq;
  o2.frequency.value = freq * 4;
  const g = ctx.createGain();
  const g2 = ctx.createGain();
  g2.gain.value = 0.12;
  o.connect(g);
  o2.connect(g2);
  g2.connect(g);
  g.connect(bus);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o2.start(t);
  o.stop(t + dur + 0.05);
  o2.stop(t + dur + 0.05);
}

// Пентатоника: любые нажатия звучат приятно.
const KEY_NOTES = {
  1: 523.25, 2: 587.33, 3: 659.25, 4: 783.99, 5: 880.0, 6: 1046.5,
  7: 1174.66, 8: 1318.51, 9: 1567.98, '*': 392.0, 0: 440.0, '#': 493.88,
};

export function keyTone(key) {
  unlockAudio();
  if (!ctx) return;
  const f = KEY_NOTES[key] || 660;
  pluck(f, ctx.currentTime + 0.005, { dur: 0.5, vol: f > 1000 ? 0.18 : 0.26 });
}

export function tapSound() {
  unlockAudio();
  if (!ctx) return;
  pluck(784, ctx.currentTime + 0.005, { dur: 0.25, vol: 0.15 });
}

// Длинные гудки. Возвращает длительность в секундах.
export function ringback(count) {
  const t0 = ctx.currentTime + 0.4;
  const period = 2.1;
  for (let i = 0; i < count; i++) {
    const t = t0 + i * period;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = 425;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.06);
    g.gain.setValueAtTime(0.12, t + 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    o.connect(g);
    g.connect(fxBus);
    o.start(t);
    o.stop(t + 1.05);
  }
  return 0.4 + count * period - 0.6;
}

export function connectSound() {
  const t = ctx.currentTime + 0.02;
  pluck(523.25, t, { vol: 0.2 });
  pluck(783.99, t + 0.12, { vol: 0.2 });
}

export function hangupSound() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  pluck(659.25, t, { vol: 0.16 });
  pluck(440.0, t + 0.14, { vol: 0.16, dur: 0.8 });
}

const RING_MELODY = [659.25, 783.99, 880.0, 783.99, 659.25, 523.25, 587.33, 659.25];

export function startRingtone() {
  stopRingtone();
  if (!ctx) return;
  const play = () => {
    const t = ctx.currentTime + 0.05;
    RING_MELODY.forEach((f, i) => pluck(f, t + i * 0.17, { vol: 0.22, dur: 0.45 }));
  };
  play();
  ringTimer = setInterval(play, 2600);
}

export function stopRingtone() {
  clearInterval(ringTimer);
  ringTimer = null;
}

// ---------- билибирдинский язык ----------

const VOWELS = {
  a: [800, 1250], o: [520, 900], u: [350, 760], i: [300, 2250],
  e: [500, 1850], y: [420, 1450], m: [260, 950],
};
const CONSONANTS = ['b', 'p', 'd', 't', 'm', 'n', 'l', 'r', 'k', 'g', 's', 'sh', 'v', 'z', 'bl', 'tr', ''];
const FRICATIVE = { s: 5200, sh: 2800, z: 4800, f: 6500, v: 3500 };
const SOFT_START = new Set(['b', 'p', 'm', 'n', 'bl', 'v']);
const LIQUID = new Set(['l', 'r', 'tr', 'bl']);

function noiseBurst(t, dur, freq, vol, bus) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 1.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(bus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

// Голосовой звук: пила через два формантных фильтра.
// pitch / f1 / f2 — массивы точек, равномерно распределённых по длительности.
function voiced(t, dur, { pitch, f1, f2, vol = 0.5, attack = 0.02, wave = 'sawtooth', vib = 0.02 }) {
  const bus = voiceBus;
  const src = ctx.createOscillator();
  src.type = wave;
  const ramp = (param, pts) => {
    param.setValueAtTime(pts[0], t);
    pts.forEach((v, i) => { if (i) param.linearRampToValueAtTime(v, t + (dur * i) / (pts.length - 1)); });
  };
  ramp(src.frequency, pitch);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.5;
  const lg = ctx.createGain();
  lg.gain.value = pitch[0] * vib;
  lfo.connect(lg);
  lg.connect(src.frequency);

  const b1 = ctx.createBiquadFilter();
  b1.type = 'bandpass';
  b1.Q.value = 5;
  ramp(b1.frequency, f1);
  const b2 = ctx.createBiquadFilter();
  b2.type = 'bandpass';
  b2.Q.value = 7;
  ramp(b2.frequency, f2);
  const g1 = ctx.createGain();
  g1.gain.value = 3.2;
  const g2 = ctx.createGain();
  g2.gain.value = 1.8;
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = pitch[0] * 1.5;
  const g3 = ctx.createGain();
  g3.gain.value = 0.35;

  const amp = ctx.createGain();
  src.connect(b1); b1.connect(g1); g1.connect(amp);
  src.connect(b2); b2.connect(g2); g2.connect(amp);
  src.connect(low); low.connect(g3); g3.connect(amp);
  amp.connect(bus);

  const rel = Math.min(0.06, dur * 0.3);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(vol, t + attack);
  amp.gain.setValueAtTime(vol, t + dur - rel);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.start(t);
  lfo.start(t);
  src.stop(t + dur + 0.02);
  lfo.stop(t + dur + 0.02);
}

function syllable(t, dur, f0a, f0b, syl, v) {
  const vowel = syl.slice(-1);
  const cons = syl.slice(0, -1);
  const [F1, F2] = VOWELS[vowel].map((f) => f * v.formant);
  let start = t;
  if (FRICATIVE[cons]) {
    noiseBurst(t, 0.07, FRICATIVE[cons], 0.12, voiceBus);
    start = t + 0.05;
  } else if (cons === 't' || cons === 'k' || cons === 'tr') {
    noiseBurst(t, 0.03, cons === 'k' ? 2200 : 4000, 0.1, voiceBus);
    start = t + 0.02;
  }
  const vdur = Math.max(0.06, dur - (start - t));
  let f1s = F1, f2s = F2;
  if (SOFT_START.has(cons)) { f1s = 250; f2s = F2 * 0.7; }
  if (LIQUID.has(cons)) { f1s = 350; f2s = 1150 * v.formant; }
  // переход от согласной к гласной занимает первую треть слога
  voiced(start, vdur, {
    pitch: [f0a, f0b],
    f1: [f1s, F1, F1, F1],
    f2: [f2s, F2, F2, F2],
    vol: 0.5,
    attack: SOFT_START.has(cons) ? 0.03 : 0.012,
  });
}

function randomSyllables() {
  const n = 2 + Math.floor(Math.random() * 6);
  const out = [];
  for (let i = 0; i < n; i++) out.push(pick(CONSONANTS) + pick(['a', 'a', 'o', 'u', 'i', 'e', 'y']));
  return out;
}

// Фраза на билибирдинском. kind: say | ask | exclaim | bye. Возвращает длительность (с).
export function speak(v, { kind = 'say', syllables } = {}) {
  if (!ctx) return 0;
  const syls = syllables || randomSyllables();
  const n = syls.length;
  let t = ctx.currentTime + 0.05;
  const t0 = t;
  let base = v.pitch * rnd(0.95, 1.08) * (kind === 'exclaim' ? 1.15 : 1);
  syls.forEach((syl, i) => {
    const p = n > 1 ? i / (n - 1) : 0;
    const last = i === n - 1;
    let dur = v.speed * rnd(0.8, 1.25) * (last ? 1.7 : 1);
    let f0 = base * (1 - 0.14 * p) * rnd(0.93, 1.07);
    let f0b = f0 * rnd(0.95, 1.04);
    if (kind === 'ask' && last) { f0b = f0 * 1.45; dur *= 1.2; }
    if (kind === 'exclaim' && i === 0) f0 *= 1.2;
    if (kind === 'bye') { f0 = base * (i % 2 ? 0.9 : 1.15) * (1 - 0.1 * p); f0b = f0 * 0.92; }
    syllable(t, dur, f0, f0b, syl, v);
    t += dur;
    if (!last && kind !== 'bye' && Math.random() < 0.22) t += rnd(0.06, 0.14);
    if (kind === 'bye' && i === 1) t += 0.18;
  });
  return t - t0;
}

// Фирменные звуки. Возвращают длительность (с).
export function signature(v) {
  if (!ctx) return 0;
  const t = ctx.currentTime + 0.05;
  const fm = (vow) => VOWELS[vow].map((f) => f * v.formant);
  switch (v.sig) {
    case 'hum': { // «Ммм»
      voiced(t, 0.75, { pitch: [105, 135, 120, 95], f1: [260, 260], f2: [900, 900], vol: 0.7, attack: 0.08 });
      return 0.85;
    }
    case 'meow': {
      const [a1, a2] = fm('a'), [i1, i2] = fm('i'), [u1, u2] = fm('u');
      voiced(t, 0.65, { pitch: [480, 640, 600, 420], f1: [i1, a1, a1, u1], f2: [i2, a2, a2, u2], vol: 0.38, vib: 0.03 });
      return 0.75;
    }
    case 'woof': {
      for (const dt of [0, 0.3]) {
        noiseBurst(t + dt, 0.05, 1500, 0.15, voiceBus);
        const [a1, a2] = fm('a'), [u1, u2] = fm('u');
        voiced(t + dt + 0.01, 0.16, { pitch: [300, 210], f1: [a1, u1], f2: [a2, u2], vol: 0.65, attack: 0.008 });
      }
      return 0.55;
    }
    case 'croak': {
      for (const dt of [0, 0.38]) {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(120, t + dt);
        o.frequency.linearRampToValueAtTime(90, t + dt + 0.28);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        const am = ctx.createGain();
        am.gain.value = 0;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 28;
        const lfoG = ctx.createGain();
        lfoG.gain.value = 0.25;
        lfo.connect(lfoG);
        lfoG.connect(am.gain);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t + dt);
        g.gain.exponentialRampToValueAtTime(2.5, t + dt + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.3);
        o.connect(lp); lp.connect(am); am.connect(g); g.connect(voiceBus);
        o.start(t + dt); lfo.start(t + dt);
        o.stop(t + dt + 0.32); lfo.stop(t + dt + 0.32);
      }
      return 0.75;
    }
    case 'cheep': {
      for (const dt of [0, 0.16, 0.32]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(2000, t + dt);
        o.frequency.exponentialRampToValueAtTime(3000, t + dt + 0.08);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t + dt);
        g.gain.exponentialRampToValueAtTime(0.18, t + dt + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.1);
        o.connect(g); g.connect(voiceBus);
        o.start(t + dt); o.stop(t + dt + 0.12);
      }
      return 0.5;
    }
    case 'boing':
    default: {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(170, t);
      o.frequency.exponentialRampToValueAtTime(560, t + 0.35);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 14;
      const lg = ctx.createGain();
      lg.gain.value = 35;
      lfo.connect(lg); lg.connect(o.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(voiceBus);
      o.start(t); lfo.start(t);
      o.stop(t + 0.52); lfo.stop(t + 0.52);
      return 0.55;
    }
  }
}
