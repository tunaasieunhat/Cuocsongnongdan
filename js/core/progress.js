// Tiến trình: danh tiếng/cấp quán, mở công thức, nâng cấp, trang trí, câu cá, mùa & thời tiết.
import { REPUTATION_LEVELS, RECIPES, UPGRADES, DECOR, FISHING, SEASONS, DAYS_PER_SEASON, CROPS } from '../config/gameData.js';

export function reputationLevel(state) {
  const p = state.reputation.points;
  let lvl = 1;
  REPUTATION_LEVELS.forEach((need, i) => {
    if (p >= need) lvl = i + 1;
  });
  return lvl;
}

// Tiến độ tới cấp sau: { level, cur, next, frac }
export function reputationProgress(state) {
  const level = reputationLevel(state);
  const cur = REPUTATION_LEVELS[level - 1];
  const next = REPUTATION_LEVELS[level];
  const p = state.reputation.points;
  return { level, cur, next, frac: next ? (p - cur) / (next - cur) : 1 };
}

export function unlockRecipe(state, id) {
  const r = RECIPES[id];
  if (state.recipes[id]) return { ok: false, reason: 'Đã biết món này rồi.' };
  if (reputationLevel(state) < r.level) return { ok: false, reason: `Cần quán cấp ${r.level}.` };
  if (state.money < r.unlock) return { ok: false, reason: `Cần ${r.unlock} xu.` };
  state.money -= r.unlock;
  state.recipes[id] = true;
  return { ok: true };
}

export function upgradePrice(state, id) {
  const u = UPGRADES.find((x) => x.id === id);
  const lv = state.upgrades[id] || 0;
  if (lv >= u.prices.length) return null;
  return { price: u.prices[lv], level: u.level[lv], next: lv + 1, max: u.prices.length };
}

export function buyUpgrade(state, id) {
  const info = upgradePrice(state, id);
  if (!info) return { ok: false, reason: 'Đã nâng cấp tối đa.' };
  if (reputationLevel(state) < info.level) return { ok: false, reason: `Cần quán cấp ${info.level}.` };
  if (state.money < info.price) return { ok: false, reason: `Cần ${info.price} xu.` };
  state.money -= info.price;
  state.upgrades[id] = info.next;
  if (id === 'chickens') state.coop.timers.push(0);
  return { ok: true, id, level: info.next };
}

export function buyDecor(state, id) {
  const d = DECOR.find((x) => x.id === id);
  if (state.decor[id]) return { ok: false, reason: 'Đã có món đồ này.' };
  if (state.money < d.price) return { ok: false, reason: `Cần ${d.price} xu.` };
  state.money -= d.price;
  state.decor[id] = true;
  return { ok: true };
}

export function fishLeft(state) {
  return Math.max(0, FISHING.fishPerDay - (state.fishToday || 0));
}

export function catchFish(state, success) {
  if (fishLeft(state) <= 0) return { ok: false, reason: 'Hôm nay ao hết cá rồi, mai quay lại nhé.' };
  state.fishToday = (state.fishToday || 0) + 1;
  if (!success) return { ok: false, reason: 'Cá sẩy mất rồi!', missed: true };
  state.items.ca = (state.items.ca || 0) + 1;
  return { ok: true };
}

// ---- Mùa & thời tiết ----
export function seasonIndex(day) {
  return Math.floor((day - 1) / DAYS_PER_SEASON) % SEASONS.length;
}

export function season(state) {
  return SEASONS[seasonIndex(state.day)];
}

export function dayOfSeason(day) {
  return ((day - 1) % DAYS_PER_SEASON) + 1;
}

export function cropInSeason(state, cropId) {
  return CROPS[cropId].seasons.includes(seasonIndex(state.day));
}

export function rollWeather(state, rnd = Math.random) {
  // Ngày đầu tiên luôn nắng cho dễ học
  const rain = state.day > 1 && rnd() < season(state).rainChance;
  state.weather = { rain };
  return state.weather;
}
