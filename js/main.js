// Điểm khởi động: nối logic (core) + hiển thị 3D (render) + giao diện (ui) + lưu (save).
import * as THREE from '../vendor/three.module.min.js';
import { PALETTES, ACTIVE_PALETTE } from './config/palettes.js';
import { CROPS, CROP_ORDER, ITEMS, TIME } from './config/gameData.js';
import { Game } from './core/game.js';
import { migrateState, createNewState } from './core/state.js';
import { plotAction } from './core/farm.js';
import { LocalStorageAdapter } from './save/storage.js';
import { Models } from './render/models.js';
import { World, SPOTS } from './render/world.js';
import { CameraRig } from './render/camera.js';
import { Player } from './render/player.js';
import { PointerInput } from './render/input.js';
import { NavGrid } from './render/pathfinding.js';
import { Hud } from './ui/hud.js';

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
  world.syncPlotCount(S().plots.length);
  S().plots.forEach((p, i) => world.updatePlot(i, p));
  world.updateEggs(S().coop.eggs);

  const farmerMesh = models.farmer();
  farmerMesh.position.copy(SPOTS.playerStart);
  world.scene.add(farmerMesh);
  const player = new Player(farmerMesh, world.obstacles, new NavGrid(world.obstacles));

  const rig = new CameraRig();
  rig.focus(SPOTS.farm.x, SPOTS.farm.z, true);
  rig.update(0);

  // Vòng tròn đánh dấu điểm đến
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.08;
  world.scene.add(marker);

  // ---- Giao diện ----
  let paused = false;
  const hud = new Hud(document.getElementById('ui'), {
    goto: (where) => {
      rig.follow = null;
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

  // Nhãn trên vật thể
  const labelFor = new Map();
  world.interactables.forEach((def) => {
    const el = hud.addLabel('wl-' + def.type);
    labelFor.set(def, el);
    if (def.type === 'market') el.innerHTML = '🛒 Chợ';
    if (def.type === 'restaurant') el.innerHTML = '🍜 Quán <small>sắp mở</small>';
  });

  const refreshLabels = () => {
    world.interactables.forEach((def) => {
      const el = labelFor.get(def);
      if (def.type === 'plot') {
        const plot = S().plots[def.index];
        const act = plotAction(plot);
        el.className = 'wlabel wl-plot';
        if (act === 'harvest') {
          el.innerHTML = CROPS[plot.crop].icon;
          el.classList.add('ripe');
        } else if (act === 'water') {
          el.innerHTML = '💧';
          el.classList.add('dry');
        } else if (act === 'wait') {
          el.innerHTML = `<i style="width:${Math.round(plot.growth * 100)}%"></i>`;
          el.classList.add('grow');
        } else {
          el.innerHTML = '';
          el.classList.add('none');
        }
      } else if (def.type === 'coop') {
        const n = S().coop.eggs;
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

  // ---- Hành động ----
  const pickSeed = () => {
    const s = S();
    if (s.seeds[hud.selectedSeed] > 0) return hud.selectedSeed;
    const other = CROP_ORDER.find((id) => s.seeds[id] > 0);
    if (other) {
      hud.selectedSeed = other;
      return other;
    }
    return hud.selectedSeed;
  };

  const doAction = (def) => {
    if (def.type === 'plot') {
      const center = def.anchor.clone().setY(0);
      player.faceTo(center);
      player.work();
      const r = game.plotAction(def.index, pickSeed());
      const at = toScreen(def.anchor);
      if (!r.ok) return hud.toast(r.reason);
      if (r.action === 'plant') {
        world.puff(center, palette.soil);
        hud.floatText(at, `Gieo ${CROPS[S().plots[def.index].crop].icon}`);
        sound('plant');
      } else if (r.action === 'water') {
        world.splashWater(center);
        hud.floatText(at, '💧 Đã tưới');
        sound('water');
      } else if (r.action === 'harvest') {
        world.puff(center, palette.veg);
        hud.floatText(at, `+${r.amount} ${ITEMS[r.item].icon}`);
        sound('harvest');
      }
    } else if (def.type === 'coop') {
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

  const hitboxes = world.interactables.map((d) => d.hitbox);
  const input = new PointerInput(renderer.domElement, rig, {
    onTap: (x, y) => {
      if (paused) return;
      const hit = input.setRay(x, y).intersectObjects(hitboxes, false)[0];
      rig.follow = player.pos;
      if (hit) {
        const def = hit.object.userData.interactable;
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
    world.updatePlot(i, S().plots[i]);
    dirty = true;
  });
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
  else if (S().day === 1 && S().stats.harvested === 0) {
    hud.toast('Chạm vào ô đất trống để gieo hạt 🥬');
  }

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
    }
    world.setDaylight((S().minutes - TIME.dayStart) / (TIME.evening - TIME.dayStart));
    world.update(dt, time);
    player.update(dt);
    rig.update(dt);

    if (marker.material.opacity > 0) {
      marker.material.opacity = Math.max(0, marker.material.opacity - dt * 1.2);
      marker.scale.setScalar(1 + (0.9 - marker.material.opacity) * 0.6);
    }
    world.interactables.forEach((def) => hud.placeLabel(labelFor.get(def), toScreen(def.anchor)));
    renderer.render(world.scene, rig.cam);
  });
  window.__game = game; // tiện kiểm thử
  window.__debug = { world, rig, player, toScreen };
}

// Âm thanh nhẹ tạm thời (sẽ làm đầy đủ ở bước âm thanh)
let audioCtx;
function sound(kind) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const notes = { plant: [523], water: [659, 784], harvest: [659, 880], evening: [523, 440, 392] }[kind] || [523];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = audioCtx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 0.3);
    });
  } catch {
    /* không có âm thanh cũng không sao */
  }
}

start();
