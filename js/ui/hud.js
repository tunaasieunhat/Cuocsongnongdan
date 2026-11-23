// Khung giao diện HTML phủ trên cảnh 3D: thanh trên, nút tròn, thanh công cụ, nhãn, thông báo, cửa sổ.
// Các cửa sổ cụ thể (chợ, thực đơn, bếp...) nằm trong dialogs.js.
import { CROPS, CROP_ORDER, TIME, TOOLS, ITEMS } from '../config/gameData.js';
import { formatClock } from '../core/game.js';
import { reputationProgress, season, dayOfSeason, cropInSeason } from '../core/progress.js';

export const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html !== undefined) el.innerHTML = html;
  return el;
};

const TOOL_TIPS = {
  hand: 'Chạm vào ô đất để xem cây đang thế nào.',
  till: 'Chạm hoặc vuốt qua các ô cỏ để xới đất.',
  plant: 'Chọn hạt ở trên, rồi chạm hoặc vuốt qua ô đã xới để gieo.',
  water: 'Chạm hoặc vuốt qua ô đất để tưới. Cây chỉ lớn khi đất ẩm.',
  fert: 'Bón phân 🧪 cho cây đang lớn để cây lớn nhanh hơn.',
  harvest: 'Chạm hoặc vuốt qua các cây đã chín để thu hoạch.',
};

function partOfDay(min, phase) {
  if (phase === 'service') return ['🏮', 'Quán đang mở'];
  if (phase === 'closed') return ['🌙', 'Đã đóng quán'];
  if (min < 9 * 60) return ['🌅', 'Buổi sáng'];
  if (min < 13 * 60) return ['☀️', 'Buổi trưa'];
  if (min < TIME.prep) return ['🌤️', 'Buổi chiều'];
  return ['🌇', 'Chuẩn bị mở quán'];
}

export class Hud {
  constructor(root, handlers) {
    this.root = root;
    this.handlers = handlers;
    this.tool = 'till';
    this.selectedSeed = 'rau';

    // ---- Góc trái trên: nhân vật, cấp quán, tiền ----
    const profile = h('div', 'profile');
    profile.innerHTML = `<div class="avatar">👩‍🌾</div><div class="pname"><b>Chủ nông trại</b><span class="rep"><small></small><i><em></em></i></span></div>`;
    this.repEl = profile.querySelector('.rep');
    const stats = h('div', 'pstats');
    this.moneyEl = h('div', 'pill pill-money');
    this.harvestEl = h('div', 'pill');
    stats.append(this.moneyEl, this.harvestEl);
    const topLeft = h('div', 'top-left');
    topLeft.append(profile, stats);

    // ---- Đồng hồ ----
    this.clockEl = h('div', 'clock');

    // ---- Nút tròn góc phải ----
    const topRight = h('div', 'top-right');
    this.roundBtns = {};
    [['recipes', '📖', 'Sổ công thức'], ['upgrades', '🔨', 'Nâng cấp & trang trí'], ['bag', '🎒', 'Kho đồ'], ['settings', '⚙️', 'Tuỳ chọn']].forEach(([id, icon, label]) => {
      const b = h('button', 'round', icon);
      b.setAttribute('aria-label', label);
      b.title = label;
      b.onclick = () => handlers.open(id);
      this.roundBtns[id] = b;
      topRight.append(b);
    });

    // ---- Cột nút khu vực ----
    const side = h('div', 'side');
    this.sideBtns = {};
    [['farm', '🌱', 'Ruộng'], ['restaurant', '🍜', 'Quán'], ['market', '🛒', 'Chợ']].forEach(([id, icon, label]) => {
      const b = h('button', 'round side-btn', `<span>${icon}</span><small>${label}</small>`);
      b.setAttribute('aria-label', label);
      b.onclick = () => handlers.goto(id);
      this.sideBtns[id] = b;
      side.append(b);
    });

    // ---- Nút quán (góc phải dưới): lên thực đơn / mở quán / trạng thái ----
    this.prepBtn = h('button', 'prep-btn');
    this.prepBtn.onclick = () => handlers.prepAction();
    this.prepBtn.hidden = true;
    this.servicePill = h('div', 'service-pill');
    this.servicePill.hidden = true;
    this.carryPill = h('button', 'carry-pill');
    this.carryPill.hidden = true;
    this.carryPill.onclick = () => handlers.dropCarry?.();

    // ---- Dòng gợi ý ----
    this.tipEl = h('div', 'tip');
    this.tipText = h('span', '');
    const tipClose = h('button', 'tip-x', '✕');
    tipClose.setAttribute('aria-label', 'Ẩn gợi ý');
    tipClose.onclick = () => {
      this.tipsOff = true;
      this.tipEl.hidden = true;
    };
    this.tipEl.append(h('b', '', '💡'), this.tipText, tipClose);

    // ---- Dãy hạt giống ----
    this.seedbar = h('div', 'seedbar');
    this.seedBtns = {};
    CROP_ORDER.forEach((id) => {
      const b = h('button', 'seed', `<span>${CROPS[id].icon}</span><small>${CROPS[id].name}</small><b></b>`);
      b.onclick = () => {
        this.selectedSeed = id;
        this.render(this._state);
      };
      this.seedBtns[id] = b;
      this.seedbar.append(b);
    });

    // ---- Thanh công cụ ----
    this.toolbar = h('div', 'toolbar');
    this.toolBtns = {};
    TOOLS.forEach((t) => {
      const b = h('button', 'tool', `<span class="ti">${t.icon}</span><span class="tl">${t.label}</span>`);
      b.setAttribute('aria-label', t.label);
      b.onclick = () => this.setTool(t.id);
      this.toolBtns[t.id] = b;
      this.toolbar.append(b);
    });
    this.seedBadge = h('span', 'badge');
    this.toolBtns.plant.append(this.seedBadge);
    this.fertBadge = h('span', 'badge');
    this.toolBtns.fert.append(this.fertBadge);

    const bottom = h('div', 'bottom');
    bottom.append(this.seedbar, this.toolbar);

    this.labels = h('div', 'labels');
    this.floats = h('div', 'floats');
    this.toastEl = h('div', 'toast');
    this.toastEl.setAttribute('role', 'status');
    this.modal = h('div', 'modal-wrap');
    this.modal.hidden = true;

    // ---- Gợi ý xoay ngang ----
    this.rotate = h('div', 'rotate', '<div class="rotate-card"><div class="rot-phone">📱</div><b>Xoay ngang điện thoại để chơi thoải mái hơn</b><button class="btn btn-soft">Vẫn chơi màn dọc</button></div>');
    this.rotate.querySelector('button').onclick = () => {
      this.rotateDismissed = true;
      this._checkOrientation();
    };
    addEventListener('resize', () => this._checkOrientation());

    root.append(this.labels, this.floats, topLeft, this.clockEl, this.tipEl, topRight, side, bottom, this.prepBtn, this.servicePill, this.carryPill, this.toastEl, this.modal, this.rotate);
    this._checkOrientation();
    this.setTool(this.tool);
  }

  setTool(id) {
    this.tool = id;
    Object.entries(this.toolBtns).forEach(([k, b]) => b.classList.toggle('active', k === id));
    this.seedbar.hidden = id !== 'plant';
    this.tipText.textContent = TOOL_TIPS[id];
    this.tipEl.hidden = !!this.tipsOff || !!this.tutorialActive;
    clearTimeout(this._tipT);
    this._tipT = setTimeout(() => (this.tipEl.hidden = true), 6000);
    this.handlers.toolChanged?.(id);
  }

  _checkOrientation() {
    const portrait = innerHeight > innerWidth && innerWidth < 700;
    this.rotate.hidden = !portrait || this.rotateDismissed;
    document.body.classList.toggle('portrait', portrait);
  }

  render(state, game) {
    if (!state) return;
    this._state = state;
    if (game) this._game = game;
    const phase = this._game?.phase || 'farm';
    this.moneyEl.innerHTML = `💰 <b>${state.money}</b>`;
    const produce = CROP_ORDER.reduce((n, id) => n + (state.items[CROPS[id].harvestItem] || 0), 0) + (state.items.trung || 0) + (state.items.ca || 0);
    this.harvestEl.innerHTML = `🧺 <b>${produce}</b>`;
    const rp = reputationProgress(state);
    this.repEl.querySelector('small').textContent = `⭐ Quán cấp ${rp.level}`;
    this.repEl.querySelector('em').style.width = Math.round(rp.frac * 100) + '%';
    const [icon, part] = partOfDay(state.minutes, phase);
    const se = season(state);
    const weather = state.weather?.rain ? ' · 🌧️' : '';
    this.clockEl.innerHTML = `<span class="clock-icon">${icon}</span><span class="ctime">${formatClock(state.minutes)}</span><span class="cinfo"><b>Ngày ${state.day} · ${se.icon} ${se.name} ${dayOfSeason(state.day)}/7${weather}</b><small>${part}</small></span>`;
    CROP_ORDER.forEach((id) => {
      const b = this.seedBtns[id];
      b.querySelector('b').textContent = state.seeds[id] || 0;
      b.classList.toggle('active', this.selectedSeed === id);
      b.classList.toggle('empty', !state.seeds[id]);
      b.hidden = !state.seeds[id] && !cropInSeason(state, id);
    });
    this.toolBtns.plant.querySelector('.ti').textContent = CROPS[this.selectedSeed].icon;
    this.seedBadge.textContent = state.seeds[this.selectedSeed] || 0;
    this.fertBadge.textContent = state.items.phan || 0;
    this._renderRestaurantBits(state, phase);
  }

  _renderRestaurantBits(state, phase) {
    const r = state.restaurant;
    // Nút quán
    let btn = null;
    if (phase === 'prep' || phase === 'farm') {
      if (!r.menuSet && phase === 'prep') btn = ['📋', 'Lên thực đơn', true];
      else if (!r.menuSet) btn = ['📋', 'Thực đơn', false];
      else btn = ['🏮', 'Mở quán', phase === 'prep'];
    } else if (phase === 'closed') btn = ['🌙', 'Tổng kết', true];
    this.prepBtn.hidden = !btn;
    if (btn) {
      this.prepBtn.innerHTML = `<span>${btn[0]}</span><small>${btn[1]}</small>`;
      this.prepBtn.classList.toggle('pulse', btn[2]);
    }
    // Trạng thái lúc mở quán
    this.servicePill.hidden = phase !== 'service';
    if (phase === 'service') {
      const waiting = r.customers.filter((c) => c.state === 'waiting').length;
      const n = r.customers.filter((c) => c.state !== 'leaving').length;
      this.servicePill.innerHTML = `🏮 <b>${n}</b> khách${waiting ? ` · <span class="warn">${waiting} chờ món</span>` : ''} · 💰 ${r.today.revenue + r.today.tips}`;
    }
    this.carryPill.hidden = !r.carry;
    if (r.carry) this.carryPill.innerHTML = `🍽️ Đang bưng: <b>${this.handlers.dishName(r.carry)}</b> <small>· chạm để đặt lại quầy</small>`;
  }

  // ---- Nhãn gắn trên vật thể 3D ----
  addLabel(cls) {
    const el = h('div', 'wlabel ' + (cls || ''));
    this.labels.append(el);
    return el;
  }

  placeLabel(el, screen) {
    if (!screen) {
      el.style.visibility = 'hidden';
      return;
    }
    el.style.visibility = '';
    el.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -100%)`;
  }

  floatText(screen, text, cls = '') {
    if (!screen) return;
    const el = h('div', 'floattext ' + cls, text);
    el.style.left = screen.x + 'px';
    el.style.top = screen.y + 'px';
    this.floats.append(el);
    setTimeout(() => el.remove(), 1400);
  }

  toast(text) {
    this.toastEl.innerHTML = text;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toastEl.classList.remove('show'), 2600);
  }

  // ---- Cửa sổ ----
  openModal(title, body, { onClose, closable = true, wide = false } = {}) {
    this.modal.innerHTML = '';
    const card = h('div', 'modal' + (wide ? ' wide' : ''));
    const head = h('div', 'modal-head');
    head.append(h('h2', '', title));
    if (closable) {
      const x = h('button', 'round sm', '✕');
      x.setAttribute('aria-label', 'Đóng');
      x.onclick = () => this.closeModal();
      head.append(x);
    }
    card.append(head, body);
    this.modal.append(card);
    this.modal.hidden = false;
    this._onClose = onClose;
    this.handlers.pause(true);
  }

  closeModal() {
    if (this.modal.hidden) return;
    this.modal.hidden = true;
    this.handlers.pause(false);
    const cb = this._onClose;
    this._onClose = null;
    if (cb) cb();
  }

  openConfirm(title, text, okText, onOk) {
    const body = h('div', 'confirm');
    body.append(h('p', '', text));
    const row = h('div', 'btn-row');
    const no = h('button', 'btn btn-soft', 'Để sau');
    no.onclick = () => this.closeModal();
    const ok = h('button', 'btn btn-pink', okText);
    ok.onclick = () => {
      this.closeModal();
      onOk();
    };
    row.append(no, ok);
    body.append(row);
    this.openModal(title, body);
  }

  itemsLine(ing, state) {
    return Object.entries(ing)
      .map(([id, n]) => {
        const have = state ? state.items[id] || 0 : n;
        return `<span class="ing${have < n ? ' short' : ''}">${ITEMS[id].icon}×${n}</span>`;
      })
      .join(' ');
  }
}
