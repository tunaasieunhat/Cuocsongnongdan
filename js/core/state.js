// Trạng thái game: chỉ là dữ liệu thuần (JSON được), để lưu local hay online đều dễ.
import { START, TIME, COOP, FARM, RECIPES, DRINKS, RESTAURANT } from '../config/gameData.js';
import { emptyAnimals } from './animals.js';
import { emptyOrchard } from './orchard.js';
import { emptyCounters } from './quests.js';
import { defaultCustom } from './custom.js';

export const SAVE_VERSION = 4;

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
    drinkCounter: [],
    drinkMaking: null,
    carry: null,
    regularsToday: [],
    today: { revenue: 0, tips: 0, served: 0, satSum: 0, angry: 0, wrong: 0, sold: {}, leftovers: 0, harvested: 0, drinks: 0, happy: 0 },
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
    recipes: Object.fromEntries(Object.entries(RECIPES).filter(([, r]) => !r.event).map(([id, r]) => [id, r.unlock === 0])),
    drinks: Object.fromEntries(Object.entries(DRINKS).map(([id, d]) => [id, d.unlock === 0])),
    upgrades: {},
    decor: {},
    regulars: {},
    fishToday: 0,
    weather: { rain: false },
    settings: { music: true, sfx: true, graphics: 'auto', fps: false },
    // GĐ7
    animals: emptyAnimals(),
    orchard: emptyOrchard(),
    saplings: {},
    // GĐ8
    story: { chapter: 0, base: emptyCounters(), seen: -1 },
    counters: emptyCounters(),
    daily: { day: 0, tasks: [] },
    orders: [],
    nextOrderId: 1,
    // GĐ9
    custom: defaultCustom(),
  };
}

const merge = (base, raw) => ({ ...base, ...(raw || {}) });

// Đọc bản lưu cũ: bổ sung trường còn thiếu để không vỡ khi game có thêm tính năng.
export function migrateState(raw) {
  if (!raw || typeof raw !== 'object') return createNewState();
  const base = createNewState();
  const s = { ...base, ...raw };
  ['seeds', 'items', 'coop', 'stats', 'recipes', 'drinks', 'settings', 'saplings'].forEach((k) => (s[k] = merge(base[k], raw[k])));
  s.restaurant = { ...base.restaurant, ...raw.restaurant, today: { ...base.restaurant.today, ...raw.restaurant?.today } };
  // Khách đang ăn dở khi tắt game thì coi như đã về; món đang bưng đặt lại quầy
  s.restaurant.customers = [];
  if (s.restaurant.carry) (DRINKS[s.restaurant.carry] ? s.restaurant.drinkCounter : s.restaurant.counter).push(s.restaurant.carry);
  s.restaurant.carry = null;
  if (s.restaurant.dirty.length < RESTAURANT.maxTables) s.restaurant.dirty = Array(RESTAURANT.maxTables).fill(false);
  s.plots = Array.isArray(raw.plots) && raw.plots.length ? raw.plots.map((p) => ({ ...emptyPlot(), tilled: !!p.crop, ...p })) : base.plots;
  s.animals = Object.fromEntries(Object.entries(base.animals).map(([k, v]) => [k, merge(v, raw.animals?.[k])]));
  if (!Array.isArray(raw.orchard)) s.orchard = base.orchard;
  s.story = merge(base.story, raw.story);
  s.counters = { ...base.counters, ...raw.counters, talk: { ...raw.counters?.talk } };
  s.custom = {
    ...base.custom,
    ...raw.custom,
    profile: merge(base.custom.profile, raw.custom?.profile),
    outfit: merge(base.custom.outfit, raw.custom?.outfit),
    owned: merge(base.custom.owned, raw.custom?.owned),
    pets: merge(base.custom.pets, raw.custom?.pets),
    garden: merge(base.custom.garden, raw.custom?.garden),
  };
  // Bản lưu cũ chưa có hướng dẫn: ai đã thu hoạch rồi thì coi như đã học xong
  if (!raw.tutorial) s.tutorial = { step: 0, done: (s.stats.harvested || 0) > 0, rewarded: false };
  // Bản cũ hết ngày lúc 17:00 (chưa có quán): đưa về đầu giờ chuẩn bị
  if ((raw.version || 1) < 3 && s.minutes >= TIME.open) s.minutes = TIME.prep;
  s.version = SAVE_VERSION;
  return s;
}
