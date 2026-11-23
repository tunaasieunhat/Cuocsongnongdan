// Điều khiển phần quán: chạm bếp/quầy/bàn, chuỗi việc "lấy món -> bưng -> phục vụ", nhãn trên đầu khách,
// người phục vụ tự động (khi đã thuê). Nối giữa logic (Game), hiển thị (RestaurantView) và giao diện (Hud).
import * as THREE from '../../vendor/three.module.min.js';
import { RECIPES, REGULARS } from '../config/gameData.js';
import { stoveCount } from '../core/restaurant.js';
import * as dialogs from '../ui/dialogs.js';
import { Player } from '../render/player.js';

export class RestaurantController {
  constructor({ game, hud, world, view, player, models, toScreen, sound, makeNav, notify }) {
    Object.assign(this, { game, hud, world, view, player, models, toScreen, sound, makeNav, notify });
    this.custLabels = new Map();
    this.claimed = new Map(); // customerId -> 'waiter'
    this.stoveLabels = view.stoves.map(() => hud.addLabel('wl-stove'));
    this.counterLabel = hud.addLabel('wl-counter');
    this.dirtyLabels = [];
    this.waiter = null;
  }

  get S() {
    return this.game.state;
  }

  // ---------- Chạm ----------
  // Trả về true nếu đã xử lý cú chạm
  handleTap(def) {
    const r = this.S.restaurant;
    if (def.type === 'stove') {
      if (def.hidden) return false;
      if (!r.menuSet) {
        this.hud.toast('Lên thực đơn hôm nay trước đã nhé.');
        this.openPlanner();
        return true;
      }
      dialogs.openCook(this.hud, this.game, {
        onCook: (dish) => this.player.walkTo(def.stand, () => this._cook(def, dish)),
      });
      return true;
    }
    if (def.type === 'counter') {
      if (r.carry) {
        this.player.walkTo(def.stand, () => this._putBack());
        return true;
      }
      const kinds = [...new Set(r.counter)];
      if (!kinds.length) {
        this.hud.toast('Quầy chưa có món. Chạm 🔥 bếp để nấu nhé.');
        return true;
      }
      const pick = (d) => this.player.walkTo(def.stand, () => this._pick(d));
      if (kinds.length === 1) pick(kinds[0]);
      else dialogs.openCounter(this.hud, this.game, { onPick: pick });
      return true;
    }
    if (def.type === 'table') {
      this._tapTable(def);
      return true;
    }
    if (def.type === 'restaurant') {
      const ph = this.game.phase;
      if (ph === 'service') this.hud.toast('🏮 Quán đang mở. Chạm bàn khách để bưng món, chạm bàn bẩn để dọn.');
      else if (!r.menuSet) this.openPlanner();
      else this.hud.toast('Thực đơn đã sẵn sàng. Nấu trước vài món ở 🔥 bếp nhé!');
      return true;
    }
    return false;
  }

  _tapTable(def) {
    const r = this.S.restaurant;
    const i = def.index;
    const c = r.customers.find((x) => x.table === i && x.state !== 'leaving');
    if (!c && r.dirty[i]) {
      this.player.walkTo(def.stand, () => {
        this.player.faceTo(this.view.tables[i].table.position);
        this.player.work();
        if (this.game.cleanTable(i).ok) {
          this.sound('clean');
          this.notify('cleaned');
          this.hud.floatText(this.toScreen(def.anchor), '✨ Sạch bong');
        }
      });
      return;
    }
    if (!c) return this.hud.toast('Bàn đang trống.');
    if (c.state === 'arriving') return this.hud.toast('Khách đang vào chỗ ngồi…');
    if (c.state === 'eating') return this.hud.toast('Khách đang ăn ngon lành 😋');
    if (this.claimed.has(c.id)) return this.hud.toast('Người phục vụ đang bưng món cho bàn này.');
    // Khách đang chờ món
    if (r.carry) {
      this.player.walkTo(def.stand, () => this._serve(c.id, def));
      return;
    }
    if (r.counter.includes(c.dish)) {
      // Tự lấy đúng món trên quầy rồi bưng ra
      this.player.walkTo(this.view.counter.stand, () => {
        if (!this._pick(c.dish)) return;
        this.player.walkTo(def.stand, () => this._serve(c.id, def));
      });
      return;
    }
    this.hud.toast(`Khách gọi ${RECIPES[c.dish].icon} ${RECIPES[c.dish].name} nhưng quầy chưa có. Chạm 🔥 bếp để nấu nhé!`);
  }

  _cook(def, dish) {
    this.player.faceTo(def.anchor);
    this.player.work();
    const res = this.game.cook(dish);
    if (!res.ok) return this.hud.toast(res.reason);
    this.sound('sizzle');
    this.hud.floatText(this.toScreen(def.anchor), `🔥 ${RECIPES[dish].icon}`);
  }

  _pick(dish) {
    const res = this.game.pickUp(dish);
    if (!res.ok) {
      this.hud.toast(res.reason);
      return false;
    }
    this.player.work();
    this.sound('pickup');
    return true;
  }

  _putBack() {
    const r = this.S.restaurant;
    if (!r.carry) return;
    r.counter.push(r.carry);
    r.carry = null;
    this.game.emit('change');
    this.hud.toast('Đã đặt món lại lên quầy.');
  }

  dropCarry() {
    if (!this.S.restaurant.carry) return;
    this.player.walkTo(this.view.counter.stand, () => this._putBack());
  }

  _serve(customerId, def) {
    const res = this.game.serve(customerId);
    if (!res.ok) return this.hud.toast(res.reason);
    this.player.faceTo(def.anchor);
    this.player.work();
    this.notify('served');
  }

  openPlanner() {
    dialogs.openMenuPlanner(this.hud, this.game, {
      onDone: (opened) => this.hud.toast(opened ? '🏮 Quán mở cửa! Khách sắp tới.' : '📋 Đã lưu thực đơn. Nấu sẵn vài món ở 🔥 bếp nhé!'),
    });
  }

  // ---------- Sự kiện từ logic ----------
  onEvent(e) {
    const c = e.customer;
    const head = c ? this._headPos(c) : null;
    switch (e.type) {
      case 'spawn':
        this.sound('bell');
        break;
      case 'served':
        if (e.wrong) {
          this.sound('wrong');
          this.hud.floatText(head, '🙃 Nhầm món!', 'bad');
        } else {
          this.sound('pickup');
          this.hud.floatText(head, '😋');
        }
        break;
      case 'angry':
        this.sound('angry');
        this.hud.floatText(head, '😠 Chờ lâu quá!', 'bad');
        this.claimed.delete(c.id);
        break;
      case 'paid':
        this.sound('coin');
        this.hud.floatText(head, `+${e.price} 💰${e.tip ? ` +${e.tip} tip` : ''}`, 'money');
        this.claimed.delete(c.id);
        break;
      case 'heart':
        this.sound('heart');
        this.hud.floatText(head, `❤️ ${e.regular.name}`, 'money');
        break;
      case 'story':
        this.sound('heart');
        dialogs.openStory(this.hud, e.regular, e.hearts, e.line);
        break;
      case 'cooked':
        this.sound('ding');
        this.hud.floatText(this.toScreen(this.view.counter.anchor), `${RECIPES[e.dish].icon} xong!`);
        break;
    }
  }

  _headPos(c) {
    const m = this.view.customerMesh(c.id);
    if (!m) return this.toScreen(this.view.tables[c.table]?.def.anchor || this.view.counter.anchor);
    return this.toScreen(new THREE.Vector3(m.position.x, m.position.y + 1.9, m.position.z));
  }

  // ---------- Nhãn & người phục vụ (mỗi khung hình) ----------
  update(dt) {
    const s = this.S;
    const r = s.restaurant;
    // Bong bóng khách
    const alive = new Set();
    r.customers.forEach((c) => {
      alive.add(c.id);
      let el = this.custLabels.get(c.id);
      if (!el) {
        el = this.hud.addLabel('wl-cust');
        this.custLabels.set(c.id, el);
      }
      const reg = c.regular ? REGULARS.find((g) => g.id === c.regular) : null;
      const name = reg ? `<em class="cname">${reg.name} ❤️${s.regulars[reg.id]?.hearts || 0}</em>` : c.vip ? '<em class="cname vip">👑 Khách VIP</em>' : '';
      let html = '';
      if (c.state === 'waiting') {
        const f = Math.max(0, c.patience / c.maxPatience);
        const col = f > 0.5 ? 'ok' : f > 0.25 ? 'mid' : 'low';
        html = `${name}<span class="order">${RECIPES[c.dish].icon}</span><i class="pat ${col}"><b style="width:${Math.round(f * 100)}%"></b></i>`;
      } else if (c.state === 'eating') html = `${name}<span class="order">${c.wrong ? '😕' : '😋'}</span>`;
      else if (c.state === 'arriving') html = name || '';
      else html = c.sat === 0 ? '<span class="order">😠</span>' : c.sat >= 75 ? '<span class="order">😍</span>' : '';
      if (el._html !== html) {
        el.innerHTML = html;
        el._html = html;
      }
      el.classList.toggle('none', !html);
      el.classList.toggle('hurry', c.state === 'waiting' && c.patience / c.maxPatience < 0.25);
      this.hud.placeLabel(el, html ? this._headPos(c) : null);
    });
    for (const [id, el] of this.custLabels) {
      if (!alive.has(id)) {
        el.remove();
        this.custLabels.delete(id);
      }
    }
    // Bếp
    this.view.stoves.forEach((def, i) => {
      const el = this.stoveLabels[i];
      const st = r.stoves[i];
      if (i >= stoveCount(s) || def.hidden) return this.hud.placeLabel(el, null);
      const html = st ? `${RECIPES[st.dish].icon}<i class="bar"><b style="width:${Math.round((st.t / st.total) * 100)}%"></b></i>` : r.menuSet ? '🔥 Nấu' : '';
      if (el._html !== html) {
        el.innerHTML = html;
        el._html = html;
      }
      el.classList.toggle('none', !html);
      this.hud.placeLabel(el, html ? this.toScreen(def.anchor) : null);
    });
    // Quầy
    const ch = r.counter.length ? r.counter.map((d) => RECIPES[d].icon).join('') : '';
    if (this.counterLabel._html !== ch) {
      this.counterLabel.innerHTML = ch;
      this.counterLabel._html = ch;
    }
    this.counterLabel.classList.toggle('none', !ch);
    this.hud.placeLabel(this.counterLabel, ch ? this.toScreen(this.view.counter.anchor) : null);
    // Bàn bẩn
    this.view.tables.forEach((t, i) => {
      let el = this.dirtyLabels[i];
      if (!el) el = this.dirtyLabels[i] = this.hud.addLabel('wl-dirty');
      el.innerHTML = '🧽';
      const show = r.dirty[i] && !r.customers.some((c) => c.table === i && c.state !== 'leaving');
      el.classList.toggle('none', !show);
      this.hud.placeLabel(el, show ? this.toScreen(t.def.anchor) : null);
    });
    this._updateWaiter(dt);
  }

  _updateWaiter(dt) {
    const s = this.S;
    if (!s.upgrades.waiter) return;
    if (!this.waiter) {
      const mesh = this.models.person({ shirt: 0xffffff, pants: 0x6b4a3c, skin: this.world.P.skin, hair: 0x3a2a20 });
      const apron = this.models.box(0.42, 0.45, 0.05, this.world.P.pink || 0xf6a6b9, 0, 0.62, 0.24);
      mesh.add(apron);
      mesh.position.copy(this.view.counter.stand).add(new THREE.Vector3(1.2, 0, 0.3));
      this.world.scene.add(mesh);
      this.waiter = new Player(mesh, this.world.obstacles, this.makeNav());
      this.waiter.speed = 3.2;
      this.waiterBusy = false;
    }
    const w = this.waiter;
    w.update(dt);
    if (this.waiterBusy || w.dest) return;
    const r = s.restaurant;
    // Ưu tiên bưng món cho khách đang chờ, sau đó dọn bàn
    const c = r.customers.find((x) => x.state === 'waiting' && !this.claimed.has(x.id) && r.counter.includes(x.dish));
    if (c) {
      this.claimed.set(c.id, 'waiter');
      this.waiterBusy = true;
      const def = this.view.tables[c.table].def;
      w.walkTo(this.view.counter.stand.clone().add(new THREE.Vector3(0.6, 0, 0)), () => {
        w.work();
        w.walkTo(def.stand, () => {
          w.work();
          const cur = r.customers.find((x) => x.id === c.id);
          if (cur && cur.state === 'waiting') this.game.serve(c.id, c.dish, true);
          this.claimed.delete(c.id);
          this.waiterBusy = false;
        });
      });
      return;
    }
    const dirty = r.dirty.findIndex((d, i) => d && i < this.view.tables.length && !r.customers.some((x) => x.table === i && x.state !== 'leaving'));
    if (dirty >= 0 && this.game.phase !== 'closed') {
      this.waiterBusy = true;
      w.walkTo(this.view.tables[dirty].def.stand, () => {
        w.work();
        this.game.cleanTable(dirty);
        this.waiterBusy = false;
      });
    }
  }

  rebuildNav() {
    if (this.waiter) this.waiter.nav = this.makeNav();
  }
}
