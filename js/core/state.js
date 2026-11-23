// Trạng thái game: chỉ là dữ liệu thuần (JSON được), để lưu local hay online đều dễ.
import { START, TIME, COOP, FARM } from '../config/gameData.js';

export const SAVE_VERSION = 2;

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
    stats: { harvested: 0, earned: 0 },
    tutorial: { step: 0, done: false, rewarded: false },
  };
}

export function emptyPlot() {
  return { tilled: false, crop: null, growth: 0, watered: false };
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
  s.plots = Array.isArray(raw.plots) && raw.plots.length ? raw.plots.map((p) => ({ ...emptyPlot(), tilled: !!p.crop, ...p })) : base.plots;
  // Bản lưu cũ chưa có hướng dẫn: ai đã thu hoạch rồi thì coi như đã học xong
  if (!raw.tutorial) s.tutorial = { step: 0, done: (s.stats.harvested || 0) > 0, rewarded: false };
  s.version = SAVE_VERSION;
  return s;
}
