// Vật nuôi cần cho ăn (heo, bò): cho ăn trong ngày -> sáng hôm sau có sản phẩm; vuốt ve tăng tình cảm.
import { ANIMALS, PET_LOVE_BONUS } from '../config/gameData.js';

export function emptyAnimals() {
  return Object.fromEntries(Object.keys(ANIMALS).map((k) => [k, { fed: false, petted: false, love: 0, ready: 0 }]));
}

export function hasAnimal(state, kind) {
  return !!state.upgrades[ANIMALS[kind].upgrade];
}

export function feedAnimal(state, kind) {
  const a = state.animals[kind];
  const def = ANIMALS[kind];
  if (!hasAnimal(state, kind)) return { ok: false, reason: `Chưa có chuồng ${def.name.toLowerCase()}.` };
  if (a.fed) return { ok: false, reason: `${def.name} đã no rồi, mai cho ăn tiếp nhé.` };
  const food = def.food.find((f) => (state.items[f] || 0) > 0);
  if (!food) return { ok: false, reason: `Cần ${def.food.map((f) => f).join('/')} để cho ${def.name.toLowerCase()} ăn.`, needFood: def.food };
  state.items[food]--;
  a.fed = true;
  return { ok: true, food };
}

export function petAnimal(state, kind) {
  const a = state.animals[kind];
  if (!hasAnimal(state, kind)) return { ok: false, reason: 'Chưa có con vật này.' };
  if (a.petted) return { ok: false, reason: `Hôm nay đã vuốt ve ${ANIMALS[kind].name.toLowerCase()} rồi.` };
  a.petted = true;
  a.love = Math.min(PET_LOVE_BONUS, a.love + 1);
  return { ok: true, love: a.love };
}

export function collectAnimal(state, kind) {
  const a = state.animals[kind];
  const def = ANIMALS[kind];
  if (a.ready <= 0) return { ok: false, reason: `Chưa có ${def.product === 'thit' ? 'thịt' : 'sữa'}. Cho ${def.name.toLowerCase()} ăn hôm nay, mai sẽ có.` };
  const n = a.ready;
  state.items[def.product] = (state.items[def.product] || 0) + n;
  a.ready = 0;
  return { ok: true, item: def.product, amount: n };
}

export function newDayAnimals(state) {
  Object.entries(state.animals).forEach(([kind, a]) => {
    if (a.fed) a.ready = Math.min(6, a.ready + ANIMALS[kind].amount + (a.love >= PET_LOVE_BONUS ? 1 : 0));
    a.fed = false;
    a.petted = false;
  });
}
