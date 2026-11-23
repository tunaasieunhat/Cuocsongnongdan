// Dựng cảnh 3D và đồng bộ với state (ô đất, trứng...). Không chứa luật chơi.
import * as THREE from '../../vendor/three.module.min.js';
import { cropStage } from '../core/farm.js';
import { FARM } from '../config/gameData.js';

export const ISLAND = { w: 30, d: 22 };

// Lô ruộng 3x3. Thứ tự ô: hàng trước (gần camera) trước, để ô mở sẵn nằm phía trước.
export const LOT = { x: -8.6, z: -0.2, pitch: 1.72, cell: 1.6 };
const LOT_SIZE = LOT.pitch * 3 + 0.3;
const FENCE = 3.9; // nửa cạnh hàng rào quanh lô
export const PLOT_POSITIONS = [2, 1, 0].flatMap((r) =>
  [0, 1, 2].map((c) => [LOT.x + (c - 1) * LOT.pitch, LOT.z + (r - 1) * LOT.pitch])
);

export const SPOTS = {
  farm: new THREE.Vector3(LOT.x + 1, 0, LOT.z + 1.5),
  restaurant: new THREE.Vector3(7.5, 0, -1),
  playerStart: new THREE.Vector3(LOT.x + 0.5, 0, LOT.z + FENCE + 1.2),
};

export class World {
  constructor(models, palette) {
    this.M = models;
    this.P = palette;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(palette.sky);
    if (palette.fogFar) this.scene.fog = new THREE.Fog(palette.fog, palette.fogNear, palette.fogFar);
    this.interactables = [];
    this.nameplates = []; // biển tên chỉ để hiển thị
    this.obstacles = []; // {minX,maxX,minZ,maxZ} hoặc {x,z,r}
    this.cellViews = [];
    this.effects = [];
    this.chickens = [];
    this._hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    this._buildLights();
    this._buildTerrain();
    this._buildFarm();
    this._buildBuildings();
    this._buildDecor();
  }

  _buildLights() {
    const P = this.P;
    this.hemi = new THREE.HemisphereLight(P.ambientSky, P.ambientGround, P.ambientIntensity);
    this.sun = new THREE.DirectionalLight(P.sunColor, P.sunIntensity);
    this.sun.position.set(10, 22, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -17, right: 17, top: 14, bottom: -14, near: 1, far: 60 });
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.radius = 4;
    this.scene.add(this.hemi, this.sun);
    this._skyDay = new THREE.Color(P.sky);
    this._skyEve = new THREE.Color(0xffd0b8);
    this._sunDay = new THREE.Color(P.sunColor);
    this._sunEve = new THREE.Color(0xffb38a);
    this._skyNight = new THREE.Color(0x3a3f6b);
    this._sunNight = new THREE.Color(0x9fa8ff);
    this._skyRain = new THREE.Color(0xaab6c4);
    this._fogDay = new THREE.Color(P.fog);
  }

  // Ánh sáng theo giờ (phút trong game): ngày -> hoàng hôn (15h-18h) -> đêm (18h-21h); mưa thì xám hơn
  setDaylight(minutes, rain = false) {
    const h = minutes / 60;
    const eve = THREE.MathUtils.clamp((h - 15) / 3, 0, 1);
    const night = THREE.MathUtils.clamp((h - 18) / 3, 0, 1);
    const sky = this.scene.background.copy(this._skyDay).lerp(this._skyEve, eve).lerp(this._skyNight, night);
    if (rain) sky.lerp(this._skyRain, 0.55 * (1 - night));
    if (this.scene.fog) this.scene.fog.color.copy(sky).lerp(this._fogDay, 0.4 * (1 - night));
    this.sun.color.copy(this._sunDay).lerp(this._sunEve, eve).lerp(this._sunNight, night);
    this.sun.intensity = this.P.sunIntensity * (1 - 0.2 * eve - 0.55 * night) * (rain ? 0.7 : 1);
    this.hemi.intensity = this.P.ambientIntensity * (1 - 0.45 * night) * (rain ? 0.85 : 1);
  }

  _buildTerrain() {
    const M = this.M;
    const s = this.scene;
    const island = M.island(ISLAND.w, ISLAND.d);
    s.add(island);
    // Mặt cỏ có vật liệu riêng để đổi màu theo mùa
    this.islandTop = island.children[0];
    this.islandTop.material = this.islandTop.material.clone();
    // Đường chính dọc mép trước đảo
    s.add(M.path(ISLAND.w, 1.8, 0, 8.2));
    // Sân hồng quanh quán
    const plaza = M.mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.06, 18), this.P.path);
    plaza.position.set(7.5, 0.03, -1.2);
    plaza.castShadow = false;
    s.add(plaza);
    // Đường đá lát: cổng ruộng -> đường chính, nhà -> đường chính, quán -> đường chính
    const pts = [];
    for (let z = LOT.z + FENCE + 0.8; z < 7.4; z += 0.9) pts.push([LOT.x + ((pts.length % 2) - 0.5) * 0.3, z]);
    for (let z = -5.6; z < 7.4; z += 0.9) pts.push([-1.4 + ((pts.length % 2) - 0.5) * 0.35, z]);
    for (let z = 3.6; z < 7.4; z += 0.9) pts.push([7.5 + ((pts.length % 2) - 0.5) * 0.35, z]);
    for (let x = -10.6; x < -7.8; x += 0.9) pts.push([x, -5.0]);
    s.add(M.stones(pts));
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

  _buildFarm() {
    const M = this.M;
    const s = this.scene;
    const frame = M.lotFrame(LOT_SIZE);
    frame.position.set(LOT.x, 0, LOT.z);
    s.add(frame);

    for (let i = 0; i < FARM.cells; i++) {
      const [x, z] = PLOT_POSITIONS[i];
      const group = M.cell(LOT.cell);
      group.position.set(x, 0, z);
      s.add(group);
      const view = { group, crop: null, key: '', popT: 1 };
      view.interact = this._addInteractable({
        type: 'plot', index: i, name: 'Ô đất',
        hitbox: this._addHitbox(LOT.pitch, 0.9, LOT.pitch, x, 0.4, z),
        stand: new THREE.Vector3(x, 0, z + 0.95),
        anchor: new THREE.Vector3(x, 1.5, z),
      });
      this.cellViews.push(view);
    }

    // Hàng rào quanh lô, chừa cổng phía trước
    const F = FENCE, L = LOT;
    s.add(M.fence(F * 2, L.x, L.z - F));
    s.add(M.fence(F * 2, L.x - F, L.z, Math.PI / 2));
    s.add(M.fence(F * 2, L.x + F, L.z, Math.PI / 2));
    s.add(M.fence(F - 1.3, L.x - (F + 1.3) / 2, L.z + F));
    s.add(M.fence(F - 1.3, L.x + (F + 1.3) / 2, L.z + F));
    this.obstacles.push(
      { minX: L.x - F, maxX: L.x + F, minZ: L.z - F - 0.1, maxZ: L.z - F + 0.1 },
      { minX: L.x - F - 0.1, maxX: L.x - F + 0.1, minZ: L.z - F, maxZ: L.z + F },
      { minX: L.x + F - 0.1, maxX: L.x + F + 0.1, minZ: L.z - F, maxZ: L.z + F },
      { minX: L.x - F, maxX: L.x - 1.3, minZ: L.z + F - 0.1, maxZ: L.z + F + 0.1 },
      { minX: L.x + 1.3, maxX: L.x + F, minZ: L.z + F - 0.1, maxZ: L.z + F + 0.1 }
    );
    s.add(M.flowerArch(L.x, L.z + F, 0, 2.5));
    s.add(M.scarecrow(L.x - F + 0.7, L.z - F + 0.8));
    s.add(M.signBoard(L.x + F + 0.8, L.z + F - 0.4, -0.5));
    this.nameplates.push({ text: '🌾 Ruộng nhà mình', anchor: new THREE.Vector3(L.x + F + 0.8, 1.7, L.z + F - 0.4) });
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
    this._addInteractable({
      type: 'coop', name: 'Chuồng gà',
      hitbox: this._addHitbox(3.6, 2.4, 3.2, -9.5, 1, -7.3),
      stand: new THREE.Vector3(-9.5, 0, -5.15),
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
    stall.position.set(-13, 0, 6.0);
    s.add(stall);
    this.obstacles.push({ minX: -14.1, maxX: -11.9, minZ: 5.4, maxZ: 6.7 });
    this._addInteractable({
      type: 'market', name: 'Chợ',
      hitbox: this._addHitbox(2.4, 2.6, 1.6, -13, 1.2, 6.0),
      stand: new THREE.Vector3(-13, 0, 7.4),
      anchor: new THREE.Vector3(-13, 3.0, 6.0),
    });

    // Quán (phần phục vụ khách làm ở bước sau)
    const rest = M.restaurant(0); // bàn ghế do RestaurantView quản lý
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
    // Chỉ bảng hiệu là vùng chạm "Quán"; bàn, bếp, quầy có vùng chạm riêng
    this._addInteractable({
      type: 'restaurant', name: 'Quán',
      hitbox: this._addHitbox(2.6, 1.0, 0.6, 6.9, 2.95, -3.9),
      stand: new THREE.Vector3(7.5, 0, 2.2),
      anchor: new THREE.Vector3(6.9, 3.9, -4.0),
    });
  }

  _buildDecor() {
    const M = this.M;
    const s = this.scene;
    s.add(M.pond(2.4, 4.4, 1.3));
    this.obstacles.push({ x: 2.4, z: 4.4, r: 1.7 });
    this._addInteractable({
      type: 'pond', name: 'Ao cá',
      hitbox: this._addHitbox(3.2, 0.6, 3.2, 2.4, 0.2, 4.4),
      stand: new THREE.Vector3(2.4, 0, 6.5),
      anchor: new THREE.Vector3(2.4, 1.3, 4.4),
    });
    const trees = [
      ['cherry', -13.6, -9.4, 1.1], ['round', 13, -9, 1.2], ['cherry', 13.4, 4.4, 1.1], ['pine', -14, -3.5, 1],
      ['cherry', 1.4, -9.4, 1], ['round', 12.8, 10, 1], ['pine', 4.4, 10.2, 0.9], ['cherry', 1.6, -4.6, 0.9],
      ['round', -6.6, -9.8, 0.9], ['pine', 13.6, -2.8, 0.9], ['cherry', -2.6, 1.2, 0.85], ['round', -14, 2.4, 0.9],
      ['cherry', 11.8, 6.2, 0.8], ['pine', -6.4, 10.2, 0.8],
    ];
    trees.forEach(([kind, x, z, sc]) => {
      const t = kind === 'pine' ? M.treePine(x, z, sc) : kind === 'cherry' ? M.cherryTree(x, z, sc) : M.treeRound(x, z, sc);
      s.add(t);
      this.obstacles.push({ x, z, r: 0.55 * sc });
    });
    // Cột đèn dọc đường chính
    [-9.8, -4.5, 0.6, 5.0, 10.2].forEach((x) => {
      s.add(M.lampPost(x, 7.0));
      this.obstacles.push({ x, z: 7.0, r: 0.2 });
    });
    [[-0.6, -2.8, 0.8], [-12.6, 9.6, 1], [4.2, 3.4, 0.7], [11.6, 2.6, 0.7]].forEach(([x, z, sc]) => s.add(M.bush(x, z, sc)));
    for (let i = 0; i < 46; i++) {
      const x = -14 + ((i * 7.31) % 28);
      const z = -10 + ((i * 5.17) % 20);
      if (Math.abs(z - 8.2) < 1.3) continue;
      if (Math.abs(x - LOT.x) < FENCE + 0.4 && Math.abs(z - LOT.z) < FENCE + 0.6) continue;
      if (Math.hypot(x - 7.5, z + 1.2) < 5) continue;
      s.add(i % 3 ? M.grassTuft(x, z) : M.flower(x, z, i));
    }
    [[10.5, 5.8, 1], [-0.2, -8.6, 0.8], [-14, 6.6, 0.7]].forEach(([x, z, sc]) => s.add(M.rock(x, z, sc)));
  }

  // ---- Mùa & mưa ----

  setSeason(i) {
    const tints = [this.P.grass, 0xa9d67e, 0xd2cf8a, 0xdfe8dc];
    this.islandTop.material.color.set(tints[i] ?? this.P.grass);
  }

  setRain(on) {
    if (!this._rain) {
      const N = 500;
      const pos = new Float32Array(N * 6);
      for (let i = 0; i < N; i++) {
        const x = (Math.random() - 0.5) * 40, y = Math.random() * 18, z = (Math.random() - 0.5) * 30;
        pos.set([x, y, z, x - 0.08, y - 0.7, z - 0.08], i * 6);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this._rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xbfd9ef, transparent: true, opacity: 0.55 }));
      this._rain.frustumCulled = false;
      this.scene.add(this._rain);
    }
    this._rain.visible = on;
    this.raining = on;
  }

  _updateRain(dt) {
    if (!this._rain?.visible) return;
    const a = this._rain.geometry.attributes.position;
    for (let i = 0; i < a.count; i += 2) {
      let y = a.getY(i) - dt * 16;
      if (y < 0) y += 18;
      a.setY(i, y);
      a.setY(i + 1, y - 0.7);
    }
    a.needsUpdate = true;
  }

  // ---- Ô đất ----

  updateCell(i, plot) {
    const v = this.cellViews[i];
    if (!v) return;
    const locked = !plot;
    this.M.setCellState(v.group, { tilled: plot?.tilled || !!plot?.crop, watered: plot?.watered, locked });
    v.interact.locked = locked;
    const stage = plot ? cropStage(plot) : -1;
    const key = plot?.crop ? plot.crop + stage : '';
    if (key === v.key) return;
    v.key = key;
    if (v.crop) v.group.remove(v.crop);
    v.crop = null;
    if (plot?.crop) {
      v.crop = this.M.crop(plot.crop, stage);
      v.crop.position.y = 0.12;
      v.crop.scale.setScalar(0.85);
      v.popT = 0; // hiệu ứng nảy lên khi đổi giai đoạn
      v.group.add(v.crop);
    }
  }

  syncCells(plots) {
    for (let i = 0; i < FARM.cells; i++) this.updateCell(i, plots[i]);
  }

  syncChickens(n) {
    while (this.chickens.length < n) {
      const ch = this.M.chicken(-10.2 + this.chickens.length * 0.5, -6.6);
      this.scene.add(ch);
      this.chickens.push({ mesh: ch, target: ch.position.clone(), wait: Math.random() * 2 });
    }
  }

  updateEggs(n) {
    this.eggGroup.clear();
    for (let i = 0; i < Math.min(n, 6); i++) {
      this.eggGroup.add(this.M.egg(-10.6 + (i % 3) * 0.35, -6.2 + Math.floor(i / 3) * 0.3));
    }
  }

  // Viền sáng trên ô đang xếp hàng chờ làm
  highlightCells(indices) {
    if (!this._hl) {
      this._hlGeo = new THREE.RingGeometry(0.7, 0.82, 4, 1);
      this._hlGeo.rotateZ(Math.PI / 4);
      this._hlGeo.rotateX(-Math.PI / 2);
      this._hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
      this._hl = new THREE.Group();
      this.scene.add(this._hl);
    }
    this._hl.clear();
    indices.forEach((i) => {
      const [x, z] = PLOT_POSITIONS[i];
      const m = new THREE.Mesh(this._hlGeo, this._hlMat);
      m.position.set(x, 0.5, z);
      m.scale.setScalar(1.05);
      this._hl.add(m);
    });
  }

  // ---- Hiệu ứng ----

  splashWater(pos) {
    for (let i = 0; i < 14; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), this.M.mat(this.P.water));
      d.position.set(pos.x + (Math.random() - 0.5) * 1.3, 1.6 + Math.random() * 0.6, pos.z + (Math.random() - 0.5) * 1.3);
      this.scene.add(d);
      this.effects.push({ mesh: d, vy: -1 - Math.random() * 2, life: 0.7 });
    }
  }

  puff(pos, color) {
    for (let i = 0; i < 8; i++) {
      const d = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), this.M.mat(color));
      d.position.set(pos.x, 0.6, pos.z);
      const a = (i / 8) * Math.PI * 2;
      this.scene.add(d);
      this.effects.push({ mesh: d, vx: Math.cos(a) * 1.6, vz: Math.sin(a) * 1.6, vy: 2.5, g: 7, life: 0.6 });
    }
  }

  update(dt, time) {
    this._updateRain(dt);
    this.effects = this.effects.filter((e) => {
      e.life -= dt;
      e.vy -= (e.g || 0) * dt;
      e.mesh.position.x += (e.vx || 0) * dt;
      e.mesh.position.y += e.vy * dt;
      e.mesh.position.z += (e.vz || 0) * dt;
      if (e.life <= 0 || e.mesh.position.y < 0.3) {
        this.scene.remove(e.mesh);
        e.mesh.geometry.dispose();
        return false;
      }
      return true;
    });
    // Cây nảy nhẹ khi mới đổi giai đoạn, rồi đung đưa
    this.cellViews.forEach((v, i) => {
      if (!v.crop) return;
      if (v.popT < 1) {
        v.popT = Math.min(1, v.popT + dt * 3);
        const t = v.popT;
        v.crop.scale.setScalar(0.85 * (0.6 + 0.4 * t + Math.sin(t * Math.PI) * 0.15));
      }
      v.crop.rotation.z = Math.sin(time * 1.5 + i) * 0.02;
    });
    if (this._hl) this._hlMat.opacity = 0.55 + Math.sin(time * 5) * 0.3;
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
        c.mesh.rotation.x = 0;
        p.y = Math.abs(Math.sin(time * 12)) * 0.06;
      } else if (c.wait <= 0) {
        c.target.set(-10.7 + Math.random() * 2.4, 0, -7.1 + Math.random() * 0.9);
        c.wait = 1 + Math.random() * 3;
      } else {
        c.mesh.rotation.x = Math.max(0, Math.sin(time * 6)) * 0.3; // mổ thóc
      }
    });
  }
}
