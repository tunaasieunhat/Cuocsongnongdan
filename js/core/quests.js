// Cốt truyện chính, nhiệm vụ hằng ngày, đơn đặt trước, sự kiện lễ, bộ đếm thành tích.
import { STORY, DAILY_TASKS, DAILY_COUNT, DAILY_REP, EVENTS, MARKET_FAIR } from '../config/story.js';
import { RECIPES, RESTAURANT, FARM } from '../config/gameData.js';
import { reputationLevel, seasonIndex, dayOfSeason } from './progress.js';

export function emptyCounters() {
  return { harvest: 0, serve: 0, drinks: 0, eggs: 0, fish: 0, water: 0, happy: 0, talk: {} };
}

// Ghi nhận một hành động cho cả cốt truyện lẫn nhiệm vụ ngày
export function track(state, type, amount = 1, who = null) {
  const c = state.counters;
  if (type === 'talk') c.talk[who] = (c.talk[who] || 0) + 1;
  else c[type] = (c[type] || 0) + amount;
  const done = [];
  state.daily.tasks.forEach((t) => {
    if (t.type === type && !t.done) {
      t.progress = Math.min(t.n, t.progress + amount);
      if (t.progress >= t.n) {
        t.done = true;
        done.push(t);
      }
    }
  });
  return done;
}

// ---------- Cốt truyện ----------
export function currentChapter(state) {
  return STORY[state.story.chapter] || null;
}

export function storyValue(state) {
  const ch = currentChapter(state);
  if (!ch) return { cur: 0, n: 0, done: false };
  const g = ch.goal;
  const base = state.story.base || {};
  const c = state.counters;
  let cur = 0;
  switch (g.type) {
    case 'harvest':
    case 'serve':
      cur = (c[g.type] || 0) - (base[g.type] || 0);
      break;
    case 'talk':
      cur = c.talk[g.who] || 0;
      break;
    case 'recipes':
      cur = Object.entries(state.recipes).filter(([id, v]) => v && !RECIPES[id]?.event).length;
      break;
    case 'level':
      cur = reputationLevel(state);
      break;
    case 'cells':
      cur = Math.min(FARM.cells, state.plots.length);
      break;
    case 'tree':
      cur = state.orchard.filter((s) => s.tree).length;
      break;
    case 'renovate':
      cur = state.upgrades.renovate || 0;
      break;
    case 'animals':
      cur = (state.upgrades.pigpen ? 1 : 0) + (state.upgrades.cowshed ? 1 : 0);
      break;
  }
  return { cur: Math.min(cur, g.n), n: g.n, done: cur >= g.n };
}

export function claimChapter(state) {
  const ch = currentChapter(state);
  if (!ch) return { ok: false, reason: 'Đã hết chương truyện.' };
  if (!storyValue(state).done) return { ok: false, reason: 'Chưa hoàn thành mục tiêu chương này.' };
  giveReward(state, ch.reward);
  state.story.chapter++;
  state.story.base = { ...state.counters, talk: { ...state.counters.talk } };
  return { ok: true, chapter: ch, next: currentChapter(state) };
}

function giveReward(state, r) {
  state.money += r.money || 0;
  Object.entries(r.items || {}).forEach(([id, n]) => (state.items[id] = (state.items[id] || 0) + n));
  Object.entries(r.seeds || {}).forEach(([id, n]) => (state.seeds[id] = (state.seeds[id] || 0) + n));
}

// ---------- Nhiệm vụ hằng ngày ----------
export function rollDaily(state, rnd = Math.random) {
  const pool = DAILY_TASKS.filter((t) => t.type !== 'drinks' || Object.values(state.drinks).some(Boolean));
  const picked = [];
  while (picked.length < Math.min(DAILY_COUNT, pool.length)) {
    const t = pool[Math.floor(rnd() * pool.length)];
    if (!picked.includes(t)) picked.push(t);
  }
  state.daily = {
    day: state.day,
    tasks: picked.map((t) => {
      const n = t.n[0] + Math.floor(rnd() * (t.n[1] - t.n[0] + 1));
      return { type: t.type, n, label: t.label.replace('{n}', n), reward: t.reward, progress: 0, done: false, claimed: false };
    }),
  };
}

export function claimDaily(state, i) {
  const t = state.daily.tasks[i];
  if (!t?.done) return { ok: false, reason: 'Nhiệm vụ chưa xong.' };
  if (t.claimed) return { ok: false, reason: 'Đã nhận thưởng rồi.' };
  t.claimed = true;
  state.money += t.reward;
  state.reputation.points += DAILY_REP;
  return { ok: true, reward: t.reward };
}

// ---------- Đơn đặt trước (GĐ6) ----------
const ORDER_PEOPLE = ['Nhà ông Bảy', 'Đám giỗ nhà chú Tư', 'Tiệc thôi nôi bé Bin', 'Hợp tác xã', 'Trường làng', 'Đám cưới anh Sáu'];

export function rollOrder(state, rnd = Math.random) {
  if (state.orders.length >= RESTAURANT.orderMax || rnd() > 0.6) return null;
  const known = Object.entries(state.recipes).filter(([id, v]) => v && !RECIPES[id].event).map(([id]) => id);
  if (!known.length) return null;
  const dish = known[Math.floor(rnd() * known.length)];
  const qty = 2 + Math.floor(rnd() * 3);
  const o = {
    id: state.nextOrderId++,
    who: ORDER_PEOPLE[Math.floor(rnd() * ORDER_PEOPLE.length)],
    dish,
    qty,
    dueDay: state.day + 1 + Math.floor(rnd() * 2),
    reward: Math.round(RECIPES[dish].price * qty * 1.5),
  };
  state.orders.push(o);
  return o;
}

export function fulfillOrder(state, id) {
  const o = state.orders.find((x) => x.id === id);
  if (!o) return { ok: false, reason: 'Không tìm thấy đơn.' };
  const have = state.restaurant.counter.filter((d) => d === o.dish).length;
  if (have < o.qty) return { ok: false, reason: `Quầy mới có ${have}/${o.qty} phần ${RECIPES[o.dish].name}. Nấu thêm nhé!` };
  for (let k = 0; k < o.qty; k++) state.restaurant.counter.splice(state.restaurant.counter.indexOf(o.dish), 1);
  state.money += o.reward;
  state.reputation.points += 5;
  state.orders = state.orders.filter((x) => x !== o);
  return { ok: true, order: o };
}

// Gọi đầu ngày mới: đơn quá hạn bị huỷ (trừ danh tiếng)
export function expireOrders(state) {
  const late = state.orders.filter((o) => state.day > o.dueDay);
  state.orders = state.orders.filter((o) => state.day <= o.dueDay);
  state.reputation.points = Math.max(0, state.reputation.points - 3 * late.length);
  return late;
}

// ---------- Sự kiện lễ & chợ phiên ----------
export function currentEvent(state) {
  const si = seasonIndex(state.day);
  const d = dayOfSeason(state.day);
  return EVENTS.find((e) => e.season === si && e.days.includes(d)) || null;
}

export function isMarketFair(state) {
  return dayOfSeason(state.day) === MARKET_FAIR.day && !currentEvent(state);
}

export function seedPrice(state, base) {
  return isMarketFair(state) ? Math.max(1, Math.round(base * (1 - MARKET_FAIR.discount))) : base;
}
