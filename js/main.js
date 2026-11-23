// Điểm khởi động: nối logic (core) + hiển thị 3D (render) + giao diện (ui) + lưu (save).
import * as THREE from '../vendor/three.module.min.js';
import { PALETTES, ACTIVE_PALETTE } from './config/palettes.js';
import { CROPS, CROP_ORDER, ITEMS, TIME, FARM } from './config/gameData.js';
import { Game } from './core/game.js';
import { migrateState, createNewState } from './core/state.js';
import { isRipe, nextUnlockPrice } from './core/farm.js';
import { LocalStorageAdapter } from './save/storage.js';
import { Models } from './render/models.js';
import { World, SPOTS, LOT } from './render/world.js';
import { CameraRig } from './render/camera.js';
import { Player } from './render/player.js';
import { PointerInput } from './render/input.js';
import { NavGrid } from './render/pathfinding.js';
import { Hud } from './ui/hud.js';
import { sound } from './audio/sound.js';

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

  const farmerMesh = models.farmer();
  farmerMesh.position.copy(SPOTS.playerStart);
  farmerMesh.rotation.y = Math.PI;
  world.scene.add(farmerMesh);
  const player = new Player(farmerMesh, world.obstacles, new NavGrid(world.obstacles));

  const rig = new CameraRig();
  // Camera bám theo điểm này: giữa lô ruộng khi nông dân đang ở ruộng, còn lại thì theo nông dân
  const camTarget = new THREE.Vector3();
  const updateCamTarget = () => {
    const p = player.pos;
    const atFarm = Math.abs(p.x - LOT.x) < 5.5 && Math.abs(p.z - LOT.z) < 5.5;
    if (atFarm || jobs.length || current) camTarget.set(LOT.x + 0.6, 0, LOT.z + 0.6);
    else camTarget.copy(p);
  };
  rig.setZoom(1.05);
  rig.focus(SPOTS.farm.x, SPOTS.farm.z, true);
  rig.update(0);

  const marker = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.08;
  world.scene.add(marker);

  // ---- Giao diện ----
  let paused = false;
  const hud = new Hud(document.getElementById('ui'), {
    goto: (where) => {
      rig.follow = null;
      if (where === 'market') {
        const def = world.interactables.find((d) => d.type === 'market');
        rig.focus(def.stand.x + 2, def.stand.z - 2);
        return;
      }
      const p = where === 'farm' ? SPOTS.farm : SPOTS.restaurant;
      rig.focus(p.x, p.z);
    },
    pause: (v) => {
      paused = v;
    },
    reset: async () => {
      await storage.clear();
      location.reload();
    },
  });
  hud.render(S());

  // ---- Nhãn trên vật thể ----
  const labelFor = new Map();
  world.interactables.forEach((def) => {
    const el = hud.addLabel('wl-' + def.type);
    labelFor.set(def, el);
    if (def.type === 'market') el.innerHTML = '🛒 Chợ quê<small>Mua hạt · bán nông sản</small>';
    if (def.type === 'restaurant') el.innerHTML = '🍜 Quán Nhỏ<small>Sắp mở cửa</small>';
    if (def.type === 'house') el.classList.add('none');
  });
  const plates = world.nameplates.map((n) => {
    const el = hud.addLabel('wl-sign');
    el.innerHTML = n.text;
    return { el, anchor: n.anchor };
  });

  const refreshLabels = () => {
    const s = S();
    world.interactables.forEach((def) => {
      const el = labelFor.get(def);
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
          el.innerHTML = `<i style="width:${Math.round(plot.growth * 100)}%"></i>`;
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
      }
    });
  };
  refreshLabels();

  const v3 = new THREE.Vector3();
  const toScreen = (pos) => {
    v3.copy(pos).project(rig.cam);
    if (v3.z > 1) return null;
    return { x: ((v3.x + 1) / 2) * innerWidth, y: ((1 - v3.y) / 2) * innerHeight };
  };

  // ---- Hàng đợi việc trên ô đất ----
  // Chạm/vuốt chỉ xếp việc vào hàng; nông dân lần lượt đi tới từng ô và làm.
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
      hud.render(s);
      if (!silent) hud.toast(`Đã đổi sang hạt ${CROPS[other].name}.`);
      return other;
    }
    return hud.selectedSeed;
  };

  const enqueue = (index, silent) => {
    if (queued(index)) return;
    const tool = hud.tool;
    const seed = tool === 'plant' ? pickSeed(silent) : null;
    // Gieo nhiều ô: trừ trước số hạt đã dành cho các ô đang xếp hàng
    if (tool === 'plant') {
      const promised = jobs.filter((j) => j.tool === 'plant' && j.seed === seed).length + (current?.tool === 'plant' && current.seed === seed ? 1 : 0);
      if ((S().seeds[seed] || 0) - promised <= 0) {
        if (!silent) hud.toast(`Hết hạt ${CROPS[seed].name}. Ra chợ mua thêm nhé!`);
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
      sound('water');
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
    return `${c.icon} ${c.name} · ${Math.round(p.growth * 100)}% · ${p.watered ? 'đất ẩm 💧' : 'đất khô, cần tưới'}`;
  };

  const askUnlock = (index) => {
    const s = S();
    if (index !== s.plots.length) return hud.toast('Mở ô phía trước trước nhé.');
    const price = nextUnlockPrice(s);
    hud.openConfirm('🔓 Mở thêm ô đất', `Mở ô đất này với giá ${price} xu? (đang có ${s.money} xu)`, `Mở · 💰${price}`, () => {
      const r = game.unlockPlot();
      if (!r.ok) return hud.toast(r.reason);
      sound('harvest');
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
      hud.openMarket(game);
    } else if (def.type === 'house') {
      hud.toast('Nhà của bạn. Về sau có thể nghỉ ngơi và trang trí ở đây.');
    } else if (def.type === 'restaurant') {
      hud.toast('Quán sẽ mở cửa ở bản tiếp theo 🍜');
    }
  };

  const showMarker = (p) => {
    marker.position.x = p.x;
    marker.position.z = p.z;
    marker.material.opacity = 0.9;
    marker.scale.setScalar(1);
  };

  // ---- Chạm & vuốt ----
  const hitboxes = world.interactables.map((d) => d.hitbox);
  const pickAt = (x, y) => input.setRay(x, y).intersectObjects(hitboxes, false)[0]?.object.userData.interactable;
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
    hud.render(S());
    refreshLabels();
    dirty = true;
  });
  const showEvening = () => {
    clearJobs();
    sound('evening');
    hud.openEvening(S(), S().stats.harvested - harvestAtDayStart, () => game.newDay());
  };
  game.on('evening', showEvening);
  game.on('newday', () => {
    harvestAtDayStart = S().stats.harvested;
    hud.toast(`☀️ Ngày ${S().day} bắt đầu. Đất khô rồi, nhớ tưới nhé!`);
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

  if (game.isEvening) showEvening();

  // ---- Vòng lặp ----
  const clock = new THREE.Clock();
  let lastMinute = -1;
  let time = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    time += dt;
    if (!paused) {
      game.tick(dt);
      const minute = Math.floor(S().minutes);
      if (minute !== lastMinute) {
        lastMinute = minute;
        hud.render(S());
        refreshLabels();
        dirty = true;
      }
      pump();
    }
    world.setDaylight((S().minutes - TIME.dayStart) / (TIME.evening - TIME.dayStart));
    world.update(dt, time);
    player.update(dt);
    updateCamTarget();
    rig.update(dt);

    if (marker.material.opacity > 0) {
      marker.material.opacity = Math.max(0, marker.material.opacity - dt * 1.2);
      marker.scale.setScalar(1 + (0.9 - marker.material.opacity) * 0.6);
    }
    world.interactables.forEach((def) => hud.placeLabel(labelFor.get(def), toScreen(def.anchor)));
    plates.forEach((p) => hud.placeLabel(p.el, toScreen(p.anchor)));
    renderer.render(world.scene, rig.cam);
  });
  window.__game = game; // tiện kiểm thử
  window.__debug = { world, rig, player, toScreen, hud, FARM };
}

start();
