// Bộ điều phối logic: giữ state, chạy thời gian, phát sự kiện cho phần hiển thị/UI.
// Không đụng tới Three.js hay DOM.
import { TIME } from '../config/gameData.js';
import { createNewState } from './state.js';
import * as farm from './farm.js';
import * as coop from './coop.js';
import * as market from './market.js';

export class Game {
  constructor(state = createNewState()) {
    this.state = state;
    this.paused = false;
    this._listeners = {};
  }

  on(evt, fn) {
    (this._listeners[evt] ||= []).push(fn);
  }

  emit(evt, data) {
    (this._listeners[evt] || []).forEach((fn) => fn(data));
  }

  get isEvening() {
    return this.state.minutes >= TIME.evening;
  }

  tick(dt) {
    if (this.paused || this.isEvening) return;
    const s = this.state;
    s.minutes = Math.min(TIME.evening, s.minutes + dt * TIME.minutesPerSecond);
    farm.tickFarm(s, dt).forEach((i) => this.emit('plot', i));
    if (coop.tickCoop(s, dt)) this.emit('coop');
    if (this.isEvening) this.emit('evening');
  }

  // ---- Hành động của người chơi (trả về {ok, reason, ...}) ----

  plotAction(index, seedId) {
    const plot = this.state.plots[index];
    const action = farm.plotAction(plot);
    let r;
    if (action === 'plant') r = farm.plant(this.state, index, seedId);
    else if (action === 'water') r = farm.water(this.state, index);
    else if (action === 'harvest') r = farm.harvest(this.state, index);
    else r = { ok: false, reason: 'Cây đang lớn, chờ chút nhé.' };
    r.action = action;
    if (r.ok) this.emit('plot', index);
    this.emit('change');
    return r;
  }

  collectEggs() {
    const r = coop.collectEggs(this.state);
    if (r.ok) this.emit('coop');
    this.emit('change');
    return r;
  }

  buySeed(id, qty) {
    const r = market.buySeed(this.state, id, qty);
    this.emit('change');
    return r;
  }

  buyItem(id, qty) {
    const r = market.buyItem(this.state, id, qty);
    this.emit('change');
    return r;
  }

  sellItem(id, qty) {
    const r = market.sellItem(this.state, id, qty);
    this.emit('change');
    return r;
  }

  newDay() {
    const s = this.state;
    s.day++;
    s.minutes = TIME.dayStart;
    farm.newDayFarm(s);
    s.plots.forEach((_, i) => this.emit('plot', i));
    this.emit('newday');
    this.emit('change');
  }
}

export function formatClock(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
