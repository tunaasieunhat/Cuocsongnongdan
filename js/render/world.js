// Dựng cảnh 3D và đồng bộ với state (ô đất, trứng...). Không chứa luật chơi.
import * as THREE from '../../vendor/three.module.min.js';
import { cropStage } from '../core/farm.js';
import { FARM, ORCHARD_SLOTS } from '../config/gameData.js';
import { VILLAGERS } from '../config/story.js';

// Đảo rộng 44: tây (x<-15) là chuồng heo/bò, giữa là trại + quán, đông (x>15) là làng ven sông
export const ISLAND = { w: 44, d: 22 };

// Lô ruộng 3x3. Thứ tự ô: hàng trước (gần camera) trước, để ô mở sẵn nằm phía trước.
export const LOT = { x: -8.6, z: -0.2, pitch: 1.72, cell: 1.6 };
const LOT_SIZE = LOT.pitch * 3 + 0.3;
const FENCE = 3.9; // nửa cạnh hàng rào quanh lô
// Lô 2 nằm giữa lô 1 và ao (mua qua nâng cấp)
export const LOT2 = { x: -0.4, z: -0.6 };
const lotCells = (L) => [2, 1, 0].flatMap((r) => [0, 1, 2].map((c) => [L.x + (c - 1) * LOT.pitch, L.z + (r - 1) * LOT.pitch]));
export const PLOT_POSITIONS = [...lotCells(LOT), ...lotCells(LOT2)];
export const ORCHARD_POS = [[0.8, -7.4], [2.9, -7.4], [5.0, -7.4]];
export const PEN_POS = { pig: [-18.3, -6.0], cow: [-18.3, 1.0] };
export const SHOP_POS = [18.4, -5.6];

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
    this._buildOrchard();
    this._buildAnimals();
    this._buildVillage();
  }

  _buildLights() {
    const P = this.P;
    this.hemi = new THREE.HemisphereLight(P.ambientSky, P.ambientGround, P.ambientIntensity);
    this.sun = new THREE.DirectionalLight(P.sunColor, P.sunIntensity);
    this.sun.position.set(10, 22, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -25, right: 25, top: 15, bottom: -15, near: 1, far: 70 });
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
    for (let z = -5.6; z < 7.4; z += 0.9) pts.push([-4.0 + ((pts.length % 2) - 0.5) * 0.3, z]);
    for (let x = -21; x < -15; x += 0.9) pts.push([x, 7.2 + ((pts.length % 2) - 0.5) * 0.3]);
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

    const frame2 = M.lotFrame(LOT_SIZE);
    frame2.position.set(LOT2.x, 0, LOT2.z);
    s.add(frame2);
    this.nameplates.push({ text: '🗺️ Lô ruộng 2', anchor: new THREE.Vector3(LOT2.x, 1.2, LOT2.z + 2.9), lot2Plate: true });
    for (let i = 0; i < FARM.cells + FARM.lot2Cells; i++) {
      const [x, z] = PLOT_POSITIONS[i];
      const group = M.cell(LOT.cell);
      group.position.set(x, 0, z);
      s.add(group);
      const view = { group, crop: null, key: '', popT: 1 };
      view.interact = this._addInteractable({
        type: 'plot', index: i, name: 'Ô đất', lot2: i >= FARM.cells,
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
      ['cherry', 7.0, -9.6, 1], ['round', 12.8, 10, 1], ['pine', 4.4, 10.2, 0.9], ['cherry', 2.0, -4.9, 0.8],
      ['round', -6.6, -9.8, 0.9], ['pine', 13.6, -2.8, 0.9], ['round', -14, 2.4, 0.9],
      ['cherry', 11.8, 6.2, 0.8], ['pine', -6.4, 10.2, 0.8],
      // khu tây (chuồng trại) và khu đông (làng)
      ['pine', -21, -9.5, 1.1], ['round', -21, 4.5, 1], ['cherry', -15.6, -9.8, 0.9], ['pine', -20.8, 9.5, 0.9],
      ['round', 16, -9.6, 1.1], ['cherry', 15.4, 10, 0.9], ['pine', 18.2, -9.8, 0.9],
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
    [-16.5, 15.4].forEach((x) => {
      s.add(M.lampPost(x, 7.0));
      this.obstacles.push({ x, z: 7.0, r: 0.2 });
    });
    [[-12.6, 9.6, 1], [4.2, 3.4, 0.7], [11.6, 2.6, 0.7], [-16, 4.6, 0.8]].forEach(([x, z, sc]) => s.add(M.bush(x, z, sc)));
    for (let i = 0; i < 80; i++) {
      const x = -21 + ((i * 7.31) % 41);
      const z = -10 + ((i * 5.17) % 20);
      if (Math.abs(z - 8.2) < 1.3) continue;
      if (Math.abs(x - LOT.x) < FENCE + 0.4 && Math.abs(z - LOT.z) < FENCE + 0.6) continue;
      if (Math.abs(x - LOT2.x) < 3.2 && Math.abs(z - LOT2.z) < 3.2) continue;
      if (Math.hypot(x - 7.5, z + 1.2) < 5) continue;
      if (x < -16 && Math.abs(z - PEN_POS.pig[1]) < 2.2) continue;
      if (x < -16 && Math.abs(z - PEN_POS.cow[1]) < 2.4) continue;
      if (x > 15 || (z < -6 && x > 0 && x < 6)) continue;
      s.add(i % 3 ? M.grassTuft(x, z) : M.flower(x, z, i));
    }
    [[10.5, 5.8, 1], [-0.2, -8.6, 0.8], [-14, 6.6, 0.7]].forEach(([x, z, sc]) => s.add(M.rock(x, z, sc)));
  }

  // ---- Vườn cây ăn trái (GĐ7) ----
  _buildOrchard() {
    this.treeViews = ORCHARD_POS.slice(0, ORCHARD_SLOTS).map(([x, z], i) => {
      const holder = new THREE.Group();
      holder.position.set(x, 0, z);
      this.scene.add(holder);
      const interact = this._addInteractable({
        type: 'tree', index: i, name: 'Ô vườn',
        hitbox: this._addHitbox(1.6, 2.4, 1.6, x, 1.0, z),
        stand: new THREE.Vector3(x, 0, z + 1.2),
        anchor: new THREE.Vector3(x, 2.6, z),
      });
      return { holder, interact, key: null };
    });
    this.nameplates.push({ text: '🌳 Vườn cây', anchor: new THREE.Vector3(ORCHARD_POS[1][0], 0.6, ORCHARD_POS[1][1] + 1.3) });
  }

  syncOrchard(orchard) {
    orchard.forEach((slot, i) => {
      const v = this.treeViews[i];
      if (!v) return;
      const grown = slot.tree && slot.age >= 1 ? 1 : 0;
      const key = `${slot.tree}|${grown}|${slot.fruit}`;
      if (key === v.key) return;
      v.key = key;
      v.holder.clear();
      v.holder.add(this.M.fruitTree(slot.tree, slot.tree ? (slot.age >= 1 ? 1 : 0) : 0, slot.fruit));
    });
  }

  // ---- Chuồng heo, bò, vịt (GĐ7) ----
  _buildAnimals() {
    const M = this.M;
    this.pens = {};
    [['pig', M.pen(3.2), 3.2], ['cow', M.shed(), 3.6]].forEach(([kind, mesh, size]) => {
      const [x, z] = PEN_POS[kind];
      mesh.position.set(x, 0, z);
      this.scene.add(mesh);
      this.obstacles.push({ minX: x - size / 2, maxX: x + size / 2, minZ: z - size / 2, maxZ: z - size / 2 + 0.2 });
      this.obstacles.push({ minX: x - size / 2, maxX: x - size / 2 + 0.2, minZ: z - size / 2, maxZ: z + size / 2 });
      this.obstacles.push({ minX: x + size / 2 - 0.2, maxX: x + size / 2, minZ: z - size / 2, maxZ: z + size / 2 });
      const animal = kind === 'pig' ? M.pig() : M.cow();
      animal.position.set(x - 0.3, 0, z - 0.2);
      animal.visible = false;
      this.scene.add(animal);
      const trough = mesh.children.find((c) => c.userData.food);
      const interact = this._addInteractable({
        type: 'pen', kind, name: kind === 'pig' ? 'Chuồng heo' : 'Chuồng bò',
        hitbox: this._addHitbox(size, 2.2, size, x, 1.0, z),
        stand: new THREE.Vector3(x + size / 2 + 0.9, 0, z + 0.6),
        anchor: new THREE.Vector3(x, kind === 'pig' ? 2.0 : 2.8, z),
      });
      this.pens[kind] = { mesh, animal, trough, interact, home: animal.position.clone() };
    });
    this.ducks = [];
  }

  syncAnimals(state) {
    Object.entries(this.pens).forEach(([kind, p]) => {
      const owned = !!state.upgrades[kind === 'pig' ? 'pigpen' : 'cowshed'];
      p.animal.visible = owned;
      p.interact.locked = !owned;
      if (p.trough?.userData.food) p.trough.userData.food.visible = owned && state.animals[kind].fed;
    });
    const n = state.upgrades.ducks || 0;
    while (this.ducks.length < n) {
      const d = this.M.duck();
      this.scene.add(d);
      this.ducks.push({ mesh: d, phase: this.ducks.length * Math.PI });
    }
  }

  // ---- Làng ven sông (GĐ8) ----
  _buildVillage() {
    const M = this.M;
    const s = this.scene;
    // Sông dọc mép đông
    const river = M.box(2.2, 0.1, ISLAND.d - 0.4, this.P.water, 21.0, 0.03, 0);
    river.castShadow = false;
    s.add(river);
    this.obstacles.push({ minX: 19.9, maxX: 22, minZ: -11, maxZ: 11 });
    // Tiệm tạp hoá
    const shop = M.shopBuilding();
    shop.position.set(SHOP_POS[0], 0, SHOP_POS[1]);
    s.add(shop);
    this.obstacles.push({ minX: SHOP_POS[0] - 1.7, maxX: SHOP_POS[0] + 1.7, minZ: SHOP_POS[1] - 1.3, maxZ: SHOP_POS[1] + 1.6 });
    this._addInteractable({
      type: 'shop', name: 'Tạp hoá',
      hitbox: this._addHitbox(3.4, 3.4, 2.8, SHOP_POS[0], 1.6, SHOP_POS[1]),
      stand: new THREE.Vector3(SHOP_POS[0] + 0.6, 0, SHOP_POS[1] + 2.6),
      anchor: new THREE.Vector3(SHOP_POS[0], 3.8, SHOP_POS[1]),
    });
    // Nhà dân
    [[18.2, 0.4, 0xc9a7f5], [16.6, 4.2, 0x9fd6f0]].forEach(([x, z, roof]) => {
      const h = M.villageHouse(roof);
      h.position.set(x, 0, z);
      h.rotation.y = -0.2;
      s.add(h);
      this.obstacles.push({ minX: x - 1.3, maxX: x + 1.3, minZ: z - 1.1, maxZ: z + 1.1 });
    });
    // Bến đò
    const pier = M.pier();
    pier.position.set(20.6, 0, 6.2);
    s.add(pier);
    this.boat = pier.userData.boat;
    // Dân làng
    const spots = { ongbay: [16.9, -3.5, 0.6], coba: [19.0, 6.4, -1.5], thangti: [15.8, 1.6, 0.3] };
    this.villagers = VILLAGERS.map((v) => {
      const [x, z, rot] = spots[v.id];
      const mesh = M.person({ shirt: v.color, pants: this.P.pants, skin: this.P.skin, hair: v.hair });
      if (v.id === 'thangti') mesh.scale.setScalar(0.75);
      mesh.position.set(x, 0, z);
      mesh.rotation.y = rot;
      s.add(mesh);
      this.obstacles.push({ x, z, r: 0.35 });
      const interact = this._addInteractable({
        type: 'npc', id: v.id, name: v.name,
        hitbox: this._addHitbox(0.9, 1.8, 0.9, x, 0.9, z),
        stand: new THREE.Vector3(x + Math.sin(rot) * 1.1, 0, z + Math.cos(rot) * 1.1),
        anchor: new THREE.Vector3(x, 2.0, z),
      });
      return { def: v, mesh, interact, base: mesh.position.clone() };
    });
    this.nameplates.push({ text: '🏘️ Làng Ven Sông', anchor: new THREE.Vector3(15.6, 1.2, 7.0) });
    this.nameplates.push({ text: '🐖 Khu chuồng trại', anchor: new THREE.Vector3(-16.4, 1.2, -2.6) });
    this.eventGroup = new THREE.Group();
    s.add(this.eventGroup);
  }

  // Trang trí ngày lễ: Tết treo đèn đỏ + cây đào, Trung thu treo đèn ông sao
  setEvent(id) {
    if (this._eventId === id) return;
    this._eventId = id;
    this.eventGroup.clear();
    if (!id) return;
    const M = this.M;
    const xs = [-9.8, -4.5, 0.6, 5.0, 10.2, 15.4, -16.5];
    xs.forEach((x) => {
      const l = id === 'tet' ? M.lantern() : M.starLantern();
      l.position.set(x, 2.0, 7.25);
      this.eventGroup.add(l);
    });
    if (id === 'tet') {
      const dao = M.cherryTree(4.2, 1.6, 0.8);
      this.eventGroup.add(dao);
    }
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
    for (let i = 0; i < this.cellViews.length; i++) this.updateCell(i, plots[i]);
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
    // Vịt bơi vòng quanh ao, heo/bò lắc lư, dân làng nhún nhảy, đò nhấp nhô
    this.ducks?.forEach((d) => {
      const a = time * 0.4 + d.phase;
      d.mesh.position.set(2.4 + Math.cos(a) * 0.8, 0.14, 4.4 + Math.sin(a) * 0.8);
      d.mesh.rotation.y = -a;
    });
    Object.values(this.pens || {}).forEach((p, i) => {
      if (!p.animal.visible) return;
      p.animal.position.x = p.home.x + Math.sin(time * 0.3 + i) * 0.5;
      p.animal.rotation.y = Math.sin(time * 0.3 + i) > 0 ? 0.6 : -0.6;
    });
    this.villagers?.forEach((v, i) => {
      v.mesh.position.y = v.def.id === 'thangti' ? Math.abs(Math.sin(time * 4)) * 0.15 : 0;
      v.mesh.userData.parts.armR.rotation.x = Math.sin(time * 1.5 + i) * 0.2;
    });
    if (this.boat) this.boat.position.y = -0.25 + Math.sin(time * 1.2) * 0.04;
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
