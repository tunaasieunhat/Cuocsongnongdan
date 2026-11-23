// Giao diện HTML phủ trên cảnh 3D. Chỉ đọc state để hiển thị và gọi callback khi người chơi bấm.
import { CROPS, CROP_ORDER, ITEMS, TIME, TOOLS } from '../config/gameData.js';
import { formatClock } from '../core/game.js';

const h = (tag, cls, html) => {
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
  harvest: 'Chạm hoặc vuốt qua các cây đã chín để thu hoạch.',
};

function partOfDay(min) {
  if (min < 9 * 60) return ['🌅', 'Buổi sáng'];
  if (min < 13 * 60) return ['☀️', 'Buổi trưa'];
  if (min < TIME.evening) return ['🌤️', 'Buổi chiều'];
  return ['🌇', 'Chiều tối'];
}

export class Hud {
  constructor(root, handlers) {
    this.root = root;
    this.handlers = handlers;
    this.tool = 'till';
    this.selectedSeed = 'rau';

    // Thẻ nhân vật + tiền (góc trái trên)
    const profile = h('div', 'profile');
    profile.innerHTML = `<div class="avatar">👩‍🌾</div><div class="pname"><b>Chủ nông trại</b><small>Nông Trại &amp; Quán Nhỏ</small></div>`;
    const stats = h('div', 'pstats');
    this.moneyEl = h('div', 'pill pill-money');
    this.harvestEl = h('div', 'pill');
    stats.append(this.moneyEl, this.harvestEl);
    const topLeft = h('div', 'top-left');
    topLeft.append(profile, stats);

    // Đồng hồ (giữa trên)
    this.clockEl = h('div', 'clock');

    // Nút tròn góc phải
    const topRight = h('div', 'top-right');
    const bagBtn = h('button', 'round', '🎒');
    bagBtn.setAttribute('aria-label', 'Kho đồ');
    bagBtn.onclick = () => this.openBag();
    const menuBtn = h('button', 'round', '⚙️');
    menuBtn.setAttribute('aria-label', 'Tuỳ chọn');
    menuBtn.onclick = () => this.openMenu();
    topRight.append(bagBtn, menuBtn);

    // Cột nút đi tới các khu (bên trái)
    const side = h('div', 'side');
    this.sideBtns = {};
    [['farm', '🌱', 'Ruộng'], ['market', '🛒', 'Chợ'], ['restaurant', '🍜', 'Quán']].forEach(([id, icon, label]) => {
      const b = h('button', 'round side-btn', `<span>${icon}</span><small>${label}</small>`);
      b.setAttribute('aria-label', label);
      b.onclick = () => handlers.goto(id);
      this.sideBtns[id] = b;
      side.append(b);
    });

    // Dòng gợi ý
    this.tipEl = h('div', 'tip');
    this.tipText = h('span', '');
    const tipClose = h('button', 'tip-x', '✕');
    tipClose.setAttribute('aria-label', 'Ẩn gợi ý');
    tipClose.onclick = () => {
      this.tipsOff = true;
      this.tipEl.hidden = true;
    };
    this.tipEl.append(h('b', '', '💡'), this.tipText, tipClose);

    // Dãy hạt giống (hiện khi chọn công cụ Gieo)
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

    // Thanh công cụ
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

    const bottom = h('div', 'bottom');
    bottom.append(this.seedbar, this.toolbar);

    this.labels = h('div', 'labels');
    this.floats = h('div', 'floats');
    this.toastEl = h('div', 'toast');
    this.toastEl.setAttribute('role', 'status');
    this.modal = h('div', 'modal-wrap');
    this.modal.hidden = true;

    // Gợi ý xoay ngang màn hình
    this.rotate = h('div', 'rotate', '<div class="rotate-card"><div class="rot-phone">📱</div><b>Xoay ngang điện thoại để chơi thoải mái hơn</b><button class="btn btn-soft">Vẫn chơi màn dọc</button></div>');
    this.rotate.querySelector('button').onclick = () => {
      this.rotateDismissed = true;
      this._checkOrientation();
    };
    addEventListener('resize', () => this._checkOrientation());

    root.append(this.labels, this.floats, topLeft, this.clockEl, this.tipEl, topRight, side, bottom, this.toastEl, this.modal, this.rotate);
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

  render(state) {
    if (!state) return;
    this._state = state;
    this.moneyEl.innerHTML = `💰 <b>${state.money}</b>`;
    const produce = CROP_ORDER.reduce((n, id) => n + (state.items[CROPS[id].harvestItem] || 0), 0);
    this.harvestEl.innerHTML = `🧺 <b>${produce}</b>`;
    const [icon, part] = partOfDay(state.minutes);
    this.clockEl.innerHTML = `<span class="clock-icon">${icon}</span><span class="ctime">${formatClock(state.minutes)}</span><span class="cinfo"><b>Ngày ${state.day}</b><small>${part}</small></span>`;
    CROP_ORDER.forEach((id) => {
      const b = this.seedBtns[id];
      b.querySelector('b').textContent = state.seeds[id] || 0;
      b.classList.toggle('active', this.selectedSeed === id);
      b.classList.toggle('empty', !state.seeds[id]);
    });
    this.toolBtns.plant.querySelector('.ti').textContent = CROPS[this.selectedSeed].icon;
    this.seedBadge.textContent = state.seeds[this.selectedSeed] || 0;
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

  floatText(screen, text) {
    if (!screen) return;
    const el = h('div', 'floattext', text);
    el.style.left = screen.x + 'px';
    el.style.top = screen.y + 'px';
    this.floats.append(el);
    setTimeout(() => el.remove(), 1300);
  }

  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toastEl.classList.remove('show'), 2400);
  }

  // ---- Cửa sổ ----
  openModal(title, body, { onClose, closable = true } = {}) {
    this.modal.innerHTML = '';
    const card = h('div', 'modal');
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

  openBag() {
    const s = this._state;
    const body = h('div', 'bag');
    const sec = (title, entries) => {
      body.append(h('h3', '', title));
      const grid = h('div', 'bag-grid');
      entries.forEach(([icon, name, n]) => grid.append(h('div', 'bag-item' + (n ? '' : ' zero'), `<span>${icon}</span><small>${name}</small><b>×${n}</b>`)));
      body.append(grid);
    };
    sec('Nông sản & nguyên liệu', Object.entries(ITEMS).map(([id, it]) => [it.icon, it.name, s.items[id] || 0]));
    sec('Hạt giống', CROP_ORDER.map((id) => [CROPS[id].icon, 'Hạt ' + CROPS[id].name, s.seeds[id] || 0]));
    this.openModal('🎒 Kho đồ', body);
  }

  openMarket(game) {
    const body = h('div', 'market');
    const tabs = h('div', 'tabs');
    const buyTab = h('button', 'tab active', 'Mua');
    const sellTab = h('button', 'tab', 'Bán');
    tabs.append(buyTab, sellTab);
    const list = h('div', 'shoplist');
    body.append(tabs, list);
    let mode = 'buy';

    const row = (icon, name, sub, price, btnText, disabled, onClick) => {
      const r = h('div', 'shoprow');
      r.append(h('div', 'shop-ico', icon));
      r.append(h('div', 'shop-name', `<b>${name}</b><small>${sub}</small>`));
      const b = h('button', 'btn btn-pink', `${btnText} <span>💰${price}</span>`);
      b.disabled = disabled;
      b.onclick = () => {
        onClick();
        draw();
      };
      r.append(b);
      return r;
    };

    const draw = () => {
      const s = game.state;
      list.innerHTML = '';
      buyTab.classList.toggle('active', mode === 'buy');
      sellTab.classList.toggle('active', mode === 'sell');
      if (mode === 'buy') {
        CROP_ORDER.forEach((id) => {
          const c = CROPS[id];
          list.append(row(c.icon, 'Hạt ' + c.name, `Đang có ${s.seeds[id] || 0} · lớn trong ${c.growTime}s · thu ${c.harvestAmount}`, c.seedPrice, 'Mua', s.money < c.seedPrice, () => {
            const r = game.buySeed(id, 1);
            if (!r.ok) this.toast(r.reason);
          }));
        });
        Object.entries(ITEMS).filter(([, it]) => it.buyPrice).forEach(([id, it]) => {
          list.append(row(it.icon, it.name, `Đang có ${s.items[id] || 0} · dùng để nấu ăn`, it.buyPrice, 'Mua', s.money < it.buyPrice, () => {
            const r = game.buyItem(id, 1);
            if (!r.ok) this.toast(r.reason);
          }));
        });
      } else {
        Object.entries(ITEMS).forEach(([id, it]) => {
          const have = s.items[id] || 0;
          list.append(row(it.icon, it.name, `Đang có ${have}`, it.sellPrice, 'Bán', have <= 0, () => {
            const r = game.sellItem(id, 1);
            if (!r.ok) this.toast(r.reason);
          }));
        });
      }
      list.append(h('p', 'hint', mode === 'buy' ? 'Mẹo: rau lớn nhanh nhất, lúa thu được nhiều nhất mỗi ô.' : 'Từ bản sau, nông sản sẽ dùng để nấu món ở quán. Giờ bán bớt phần dư cũng được.'));
    };
    buyTab.onclick = () => ((mode = 'buy'), draw());
    sellTab.onclick = () => ((mode = 'sell'), draw());
    draw();
    this.openModal('🛒 Chợ quê', body);
    this.handlers.onMarket?.();
  }

  openEvening(state, todayHarvest, onNewDay) {
    const body = h('div', 'summary');
    body.innerHTML = `
      <p>Trời đã chiều, hết giờ làm đồng hôm nay.</p>
      <div class="stats">
        <div><span>🧺</span><b>${todayHarvest}</b><small>nông sản thu hôm nay</small></div>
        <div><span>💰</span><b>${state.money}</b><small>xu đang có</small></div>
      </div>
      <p class="hint">Phần mở quán buổi tối sẽ có ở bản tiếp theo. Sang ngày mới, đất khô lại và cần tưới tiếp.</p>`;
    const btn = h('button', 'btn btn-pink btn-big', '☀️ Ngày mới');
    btn.onclick = () => {
      this.closeModal();
      onNewDay();
    };
    body.append(btn);
    this.openModal(`🌇 Hết ngày ${state.day}`, body, { closable: false });
  }

  openMenu() {
    const body = h('div', 'menu');
    body.innerHTML = '<p>Tiến độ được tự động lưu trên máy này.</p>';
    const reset = h('button', 'btn btn-danger', 'Chơi lại từ đầu');
    reset.onclick = () => {
      if (reset.dataset.confirm) {
        this.closeModal();
        this.handlers.reset();
      } else {
        reset.dataset.confirm = '1';
        reset.textContent = 'Bấm lần nữa để xoá tiến độ';
      }
    };
    const help = h('div', 'help', `
      <p><b>Cách chơi</b></p>
      <ul>
        <li>Chọn công cụ ở thanh dưới: 🪏 Xới → 🌱 Gieo → 💧 Tưới → 🧺 Thu.</li>
        <li>Chạm một ô, hoặc giữ và vuốt qua nhiều ô để làm liền một lượt.</li>
        <li>Cây chỉ lớn khi đất ẩm. Sáng mỗi ngày đất khô lại.</li>
        <li>Ô có 🔒 là đất chưa mở, chạm để mua thêm.</li>
        <li>Chạm chuồng gà để nhặt trứng, chạm sạp chợ để mua bán.</li>
        <li>Kéo chỗ trống để nhìn xung quanh, chụm 2 ngón để phóng to.</li>
      </ul>`);
    const replay = h('button', 'btn btn-soft', '📖 Xem lại hướng dẫn');
    replay.onclick = () => {
      this.closeModal();
      this.handlers.replayTutorial?.();
    };
    const row = h('div', 'btn-row');
    row.append(replay, reset);
    body.append(help, row);
    this.openModal('⚙️ Tuỳ chọn', body);
  }
}
