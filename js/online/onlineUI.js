// Giao diện online (GĐ10): đăng nhập, đồng bộ lưu game, bạn bè (thăm quán, tưới giúp, tặng quà), xếp hạng.
// Khi chưa cấu hình Supabase (js/config/online.js) thì chỉ hiện hướng dẫn, game vẫn chơi offline bình thường.
import { ITEMS } from '../config/gameData.js';
import { ONLINE } from '../config/online.js';
import { SupabaseClient, isConfigured, friendCode } from './supabase.js';
import { migrateState } from '../core/state.js';
import { reputationLevel } from '../core/progress.js';
import { h } from '../ui/hud.js';

export function initOnline({ hud, game, storage, onLoaded }) {
  const configured = isConfigured(ONLINE);
  const api = configured ? new SupabaseClient(ONLINE) : null;
  let lastCloud = 0;
  let pending = null;

  const profileOf = (s) => ({
    name: s.custom.profile.name,
    shop: s.custom.profile.shop,
    level: reputationLevel(s),
    customers: s.stats.customers + s.restaurant.today.served,
    day: s.day,
    snapshot: {
      money: s.money,
      tables: 3 + (s.upgrades.tables || 0),
      recipes: Object.values(s.recipes).filter(Boolean).length,
      decor: Object.keys(s.decor).length + s.custom.garden.placed.length,
      pet: s.custom.pets.active,
      renovate: s.upgrades.renovate || 0,
      chapter: s.story.chapter,
    },
  });

  // Lưu lên mạng (giãn cách để tiết kiệm lượt gọi)
  const cloudSave = async (force = false) => {
    if (!api?.loggedIn) return { ok: false };
    const now = Date.now();
    if (!force && now - lastCloud < ONLINE.cloudSaveEvery * 1000) {
      clearTimeout(pending);
      pending = setTimeout(() => cloudSave(true), ONLINE.cloudSaveEvery * 1000);
      return { ok: true, queued: true };
    }
    lastCloud = now;
    const s = game.state;
    const a = await api.writeSave(s);
    if (a.ok) await api.writeProfile(profileOf(s));
    return a;
  };
  if (api) {
    const orig = storage.save.bind(storage);
    storage.save = async (st) => {
      const r = await orig(st);
      cloudSave();
      return r;
    };
  }

  // Nhận quà và lượt tưới giúp khi mở game
  const checkInbox = async () => {
    if (!api?.loggedIn) return;
    const r = await api.inbox();
    if (!r.ok) return;
    const s = game.state;
    const notes = [];
    r.data.gifts.forEach((g) => {
      if (!ITEMS[g.item]) return;
      const q = Math.max(1, Math.min(10, g.qty | 0));
      s.items[g.item] = (s.items[g.item] || 0) + q;
      notes.push(`${ITEMS[g.item].icon}×${q}`);
    });
    if (r.data.helps.length) {
      s.plots.forEach((p, i) => {
        if (p.crop && !p.watered) {
          p.watered = true;
          game.emit('plot', i);
        }
      });
    }
    if (notes.length || r.data.helps.length) {
      game.emit('change');
      hud.toast(`🎁 Bạn bè gửi: ${notes.join(' ') || ''}${r.data.helps.length ? ` · 💧 ${r.data.helps.length} người đã tưới giúp ruộng!` : ''}`);
    }
  };
  if (api?.loggedIn) setTimeout(checkInbox, 1500);

  // ---------- Cửa sổ ----------
  const open = (tab = 'account') => {
    const body = h('div', 'online');
    if (!configured) {
      body.innerHTML = `<p>Chế độ online chưa được bật cho bản game này.</p>
        <ol class="steps"><li>Tạo project miễn phí ở <b>supabase.com</b>.</li><li>Chạy file <code>supabase/schema.sql</code> trong SQL Editor.</li><li>Dán <b>Project URL</b> và khoá <b>anon public</b> vào <code>js/config/online.js</code>.</li></ol>
        <p class="hint">Hướng dẫn chi tiết: <code>docs/ONLINE.md</code>. Trong lúc chưa bật, tiến độ vẫn lưu trên máy này.</p>`;
      return hud.openModal('☁️ Chơi online', body);
    }
    if (!api.loggedIn) return openLogin(body);
    const tabs = h('div', 'tabs');
    const defs = [['account', '👤 Tài khoản'], ['friends', '👥 Bạn bè'], ['rank', '🏆 Xếp hạng']];
    const content = h('div', 'shoplist');
    const btns = defs.map(([id, label]) => {
      const b = h('button', 'tab', label);
      b.onclick = () => draw(id);
      tabs.append(b);
      return [id, b];
    });
    body.append(tabs, content);
    const draw = async (t) => {
      tab = t;
      btns.forEach(([id, b]) => b.classList.toggle('active', id === t));
      content.innerHTML = '<p class="hint">Đang tải…</p>';
      if (t === 'account') return drawAccount(content);
      if (t === 'friends') return drawFriends(content);
      return drawRank(content);
    };
    hud.openModal('☁️ Chơi online', body, { wide: true });
    draw(tab);
  };

  const openLogin = (body) => {
    body.innerHTML = `<p>Đăng nhập để lưu nông trại lên mạng, chơi trên nhiều máy và kết bạn.</p>
      <div class="name-row"><label>Email<input id="ol-email" type="email" autocomplete="email"></label><label>Mật khẩu<input id="ol-pass" type="password" autocomplete="current-password" minlength="6"></label></div>
      <p class="hint" id="ol-msg"></p>`;
    const row = h('div', 'btn-row');
    const msg = () => body.querySelector('#ol-msg');
    const val = () => [body.querySelector('#ol-email').value.trim(), body.querySelector('#ol-pass').value];
    const reg = h('button', 'btn btn-soft', 'Đăng ký');
    const login = h('button', 'btn btn-pink', 'Đăng nhập');
    reg.onclick = async () => {
      const [e, p] = val();
      msg().textContent = 'Đang đăng ký…';
      const r = await api.signUp(e, p);
      if (!r.ok) return (msg().textContent = r.reason);
      if (r.needConfirm) return (msg().textContent = r.reason);
      afterLogin();
    };
    login.onclick = async () => {
      const [e, p] = val();
      msg().textContent = 'Đang đăng nhập…';
      const r = await api.signIn(e, p);
      if (!r.ok) return (msg().textContent = r.reason);
      afterLogin();
    };
    row.append(reg, login);
    body.append(row);
    hud.openModal('☁️ Đăng nhập', body);
  };

  // Sau khi đăng nhập: nếu trên mạng có bản lưu thì hỏi dùng bản nào
  const afterLogin = async () => {
    hud.closeModal();
    const r = await api.loadSave();
    if (r.ok && r.data?.data) {
      const cloud = r.data.data;
      const local = game.state;
      hud.openConfirm(
        '☁️ Có tiến độ trên mạng',
        `Trên mạng: ngày ${cloud.day}, ${cloud.money} xu. Trên máy này: ngày ${local.day}, ${local.money} xu. Dùng bản trên mạng? (bản trên máy sẽ bị thay)`,
        'Dùng bản trên mạng',
        async () => {
          await storage.save(migrateState(cloud));
          onLoaded();
        }
      );
    } else {
      await cloudSave(true);
      hud.toast('☁️ Đã đăng nhập và lưu nông trại lên mạng!');
    }
    checkInbox();
  };

  const drawAccount = (el) => {
    el.innerHTML = '';
    const code = friendCode(api.user.id);
    el.append(h('div', 'chapter', `<small>Đăng nhập bằng</small><b>${escapeHtml(api.user.email || '')}</b><p>Mã bạn bè của bạn: <b class="code">${code}</b> · gửi mã này cho bạn bè để kết bạn.</p>`));
    const row = h('div', 'btn-row wrap');
    const sync = h('button', 'btn btn-pink', '☁️ Lưu lên mạng ngay');
    sync.onclick = async () => {
      const r = await cloudSave(true);
      hud.toast(r.ok ? '☁️ Đã lưu lên mạng.' : r.reason || 'Chưa lưu được.');
    };
    const pull = h('button', 'btn btn-soft', '⬇️ Tải bản trên mạng');
    pull.onclick = () => afterLogin();
    const out = h('button', 'btn btn-danger', 'Đăng xuất');
    out.onclick = () => {
      api.signOut();
      hud.closeModal();
      hud.toast('Đã đăng xuất. Tiến độ vẫn lưu trên máy này.');
    };
    row.append(sync, pull, out);
    el.append(row);
  };

  const drawFriends = async (el) => {
    el.innerHTML = '';
    const add = h('div', 'name-row');
    add.innerHTML = '<label>Thêm bạn bằng mã<input id="ol-code" maxlength="6" placeholder="VD: A1B2C3"></label>';
    const addBtn = h('button', 'btn btn-pink', 'Kết bạn');
    addBtn.onclick = async () => {
      const f = await api.findByCode(add.querySelector('#ol-code').value);
      if (!f.ok) return hud.toast(f.reason);
      const r = await api.addFriend(f.data.user_id);
      hud.toast(r.ok ? `👥 Đã kết bạn với ${f.data.name}!` : r.reason);
      drawFriends(el);
    };
    add.append(addBtn);
    el.append(add);
    const r = await api.listFriends();
    if (!r.ok) return el.append(h('p', 'hint', r.reason));
    if (!r.data.length) el.append(h('p', 'hint', 'Chưa có bạn bè. Nhập mã 6 ký tự của bạn mình để kết bạn.'));
    r.data.forEach((f) => {
      const row = h('div', 'shoprow');
      row.append(h('div', 'shop-ico', '🏡'), h('div', 'shop-name', `<b>${escapeHtml(f.name)} · ${escapeHtml(f.shop)}</b><small>⭐ cấp ${f.level} · ngày ${f.day} · ${f.customers} khách</small>`));
      const visit = h('button', 'btn btn-pink', 'Thăm');
      visit.onclick = () => openVisit(f);
      row.append(visit);
      el.append(row);
    });
  };

  const openVisit = (f) => {
    const sn = f.snapshot || {};
    const body = h('div', 'visit');
    body.innerHTML = `<div class="stats stats-3">
      <div><span>⭐</span><b>${f.level}</b><small>cấp quán</small></div>
      <div><span>🧑‍🤝‍🧑</span><b>${f.customers}</b><small>khách đã phục vụ</small></div>
      <div><span>🎨</span><b>${sn.decor || 0}</b><small>đồ trang trí</small></div>
    </div><ul class="sum-list"><li>🪑 ${sn.tables || 3} bàn · 📖 ${sn.recipes || 4} món · 🏗️ ${['quán lá', 'quán gỗ', 'nhà gạch'][sn.renovate || 0]}</li><li>📅 Đang ở ngày ${f.day}${sn.pet ? ` · nuôi ${sn.pet === 'cho' ? '🐕' : '🐈'}` : ''}</li></ul>`;
    const row = h('div', 'btn-row wrap');
    const water = h('button', 'btn btn-pink', '💧 Tưới giúp ruộng');
    water.onclick = async () => {
      const r = await api.helpWater(f.user_id);
      hud.toast(r.ok ? `💧 Đã tưới giúp ${f.name}! Bạn ấy sẽ thấy khi mở game.` : r.reason);
    };
    row.append(water);
    // Tặng quà: chọn 1 món nông sản đang có (tặng 1 cái mỗi lần)
    const giftable = Object.entries(game.state.items).filter(([id, n]) => n > 0 && ITEMS[id] && !ITEMS[id].tool);
    giftable.slice(0, 6).forEach(([id]) => {
      const b = h('button', 'btn btn-soft', `🎁 ${ITEMS[id].icon}`);
      b.title = `Tặng 1 ${ITEMS[id].name}`;
      b.onclick = async () => {
        if ((game.state.items[id] || 0) <= 0) return hud.toast('Hết món này rồi.');
        const r = await api.sendGift(f.user_id, id, 1);
        if (!r.ok) return hud.toast(r.reason);
        game.state.items[id]--;
        game.emit('change');
        hud.toast(`🎁 Đã tặng ${ITEMS[id].icon} ${ITEMS[id].name} cho ${f.name}.`);
      };
      row.append(b);
    });
    body.append(row, h('p', 'hint', 'Mỗi ngày tưới giúp mỗi bạn 1 lần. Quà tới khi bạn ấy mở game.'));
    hud.openModal(`🏡 ${escapeHtml(f.shop)} của ${escapeHtml(f.name)}`, body, { wide: true });
  };

  const drawRank = async (el) => {
    const r = await api.leaderboard();
    el.innerHTML = '';
    if (!r.ok) return el.append(h('p', 'hint', r.reason));
    r.data.forEach((p, i) => {
      el.append(h('div', 'shoprow', `<div class="shop-ico">${['🥇', '🥈', '🥉'][i] || i + 1}</div><div class="shop-name"><b>${escapeHtml(p.shop)} · ${escapeHtml(p.name)}</b><small>⭐ cấp ${p.level} · ${p.customers} khách · mã ${p.code}</small></div>`));
    });
  };

  let tab = 'account';
  return { open, cloudSave, configured, api };
}

function escapeHtml(t) {
  return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
