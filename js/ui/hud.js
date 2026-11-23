// Giao diện HTML phủ trên cảnh 3D. Chỉ đọc state để hiển thị và gọi callback khi người chơi bấm.
import { CROPS, CROP_ORDER, ITEMS, TIME } from '../config/gameData.js';
import { formatClock } from '../core/game.js';

const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html !== undefined) el.innerHTML = html;
  return el;
};

export class Hud {
  constructor(root, handlers) {
    this.root = root;
    this.handlers = handlers;
    this.selectedSeed = 'rau';

    // Thanh trên cùng
    const top = h('div', 'topbar');
    this.moneyEl = h('div', 'chip chip-money', '');
    this.dayEl = h('div', 'chip', '');
    this.timeEl = h('div', 'chip', '');
    const menuBtn = h('button', 'chip chip-btn', '⚙️');
    menuBtn.setAttribute('aria-label', 'Tuỳ chọn');
    menuBtn.onclick = () => this.openMenu();
    top.append(this.moneyEl, this.dayEl, this.timeEl, menuBtn);

    // Nút chuyển khu
    const nav = h('div', 'nav');
    this.navFarm = h('button', 'navbtn navbtn-farm', '<span>🌱</span><b>Nông trại</b>');
    this.navRest = h('button', 'navbtn navbtn-rest', '<span>🍜</span><b>Quán</b>');
    this.navFarm.onclick = () => handlers.goto('farm');
    this.navRest.onclick = () => handlers.goto('restaurant');
    nav.append(this.navFarm, this.navRest);

    // Thanh hạt giống
    const seedbar = h('div', 'seedbar');
    seedbar.append(h('div', 'bar-label', 'Hạt giống'));
    const seedRow = h('div', 'seed-row');
    this.seedBtns = {};
    CROP_ORDER.forEach((id) => {
      const b = h('button', 'seedbtn', `<span class="ico">${CROPS[id].icon}</span><span class="cnt"></span>`);
      b.setAttribute('aria-label', 'Hạt ' + CROPS[id].name);
      b.onclick = () => {
        this.selectedSeed = id;
        this.render(this._state);
        this.toast(`Đã chọn hạt ${CROPS[id].name}. Chạm ô đất trống để gieo.`);
      };
      this.seedBtns[id] = b;
      seedRow.append(b);
    });
    seedbar.append(seedRow);

    // Kho
    const inv = h('div', 'inventory');
    inv.append(h('div', 'bar-label', 'Kho'));
    const invRow = h('div', 'inv-row');
    this.invEls = {};
    Object.entries(ITEMS).forEach(([id, it]) => {
      const el = h('div', 'invitem', `<span class="ico">${it.icon}</span><span class="cnt">0</span>`);
      el.title = it.name;
      this.invEls[id] = el;
      invRow.append(el);
    });
    inv.append(invRow);

    this.labels = h('div', 'labels');
    this.floats = h('div', 'floats');
    this.toastEl = h('div', 'toast');
    this.toastEl.setAttribute('role', 'status');
    this.modal = h('div', 'modal');
    this.modal.hidden = true;

    // Gợi ý xoay ngang màn hình
    this.rotate = h('div', 'rotate', '<div class="rotate-card"><div class="rotate-ico">📱↻</div><p>Xoay ngang điện thoại để chơi thoải mái hơn</p><button class="btn btn-ghost">Vẫn chơi màn dọc</button></div>');
    this.rotate.querySelector('button').onclick = () => {
      this.rotateDismissed = true;
      this._checkOrientation();
    };
    addEventListener('resize', () => this._checkOrientation());

    root.append(this.labels, this.floats, top, nav, seedbar, inv, this.toastEl, this.modal, this.rotate);
    this._checkOrientation();
  }

  _checkOrientation() {
    const portrait = innerHeight > innerWidth && innerWidth < 700;
    this.rotate.hidden = !portrait || this.rotateDismissed;
    document.body.classList.toggle('portrait', portrait);
  }

  render(state) {
    this._state = state;
    this.moneyEl.innerHTML = `<span>💰</span><b>${state.money}</b>`;
    this.dayEl.innerHTML = `<span>📅</span><b>Ngày ${state.day}</b>`;
    this.timeEl.innerHTML = `<span>${state.minutes >= TIME.evening ? '🌇' : '🕗'}</span><b>${formatClock(state.minutes)}</b>`;
    CROP_ORDER.forEach((id) => {
      const b = this.seedBtns[id];
      b.querySelector('.cnt').textContent = state.seeds[id] || 0;
      b.classList.toggle('selected', this.selectedSeed === id);
      b.classList.toggle('empty', !state.seeds[id]);
    });
    Object.entries(this.invEls).forEach(([id, el]) => {
      el.querySelector('.cnt').textContent = state.items[id] || 0;
      el.classList.toggle('zero', !state.items[id]);
    });
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
    this._toastT = setTimeout(() => this.toastEl.classList.remove('show'), 2200);
  }

  // ---- Cửa sổ ----
  openModal(title, body, { onClose, closable = true } = {}) {
    this.modal.innerHTML = '';
    const card = h('div', 'card');
    const head = h('div', 'card-head');
    head.append(h('h2', '', title));
    if (closable) {
      const x = h('button', 'iconbtn', '✕');
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
      const b = h('button', 'btn btn-buy', `${btnText} <span>💰${price}</span>`);
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
      const note = h('p', 'hint', mode === 'buy' ? 'Mẹo: rau lớn nhanh nhất, lúa bán được nhiều nhất mỗi ô.' : 'Từ bản sau, nông sản sẽ dùng để nấu món ở quán. Giờ bán bớt phần dư cũng được.');
      list.append(note);
    };
    buyTab.onclick = () => ((mode = 'buy'), draw());
    sellTab.onclick = () => ((mode = 'sell'), draw());
    draw();
    this.openModal('🛒 Chợ quê', body);
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
    const btn = h('button', 'btn btn-primary btn-big', '☀️ Ngày mới');
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
        <li>Chọn hạt giống ở góc dưới bên trái, chạm ô đất trống để gieo.</li>
        <li>Chạm ô đất khô (có 💧) để tưới. Cây chỉ lớn khi đất ướt.</li>
        <li>Cây chín có biểu tượng nhảy nhảy, chạm để thu hoạch.</li>
        <li>Chạm chuồng gà để nhặt trứng, chạm sạp chợ để mua bán.</li>
        <li>Kéo màn hình để nhìn xung quanh, chụm 2 ngón để phóng to.</li>
      </ul>`);
    body.append(help, reset);
    this.openModal('⚙️ Tuỳ chọn', body);
  }
}
