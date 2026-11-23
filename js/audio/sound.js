// Âm thanh nhẹ tạo bằng Web Audio (không cần file). Bản đầy đủ (nhạc nền, bật/tắt) làm ở bước âm thanh.
let ctx;

const NOTES = {
  till: [330],
  plant: [523],
  water: [659, 784],
  harvest: [659, 880],
  evening: [523, 440, 392],
};

export function sound(kind) {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    (NOTES[kind] || [523]).forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = kind === 'till' ? 'triangle' : 'sine';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.3);
    });
  } catch {
    /* không có âm thanh cũng không sao */
  }
}
