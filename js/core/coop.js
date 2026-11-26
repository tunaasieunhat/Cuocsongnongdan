// Chuồng gà: gà tự đẻ trứng theo thời gian, người chơi đến nhặt.
import { COOP } from '../config/gameData.js';

export function tickCoop(state, dt) {
  const c = state.coop;
  let laid = 0;
  if (c.eggs >= COOP.maxEggs) return 0;
  c.timers = c.timers.map((t) => {
    t += dt;
    if (t >= COOP.layTime && c.eggs < COOP.maxEggs) {
      c.eggs++;
      laid++;
      t = 0;
    }
    return t;
  });
  return laid;
}

export function collectEggs(state) {
  const n = state.coop.eggs;
  if (n <= 0) return { ok: false, reason: 'Gà chưa đẻ trứng, quay lại sau nhé.' };
  state.items.trung = (state.items.trung || 0) + n;
  state.coop.eggs = 0;
  return { ok: true, item: 'trung', amount: n };
}
