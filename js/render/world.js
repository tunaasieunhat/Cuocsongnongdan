// Dựng cảnh 3D và đồng bộ với state (ô đất, trứng...). Không chứa luật chơi.
import * as THREE from '../../vendor/three.module.min.js';
import { cropStage } from '../core/farm.js';

// Vị trí các ô đất (tối đa 12: 3 cột x 4 hàng). Game mở dần theo state.plots.length.
const PLOT_COLS = [-11.4, -9.2, -7.0];
const PLOT_ROWS = [-2.6, -0.4, 1.8, 4.0];
export const PLOT_POSITIONS = PLOT_ROWS.flatMap((z) => PLOT_COLS.map((x) => [x, z]));

export const ISLAND = { w: 30, d: 22 };

export const SPOTS = {
  farm: new THREE.Vector3(-8, 0, 0.5),
  restaurant: new THREE.Vector3(7.5, 0, -1),
  playerStart: new THREE.Vector3(-5.2, 0, 1.2),
};

export class World {
  constructor(models, palette) {
    this.M = models;
    this.P = palette;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(palette.sky);
    this.interactables = [];
    this.obstacles = []; // {minX,maxX,minZ,maxZ} hoặc {x,z,r}
    this.plotViews = [];
    this.effects = [];
    this.chickens = [];
    this._hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    this._buildLights();
    this._buildTerrain();
    this._buildBuildings();
    this._buildDecor();
  }

  _buildLights() {
    const P = this.P;
    this.hemi = new THREE.HemisphereLight(P.ambientSky, P.ambientGround, P.ambientIntensity);
    this.sun = new THREE.DirectionalLight(P.sunColor, P.sunIntensity);
    this.sun.position.set(12, 20, 9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -17, right: 17, top: 14, bottom: -14, near: 1, far: 60 });
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.hemi, this.sun);
    this._skyDay = new THREE.Color(P.sky);
    this._skyEve = new THREE.Color(0xffc48a);
    this._sunDay = new THREE.Color(P.sunColor);
    this._sunEve = new THREE.Color(0xffa860);
  }

  // t: 0 = sáng sớm, 1 = chiều tối
  setDaylight(t) {
    const k = Math.max(0, (t - 0.65) / 0.35); // chỉ ngả màu vào cuối buổi chiều
    this.scene.background.copy(this._skyDay).lerp(this._skyEve, k);
    this.sun.color.copy(this._sunDay).lerp(this._sunEve, k);
    this.sun.intensity = this.P.sunIntensity * (1 - 0.25 * k);
  }

  _buildTerrain() {
    const M = this.M;
    const s = this.scene;
    s.add(M.island(ISLAND.w, ISLAND.d));
    s.add(M.path(1.8, ISLAND.d, -1.5, 0));
    s.add(M.path(ISLAND.w, 1.6, 0, 8));
    s.add(M.path(3.2, 1.6, 7.5, 2.4));
    // Rào quanh ruộng
    s.add(M.fence(8.4, -9.2, -4.0));
    s.add(M.fence(10.6, -13.0, 0.9, Math.PI / 2));
    this.obstacles.push(
      { minX: -13.4, maxX: -5.0, minZ: -4.1, maxZ: -3.9 },
      { minX: -13.1, maxX: -12.9, minZ: -4.4, maxZ: 6.2 }
    );
  }

  _addHitbox(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this._hitMat);
    m.position.set(x, y, z);
    this.scene.add(m);
    return m;
  }

  _addInteractable(def) {
    def.hitbox.userData.interactable = def;
    this.interactables.push(def);
    return def;
  }

  _buildBuildings() {
    const M = this.M;
    const s = this.scene;

    // Nhà
    const house = M.house();
    house.position.set(-3.5, 0, -7.8);
    s.add(house);
    this.obstacles.push({ minX: -5.0, maxX: -2.0, minZ: -9.1, maxZ: -6.5 });
    this._addInteractable({
      type: 'house', name: 'Nhà',
      hitbox: this._addHitbox(3.2, 4, 2.8, -3.5, 1.8, -7.8),
      stand: new THREE.Vector3(-3.5, 0, -5.9),
      anchor: new THREE.Vector3(-3.5, 4.2, -7.8),
    });

    // Chuồng gà
    const coop = M.coop();
    coop.position.set(-9.5, 0, -7.5);
    s.add(coop);
    this.obstacles.push({ minX: -11.2, maxX: -7.8, minZ: -8.8, maxZ: -5.8 });
    this.coopInteract = this._addInteractable({
      type: 'coop', name: 'Chuồng gà',
      hitbox: this._addHitbox(3.6, 2.4, 3.2, -9.5, 1, -7.3),
      stand: new THREE.Vector3(-9.5, 0, -5.2),
      anchor: new THREE.Vector3(-9.5, 2.8, -7.2),
    });
    for (let i = 0; i < 2; i++) {
      const ch = M.chicken(-10 + i, -6.6);
      s.add(ch);
      this.chickens.push({ mesh: ch, target: ch.position.clone(), wait: Math.random() * 2 });
    }
    this.eggGroup = new THREE.Group();
    s.add(this.eggGroup);

    // Sạp chợ
    const stall = M.marketStall();
    stall.position.set(-12, 0, 6.2);
    s.add(stall);
    this.obstacles.push({ minX: -13.1, maxX: -10.9, minZ: 5.6, maxZ: 6.9 });
    this._addInteractable({
      type: 'market', name: 'Chợ',
      hitbox: this._addHitbox(2.4, 2.6, 1.6, -12, 1.2, 6.2),
      stand: new THREE.Vector3(-12, 0, 7.6),
      anchor: new THREE.Vector3(-12, 3.0, 6.2),
    });

    // Quán (phần phục vụ khách làm ở bước sau)
    const rest = M.restaurant(3);
    rest.position.set(7.5, 0, -1.5);
    s.add(rest);
    this.restaurant = rest;
    this.obstacles.push(
      { minX: 4.5, maxX: 10.5, minZ: -4.0, maxZ: -3.4 },
      { minX: 4.5, maxX: 5.1, minZ: -4.0, maxZ: 1.0 },
      { minX: 4.9, maxX: 6.9, minZ: -3.8, maxZ: -2.7 }
    );
    rest.userData.tables.forEach(({ table }) => {
      this.obstacles.push({ x: table.position.x + 7.5, z: table.position.z - 1.5, r: 0.75 });
    });
    this._addInteractable({
      type: 'restaurant', name: 'Quán',
      hitbox: this._addHitbox(6, 3, 5, 7.5, 1.4, -1.5),
      stand: new THREE.Vector3(7.5, 0, 1.9),
      anchor: new THREE.Vector3(6.9, 3.9, -4.0),
    });
  }

  _buildDecor() {
    const M = this.M;
    const s = this.scene;
    s.add(M.pond(-4.2, 3.4, 1.3));
    this.obstacles.push({ x: -4.2, z: 3.4, r: 1.7 });
    const trees = [
      ['pine', -13.6, -9.4, 1.1], ['round', 13, -9, 1.2], ['pine', 13.6, 4.6, 1.1], ['round', -14, -4.8, 1],
      ['pine', 1.2, -9.6, 1], ['round', 12.6, 10, 1], ['pine', 4.2, 10.2, 0.9], ['round', 1.5, -4.5, 0.9],
      ['pine', -6.6, -9.8, 0.9], ['round', 13.4, -2.5, 0.9],
    ];
    trees.forEach(([kind, x, z, sc]) => {
      s.add(kind === 'pine' ? M.treePine(x, z, sc) : M.treeRound(x, z, sc));
      this.obstacles.push({ x, z, r: 0.55 * sc });
    });
    [[1.6, 4.6, 0.8], [-6.5, 10, 0.9], [11.6, 2.2, 0.7], [-13.8, 9.6, 1]].forEach(([x, z, sc]) => s.add(M.bush(x, z, sc)));
    for (let i = 0; i < 30; i++) {
      const x = -14 + ((i * 7.31) % 28);
      const z = -10 + ((i * 5.17) % 20);
      if (Math.abs(z - 8) < 1.3 || Math.abs(x + 1.5) < 1.3) continue;
      if (x < -5.8 && z > -4.2 && z < 5.2) continue; // vùng ruộng
      if (x > 4 && x < 11 && z > -4.5 && z < 3) continue; // quán
      s.add(i % 3 ? M.grassTuft(x, z) : M.flower(x, z, i));
    }
    [[10.5, 5.5, 1], [-0.2, -8.6, 0.8], [-13.6, 3, 0.7]].forEach(([x, z, sc]) => s.add(M.rock(x, z, sc)));
  }

  // ---- Ô đất ----

  syncPlotCount(count) {
    while (this.plotViews.length < count) {
      const i = this.plotViews.length;
      const [x, z] = PLOT_POSITIONS[i];
      const group = this.M.plot();
      group.position.set(x, 0, z);
      this.scene.add(group);
      const view = { group, crop: null, key: '' };
      view.interact = this._addInteractable({
        type: 'plot', index: i, name: 'Ô đất',
        hitbox: this._addHitbox(2.0, 1.2, 2.0, x, 0.5, z),
        stand: new THREE.Vector3(x, 0, z + 1.2),
        anchor: new THREE.Vector3(x, 1.9, z),
      });
      this.plotViews.push(view);
    }
  }

  updatePlot(i, plot) {
    const v = this.plotViews[i];
    if (!v) return;
    this.M.setPlotWet(v.group, plot.watered);
    const stage = cropStage(plot);
    const key = plot.crop ? plot.crop + stage : '';
    if (key === v.key) return;
    v.key = key;
    if (v.crop) v.group.remove(v.crop);
    v.crop = null;
    if (plot.crop) {
      v.crop = this.M.crop(plot.crop, stage);
      v.crop.scale.setScalar(0.6);
      v.popT = 0; // hiệu ứng nảy lên khi đổi giai đoạn
      v.group.add(v.crop);
    }
  }

  updateEggs(n) {
    this.eggGroup.clear();
    for (let i = 0; i < Math.min(n, 6); i++) {
      this.eggGroup.add(this.M.egg(-10.6 + (i % 3) * 0.35, -6.2 + Math.floor(i / 3) * 0.3));
    }
  }

  // ---- Hiệu ứng ----

  splashWater(pos) {
    for (let i = 0; i < 14; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), this.M.mat(this.P.water));
      d.position.set(pos.x + (Math.random() - 0.5) * 1.4, 1.6 + Math.random() * 0.6, pos.z + (Math.random() - 0.5) * 1.4);
      this.scene.add(d);
      this.effects.push({ mesh: d, vy: -1 - Math.random() * 2, life: 0.7 });
    }
  }

  puff(pos, color) {
    for (let i = 0; i < 8; i++) {
      const d = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), this.M.mat(color));
      d.position.set(pos.x, 0.5, pos.z);
      const a = (i / 8) * Math.PI * 2;
      this.scene.add(d);
      this.effects.push({ mesh: d, vx: Math.cos(a) * 1.6, vz: Math.sin(a) * 1.6, vy: 2.5, g: 7, life: 0.6 });
    }
  }

  update(dt, time) {
    // Hạt hiệu ứng
    this.effects = this.effects.filter((e) => {
      e.life -= dt;
      e.vy -= (e.g || 0) * dt;
      e.mesh.position.x += (e.vx || 0) * dt;
      e.mesh.position.y += e.vy * dt;
      e.mesh.position.z += (e.vz || 0) * dt;
      if (e.life <= 0 || e.mesh.position.y < 0.2) {
        this.scene.remove(e.mesh);
        e.mesh.geometry.dispose();
        return false;
      }
      return true;
    });
    // Cây nảy nhẹ khi mới đổi giai đoạn, rồi đung đưa
    this.plotViews.forEach((v, i) => {
      if (!v.crop) return;
      if (v.popT !== undefined && v.popT < 1) {
        v.popT = Math.min(1, v.popT + dt * 3);
        const t = v.popT;
        v.crop.scale.setScalar(0.6 + 0.4 * t + Math.sin(t * Math.PI) * 0.15);
      } else {
        v.crop.scale.setScalar(1);
      }
      v.crop.rotation.z = Math.sin(time * 1.5 + i) * 0.02;
    });
    // Gà đi lại trong chuồng
    this.chickens.forEach((c) => {
      const p = c.mesh.position;
      c.wait -= dt;
      const dx = c.target.x - p.x, dz = c.target.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.05) {
        const step = Math.min(dist, dt * 0.9);
        p.x += (dx / dist) * step;
        p.z += (dz / dist) * step;
        c.mesh.rotation.y = Math.atan2(dx, dz);
        p.y = Math.abs(Math.sin(time * 12)) * 0.06;
      } else if (c.wait <= 0) {
        c.target.set(-10.7 + Math.random() * 2.4, 0, -7.1 + Math.random() * 0.9);
        c.wait = 1 + Math.random() * 3;
      } else {
        // Mổ thóc
        c.mesh.rotation.x = Math.max(0, Math.sin(time * 6)) * 0.3;
      }
    });
  }
}
