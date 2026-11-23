// Trạng thái game: chỉ là dữ liệu thuần (JSON được), để lưu local hay online đều dễ.
import { START, TIME, COOP, FARM, RECIPES, RESTAURANT } from '../config/gameData.js';

export const SAVE_VERSION = 3;

export function emptyPlot() {
  return { tilled: false, crop: null, growth: 0, watered: false, fert: false };
}

function newRestaurant() {
  return {
    menu: [],
    menuSet: false,
    open: false,
    closed: false,
    prepNotified: false,
    customers: [],
    nextId: 1,
    spawnT: 2,
    dirty: Array(RESTAURANT.maxTables).fill(false),
    stoves: [null, null],
    counter: [],
    carry: null,
    regularsToday: [],
    today: { revenue: 0, tips: 0, served: 0, satSum: 0, angry: 0, wrong: 0, sold: {}, leftovers: 0, harvested: 0 },
  };
}

export function createNewState() {
  return {
    version: SAVE_VERSION,
    day: 1,
    minutes: TIME.dayStart,
    money: START.money,
    seeds: { ...START.seeds },
    items: { ...START.items },
    plots: Array.from({ length: FARM.startOpen }, emptyPlot),
    coop: { eggs: 0, timers: Array(COOP.chickens).fill(0) },
    stats: { harvested: 0, earned: 0, customers: 0 },
    tutorial: { step: 0, done: false, rewarded: false },
    tutorialQuan: { step: 0, done: false, rewarded: false },
    restaurant: newRestaurant(),
    reputation: { points: 0 },
    recipes: Object.fromEntries(Object.entries(RECIPES).map(([id, r]) => [id, r.unlock === 0])),
    upgrades: {},
    decor: {},
    regulars: {},
    fishToday: 0,
    weather: { rain: false },
    settings: { music: true, sfx: true },
  };
}

// Đọc bản lưu cũ: bổ sung trường còn thiếu để không vỡ khi game có thêm tính năng.
export function migrateState(raw) {
  if (!raw || typeof raw !== 'object') return createNewState();
  const base = createNewState();
  const s = { ...base, ...raw };
  s.seeds = { ...base.seeds, ...raw.seeds };
  s.items = { ...base.items, ...raw.items };
  s.coop = { ...base.coop, ...raw.coop };
  s.stats = { ...base.stats, ...raw.stats };
  s.recipes = { ...base.recipes, ...raw.recipes };
  s.settings = { ...base.settings, ...raw.settings };
  s.restaurant = { ...base.restaurant, ...raw.restaurant, today: { ...base.restaurant.today, ...raw.restaurant?.today } };
  // Khách đang ăn dở khi tắt game thì coi như đã về
  s.restaurant.customers = [];
  s.restaurant.carry && s.restaurant.counter.push(s.restaurant.carry);
  s.restaurant.carry = null;
  s.plots = Array.isArray(raw.plots) && raw.plots.length ? raw.plots.map((p) => ({ ...emptyPlot(), tilled: !!p.crop, ...p })) : base.plots;
  // Bản lưu cũ chưa có hướng dẫn: ai đã thu hoạch rồi thì coi như đã học xong
  if (!raw.tutorial) s.tutorial = { step: 0, done: (s.stats.harvested || 0) > 0, rewarded: false };
  // Bản cũ hết ngày lúc 17:00 (chưa có quán): đưa về đầu giờ chuẩn bị
  if ((raw.version || 1) < 3 && s.minutes >= TIME.open) s.minutes = TIME.prep;
  s.version = SAVE_VERSION;
  return s;
}
