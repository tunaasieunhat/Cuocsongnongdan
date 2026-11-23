// Điểm khởi động: nối logic (core) + hiển thị 3D (render) + giao diện (ui) + âm thanh + lưu (save).
import * as THREE from '../vendor/three.module.min.js';
import { PALETTES, ACTIVE_PALETTE } from './config/palettes.js';
import { CROPS, CROP_ORDER, ITEMS, RECIPES, TIME, FARM } from './config/gameData.js';
import { TUTORIAL_QUAN_STEPS, TUTORIAL_QUAN_REWARD } from './config/tutorial.js';
import { Game } from './core/game.js';
import { migrateState, createNewState } from './core/state.js';
import { isRipe, nextUnlockPrice } from './core/farm.js';
import { fishLeft, seasonIndex } from './core/progress.js';
import { LocalStorageAdapter } from './save/storage.js';
import { Models } from './render/models.js';
import { World, SPOTS, LOT } from './render/world.js';
import { RestaurantView, REST_ORIGIN } from './render/restaurantView.js';
import { CameraRig } from './render/camera.js';
import { Player } from './render/player.js';
import { PointerInput } from './render/input.js';
import { NavGrid } from './render/pathfinding.js';
import { Hud } from './ui/hud.js';
import * as dialogs from './ui/dialogs.js';
import { Tutorial } from './ui/tutorial.js';
import { RestaurantController } from './controllers/restaurantController.js';
import { sound, unlockAudio, setAudioSettings, setMood } from './audio/sound.js';

const palette = PALETTES[ACTIVE_PALETTE];
const storage = new LocalStorageAdapter();

async function start() {
  const saved = await storage.load();
  const game = new Game(saved ? migrateState(saved) : createNewState());
  const S = () => game.state;

  // ---- Renderer ----
  const app = document.getElementById('app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'scene';
  app.append(renderer.domElement);

  // ---- Thế giới ----
  const models = new Models(palette);
  const world = new World(models, palette);
  world.syncCells(S().plots);
  world.updateEggs(S().coop.eggs);
  world.syncChickens(S().coop.timers.length);
  world.setSeason(seasonIndex(S().day));
  world.setRain(!!S().weather?.rain);
  const restView = new RestaurantView(world, models);
  restView.syncTables(S());
  restView.syncDecor(S());

  const makeNav = () => new NavGrid(world.obstacles);
  const farmerMesh = models.farmer();
  farmerMesh.position.copy(SPOTS.playerStart);
  farmerMesh.rotation.y = Math.PI;
  world.scene.add(farmerMesh);
  const player = new Player(farmerMesh, world.obstacles, makeNav());
  restView.navDirty = false;

  // ---- Camera ----
  const rig = new CameraRig();
  const camTarget = new THREE.Vector3();
  // Điểm nhìn khi ở ruộng / quán: lệch để công trình nằm hơi trái-dưới, chừa chỗ cho thẻ bên phải
  const FARM_VIEW = { x: LOT.x + 0.6, z: LOT.z - 1.2 };
  const REST_VIEW = { x: REST_ORIGIN.x + 0.8, z: REST_ORIGIN.z - 0.6 };
  const updateCamTarget = () => {
    const p = player.pos;
    const atFarm = Math.abs(p.x - LOT.x) < 5.5 && Math.abs(p.z - LOT.z) < 5.5;
    const atRest = Math.abs(p.x - REST_ORIGIN.x) < 4.8 && p.z > REST_ORIGIN.z - 4 && p.z < REST_ORIGIN.z + 5;
    if (atFarm || jobs.length || current) camTarget.set(FARM_VIEW.x, 0, FARM_VIEW.z);
    else if (atRest) camTarget.set(REST_VIEW.x, 0, REST_VIEW.z);
    else camTarget.copy(p);
  };
  rig.setZoom(1.05);
  rig.focus(FARM_VIEW.x, FARM_VIEW.z, true);
  rig.update(0);

  const marker = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.08;
  world.scene.add(marker);

  const v3 = new THREE.Vector3();
  const toScreen = (pos) => {
    v3.copy(pos).project(rig.cam);
    if (v3.z > 1) return null;
    return { x: ((v3.x + 1) / 2) * innerWidth, y: ((1 - v3.y) / 2) * innerHeight };
  };

  // ---- Giao diện ----
  let paused = false;
  const applyAudio = () => setAudioSettings(S().settings);
  applyAudio();
  const hud = new Hud(document.getElementById('ui'), {
    goto: (where) => {
      rig.follow = null;
      if (where === 'market') {
        const def = world.interactables.find((d) => d.type === 'market');
        return rig.focus(def.stand.x + 2, def.stand.z - 2);
      }
      const p = where === 'farm' ? FARM_VIEW : REST_VIEW;
      rig.focus(p.x, p.z);
    },
    pause: (v) => (paused = v),
    open: (id) => {
      if (id === 'bag') dialogs.openBag(hud, game);
      if (id === 'recipes') dialogs.openRecipes(hud, game);
      if (id === 'upgrades') dialogs.openUpgrades(hud, game);
      if (id === 'settings')
        dialogs.openSettings(hud, game, {
          onAudio: () => (applyAudio(), (dirty = true)),
          onReplay: () => (clearJobs(), tutorial.start(true)),
          onReplayQuan: () => tutorialQuan.start(true),
          onReset: async () => {
            await storage.clear();
            location.reload();
          },
        });
    },
    prepAction: () => {
      const ph = game.phase;
      const r = S().restaurant;
      if (ph === 'closed') return showSummary();
      if (!r.menuSet) return restCtl.openPlanner();
      game.openRestaurant();
    },
    dropCarry: () => restCtl.dropCarry(),
    dishName: (d) => `${RECIPES[d].icon} ${RECIPES[d].name}`,
  });
  hud.render(S(), game);

  const restCtl = new RestaurantController({
    game, hud, world, view: restView, player, models, toScreen, sound, makeNav,
    notify: (flag) => tutorialQuan?.notify(flag),
  });

  // ---- Nhãn trên vật thể ----
  const LABELED = new Set(['plot', 'coop', 'market', 'restaurant', 'pond']);
  const labelFor = new Map();
  const labelOf = (def) => {
    if (!LABELED.has(def.type)) return null;
    let el = labelFor.get(def);
    if (!el) {
      el = hud.addLabel('wl-' + def.type);
      labelFor.set(def, el);
      if (def.type === 'market') el.innerHTML = '🛒 Chợ quê<small>Mua hạt · bán nông sản</small>';
    }
    return el;
  };
  const plates = world.nameplates.map((n) => {
    const el = hud.addLabel('wl-sign');
    el.innerHTML = n.text;
    return { el, anchor: n.anchor };
  });

  const refreshLabels = () => {
    const s = S();
    world.interactables.forEach((def) => {
      const el = labelOf(def);
      if (!el) return;
      if (def.type === 'plot') {
        const plot = s.plots[def.index];
        el.className = 'wlabel wl-plot';
        if (!plot) {
          const next = def.index === s.plots.length;
          el.innerHTML = next ? `🔒 ${nextUnlockPrice(s)} xu` : '🔒';
          el.classList.add('lock');
          el.classList.toggle('next', next);
        } else if (isRipe(plot)) {
          el.innerHTML = CROPS[plot.crop].icon;
          el.classList.add('ripe');
        } else if (plot.crop && !plot.watered) {
          el.innerHTML = '💧';
          el.classList.add('dry');
        } else if (plot.crop) {
          el.innerHTML = `<i style="width:${Math.round(plot.growth * 100)}%"></i>${plot.fert ? '<u>🧪</u>' : ''}`;
          el.classList.add('grow');
        } else {
          el.innerHTML = '';
          el.classList.add('none');
        }
      } else if (def.type === 'coop') {
        const n = s.coop.eggs;
        el.innerHTML = n ? `🥚 ×${n}` : '';
        el.classList.toggle('none', !n);
        el.classList.toggle('ripe', n > 0);
      } else if (def.type === 'pond') {
        const n = fishLeft(s);
        el.innerHTML = n ? `🎣 Ao cá<small>còn ${n} lượt câu</small>` : '🎣 Ao cá<small>hết cá hôm nay</small>';
      } else if (def.type === 'restaurant') {
        const ph = game.phase;
        const sub = ph === 'service' ? 'Đang mở cửa' : ph === 'closed' ? 'Đã đóng cửa' : s.restaurant.menuSet ? 'Mở lúc 17:00' : 'Chưa có thực đơn';
        el.innerHTML = `🍜 Quán Nhỏ<small>${sub}</small>`;
      }
    });
  };
  refreshLabels();

  // ---- Hàng đợi việc trên ô đất ----
  let jobs = [];
  let current = null;
  const plotDef = (i) => world.cellViews[i].interact;
  const queued = (i) => current?.index === i || jobs.some((j) => j.index === i);
  const refreshHighlight = () => world.highlightCells([...(current ? [current.index] : []), ...jobs.map((j) => j.index)]);

  const pickSeed = (silent) => {
    const s = S();
    if (s.seeds[hud.selectedSeed] > 0) return hud.selectedSeed;
    const other = CROP_ORDER.find((id) => s.seeds[id] > 0);
    if (other) {
      hud.selectedSeed = other;
      hud.render(s, game);
      if (!silent) hud.toast(`Đã đổi sang hạt ${CROPS[other].name}.`);
      return other;
    }
    return hud.selectedSeed;
  };

  const enqueue = (index, silent) => {
    if (queued(index)) return;
    const tool = hud.tool;
    const seed = tool === 'plant' ? pickSeed(silent) : null;
    // Gieo/bón nhiều ô: trừ trước số hạt/phân đã dành cho các ô đang xếp hàng
    if (tool === 'plant' || tool === 'fert') {
      const same = (j) => j && j.tool === tool && j.seed === seed;
      const promised = jobs.filter(same).length + (same(current) ? 1 : 0);
      const have = tool === 'plant' ? S().seeds[seed] || 0 : S().items.phan || 0;
      if (have - promised <= 0) {
        if (!silent) hud.toast(tool === 'plant' ? `Hết hạt ${CROPS[seed].name}. Ra chợ mua thêm nhé!` : 'Hết phân bón. Ra chợ mua thêm nhé!');
        return;
      }
    }
    const check = game.canApply(index, tool, seed);
    if (!check.ok) {
      if (!silent) hud.toast(check.reason);
      return;
    }
    jobs.push({ index, tool, seed });
    rig.follow = camTarget;
    refreshHighlight();
  };

  const clearJobs = () => {
    jobs = [];
    refreshHighlight();
  };

  const runJob = (job) => {
    const def = plotDef(job.index);
    const center = def.anchor.clone().setY(0);
    player.faceTo(center);
    player.work();
    const r = game.applyTool(job.index, job.tool, job.seed);
    const at = toScreen(def.anchor);
    if (!r.ok) return;
    if (job.tool === 'till') {
      world.puff(center, palette.soilTilled || palette.soil);
      sound('till');
    } else if (job.tool === 'plant') {
      world.puff(center, palette.leaf);
      hud.floatText(at, `Gieo ${CROPS[job.seed].icon}`);
      sound('plant');
    } else if (job.tool === 'water') {
      world.splashWater(center);
      r.extra.forEach((i) => world.splashWater(plotDef(i).anchor.clone().setY(0)));
      sound('water');
    } else if (job.tool === 'fert') {
      world.puff(center, 0xc9a7f5);
      hud.floatText(at, '🧪 Lớn nhanh!');
      sound('plant');
    } else if (job.tool === 'harvest') {
      world.puff(center, palette.veg);
      hud.floatText(at, `+${r.amount} ${ITEMS[r.item].icon}`);
      sound('harvest');
    }
  };

  const pump = () => {
    if (current || !jobs.length || player.dest || player.workT > 0) return;
    current = jobs.shift();
    player.walkTo(plotDef(current.index).stand, () => {
      runJob(current);
      current = null;
      refreshHighlight();
    });
  };

  const describePlot = (i) => {
    const p = S().plots[i];
    if (!p.crop) return p.tilled ? '🟫 Đất đã xới, sẵn sàng gieo hạt.' : '🌿 Ô cỏ. Dùng 🪏 Xới để làm đất.';
    const c = CROPS[p.crop];
    if (isRipe(p)) return `${c.icon} ${c.name} đã chín! Dùng 🧺 Thu để thu hoạch.`;
    return `${c.icon} ${c.name} · ${Math.round(p.growth * 100)}% · ${p.watered ? 'đất ẩm 💧' : 'đất khô, cần tưới'}${p.fert ? ' · đã bón 🧪' : ''}`;
  };

  const askUnlock = (index) => {
    const s = S();
    if (index !== s.plots.length) return hud.toast('Mở ô phía trước trước nhé.');
    const price = nextUnlockPrice(s);
    hud.openConfirm('🔓 Mở thêm ô đất', `Mở ô đất này với giá ${price} xu? (đang có ${s.money} xu)`, `Mở · 💰${price}`, () => {
      const r = game.unlockPlot();
      if (!r.ok) return hud.toast(r.reason);
      sound('levelup');
      hud.floatText(toScreen(plotDef(r.index).anchor), '🎉 Ô đất mới!');
    });
  };

  // ---- Việc ở công trình khác ----
  const doAction = (def) => {
    if (def.type === 'coop') {
      player.faceTo(def.anchor);
      player.work();
      const r = game.collectEggs();
      if (!r.ok) return hud.toast(r.reason);
      hud.floatText(toScreen(def.anchor), `+${r.amount} 🥚`);
      sound('harvest');
    } else if (def.type === 'market') {
      dialogs.openMarket(hud, game);
      tutorial.notify('market');
    } else if (def.type === 'house') {
      hud.toast('🏠 Nhà của bạn. Chiều về mở quán, tối về nghỉ ngơi.');
    } else if (def.type === 'pond') {
      player.faceTo(def.anchor);
      dialogs.openFishing(hud, game, {
        onResult: (res) => {
          sound(res.ok ? 'splash' : 'wrong');
          if (res.ok) hud.floatText(toScreen(def.anchor), '+1 🐟');
        },
      });
    }
  };

  const showMarker = (p) => {
    marker.position.x = p.x;
    marker.position.z = p.z;
    marker.material.opacity = 0.9;
    marker.scale.setScalar(1);
  };

  // ---- Chạm & vuốt ----
  const pickAt = (x, y) => {
    const boxes = world.interactables.filter((d) => !d.hidden).map((d) => d.hitbox);
    return input.setRay(x, y).intersectObjects(boxes, false)[0]?.object.userData.interactable;
  };
  const input = new PointerInput(renderer.domElement, rig, {
    canPaint: (x, y) => {
      if (paused || hud.tool === 'hand') return false;
      const def = pickAt(x, y);
      return def?.type === 'plot' && !def.locked;
    },
    onPaint: (x, y) => {
      const def = pickAt(x, y);
      if (def?.type === 'plot' && !def.locked) enqueue(def.index, true);
    },
    onTap: (x, y) => {
      if (paused) return;
      const def = pickAt(x, y);
      if (def?.type === 'plot') {
        if (def.locked) return askUnlock(def.index);
        if (hud.tool === 'hand') return hud.toast(describePlot(def.index));
        return enqueue(def.index, false);
      }
      clearJobs();
      rig.follow = camTarget;
      if (def && restCtl.handleTap(def)) return;
      if (def) {
        showMarker(def.stand);
        player.walkTo(def.stand, () => doAction(def));
      } else {
        const g = input.groundPoint(x, y);
        if (g) {
          showMarker(g);
          player.walkTo(g);
        }
      }
    },
  });
  // Âm thanh chỉ bật được sau lần chạm đầu tiên
  addEventListener('pointerdown', unlockAudio, { capture: true });

  // ---- Sự kiện từ logic ----
  let dirty = false;
  let harvestAtDayStart = S().stats.harvested;
  game.on('plot', (i) => {
    world.updateCell(i, S().plots[i]);
    dirty = true;
  });
  game.on('plots', () => world.syncCells(S().plots));
  game.on('coop', () => {
    world.updateEggs(S().coop.eggs);
    dirty = true;
  });
  game.on('change', () => {
    hud.render(S(), game);
    refreshLabels();
    dirty = true;
  });
  game.on('rest', (e) => restCtl.onEvent(e));
  game.on('upgrade', () => {
    restView.syncTables(S());
    world.syncChickens(S().coop.timers.length);
    if (restView.navDirty) {
      restView.navDirty = false;
      player.nav = makeNav();
      restCtl.rebuildNav();
    }
    sound('levelup');
  });
  game.on('decor', () => (restView.syncDecor(S()), sound('levelup')));
  game.on('prep', () => {
    sound('ding');
    if (!tutorial.active && !S().tutorialQuan.done) tutorialQuan.start();
    else hud.toast('🌇 15:00 rồi! Bấm <b>📋 Lên thực đơn</b> để chuẩn bị mở quán.');
  });
  game.on('needMenu', () => {
    if (!hud.modal.hidden) return;
    hud.toast('🏮 17:00 rồi, khách đang chờ! Lên thực đơn để mở quán.');
    restCtl.openPlanner();
  });
  game.on('open', () => {
    sound('bell');
    setMood('night');
    hud.toast('🏮 Quán mở cửa! Chạm bàn khách để bưng món.');
  });
  game.on('levelUp', (lvl) => {
    sound('levelup');
    hud.toast(`⭐ Quán lên <b>cấp ${lvl}</b>! Có thêm khách, mở thêm món và nâng cấp mới.`);
  });

  const showSummary = () => {
    clearJobs();
    dialogs.openSummary(hud, game, {
      harvested: S().stats.harvested - harvestAtDayStart,
      onNewDay: () => game.newDay(),
    });
  };
  game.on('dayEnd', () => {
    sound('evening');
    storage.save(S());
    setTimeout(showSummary, 600);
  });
  game.on('newday', ({ weather, notes }) => {
    harvestAtDayStart = S().stats.harvested;
    setMood('day');
    world.setSeason(seasonIndex(S().day));
    world.setRain(weather.rain);
    sound(weather.rain ? 'rain' : 'rooster');
    hud.toast([`☀️ Ngày ${S().day} bắt đầu.`, ...notes].join(' ') || '');
    if (!weather.rain && !notes.length) setTimeout(() => hud.toast('Đất khô rồi, nhớ tưới nhé! 💧'), 2700);
    storage.save(S());
  });

  // Lưu tự động
  const save = () => {
    if (!dirty) return;
    dirty = false;
    storage.save(S());
  };
  setInterval(save, 4000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      dirty = true;
      save();
    }
  });

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    rig.resize(innerWidth, innerHeight);
  });

  // ---- Hướng dẫn chơi ----
  const focusArea = (where) => {
    rig.follow = null;
    if (where === 'farm') return rig.focus(FARM_VIEW.x, FARM_VIEW.z);
    if (where === 'restaurant') return rig.focus(REST_VIEW.x, REST_VIEW.z);
    const def = world.interactables.find((d) => d.type === where);
    if (def) rig.focus(def.stand.x + 0.9, def.stand.z - 2.2);
  };
  const anchors = (point) => {
    const r = S().restaurant;
    if (point === 'table:waiting') {
      const c = r.customers.find((x) => x.state === 'waiting');
      return c ? restView.tables[c.table]?.def.anchor : null;
    }
    if (point === 'table:dirty') {
      const i = r.dirty.findIndex((d, i) => d && i < restView.tables.length);
      return i >= 0 ? restView.tables[i].def.anchor : null;
    }
    return null;
  };
  const tutCtx = { game, hud, world, focus: focusArea, anchors, onFinish: () => ((dirty = true), storage.save(S())) };
  const tutorial = new Tutorial(tutCtx);
  const tutorialQuan = new Tutorial(tutCtx, { steps: TUTORIAL_QUAN_STEPS, key: 'tutorialQuan', reward: TUTORIAL_QUAN_REWARD, freezePatience: true });
  if (tutorial.active) tutorial.start();
  else if (tutorialQuan.active && S().minutes >= TIME.prep && !game.isEvening) tutorialQuan.start();

  if (game.phase === 'service') setMood('night');
  if (game.isEvening) showSummary();

  // ---- Vòng lặp ----
  const clock = new THREE.Clock();
  let lastMinute = -1;
  let lastHud = 0;
  let time = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    time += dt;
    if (!paused) {
      game.tick(dt);
      const minute = Math.floor(S().minutes);
      // Lúc mở quán cập nhật giao diện 4 lần/giây (đủ mượt, đỡ tốn pin)
      if (minute !== lastMinute || (game.phase === 'service' && time - lastHud > 0.25)) {
        lastMinute = minute;
        lastHud = time;
        hud.render(S(), game);
        refreshLabels();
        dirty = true;
      }
      pump();
    }
    world.setDaylight(S().minutes, !!S().weather?.rain);
    world.update(dt, time);
    restView.update(S(), dt, time);
    restView.syncCarry(S(), player.pos);
    player.update(dt);
    updateCamTarget();
    rig.update(dt);

    if (marker.material.opacity > 0) {
      marker.material.opacity = Math.max(0, marker.material.opacity - dt * 1.2);
      marker.scale.setScalar(1 + (0.9 - marker.material.opacity) * 0.6);
    }
    labelFor.forEach((el, def) => hud.placeLabel(el, toScreen(def.anchor)));
    plates.forEach((p) => hud.placeLabel(p.el, toScreen(p.anchor)));
    restCtl.update(dt);
    tutorial.update(toScreen);
    tutorialQuan.update(toScreen);
    renderer.render(world.scene, rig.cam);
  });
  window.__game = game; // tiện kiểm thử
  window.__debug = { world, rig, player, toScreen, hud, FARM, restView, restCtl, tutorialQuan };
}

start();
