// Cửa sổ cho các phần mở rộng (GĐ6-9): quầy nước, tạp hoá, chuồng trại, vườn cây, dân làng,
// sổ nhiệm vụ (cốt truyện / nhiệm vụ ngày / đơn đặt / khách quen), tuỳ biến nhân vật.
import { DRINKS, ITEMS, TREES, ANIMALS, GARDEN_DECOR, PETS, OUTFITS, RECIPES, REGULARS, PET_LOVE_BONUS } from '../config/gameData.js';
import { STORY } from '../config/story.js';
import { h } from './hud.js';
import { knownDrinks, portionsAvailable } from '../core/restaurant.js';
import { currentChapter, storyValue } from '../core/quests.js';
import { isGrown } from '../core/orchard.js';
import { gardenFree } from '../core/custom.js';

const money = (n) => `💰${n}`;
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

function rowItem(icon, title, sub, btn) {
  const r = h('div', 'shoprow');
  r.append(h('div', 'shop-ico', icon), h('div', 'shop-name', `<b>${title}</b><small>${sub}</small>`));
  if (btn) r.append(btn);
  return r;
}

function actBtn(label, cls, disabled, onClick) {
  const b = h('button', 'btn ' + cls, label);
  b.disabled = !!disabled;
  b.onclick = onClick;
  return b;
}

// ---------- Quầy nước ----------
export function openDrinks(hud, game, { onMake, onPick }) {
  const s = game.state;
  const r = s.restaurant;
  const body = h('div', 'cook');
  const waiting = {};
  r.customers.forEach((c) => c.drink && !c.drinkServed && (waiting[c.drink] = (waiting[c.drink] || 0) + 1));
  body.append(h('p', 'hint', `Trên quầy: ${r.drinkCounter.length ? r.drinkCounter.map((d) => DRINKS[d].icon).join(' ') : 'chưa có ly nào'}. Pha xong ly tự lên quầy nước.`));
  const list = h('div', 'dishlist');
  knownDrinks(s).forEach((d) => {
    const dr = DRINKS[d];
    const n = portionsAvailable(s, d);
    const b = h('button', 'dish', `<span class="dish-ico">${dr.icon}</span><span class="dish-main"><b>${dr.name}</b><small>${hud.itemsLine(dr.ingredients, s)}</small></span><span class="dish-side">${waiting[d] ? `<b class="warn">${waiting[d]} khách chờ</b>` : `<b>${money(dr.price)}</b>`}<small>pha được ${n}</small></span>`);
    b.disabled = n < 1;
    b.onclick = () => (hud.closeModal(), onMake(d));
    list.append(b);
  });
  body.append(list);
  if (r.drinkCounter.length && !r.carry) {
    const pick = h('div', 'btn-row');
    [...new Set(r.drinkCounter)].forEach((d) => pick.append(actBtn(`Bưng ${DRINKS[d].icon}`, 'btn-soft', false, () => (hud.closeModal(), onPick(d)))));
    body.append(pick);
  }
  body.append(h('p', 'hint', 'Lá trà, cà phê mua ở tạp hoá ông Bảy; mía, đậu tự trồng; sữa từ bò; xoài từ vườn.'));
  hud.openModal('🧋 Quầy nước', body);
}

// ---------- Tiệm tạp hoá ông Bảy ----------
export function openShop(hud, game, startTab = 'hang') {
  const body = h('div', 'shop');
  const tabs = h('div', 'tabs');
  const defs = [['hang', '🍃 Hàng hoá'], ['cay', '🌱 Cây giống'], ['vuon', '🪴 Trang trí vườn'], ['pet', '🐾 Thú cưng']];
  let tab = startTab;
  const btns = defs.map(([id, label]) => {
    const b = h('button', 'tab', label);
    b.onclick = () => ((tab = id), draw());
    tabs.append(b);
    return [id, b];
  });
  const list = h('div', 'shoplist');
  body.append(tabs, list);
  const after = (res, okMsg) => {
    hud.toast(res.ok ? okMsg : res.reason);
    draw();
  };
  const draw = () => {
    const s = game.state;
    btns.forEach(([id, b]) => b.classList.toggle('active', id === tab));
    list.innerHTML = '';
    if (tab === 'hang') {
      Object.entries(ITEMS).filter(([, it]) => it.shop === 'taphoa').forEach(([id, it]) => {
        list.append(rowItem(it.icon, it.name, `Đang có ${s.items[id] || 0} · nguyên liệu pha nước`, actBtn(`Mua <span>${money(it.buyPrice)}</span>`, 'btn-pink', s.money < it.buyPrice, () => after(game.buyItem(id, 1), `Đã mua ${it.name}.`))));
      });
    } else if (tab === 'cay') {
      Object.entries(TREES).forEach(([id, t]) => {
        list.append(rowItem(t.icon, t.name, `Đang có ${s.saplings[id] || 0} cây giống · lớn sau ${t.growDays} ngày · mỗi sáng ra ${t.amount} trái`, actBtn(`Mua <span>${money(t.saplingPrice)}</span>`, 'btn-pink', s.money < t.saplingPrice, () => after(game.buySapling(id), `Đã mua cây giống. Ra 🌳 vườn cây sau nhà để trồng!`))));
      });
    } else if (tab === 'vuon') {
      GARDEN_DECOR.forEach((d) => {
        const own = s.custom.garden.owned[d.id] || 0;
        list.append(rowItem(d.icon, d.name, `Có ${own} (còn ${gardenFree(s, d.id)} chưa đặt) · +1% hài lòng`, actBtn(`Mua <span>${money(d.price)}</span>`, 'btn-pink', s.money < d.price, () => after(game.buyGarden(d.id), `Đã mua ${d.name}. Bấm 🪴 để đặt ngoài vườn!`))));
      });
      list.append(h('p', 'hint', 'Đặt đồ trang trí ở bất kỳ đâu trên đảo bằng nút 🪴 Trang trí (góc phải). Tối đa +10% hài lòng.'));
    } else {
      Object.entries(PETS).forEach(([id, p]) => {
        const owned = s.custom.pets.owned.includes(id);
        list.append(rowItem(p.icon, p.name, owned ? (s.custom.pets.active === id ? 'Đang theo bạn' : 'Đã nuôi') : 'Đi theo bạn khắp nông trại', actBtn(owned ? 'Dắt theo' : `Nuôi <span>${money(p.price)}</span>`, owned ? 'btn-soft' : 'btn-pink', !owned && s.money < p.price, () => after(owned ? game.setActivePet(id) : game.buyPet(id), `${p.icon} ${p.name} sẽ theo bạn!`))));
      });
    }
  };
  draw();
  hud.openModal('🏪 Tạp hoá ông Bảy', body, { wide: true });
}

// ---------- Chuồng heo / bò ----------
export function openPen(hud, game, kind, { onFeed, onPet, onCollect }) {
  const s = game.state;
  const def = ANIMALS[kind];
  const a = s.animals[kind];
  const body = h('div', 'pen');
  const food = def.food.map((f) => `${ITEMS[f].icon}${s.items[f] || 0}`).join(' ');
  body.innerHTML = `<div class="stats stats-3">
    <div><span>${a.fed ? '😋' : '🍽️'}</span><b>${a.fed ? 'No' : 'Đói'}</b><small>thức ăn: ${food}</small></div>
    <div><span>💕</span><b>${a.love}/${PET_LOVE_BONUS}</b><small>tình cảm (đủ thì thêm sản lượng)</small></div>
    <div><span>${ITEMS[def.product].icon}</span><b>${a.ready}</b><small>${ITEMS[def.product].name} chờ thu</small></div>
  </div>`;
  const row = h('div', 'btn-row wrap');
  row.append(
    actBtn('🍽️ Cho ăn', 'btn-pink', a.fed, () => (hud.closeModal(), onFeed())),
    actBtn('🤚 Vuốt ve', 'btn-soft', a.petted, () => (hud.closeModal(), onPet())),
    actBtn(`🧺 Thu ${ITEMS[def.product].icon}`, 'btn-pink', a.ready <= 0, () => (hud.closeModal(), onCollect()))
  );
  body.append(h('p', 'hint', `Cho ${def.name.toLowerCase()} ăn mỗi ngày, sáng hôm sau có ${ITEMS[def.product].name.toLowerCase()}.`), row);
  hud.openModal(`${def.icon} ${def.name}`, body);
}

// ---------- Ô vườn cây ----------
export function openTree(hud, game, slot, { onPlant, onHarvest }) {
  const s = game.state;
  const o = s.orchard[slot];
  const body = h('div', 'tree');
  if (!o.tree) {
    const list = h('div', 'shoplist');
    Object.entries(TREES).forEach(([id, t]) => {
      const n = s.saplings[id] || 0;
      list.append(rowItem(t.icon, t.name, `Có ${n} cây giống`, actBtn('Trồng', 'btn-pink', n <= 0, () => (hud.closeModal(), onPlant(id)))));
    });
    body.append(h('p', 'hint', 'Ô vườn trống. Cây giống mua ở 🏪 tạp hoá ông Bảy (làng phía đông).'), list);
  } else {
    const t = TREES[o.tree];
    const grown = isGrown(o);
    body.append(h('p', '', grown ? `${t.icon} ${t.name} đã lớn. Đang có <b>${o.fruit}</b> trái. Mỗi sáng ra thêm ${t.amount} trái.` : `${t.icon} ${t.name} đang lớn: còn ${t.growDays - o.age} ngày nữa ra trái.`));
    if (grown) body.append(actBtn(`🧺 Hái ${o.fruit} trái`, 'btn-pink btn-big', o.fruit <= 0, () => (hud.closeModal(), onHarvest())));
  }
  hud.openModal('🌳 Vườn cây', body);
}

// ---------- Trò chuyện dân làng ----------
export function openTalk(hud, villager, line, { onShop } = {}) {
  const body = h('div', 'story');
  body.innerHTML = `<div class="story-head"><span class="story-ava" style="background:${hex(villager.color)}">🙂</span><div><b>${villager.name}</b><small>${villager.role}</small></div></div><p class="story-line">“${line}”</p>`;
  const row = h('div', 'btn-row');
  if (villager.shop && onShop) row.append(actBtn('🏪 Xem tiệm', 'btn-pink', false, () => (hud.closeModal(), onShop())));
  row.append(actBtn('Chào nhé 👋', 'btn-soft', false, () => hud.closeModal()));
  body.append(row);
  hud.openModal('💬 Trò chuyện', body);
}

// ---------- Sổ nhiệm vụ ----------
export function openQuests(hud, game, startTab = 'story') {
  const body = h('div', 'quests');
  const tabs = h('div', 'tabs');
  const defs = [['story', '📖 Chuyện'], ['daily', '✅ Hôm nay'], ['orders', '📜 Đơn đặt'], ['regulars', '💕 Khách quen']];
  let tab = startTab;
  const btns = defs.map(([id, label]) => {
    const b = h('button', 'tab', label);
    b.onclick = () => ((tab = id), draw());
    tabs.append(b);
    return [id, b];
  });
  const list = h('div', 'shoplist');
  body.append(tabs, list);
  const draw = () => {
    const s = game.state;
    btns.forEach(([id, b]) => b.classList.toggle('active', id === tab));
    list.innerHTML = '';
    if (tab === 'story') {
      const ch = currentChapter(s);
      if (!ch) {
        list.append(h('p', '', '🎉 Bạn đã đi hết chương đầu "Quán của bà Út". Chương mới sẽ có trong bản cập nhật sau!'));
      } else {
        const v = storyValue(s);
        const idx = STORY.indexOf(ch) + 1;
        list.append(h('div', 'chapter', `<small>Chương ${idx}/${STORY.length}</small><b>${ch.title}</b><p>${ch.text}</p>`));
        const prog = h('div', 'quest-prog', `<span>🎯 ${ch.goal.label}</span><i><b style="width:${Math.round((v.cur / v.n) * 100)}%"></b></i><small>${v.cur}/${v.n}</small>`);
        list.append(prog);
        list.append(actBtn(v.done ? `🎁 Nhận thưởng ${rewardText(ch.reward)}` : `Thưởng: ${rewardText(ch.reward)}`, v.done ? 'btn-pink btn-big' : 'btn-soft btn-big', !v.done, () => {
          const r = game.claimChapter();
          hud.toast(r.ok ? `📖 Xong chương "${r.chapter.title}"!` : r.reason);
          draw();
        }));
      }
    } else if (tab === 'daily') {
      s.daily.tasks.forEach((t, i) => {
        const btn = actBtn(t.claimed ? '✓ Đã nhận' : `Nhận ${money(t.reward)}`, t.done && !t.claimed ? 'btn-pink' : 'btn-soft', !t.done || t.claimed, () => {
          const r = game.claimDaily(i);
          hud.toast(r.ok ? `✅ +${r.reward} xu, +3 danh tiếng` : r.reason);
          draw();
        });
        list.append(rowItem(t.done ? '✅' : '⬜', t.label, `${t.progress}/${t.n}`, btn));
      });
      list.append(h('p', 'hint', 'Mỗi sáng có 3 nhiệm vụ mới.'));
    } else if (tab === 'orders') {
      if (!s.orders.length) list.append(h('p', 'hint', 'Chưa có đơn đặt trước. Sáng nào cũng có thể có đơn mới từ người làng.'));
      s.orders.forEach((o) => {
        const have = s.restaurant.counter.filter((d) => d === o.dish).length;
        const left = o.dueDay - s.day;
        const btn = actBtn(`Giao ${money(o.reward)}`, 'btn-pink', have < o.qty, () => {
          const r = game.fulfillOrder(o.id);
          hud.toast(r.ok ? `📜 Đã giao đơn cho ${o.who}! +${o.reward} xu` : r.reason);
          draw();
        });
        list.append(rowItem(RECIPES[o.dish].icon, `${o.who}: ${o.qty} phần ${RECIPES[o.dish].name}`, `Trên quầy: ${have}/${o.qty} · ${left <= 0 ? '⚠️ hạn hôm nay' : `còn ${left} ngày`} · nấu ở 🔥 bếp (món lên quầy)`, btn));
      });
      list.append(h('p', 'hint', 'Món cho đơn đặt nấu như bình thường (cần có trong thực đơn hôm nay). Quá hạn sẽ mất danh tiếng.'));
    } else {
      REGULARS.forEach((g) => {
        const hearts = s.regulars[g.id]?.hearts || 0;
        const max = g.story.length * 2;
        list.append(rowItem(`<span class="mini-ava" style="background:${hex(g.color)}">🙂</span>`, g.name, `Thích ${RECIPES[g.favorite].icon} ${RECIPES[g.favorite].name} · ${'❤️'.repeat(Math.min(hearts, max))}${'🤍'.repeat(Math.max(0, max - hearts))}`));
      });
    }
  };
  draw();
  hud.openModal('📜 Sổ nhiệm vụ', body, { wide: true });
}

function rewardText(r) {
  const parts = [];
  if (r.money) parts.push(`💰${r.money}`);
  Object.entries(r.items || {}).forEach(([id, n]) => parts.push(`${ITEMS[id].icon}×${n}`));
  Object.entries(r.seeds || {}).forEach(([id, n]) => parts.push(`hạt ${ITEMS[id]?.icon || id}×${n}`));
  return parts.join(' ');
}

// Chương truyện xong: mở thông báo
export function openChapterReady(hud, game, ch, onOpen) {
  const body = h('div', 'story');
  body.innerHTML = `<p class="story-line">🎯 Bạn đã hoàn thành mục tiêu chương <b>${ch.title}</b>!</p>`;
  body.append(actBtn('📖 Nhận thưởng & đọc tiếp', 'btn-pink btn-big', false, () => (hud.closeModal(), onOpen())));
  hud.openModal('✨ Chương truyện', body);
}

// ---------- Tuỳ biến nhân vật ----------
export function openCustomize(hud, game, { onChange }) {
  const body = h('div', 'custom');
  const draw = () => {
    const s = game.state;
    const c = s.custom;
    body.innerHTML = '';
    const names = h('div', 'name-row');
    names.innerHTML = `<label>Tên bạn<input id="cus-name" maxlength="18" value="${c.profile.name}"></label><label>Tên quán<input id="cus-shop" maxlength="22" value="${c.profile.shop}"></label>`;
    const save = actBtn('Lưu tên', 'btn-pink', false, () => {
      const r = game.setNames(names.querySelector('#cus-name').value, names.querySelector('#cus-shop').value);
      hud.toast(r.ok ? '✍️ Đã đổi tên!' : r.reason);
      onChange();
    });
    names.append(save);
    body.append(names);
    const section = (title, kind, list, current, isColor) => {
      body.append(h('h3', '', title));
      const grid = h('div', 'swatches');
      list.forEach((it, i) => {
        const id = isColor ? i : it.id;
        const owned = isColor || c.owned[kind].includes(id);
        const b = h('button', 'swatch' + (current === id ? ' on' : ''), isColor ? '' : `<small>${it.name}</small>${owned ? '' : `<b>💰${it.price}</b>`}`);
        if (isColor || it.color) b.style.setProperty('--sw', hex(isColor ? it : it.color));
        b.onclick = () => {
          let r = { ok: true };
          if (!owned) r = game.buyOutfit(kind, id);
          if (r.ok) r = game.wearOutfit(kind, id);
          if (!r.ok) hud.toast(r.reason);
          onChange();
          draw();
        };
        grid.append(b);
      });
      body.append(grid);
    };
    section('👕 Áo', 'shirts', OUTFITS.shirts, c.outfit.shirt);
    section('👒 Mũ nón', 'hats', OUTFITS.hats, c.outfit.hat);
    section('💇 Màu tóc', 'hair', OUTFITS.hair, c.outfit.hair, true);
  };
  draw();
  hud.openModal('👕 Tuỳ biến nhân vật', body, { wide: true });
}
