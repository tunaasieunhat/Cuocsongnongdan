// Các cửa sổ: kho, chợ, tuỳ chọn, lên thực đơn, bếp, quầy, sổ công thức, nâng cấp & trang trí,
// câu cá, tổng kết ngày, chuyện khách quen. Mỗi hàm nhận (hud, game, ...).
import { CROPS, CROP_ORDER, ITEMS, RECIPES, RECIPE_ORDER, UPGRADES, DECOR, REGULARS, FISHING, REPUTATION_LEVELS } from '../config/gameData.js';
import { h } from './hud.js';
import { portionsAvailable, menuSize, tableCount, stoveCount, decorBonus } from '../core/restaurant.js';
import { reputationLevel, upgradePrice, fishLeft, cropInSeason, season } from '../core/progress.js';

const money = (n) => `💰${n}`;

// ---------- Kho đồ ----------
export function openBag(hud, game) {
  const s = game.state;
  const body = h('div', 'bag');
  const sec = (title, entries) => {
    body.append(h('h3', '', title));
    const grid = h('div', 'bag-grid');
    entries.forEach(([icon, name, n]) => grid.append(h('div', 'bag-item' + (n ? '' : ' zero'), `<span>${icon}</span><small>${name}</small><b>×${n}</b>`)));
    body.append(grid);
  };
  sec('Nông sản & nguyên liệu', Object.entries(ITEMS).map(([id, it]) => [it.icon, it.name, s.items[id] || 0]));
  sec('Hạt giống', CROP_ORDER.map((id) => [CROPS[id].icon, 'Hạt ' + CROPS[id].name, s.seeds[id] || 0]));
  if (s.restaurant.counter.length) sec('Món trên quầy', Object.entries(countBy(s.restaurant.counter)).map(([d, n]) => [RECIPES[d].icon, RECIPES[d].name, n]));
  hud.openModal('🎒 Kho đồ', body);
}

function countBy(arr) {
  return arr.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});
}

// ---------- Chợ ----------
export function openMarket(hud, game) {
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
    const b = h('button', 'btn btn-pink', `${btnText} <span>${money(price)}</span>`);
    b.disabled = disabled;
    b.onclick = () => {
      const res = onClick();
      if (res && !res.ok) hud.toast(res.reason);
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
        const inSeason = cropInSeason(s, id);
        list.append(row(c.icon, 'Hạt ' + c.name, inSeason ? `Đang có ${s.seeds[id] || 0} · lớn trong ${c.growTime}s · thu ${c.harvestAmount}` : `Hết mùa · bán vào mùa ${c.seasons.map((i) => ['Xuân', 'Hạ', 'Thu', 'Đông'][i]).join(', ')}`, c.seedPrice, 'Mua', !inSeason || s.money < c.seedPrice, () => game.buySeed(id, 1)));
      });
      Object.entries(ITEMS).filter(([, it]) => it.buyPrice).forEach(([id, it]) => {
        list.append(row(it.icon, it.name, `Đang có ${s.items[id] || 0}${id === 'phan' ? ' · dùng với công cụ 🧪 Bón' : ' · dùng để nấu ăn'}`, it.buyPrice, 'Mua', s.money < it.buyPrice, () => game.buyItem(id, 1)));
      });
    } else {
      Object.entries(ITEMS).forEach(([id, it]) => {
        const have = s.items[id] || 0;
        list.append(row(it.icon, it.name, `Đang có ${have}`, it.sellPrice, 'Bán', have <= 0, () => game.sellItem(id, 1)));
      });
    }
    list.append(h('p', 'hint', mode === 'buy' ? `Mùa ${season(s).name}: hạt hết mùa sẽ quay lại vào mùa sau.` : 'Nấu thành món bán ở quán thường lời hơn bán sống.'));
  };
  buyTab.onclick = () => ((mode = 'buy'), draw());
  sellTab.onclick = () => ((mode = 'sell'), draw());
  draw();
  hud.openModal('🛒 Chợ quê', body);
}

// ---------- Tuỳ chọn ----------
export function openSettings(hud, game, { onAudio, onReplay, onReplayQuan, onReset }) {
  const s = game.state;
  const body = h('div', 'menu');
  const toggles = h('div', 'toggles');
  const tog = (key, label) => {
    const b = h('button', 'toggle' + (s.settings[key] ? ' on' : ''), `${label}<i></i>`);
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-checked', String(!!s.settings[key]));
    b.onclick = () => {
      s.settings[key] = !s.settings[key];
      b.classList.toggle('on', s.settings[key]);
      b.setAttribute('aria-checked', String(s.settings[key]));
      onAudio();
    };
    return b;
  };
  toggles.append(tog('music', '🎵 Nhạc nền'), tog('sfx', '🔔 Âm thanh'));
  const help = h('div', 'help', `
    <p><b>Một ngày ở nông trại</b></p>
    <ul>
      <li>☀️ 06:00–15:00: làm ruộng (🪏 Xới → 🌱 Gieo → 💧 Tưới → 🧺 Thu), nhặt trứng, câu cá, đi chợ.</li>
      <li>🌇 15:00: bấm <b>📋 Lên thực đơn</b> chọn món hôm nay, nấu sẵn vài món ở bếp.</li>
      <li>🏮 17:00–21:30: khách vào. Chạm bàn khách để bưng đúng món, khách ăn xong thì chạm bàn để dọn.</li>
      <li>🌙 Hết khách: xem tổng kết rồi bấm <b>Ngày mới</b>. Mỗi sáng đất khô lại, trời mưa thì được tưới sẵn.</li>
      <li>⭐ Khách hài lòng tăng cấp quán: mở món mới trong 📖, nâng cấp và trang trí trong 🔨.</li>
    </ul>`);
  const row = h('div', 'btn-row wrap');
  const replay = h('button', 'btn btn-soft', '📖 Học lại phần ruộng');
  replay.onclick = () => (hud.closeModal(), onReplay());
  const replayQ = h('button', 'btn btn-soft', '🍜 Học lại phần quán');
  replayQ.onclick = () => (hud.closeModal(), onReplayQuan());
  const reset = h('button', 'btn btn-danger', 'Chơi lại từ đầu');
  reset.onclick = () => {
    if (reset.dataset.confirm) return hud.closeModal(), onReset();
    reset.dataset.confirm = '1';
    reset.textContent = 'Bấm lần nữa để xoá tiến độ';
  };
  row.append(replay, replayQ, reset);
  body.append(toggles, help, h('p', 'hint', 'Tiến độ được tự động lưu trên máy này.'), row);
  hud.openModal('⚙️ Tuỳ chọn', body);
}

// ---------- Lên thực đơn ----------
export function openMenuPlanner(hud, game, { onDone } = {}) {
  const s = game.state;
  const max = menuSize(s);
  const picked = new Set(s.restaurant.menu.filter((d) => s.recipes[d]));
  // Gợi ý: các món nấu được nhiều nhất
  if (!picked.size) {
    RECIPE_ORDER.filter((d) => s.recipes[d])
      .sort((a, b) => portionsAvailable(s, b) - portionsAvailable(s, a))
      .slice(0, max)
      .forEach((d) => portionsAvailable(s, d) > 0 && picked.add(d));
  }
  const body = h('div', 'planner');
  const info = h('p', 'hint');
  const list = h('div', 'dishlist');
  const draw = () => {
    list.innerHTML = '';
    info.innerHTML = `Chọn tối đa <b>${max}</b> món (quán cấp cao chọn được nhiều hơn). Đã chọn <b>${picked.size}</b>. Món còn thiếu nguyên liệu vẫn chọn được, nhớ đi thu hoạch thêm.`;
    RECIPE_ORDER.filter((d) => s.recipes[d]).forEach((d) => {
      const r = RECIPES[d];
      const n = portionsAvailable(s, d);
      const b = h('button', 'dish' + (picked.has(d) ? ' on' : ''), `<span class="dish-ico">${r.icon}</span><span class="dish-main"><b>${r.name}</b><small>${hud.itemsLine(r.ingredients, s)}</small></span><span class="dish-side"><b>${money(r.price)}</b><small>nấu được ${n}</small></span>`);
      b.onclick = () => {
        if (picked.has(d)) picked.delete(d);
        else if (picked.size < max) picked.add(d);
        else hud.toast(`Thực đơn tối đa ${max} món.`);
        draw();
      };
      list.append(b);
    });
  };
  draw();
  const row = h('div', 'btn-row');
  const save = h('button', 'btn btn-soft', 'Lưu thực đơn');
  const open = h('button', 'btn btn-pink', '🏮 Lưu & mở quán');
  const submit = (openNow) => {
    const r = game.setMenu([...picked], openNow);
    if (!r.ok) return hud.toast(r.reason);
    hud.closeModal();
    onDone?.(openNow);
  };
  save.onclick = () => submit(false);
  open.onclick = () => submit(true);
  row.append(save, open);
  body.append(info, list, row);
  hud.openModal('📋 Thực đơn hôm nay', body, { wide: true });
}

// ---------- Bếp: chọn món để nấu ----------
export function openCook(hud, game, { onCook }) {
  const s = game.state;
  const body = h('div', 'cook');
  const r0 = s.restaurant;
  const busy = r0.stoves.slice(0, stoveCount(s)).filter(Boolean).length;
  body.append(h('p', 'hint', `Bếp: ${busy}/${stoveCount(s)} đang nấu · Quầy: ${r0.counter.length} món. Món nấu xong tự lên quầy.`));
  const list = h('div', 'dishlist');
  r0.menu.forEach((d) => {
    const r = RECIPES[d];
    const n = portionsAvailable(s, d);
    const waiting = r0.customers.filter((c) => c.state === 'waiting' && c.dish === d).length;
    const b = h('button', 'dish', `<span class="dish-ico">${r.icon}</span><span class="dish-main"><b>${r.name}</b><small>${hud.itemsLine(r.ingredients, s)}</small></span><span class="dish-side">${waiting ? `<b class="warn">${waiting} khách chờ</b>` : `<b>${r.cookTime}s</b>`}<small>còn nấu được ${n}</small></span>`);
    b.disabled = n < 1;
    b.onclick = () => {
      hud.closeModal();
      onCook(d);
    };
    list.append(b);
  });
  body.append(list);
  hud.openModal('🔥 Nấu món', body);
}

// ---------- Quầy: chọn món để bưng ----------
export function openCounter(hud, game, { onPick }) {
  const s = game.state;
  const body = h('div', 'cook');
  const list = h('div', 'dishlist');
  Object.entries(countBy(s.restaurant.counter)).forEach(([d, n]) => {
    const r = RECIPES[d];
    const waiting = s.restaurant.customers.filter((c) => c.state === 'waiting' && c.dish === d).length;
    const b = h('button', 'dish', `<span class="dish-ico">${r.icon}</span><span class="dish-main"><b>${r.name}</b><small>${n} phần trên quầy</small></span><span class="dish-side">${waiting ? `<b class="warn">${waiting} khách chờ</b>` : ''}</span>`);
    b.onclick = () => {
      hud.closeModal();
      onPick(d);
    };
    list.append(b);
  });
  body.append(h('p', 'hint', 'Chọn món để bưng, rồi chạm vào bàn khách. Đưa nhầm món khách sẽ không vui!'), list);
  hud.openModal('🍽️ Quầy món', body);
}

// ---------- Sổ công thức ----------
export function openRecipes(hud, game) {
  const body = h('div', 'recipes');
  const draw = () => {
    const s = game.state;
    const lvl = reputationLevel(s);
    body.innerHTML = '';
    body.append(h('p', 'hint', 'Món mới bán giá cao hơn. Một số món cần quán đạt cấp nhất định.'));
    const list = h('div', 'dishlist');
    RECIPE_ORDER.forEach((d) => {
      const r = RECIPES[d];
      const known = s.recipes[d];
      const row = h('div', 'dish' + (known ? ' known' : ''), `<span class="dish-ico">${known ? r.icon : '❔'}</span><span class="dish-main"><b>${r.name}</b><small>${hud.itemsLine(r.ingredients)} · bán ${money(r.price)}</small></span>`);
      const side = h('span', 'dish-side');
      if (known) side.innerHTML = '<b class="ok">✓ Đã biết</b>';
      else if (lvl < r.level) side.innerHTML = `<b>🔒 Cấp ${r.level}</b>`;
      else {
        const b = h('button', 'btn btn-pink', `Học ${money(r.unlock)}`);
        b.disabled = s.money < r.unlock;
        b.onclick = () => {
          const res = game.unlockRecipe(d);
          hud.toast(res.ok ? `📖 Đã học món ${r.name}!` : res.reason);
          draw();
        };
        side.append(b);
      }
      row.append(side);
      list.append(row);
    });
    body.append(list);
  };
  draw();
  hud.openModal('📖 Sổ công thức', body, { wide: true });
}

// ---------- Nâng cấp & trang trí ----------
export function openUpgrades(hud, game, startTab = 'quan') {
  const body = h('div', 'upgrades');
  const tabs = h('div', 'tabs');
  const tabDefs = [['quan', '🍜 Quán'], ['trai', '🌱 Nông trại'], ['decor', '🎨 Trang trí']];
  let tab = startTab;
  const tabBtns = tabDefs.map(([id, label]) => {
    const b = h('button', 'tab', label);
    b.onclick = () => ((tab = id), draw());
    tabs.append(b);
    return [id, b];
  });
  const list = h('div', 'shoplist');
  body.append(tabs, list);
  const draw = () => {
    const s = game.state;
    const lvl = reputationLevel(s);
    tabBtns.forEach(([id, b]) => b.classList.toggle('active', id === tab));
    list.innerHTML = '';
    if (tab === 'decor') {
      DECOR.forEach((d) => {
        const owned = s.decor[d.id];
        const r = h('div', 'shoprow');
        r.append(h('div', 'shop-ico', d.icon), h('div', 'shop-name', `<b>${d.name}</b><small>+${Math.round(d.bonus * 100)}% hài lòng & tiền tip</small>`));
        const b = h('button', 'btn btn-pink', owned ? '✓ Đã đặt' : `Mua <span>${money(d.price)}</span>`);
        b.disabled = owned || s.money < d.price;
        b.onclick = () => {
          const res = game.buyDecor(d.id);
          hud.toast(res.ok ? `🎨 Đã đặt ${d.name} ở quán!` : res.reason);
          draw();
        };
        r.append(b);
        list.append(r);
      });
      list.append(h('p', 'hint', `Trang trí hiện tại: +${Math.round(decorBonus(s) * 100)}% hài lòng & tiền tip.`));
      return;
    }
    UPGRADES.filter((u) => u.group === tab).forEach((u) => {
      const lv = s.upgrades[u.id] || 0;
      const info = upgradePrice(s, u.id);
      const r = h('div', 'shoprow');
      const dots = u.prices.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
      r.append(h('div', 'shop-ico', u.icon), h('div', 'shop-name', `<b>${u.name} <span class="dots">${dots}</span></b><small>${u.desc}</small>`));
      let b;
      if (!info) b = h('button', 'btn btn-soft', 'Tối đa');
      else if (lvl < info.level) b = h('button', 'btn btn-soft', `🔒 Cấp ${info.level}`);
      else b = h('button', 'btn btn-pink', `Nâng <span>${money(info.price)}</span>`);
      b.disabled = !info || lvl < info.level || s.money < info.price;
      b.onclick = () => {
        const res = game.buyUpgrade(u.id);
        hud.toast(res.ok ? `🔨 ${u.name} lên bậc ${res.level}!` : res.reason);
        draw();
      };
      r.append(b);
      list.append(r);
    });
    if (tab === 'quan') list.append(h('p', 'hint', `Đang có ${tableCount(s)} bàn, ${stoveCount(s)} bếp. Cấp quán tăng nhờ khách hài lòng.`));
  };
  draw();
  hud.openModal('🔨 Nâng cấp', body, { wide: true });
}

// ---------- Câu cá (mini-game canh đúng lúc) ----------
export function openFishing(hud, game, { onResult }) {
  const body = h('div', 'fishing');
  const left = fishLeft(game.state);
  if (left <= 0) {
    body.append(h('p', '', 'Hôm nay ao hết cá rồi. Mai quay lại nhé! 🐟'));
    return hud.openModal('🎣 Câu cá', body);
  }
  const bar = h('div', 'fish-bar');
  const zone = h('div', 'fish-zone');
  const mark = h('div', 'fish-mark', '🎣');
  bar.append(zone, mark);
  const status = h('p', 'hint', `Bấm <b>Giật cần</b> khi phao nằm trong vùng xanh. Hôm nay còn ${left} lượt.`);
  const btn = h('button', 'btn btn-pink btn-big', '🎣 Giật cần!');
  body.append(status, bar, btn);
  const zw = FISHING.zoneWidth;
  const z0 = 0.1 + Math.random() * (0.8 - zw);
  zone.style.left = z0 * 100 + '%';
  zone.style.width = zw * 100 + '%';
  let x = 0, dir = 1, done = false, raf;
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    x += dir * dt * FISHING.speed * (0.8 + Math.sin(now / 300) * 0.35);
    if (x > 1) (x = 1), (dir = -1);
    if (x < 0) (x = 0), (dir = 1);
    mark.style.left = x * 100 + '%';
    if (!done) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  btn.onclick = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    const success = x >= z0 && x <= z0 + zw;
    const res = game.catchFish(success);
    status.innerHTML = res.ok ? '🐟 Câu được 1 con cá! Cá dùng nấu canh chua, cá kho.' : res.reason;
    btn.textContent = fishLeft(game.state) > 0 ? '🎣 Câu tiếp' : 'Đóng';
    btn.onclick = () => (fishLeft(game.state) > 0 ? openFishing(hud, game, { onResult }) : hud.closeModal());
    onResult(res);
  };
  hud.openModal('🎣 Câu cá', body, { onClose: () => cancelAnimationFrame(raf) });
}

// ---------- Tổng kết ngày ----------
export function openSummary(hud, game, { harvested, onNewDay }) {
  const s = game.state;
  const t = s.restaurant.today;
  const guests = t.served + t.angry;
  const avg = guests ? Math.round(t.satSum / guests) : 0;
  const best = Object.entries(t.sold).sort((a, b) => b[1] - a[1])[0];
  const face = avg >= 80 ? '😍' : avg >= 60 ? '😊' : avg >= 40 ? '🙂' : guests ? '😟' : '😴';
  const body = h('div', 'summary');
  body.innerHTML = `
    <div class="stats stats-3">
      <div><span>💰</span><b>${t.revenue + t.tips}</b><small>doanh thu (tip ${t.tips})</small></div>
      <div><span>🧑‍🤝‍🧑</span><b>${t.served}</b><small>khách đã phục vụ</small></div>
      <div><span>${face}</span><b>${avg}%</b><small>hài lòng trung bình</small></div>
    </div>
    <ul class="sum-list">
      <li>🧺 Thu hoạch hôm nay: <b>${harvested}</b></li>
      ${best ? `<li>🏆 Món bán chạy: <b>${RECIPES[best[0]].icon} ${RECIPES[best[0]].name}</b> (${best[1]} phần)</li>` : ''}
      ${t.angry ? `<li>😠 Khách bỏ về vì chờ lâu: <b>${t.angry}</b></li>` : ''}
      ${t.wrong ? `<li>🙃 Bưng nhầm món: <b>${t.wrong}</b> lần</li>` : ''}
      ${t.leftovers ? `<li>🍽️ Món thừa trên quầy (bỏ đi): <b>${t.leftovers}</b></li>` : ''}
      <li>⭐ Danh tiếng: <b>${s.reputation.points}</b> điểm · quán cấp ${reputationLevel(s)}${REPUTATION_LEVELS[reputationLevel(s)] ? ` (cấp sau: ${REPUTATION_LEVELS[reputationLevel(s)]})` : ''}</li>
      <li>💵 Đang có: <b>${s.money}</b> xu</li>
    </ul>`;
  if (!guests) body.append(h('p', 'hint', 'Hôm nay quán chưa đón khách nào. Nhớ lên thực đơn trước 17:00 nhé!'));
  const btn = h('button', 'btn btn-pink btn-big', '☀️ Ngày mới');
  btn.onclick = () => {
    hud.closeModal();
    onNewDay();
  };
  body.append(btn);
  hud.openModal(`🌙 Tổng kết ngày ${s.day}`, body, { closable: false });
}

// ---------- Chuyện khách quen ----------
export function openStory(hud, reg, hearts, line) {
  const body = h('div', 'story');
  const max = reg.story.length * 2;
  body.innerHTML = `<div class="story-head"><span class="story-ava" style="background:#${reg.color.toString(16).padStart(6, '0')}">🙂</span><div><b>${reg.name}</b><small>Thích món ${RECIPES[reg.favorite].icon} ${RECIPES[reg.favorite].name}</small><div class="hearts">${'❤️'.repeat(Math.min(hearts, max))}${'🤍'.repeat(Math.max(0, max - hearts))}</div></div></div><p class="story-line">“${line}”</p>`;
  const ok = h('button', 'btn btn-pink btn-big', 'Cảm ơn khách quen 💕');
  ok.onclick = () => hud.closeModal();
  body.append(ok);
  hud.openModal('💌 Khách quen', body);
}

export function regularsList(state) {
  return REGULARS.map((g) => ({ ...g, hearts: state.regulars[g.id]?.hearts || 0 }));
}
