// Bộ điều phối logic: giữ state, chạy nhịp một ngày, phát sự kiện cho phần hiển thị/UI.
// Không đụng tới Three.js hay DOM.
//
// Nhịp ngày: 06:00 làm nông -> 15:00 nhắc lên thực đơn -> 17:00 mở quán (đồng hồ chờ nếu chưa có thực đơn)
//            -> 21:30 thôi đón khách -> khách về hết (hoặc 22:30) -> tổng kết -> "Ngày mới".
import { TIME } from '../config/gameData.js';
import { createNewState } from './state.js';
import * as farm from './farm.js';
import * as coop from './coop.js';
import * as market from './market.js';
import * as rest from './restaurant.js';
import * as prog from './progress.js';

export class Game {
  constructor(state = createNewState()) {
    this.state = state;
    this.paused = false;
    this.clockFrozen = false; // hướng dẫn đang chạy: dừng đồng hồ
    this.growBoost = 1; // hướng dẫn cho cây lớn nhanh hơn
    this.patienceFrozen = false; // hướng dẫn phần quán: khách chờ không sốt ruột
    this._listeners = {};
    this._needMenuSent = false;
  }

  on(evt, fn) {
    (this._listeners[evt] ||= []).push(fn);
  }

  emit(evt, data) {
    (this._listeners[evt] || []).forEach((fn) => fn(data));
  }

  get R() {
    return this.state.restaurant;
  }

  // Đã hết ngày, chờ người chơi bấm "Ngày mới"
  get isEvening() {
    return this.R.closed;
  }

  get phase() {
    const m = this.state.minutes;
    if (this.R.closed) return 'closed';
    if (this.R.open) return 'service';
    if (m >= TIME.prep) return 'prep';
    return 'farm';
  }

  tick(dt) {
    if (this.paused || this.R.closed) return;
    const s = this.state;
    const r = this.R;

    // Đồng hồ
    if (!this.clockFrozen) {
      if (!r.open) {
        s.minutes = Math.min(TIME.open, s.minutes + dt * TIME.minutesPerSecond);
        if (s.minutes >= TIME.prep && !r.prepNotified) {
          r.prepNotified = true;
          this.emit('prep');
        }
        if (s.minutes >= TIME.open) {
          if (r.menuSet) this.openRestaurant();
          else if (!this._needMenuSent) {
            this._needMenuSent = true;
            this.emit('needMenu');
          }
        }
      } else {
        s.minutes = Math.min(TIME.close, s.minutes + dt * TIME.serviceMinutesPerSecond);
      }
    }

    farm.tickFarm(s, dt * this.growBoost).forEach((i) => this.emit('plot', i));
    if (coop.tickCoop(s, dt)) this.emit('coop');

    // Quán
    const levelBefore = prog.reputationLevel(s);
    const events = rest.tickRestaurant(s, dt, {
      accepting: r.open && s.minutes < TIME.lastOrder,
      patienceFrozen: this.patienceFrozen,
      preferCounter: this.patienceFrozen,
    });
    events.forEach((e) => this.emit('rest', e));
    if (events.some((e) => e.type === 'paid' || e.type === 'angry' || e.type === 'cooked')) this.emit('change');
    const levelAfter = prog.reputationLevel(s);
    if (levelAfter > levelBefore) this.emit('levelUp', levelAfter);

    // Hết giờ
    if (r.open) {
      const allGone = r.customers.length === 0;
      if ((s.minutes >= TIME.lastOrder && allGone) || s.minutes >= TIME.close) this.endDay();
    }
  }

  openRestaurant() {
    const r = this.R;
    if (r.open || r.closed) return;
    this.state.minutes = Math.max(this.state.minutes, TIME.open);
    r.open = true;
    r.spawnT = 2;
    this.emit('open');
    this.emit('change');
  }

  endDay() {
    const r = this.R;
    rest.closeRestaurant(this.state);
    r.closed = true;
    r.today.leftovers = r.counter.length + (r.carry ? 1 : 0);
    this.emit('dayEnd', r.today);
    this.emit('change');
  }

  // ---- Ruộng ----
  canApply(index, tool, seedId) {
    return farm.canApply(this.state, index, tool, seedId);
  }

  applyTool(index, tool, seedId) {
    const r = farm.applyTool(this.state, index, tool, seedId);
    r.tool = tool;
    r.extra = [];
    if (r.ok) {
      this.emit('plot', index);
      // Bình tưới lớn: tưới luôn các ô cùng hàng
      if (tool === 'water' && this.state.upgrades.bigCan) {
        const row = Math.floor(index / 3);
        for (let i = row * 3; i < row * 3 + 3; i++) {
          if (i !== index && farm.canApply(this.state, i, 'water').ok) {
            farm.applyTool(this.state, i, 'water');
            r.extra.push(i);
            this.emit('plot', i);
          }
        }
      }
    }
    this.emit('change');
    return r;
  }

  unlockPlot() {
    return this._act(farm.unlockPlot(this.state), 'plots');
  }

  collectEggs() {
    return this._act(coop.collectEggs(this.state), 'coop');
  }

  // ---- Chợ ----
  buySeed(id, qty) {
    if (!prog.cropInSeason(this.state, id)) return this._act({ ok: false, reason: 'Hạt này hết mùa rồi.' });
    return this._act(market.buySeed(this.state, id, qty));
  }

  buyItem(id, qty) {
    return this._act(market.buyItem(this.state, id, qty));
  }

  sellItem(id, qty) {
    return this._act(market.sellItem(this.state, id, qty));
  }

  // ---- Quán ----
  setMenu(dishes, openNow = false) {
    const r = rest.setMenu(this.state, dishes);
    if (r.ok) {
      this._needMenuSent = false;
      if (openNow || this.state.minutes >= TIME.open) this.openRestaurant();
    }
    return this._act(r, 'menu');
  }

  cook(dish) {
    return this._act(rest.startCooking(this.state, dish), 'cook');
  }

  pickUp(dish) {
    return this._act(rest.pickUp(this.state, dish), 'carry');
  }

  serve(customerId, dish, fromCounter = false) {
    const r = rest.serve(this.state, customerId, dish, fromCounter);
    if (r.ok) this.emit('rest', { type: 'served', customer: r.customer, wrong: r.wrong });
    return this._act(r, 'carry');
  }

  cleanTable(table) {
    return this._act(rest.cleanTable(this.state, table), 'tables');
  }

  // ---- Tiến trình ----
  unlockRecipe(id) {
    return this._act(prog.unlockRecipe(this.state, id));
  }

  buyUpgrade(id) {
    return this._act(prog.buyUpgrade(this.state, id), 'upgrade');
  }

  buyDecor(id) {
    return this._act(prog.buyDecor(this.state, id), 'decor');
  }

  catchFish(success) {
    return this._act(prog.catchFish(this.state, success));
  }

  _act(r, evt) {
    if (r.ok && evt) this.emit(evt, r);
    this.emit('change');
    return r;
  }

  newDay() {
    const s = this.state;
    s.day++;
    s.minutes = TIME.dayStart;
    s.stats.customers += s.restaurant.today.served;
    farm.newDayFarm(s);
    rest.resetForNewDay(s);
    s.fishToday = 0;
    this._needMenuSent = false;
    const weather = prog.rollWeather(s);
    const notes = [];
    if (weather.rain) {
      s.plots.forEach((p) => (p.tilled || p.crop) && (p.watered = true));
      notes.push('🌧️ Trời mưa, ruộng được tưới sẵn rồi!');
    } else if (s.upgrades.gardener) {
      let n = 0;
      s.plots.forEach((p) => p.crop && !p.watered && ((p.watered = true), n++));
      if (n) notes.push(`👨‍🌾 Người làm vườn đã tưới ${n} ô.`);
    }
    s.plots.forEach((_, i) => this.emit('plot', i));
    this.emit('newday', { weather, notes });
    this.emit('change');
  }
}

export function formatClock(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
