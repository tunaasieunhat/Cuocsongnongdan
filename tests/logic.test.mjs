// Kiểm thử logic game (chạy bằng Node, không cần trình duyệt): node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/core/game.js';
import { createNewState, migrateState } from '../js/core/state.js';
import { TIME } from '../js/config/gameData.js';

const newGame = () => {
  const g = new Game(createNewState());
  g.ensureDaily();
  return g;
};

test('ruộng: xới -> gieo -> tưới -> lớn -> thu hoạch', () => {
  const g = newGame();
  assert.ok(g.applyTool(0, 'till').ok);
  assert.ok(g.applyTool(0, 'plant', 'rau').ok);
  assert.equal(g.applyTool(0, 'harvest').ok, false);
  assert.ok(g.applyTool(0, 'water').ok);
  for (let i = 0; i < 40; i++) g.tick(1);
  const r = g.applyTool(0, 'harvest');
  assert.ok(r.ok);
  assert.equal(g.state.items.rau, 2);
  assert.equal(g.state.plots[0].tilled, false);
});

test('nhịp ngày: tới 17:00 chờ thực đơn, mở quán, phục vụ, tổng kết', () => {
  const g = newGame();
  const s = g.state;
  const ev = [];
  ['prep', 'needMenu', 'open', 'dayEnd'].forEach((e) => g.on(e, () => ev.push(e)));
  s.minutes = TIME.prep - 1;
  for (let i = 0; i < 300; i++) g.tick(0.5);
  assert.deepEqual(ev, ['prep', 'needMenu']);
  s.items.rau = 20;
  assert.ok(g.setMenu(['rauxao'], true).ok);
  let served = 0;
  for (let i = 0; i < 1500 && !s.restaurant.closed; i++) {
    g.tick(0.25);
    const c = s.restaurant.customers.find((x) => x.state === 'waiting');
    if (c && s.restaurant.counter.includes(c.dish)) served += g.serve(c.id, c.dish, true).ok ? 1 : 0;
    if (!s.restaurant.stoves[0] && s.restaurant.counter.length < 2) g.cook('rauxao');
    s.restaurant.dirty.fill(false);
  }
  assert.ok(ev.includes('open') && ev.includes('dayEnd'));
  assert.ok(served > 0 && s.restaurant.today.revenue > 0);
  g.newDay();
  assert.equal(s.day, 2);
  assert.equal(s.minutes, TIME.dayStart);
});

test('đồ uống: khách gọi nước được tip thêm', () => {
  const g = newGame();
  const s = g.state;
  s.items.rau = 10;
  g.setMenu(['rauxao'], true);
  s.restaurant.counter.push('rauxao');
  assert.ok(g.makeDrink('trada').ok);
  for (let i = 0; i < 10; i++) g.tick(0.25);
  assert.deepEqual(s.restaurant.drinkCounter, ['trada']);
  s.restaurant.customers.push({ id: 900, table: 0, dish: 'rauxao', state: 'waiting', t: 0, patience: 50, maxPatience: 50, vip: false, regular: null, drink: 'trada', drinkServed: false });
  assert.equal(g.serve(900, 'canhchua', true).ok, false);
  assert.ok(g.serve(900, 'trada', true).ok);
  assert.ok(g.serve(900, 'rauxao', true).ok);
  s.restaurant.spawnT = 999;
  const before = s.money;
  for (let i = 0; i < 30; i++) g.tick(0.25);
  assert.equal(s.restaurant.today.drinks, 1);
  assert.ok(s.money - before > 28 + 8);
});

test('nâng cấp: lô 2 cần mở hết lô 1; heo cho ăn hôm nay mai có thịt', () => {
  const g = newGame();
  const s = g.state;
  s.money = 5000;
  s.reputation.points = 400;
  assert.equal(g.buyUpgrade('lot2').ok, false);
  for (let i = 0; i < 3; i++) assert.ok(g.unlockPlot().ok);
  assert.ok(g.buyUpgrade('lot2').ok);
  assert.equal(s.plots.length, 18);
  assert.ok(g.buyUpgrade('pigpen').ok);
  s.items.rau = 1;
  assert.ok(g.feedAnimal('pig').ok);
  assert.equal(g.feedAnimal('pig').ok, false);
  g.endDay();
  g.newDay();
  assert.ok(g.collectAnimal('pig').ok);
  assert.equal(s.items.thit, 1);
});

test('vườn cây: chuối trồng hôm nay, mai ra trái', () => {
  const g = newGame();
  g.state.money = 100;
  assert.ok(g.buySapling('chuoi').ok);
  assert.ok(g.plantTree(0, 'chuoi').ok);
  assert.equal(g.harvestTree(0).ok, false);
  g.endDay();
  g.newDay();
  const r = g.harvestTree(0);
  assert.ok(r.ok);
  assert.equal(r.amount, 3);
});

test('cốt truyện + nhiệm vụ ngày', () => {
  const g = newGame();
  const s = g.state;
  assert.equal(s.daily.tasks.length, 3);
  assert.equal(g.claimChapter().ok, false);
  g.track('harvest', 10);
  const m = s.money;
  assert.ok(g.claimChapter().ok);
  assert.equal(s.money, m + 50);
  assert.equal(s.story.chapter, 1);
});

test('tuỳ biến: tên được làm sạch, đồ trang trí vườn đặt/cất', () => {
  const g = newGame();
  assert.ok(g.setNames('<b>Tí"</b>', 'Quán "Vui"').ok);
  assert.equal(g.state.custom.profile.name, 'bTí/b');
  g.state.money = 100;
  assert.ok(g.buyGarden('ghenda').ok);
  assert.ok(g.placeGarden('ghenda', 1.2, 3.3).ok);
  assert.equal(g.placeGarden('ghenda', 2, 2).ok, false);
  assert.ok(g.storeGarden(0).ok);
  assert.ok(g.placeGarden('ghenda', 2, 2).ok);
});

test('bản lưu cũ (v2) chuyển sang bản mới không lỗi', () => {
  const s = migrateState({ version: 2, day: 4, minutes: 1100, plots: [{ crop: 'rau', growth: 0.4 }], restaurant: { carry: 'trada', counter: [] } });
  assert.equal(s.version, 4);
  assert.equal(s.minutes, TIME.prep);
  assert.equal(s.plots[0].tilled, true);
  assert.deepEqual(s.restaurant.drinkCounter, ['trada']);
  assert.ok(s.custom.profile.name);
  const g = new Game(s);
  g.ensureDaily();
  for (let i = 0; i < 50; i++) g.tick(0.5);
});
