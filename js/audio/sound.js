// Âm thanh tạo bằng Web Audio (không cần file nhạc).
//  - Nhạc nền: giai điệu ngũ cung nhẹ, ban ngày tươi (Đô trưởng), buổi tối êm (La thứ).
//  - Hiệu ứng: xới đất, gieo, tưới, thu hoạch, xèo xèo khi nấu, chuông cửa, tiền rơi, gà gáy...
//  Trình duyệt chỉ cho phát tiếng sau lần chạm đầu tiên, nên gọi unlockAudio() trong sự kiện chạm.

let ctx = null;
let master, musicGain, sfxGain;
let musicOn = true;
let sfxOn = true;
let mood = 'day';
let timer = null;
let nextBeat = 0;
let beat = 0;

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return null;
  }
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = musicOn ? 0.5 : 0;
  musicGain.connect(master);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = sfxOn ? 1 : 0;
  sfxGain.connect(master);
  return ctx;
}

export function unlockAudio() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (!timer) startMusic();
}

export function setAudioSettings({ music, sfx }) {
  musicOn = music;
  sfxOn = sfx;
  if (!ctx) return;
  musicGain.gain.setTargetAtTime(music ? 0.5 : 0, ctx.currentTime, 0.2);
  sfxGain.gain.setTargetAtTime(sfx ? 1 : 0, ctx.currentTime, 0.05);
}

export function setMood(m) {
  mood = m;
}

// ---------- Nốt cơ bản ----------
function tone(freq, t, dur, { type = 'sine', vol = 0.1, out = sfxGain, attack = 0.01, glideTo = null } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let noiseBuf = null;
function noise(t, dur, { vol = 0.1, freq = 1200, q = 0.8, type = 'bandpass' } = {}) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(sfxGain);
  src.start(t);
  src.stop(t + dur + 0.05);
}

// ---------- Hiệu ứng ----------
const SFX = {
  till: (t) => {
    noise(t, 0.18, { vol: 0.25, freq: 300, q: 1 });
    tone(110, t, 0.15, { type: 'triangle', vol: 0.12 });
  },
  plant: (t) => tone(520, t, 0.15, { vol: 0.1, glideTo: 780 }),
  water: (t) => noise(t, 0.5, { vol: 0.12, freq: 3200, q: 0.6, type: 'highpass' }),
  harvest: (t) => {
    tone(659, t, 0.18, { type: 'triangle', vol: 0.12 });
    tone(988, t + 0.08, 0.25, { type: 'triangle', vol: 0.1 });
  },
  coin: (t) => {
    tone(1319, t, 0.1, { type: 'square', vol: 0.04 });
    tone(1760, t + 0.07, 0.22, { type: 'square', vol: 0.04 });
  },
  bell: (t) => {
    tone(880, t, 0.6, { vol: 0.08 });
    tone(1320, t + 0.12, 0.7, { vol: 0.07 });
  },
  sizzle: (t) => noise(t, 1.1, { vol: 0.08, freq: 5000, q: 0.4, type: 'highpass' }),
  ding: (t) => tone(1568, t, 0.5, { vol: 0.08 }),
  pickup: (t) => tone(700, t, 0.1, { type: 'triangle', vol: 0.08, glideTo: 900 }),
  clean: (t) => noise(t, 0.3, { vol: 0.1, freq: 2000, q: 2 }),
  wrong: (t) => {
    tone(220, t, 0.25, { type: 'sawtooth', vol: 0.05 });
    tone(185, t + 0.15, 0.3, { type: 'sawtooth', vol: 0.05 });
  },
  angry: (t) => tone(300, t, 0.4, { type: 'square', vol: 0.04, glideTo: 150 }),
  heart: (t) => [784, 988, 1175].forEach((f, i) => tone(f, t + i * 0.08, 0.3, { vol: 0.07 })),
  levelup: (t) => [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.35, { type: 'triangle', vol: 0.1 })),
  rooster: (t) => {
    tone(600, t, 0.18, { type: 'sawtooth', vol: 0.04, glideTo: 900 });
    tone(900, t + 0.2, 0.5, { type: 'sawtooth', vol: 0.04, glideTo: 700 });
  },
  evening: (t) => [523, 440, 392].forEach((f, i) => tone(f, t + i * 0.12, 0.4, { vol: 0.08 })),
  splash: (t) => noise(t, 0.35, { vol: 0.15, freq: 900, q: 0.7 }),
  rain: (t) => noise(t, 2.5, { vol: 0.05, freq: 6000, q: 0.3, type: 'highpass' }),
};

export function sound(kind) {
  if (!ensure() || !sfxOn) return;
  try {
    (SFX[kind] || SFX.plant)(ctx.currentTime + 0.01);
  } catch {
    /* không có âm thanh cũng không sao */
  }
}

// ---------- Nhạc nền ----------
const SCALES = {
  day: { notes: [523, 587, 659, 784, 880, 1047], bass: [131, 196, 175, 196], step: 0.42, type: 'triangle', vol: 0.05 },
  night: { notes: [440, 523, 587, 659, 784, 880], bass: [110, 131, 147, 131], step: 0.6, type: 'sine', vol: 0.05 },
};

function startMusic() {
  nextBeat = ctx.currentTime + 0.2;
  timer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    while (nextBeat < ctx.currentTime + 0.4) {
      const s = SCALES[mood];
      // Giai điệu: không phải nhịp nào cũng có nốt cho thưa, nhẹ
      if (Math.random() < 0.6) {
        const f = s.notes[Math.floor(Math.random() * s.notes.length)];
        tone(f, nextBeat, s.step * 1.6, { type: s.type, vol: s.vol, out: musicGain, attack: 0.02 });
      }
      if (beat % 4 === 0) tone(s.bass[(beat / 4) % s.bass.length], nextBeat, s.step * 3.5, { type: 'sine', vol: 0.06, out: musicGain, attack: 0.05 });
      nextBeat += s.step;
      beat++;
    }
  }, 100);
}
