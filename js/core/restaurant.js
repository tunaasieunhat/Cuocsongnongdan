// Logic quán ăn: thực đơn, bếp, quầy món, khách (đến -> chờ -> ăn -> trả tiền -> về), dọn bàn.
// Chỉ dữ liệu + luật chơi; việc khách đi lại trên màn hình do render lo.
import { RECIPES, RESTAURANT, REGULARS, REGULAR_CHANCE, UPGRADES, DECOR } from '../config/gameData.js';
import { reputationLevel } from './progress.js';

const WALK_OUT = 3; // giây hiển thị khách đi ra trước khi xoá

export function emptyToday() {
  return { revenue: 0, tips: 0, served: 0, satSum: 0, angry: 0, wrong: 0, sold: {}, leftovers: 0, harvested: 0 };
}

export function tableCount(state) {
  return Math.min(RESTAURANT.maxTables, RESTAURANT.startTables + (state.upgrades.tables || 0));
}

export function stoveCount(state) {
  return 1 + (state.upgrades.stove2 || 0);
}

// Hệ số thời gian nấu: bậc 1 còn 75%, bậc 2 còn 50%
export function cookTimeMult(state) {
  return 1 - 0.25 * (state.upgrades.fastStove || 0);
}

export function decorBonus(state) {
  return DECOR.reduce((b, d) => b + (state.decor[d.id] ? d.bonus : 0), 0);
}

export function menuSize(state) {
  return RESTAURANT.menuSize(reputationLevel(state));
}

// Số phần có thể nấu từ kho hiện có
export function portionsAvailable(state, dishId) {
  const ing = RECIPES[dishId].ingredients;
  return Math.min(...Object.entries(ing).map(([id, n]) => Math.floor((state.items[id] || 0) / n)));
}

export function setMenu(state, dishIds) {
  const r = state.restaurant;
  const valid = dishIds.filter((d) => state.recipes[d]);
  if (!valid.length) return { ok: false, reason: 'Chọn ít nhất 1 món nhé.' };
  if (valid.length > menuSize(state)) return { ok: false, reason: `Thực đơn tối đa ${menuSize(state)} món.` };
  r.menu = valid;
  r.menuSet = true;
  return { ok: true };
}

export function startCooking(state, dishId) {
  const r = state.restaurant;
  if (!r.menuSet) return { ok: false, reason: 'Lên thực đơn hôm nay trước đã.' };
  if (!r.menu.includes(dishId)) return { ok: false, reason: 'Món này không có trong thực đơn hôm nay.' };
  const slot = r.stoves.findIndex((s, i) => i < stoveCount(state) && !s);
  if (slot < 0) return { ok: false, reason: 'Bếp đang bận, chờ chút nhé.' };
  const pending = r.stoves.filter(Boolean).length;
  if (r.counter.length + pending >= RESTAURANT.counterMax) return { ok: false, reason: 'Quầy đã đầy món, bưng bớt ra đã.' };
  if (portionsAvailable(state, dishId) < 1) return { ok: false, reason: 'Thiếu nguyên liệu cho món này.' };
  Object.entries(RECIPES[dishId].ingredients).forEach(([id, n]) => (state.items[id] -= n));
  const total = RECIPES[dishId].cookTime * cookTimeMult(state);
  r.stoves[slot] = { dish: dishId, t: 0, total };
  return { ok: true, slot };
}

// Lấy món từ quầy lên tay
export function pickUp(state, dishId) {
  const r = state.restaurant;
  if (r.carry) return { ok: false, reason: 'Tay đang bưng món rồi.' };
  const i = r.counter.indexOf(dishId);
  if (i < 0) return { ok: false, reason: 'Quầy chưa có món này.' };
  r.counter.splice(i, 1);
  r.carry = dishId;
  return { ok: true };
}

export function findCustomer(state, id) {
  return state.restaurant.customers.find((c) => c.id === id);
}

// Đưa món cho khách. dishId: món đưa (mặc định món đang bưng)
export function serve(state, customerId, dishId = state.restaurant.carry, fromCounter = false) {
  const r = state.restaurant;
  const c = findCustomer(state, customerId);
  if (!c || c.state !== 'waiting') return { ok: false, reason: 'Khách này không chờ món.' };
  if (!dishId) return { ok: false, reason: 'Chưa bưng món nào.' };
  if (fromCounter) {
    const i = r.counter.indexOf(dishId);
    if (i < 0) return { ok: false, reason: 'Quầy chưa có món này.' };
    r.counter.splice(i, 1);
  } else {
    r.carry = null;
  }
  const frac = Math.max(0, c.patience / c.maxPatience);
  const wrong = dishId !== c.dish;
  let sat = 40 + 60 * frac + decorBonus(state) * 100;
  if (wrong) sat -= RESTAURANT.wrongDishPenalty;
  c.sat = Math.max(0, Math.min(100, Math.round(sat)));
  c.served = dishId;
  c.wrong = wrong;
  c.frac = frac;
  c.state = 'eating';
  c.t = 0;
  if (wrong) r.today.wrong++;
  return { ok: true, wrong, customer: c };
}

export function cleanTable(state, table) {
  const r = state.restaurant;
  if (!r.dirty[table]) return { ok: false, reason: 'Bàn sạch rồi.' };
  r.dirty[table] = false;
  return { ok: true };
}

function freeTable(state) {
  const r = state.restaurant;
  const n = tableCount(state);
  const used = new Set(r.customers.filter((c) => c.state !== 'leaving').map((c) => c.table));
  const free = [];
  for (let i = 0; i < n; i++) if (!used.has(i) && !r.dirty[i]) free.push(i);
  return free.length ? free[Math.floor(Math.random() * free.length)] : -1;
}

function spawnCustomer(state, events, preferCounter) {
  const r = state.restaurant;
  const table = freeTable(state);
  if (table < 0 || !r.menu.length) return;
  const level = reputationLevel(state);
  let regular = null;
  const candidates = REGULARS.filter((g) => r.menu.includes(g.favorite) && !r.regularsToday.includes(g.id));
  if (candidates.length && Math.random() < REGULAR_CHANCE) regular = candidates[Math.floor(Math.random() * candidates.length)];
  const vip = !regular && level >= RESTAURANT.vipLevel && Math.random() < RESTAURANT.vipChance;
  let dish = regular ? regular.favorite : r.menu[Math.floor(Math.random() * r.menu.length)];
  // Lúc hướng dẫn: khách gọi đúng món đã có trên quầy cho dễ học
  if (preferCounter && !regular && r.counter.length && r.menu.includes(r.counter[0])) dish = r.counter[0];
  const maxPatience = vip ? RESTAURANT.vipPatience : RESTAURANT.patience;
  const c = {
    id: r.nextId++,
    table,
    dish,
    state: 'arriving',
    t: 0,
    patience: maxPatience,
    maxPatience,
    vip,
    regular: regular?.id || null,
    look: Math.floor(Math.random() * 4),
  };
  if (regular) r.regularsToday.push(regular.id);
  r.customers.push(c);
  events.push({ type: 'spawn', customer: c });
}

// Mỗi khung hình khi đang mở quán. Trả về danh sách sự kiện cho UI.
export function tickRestaurant(state, dt, { accepting, patienceFrozen, preferCounter = false }) {
  const r = state.restaurant;
  const events = [];
  // Bếp
  r.stoves.forEach((s, i) => {
    if (!s) return;
    s.t += dt;
    if (s.t >= s.total && r.counter.length < RESTAURANT.counterMax) {
      r.counter.push(s.dish);
      r.stoves[i] = null;
      events.push({ type: 'cooked', dish: s.dish, slot: i });
    }
  });
  if (!r.open) return events;
  // Khách mới
  if (accepting) {
    r.spawnT -= dt;
    if (r.spawnT <= 0) {
      const level = reputationLevel(state);
      r.spawnT = (RESTAURANT.spawnEvery / (1 + 0.15 * (level - 1))) * (0.75 + Math.random() * 0.5);
      spawnCustomer(state, events, preferCounter);
    }
  }
  // Khách
  r.customers.forEach((c) => {
    c.t += dt;
    if (c.state === 'arriving' && c.t >= RESTAURANT.walkIn) {
      c.state = 'waiting';
      c.t = 0;
      events.push({ type: 'seated', customer: c });
    } else if (c.state === 'waiting' && !patienceFrozen) {
      c.patience -= dt;
      if (c.patience <= 0) {
        c.state = 'leaving';
        c.t = 0;
        c.sat = 0;
        r.today.angry++;
        state.reputation.points = Math.max(0, state.reputation.points - 2);
        events.push({ type: 'angry', customer: c });
      }
    } else if (c.state === 'eating' && c.t >= RESTAURANT.eatTime) {
      pay(state, c, events);
    }
  });
  r.customers = r.customers.filter((c) => !(c.state === 'leaving' && c.t >= WALK_OUT));
  return events;
}

function pay(state, c, events) {
  const r = state.restaurant;
  const dish = RECIPES[c.served];
  const price = Math.round(dish.price * (c.vip ? RESTAURANT.vipPay : 1));
  const tip = c.wrong ? 0 : Math.round(price * RESTAURANT.tipMax * c.frac * (1 + decorBonus(state)));
  state.money += price + tip;
  state.stats.earned += price + tip;
  r.today.revenue += price;
  r.today.tips += tip;
  r.today.served++;
  r.today.satSum += c.sat;
  r.today.sold[c.served] = (r.today.sold[c.served] || 0) + 1;
  r.dirty[c.table] = true;
  const before = state.reputation.points;
  state.reputation.points += Math.round(c.sat / 20) + (c.vip ? 2 : 0);
  c.state = 'leaving';
  c.t = 0;
  events.push({ type: 'paid', customer: c, price, tip, repBefore: before });
  // Khách quen: phục vụ đúng món ưa thích và hài lòng thì thân thiết hơn
  if (c.regular && !c.wrong && c.sat >= 70) {
    const reg = REGULARS.find((g) => g.id === c.regular);
    const rs = (state.regulars[c.regular] ||= { hearts: 0 });
    rs.hearts++;
    const line = reg.story[Math.min(reg.story.length - 1, Math.floor((rs.hearts - 1) / 2))];
    if ((rs.hearts - 1) % 2 === 0 && rs.hearts <= reg.story.length * 2) events.push({ type: 'story', regular: reg, hearts: rs.hearts, line });
    else events.push({ type: 'heart', regular: reg, hearts: rs.hearts });
  }
}

// Hết giờ: khách còn lại ra về (không tính giận)
export function closeRestaurant(state) {
  const r = state.restaurant;
  r.customers.forEach((c) => {
    if (c.state !== 'leaving') {
      c.state = 'leaving';
      c.t = 0;
    }
  });
  r.open = false;
}

export function resetForNewDay(state) {
  const r = state.restaurant;
  r.today = emptyToday();
  r.customers = [];
  r.dirty = Array(RESTAURANT.maxTables).fill(false);
  r.stoves = [null, null];
  r.counter = [];
  r.carry = null;
  r.open = false;
  r.menuSet = false;
  r.closed = false;
  r.prepNotified = false;
  r.regularsToday = [];
  r.spawnT = 2;
}

export function upgradeLevel(state, id) {
  return state.upgrades[id] || 0;
}

export function upgradeDef(id) {
  return UPGRADES.find((u) => u.id === id);
}
