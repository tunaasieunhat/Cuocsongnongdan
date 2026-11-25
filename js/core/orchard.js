// Vườn cây ăn trái: mua cây giống ở tạp hoá, trồng vào ô vườn, lớn theo ngày, ra trái mỗi sáng.
import { TREES, ORCHARD_SLOTS } from '../config/gameData.js';

export function emptyOrchard() {
  return Array.from({ length: ORCHARD_SLOTS }, () => ({ tree: null, age: 0, fruit: 0 }));
}

export function buySapling(state, treeId) {
  const t = TREES[treeId];
  if (state.money < t.saplingPrice) return { ok: false, reason: `Cần ${t.saplingPrice} xu.` };
  state.money -= t.saplingPrice;
  state.saplings[treeId] = (state.saplings[treeId] || 0) + 1;
  return { ok: true };
}

export function plantTree(state, slot, treeId) {
  const s = state.orchard[slot];
  if (!s) return { ok: false, reason: 'Ô vườn không hợp lệ.' };
  if (s.tree) return { ok: false, reason: 'Ô vườn này đã có cây.' };
  if (!(state.saplings[treeId] > 0)) return { ok: false, reason: 'Chưa có cây giống. Mua ở tiệm tạp hoá ông Bảy nhé.' };
  state.saplings[treeId]--;
  Object.assign(s, { tree: treeId, age: 0, fruit: 0 });
  return { ok: true };
}

export function isGrown(slot) {
  return slot.tree && slot.age >= TREES[slot.tree].growDays;
}

export function harvestTree(state, slot) {
  const s = state.orchard[slot];
  if (!s?.tree) return { ok: false, reason: 'Ô vườn trống.' };
  if (!isGrown(s)) return { ok: false, reason: `Cây còn nhỏ, ${TREES[s.tree].growDays - s.age} ngày nữa mới ra trái.` };
  if (s.fruit <= 0) return { ok: false, reason: 'Hôm nay hái hết trái rồi, mai cây ra tiếp.' };
  const t = TREES[s.tree];
  state.items[t.fruit] = (state.items[t.fruit] || 0) + s.fruit;
  const n = s.fruit;
  s.fruit = 0;
  return { ok: true, item: t.fruit, amount: n };
}

export function newDayOrchard(state) {
  state.orchard.forEach((s) => {
    if (!s.tree) return;
    s.age++;
    if (isGrown(s)) s.fruit = Math.min(TREES[s.tree].amount * 2, s.fruit + TREES[s.tree].amount);
  });
}
