import { CHARACTERS, faceSVG } from './characters.js';
import * as A from './audio.js';

// Настройки поведения
const CONFIG = {
  turns: [3, 5],              // сколько раз персонаж «говорит» после приветствия
  listenMs: [2600, 3800],     // пауза, чтобы малыш успел ответить
  incomingAfterMs: [25000, 50000], // через сколько бездействия звонят сами
  incomingTimeoutMs: 15000,   // сколько звенит входящий
  endScreenMs: 2200,
  maxDigits: 10,
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
const KEY_COLORS = ['#FF8A80', '#FFB74D', '#FFD54F', '#AED581', '#4DD0B5', '#4FC3F7',
                    '#7986CB', '#BA8BE0', '#F48FB1', '#C4A88E', '#FF9E80', '#C4A88E'];

const $ = (s) => document.querySelector(s);
const phone = $('#phone');
const callEl = $('#call');
const avatarEl = $('.avatar');
const numberEl = $('#number');
const keypadView = $('#keypad-view');

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CANCEL = Symbol('cancel');

let number = '';
let callToken = 0;
let current = null;      // текущий персонаж в звонке
let shownAt = 0;         // когда показан текущий экран звонка
let lastCharId = null;

// ---------- нажатия: мгновенная реакция на касание ----------

function onTap(el, fn) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    A.unlockAudio();
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 140);
    fn(e);
  });
}

// ---------- клавиатура ----------

const keysEl = $('.keys');
KEYS.forEach((k, i) => {
  const b = document.createElement('button');
  b.className = 'key';
  b.textContent = k;
  b.style.setProperty('--c', KEY_COLORS[i]);
  onTap(b, () => {
    A.keyTone(k);
    if (number.length < CONFIG.maxDigits) setNumber(number + k);
  });
  keysEl.appendChild(b);
});

function setNumber(n) {
  number = n;
  numberEl.textContent = n;
  keypadView.classList.toggle('has-number', n.length > 0);
}

onTap($('#backspace'), () => { A.tapSound(); setNumber(number.slice(0, -1)); });

onTap($('#dial'), () => {
  // Один и тот же номер всегда попадает к одной и той же зверушке.
  let ch;
  if (number) {
    let h = 0;
    for (const c of number) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    ch = CHARACTERS[h % CHARACTERS.length];
  } else {
    ch = pickCharacter();
  }
  const shown = number;
  setNumber('');
  outgoing(ch, shown);
});

// ---------- контакты ----------

const contactsEl = $('.contacts');
CHARACTERS.forEach((c) => {
  const b = document.createElement('button');
  b.className = 'contact';
  b.style.setProperty('--c', c.color);
  b.style.setProperty('--l', c.light);
  b.innerHTML = faceSVG(c);
  onTap(b, () => outgoing(c, ''));
  contactsEl.appendChild(b);
});

document.querySelectorAll('.tabs button').forEach((b) =>
  onTap(b, () => { A.tapSound(); phone.dataset.tab = b.dataset.tab; }));

// ---------- экраны ----------

function pickCharacter() {
  const pool = CHARACTERS.filter((c) => c.id !== lastCharId);
  return pick(pool);
}

function showCall(ch, mode, shownNumber = '') {
  current = ch;
  lastCharId = ch.id;
  phone.dataset.screen = 'call';
  callEl.style.setProperty('--c', ch.color);
  callEl.style.setProperty('--l', ch.light);
  avatarEl.innerHTML = faceSVG(ch);
  avatarEl.classList.remove('listening', 'waving');
  $('.call-number').textContent = shownNumber;
  $('.hearts').innerHTML = '';
  setMode(mode);
  wakeLock(true);
}

function setMode(mode) {
  callEl.dataset.mode = mode;
  shownAt = performance.now();
}

function goHome() {
  current = null;
  phone.dataset.screen = 'home';
  stopTimer();
  wakeLock(false);
  scheduleIncoming();
}

// ---------- звонки ----------

async function outgoing(ch, shownNumber) {
  const tok = ++callToken;
  clearTimeout(incomingTimer);
  showCall(ch, 'outgoing', shownNumber);
  try {
    const beeps = Math.random() < 0.5 ? 2 : 3;
    await sleep(A.ringback(beeps) * 1000);
    alive(tok);
    await talk(ch, tok);
  } catch (e) {
    if (e !== CANCEL) console.error(e);
  }
}

function alive(tok) {
  if (tok !== callToken) throw CANCEL;
}

async function say(seconds, tok) {
  await sleep(seconds * 1000 + 80);
  alive(tok);
}

async function talk(ch, tok) {
  const v = ch.voice;
  setMode('talk');
  A.connectSound();
  startTimer();
  await sleep(450); alive(tok);

  await say(A.signature(v), tok);
  await say(A.speak(v, { syllables: ['a', 'lo'], kind: 'ask' }), tok);

  const turns = Math.round(rnd(...CONFIG.turns));
  for (let i = 0; i < turns; i++) {
    avatarEl.classList.add('listening');
    await sleep(rnd(...CONFIG.listenMs)); alive(tok);
    avatarEl.classList.remove('listening');
    if (Math.random() < 0.3) await say(A.signature(v), tok);
    await say(A.speak(v, { kind: pick(['say', 'ask', 'ask', 'exclaim']) }), tok);
    if (Math.random() < 0.35) {
      await sleep(250); alive(tok);
      await say(A.speak(v, { kind: pick(['say', 'exclaim']) }), tok);
    }
  }

  avatarEl.classList.add('listening');
  await sleep(1800); alive(tok);
  avatarEl.classList.remove('listening');
  avatarEl.classList.add('waving');
  await say(A.speak(v, { syllables: ['pa', 'ka', 'pa', 'ka'], kind: 'bye' }), tok);
  await sleep(400); alive(tok);
  finishCall(true);
}

// talked = разговор состоялся → прощальный экран с сердечками
function finishCall(talked) {
  const tok = ++callToken;
  A.stopAll();
  A.hangupSound();
  stopTimer();
  if (!talked) {
    setTimeout(() => { if (tok === callToken) goHome(); }, 350);
    return;
  }
  setMode('end');
  avatarEl.classList.remove('listening');
  avatarEl.classList.add('waving');
  const hearts = $('.hearts');
  for (let i = 0; i < 7; i++) {
    const s = document.createElement('span');
    s.textContent = pick(['💗', '💛', '💜', '🧡']);
    s.style.left = `${rnd(8, 82)}%`;
    s.style.animationDelay = `${rnd(0, 0.9)}s`;
    hearts.appendChild(s);
  }
  setTimeout(() => { if (tok === callToken) goHome(); }, CONFIG.endScreenMs);
}

onTap($('#hangup'), () => {
  // защита: то же касание, что открыло экран, не должно сразу сбросить звонок
  if (performance.now() - shownAt < 500) return;
  const mode = callEl.dataset.mode;
  if (mode === 'end') return;
  finishCall(mode === 'talk');
});

onTap($('#answer'), () => {
  if (callEl.dataset.mode !== 'incoming' || performance.now() - shownAt < 500) return;
  A.stopRingtone();
  const tok = ++callToken;
  talk(current, tok).catch((e) => { if (e !== CANCEL) console.error(e); });
});

// ---------- входящие ----------

let incomingTimer = null;

function scheduleIncoming() {
  clearTimeout(incomingTimer);
  incomingTimer = setTimeout(incoming, rnd(...CONFIG.incomingAfterMs));
}

function incoming() {
  if (phone.dataset.screen !== 'home' || document.hidden || !A.audioReady()) {
    scheduleIncoming();
    return;
  }
  const tok = ++callToken;
  showCall(pickCharacter(), 'incoming');
  A.startRingtone();
  setTimeout(() => {
    if (tok === callToken && callEl.dataset.mode === 'incoming') {
      A.stopRingtone();
      callToken++;
      goHome();
    }
  }, CONFIG.incomingTimeoutMs);
}

// любое касание на главном экране откладывает входящий звонок
document.addEventListener('pointerdown', () => {
  if (phone.dataset.screen === 'home') scheduleIncoming();
}, true);

// ---------- таймер разговора, рот, часы ----------

let timerStart = 0;
let timerInt = null;
function startTimer() {
  timerStart = Date.now();
  const el = $('.call-timer');
  const tick = () => {
    const s = Math.floor((Date.now() - timerStart) / 1000);
    el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  tick();
  clearInterval(timerInt);
  timerInt = setInterval(tick, 500);
}
function stopTimer() { clearInterval(timerInt); }

let open = 0;
function frame() {
  if (phone.dataset.screen === 'call') {
    const target = Math.min(1, A.voiceLevel() * 7);
    open += (target - open) * (target > open ? 0.6 : 0.3);
    avatarEl.style.setProperty('--open', open.toFixed(3));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function clock() {
  const d = new Date();
  $('.time').textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
clock();
setInterval(clock, 10000);

// ---------- экран не гаснет во время звонка ----------

let lock = null;
async function wakeLock(on) {
  try {
    if (on && !lock && 'wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch { lock = null; }
}

// ---------- защита от случайных действий ----------

for (const ev of ['contextmenu', 'gesturestart', 'gesturechange', 'dblclick', 'selectstart']) {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && phone.dataset.screen === 'call') {
    callToken++;
    A.stopAll();
    goHome();
  }
});

scheduleIncoming();

// ---------- офлайн ----------

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js');
}
