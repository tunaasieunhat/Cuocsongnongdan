// Hiển thị quán: bàn ghế, bếp, quầy món, khách đi vào/ngồi/ăn/ra về, bàn bẩn, đồ trang trí.
// Đọc state.restaurant mỗi khung hình; không chứa luật chơi.
import * as THREE from '../../vendor/three.module.min.js';
import { RESTAURANT, REGULARS, DRINKS } from '../config/gameData.js';
import { tableCount, stoveCount } from '../core/restaurant.js';

// Gốc toạ độ quán trong thế giới (khớp World)
export const REST_ORIGIN = new THREE.Vector3(7.5, 0, -1.5);
const FLOOR_Y = 0.25;
// Vị trí bàn (tương đối với quán), tối đa 6
// 6 bàn trong quán + 2 bàn ngoài sân (bậc nâng cấp 4-5)
const TABLE_SPOTS = [[-1.5, -0.3], [0.6, -0.3], [2.5, -0.3], [-1.5, 1.45], [0.6, 1.45], [2.5, 1.45], [-2.4, 3.4], [2.6, 3.4]];
const ENTRANCE = new THREE.Vector3(REST_ORIGIN.x, 0, REST_ORIGIN.z + 4.2);
const STREET_IN = new THREE.Vector3(REST_ORIGIN.x + 9, 0, 8.2);
const STREET_OUT = new THREE.Vector3(REST_ORIGIN.x - 2, 0, 9.0);

// Màu món trên đĩa
const DISH_COLOR = {
  rauxao: 0x6fcf5a, trungchien: 0xffc94a, canhchua: 0xf2a05a, comphan: 0xfff6e0,
  canhcai: 0x9ed67a, comchien: 0xf5d27a, cakho: 0xa0603a, banhxeo: 0xf7c35c,
  canhbi: 0xf2a05a, chuoinuong: 0xf5d85a, dausotca: 0xd9603a, canuong: 0xc9873a, banhflan: 0xffd27a,
  thitkho: 0x9a4a2a, banhchung: 0x5f9e45, banhtrungthu: 0xd9a05a,
};
const DRINK_COLOR = { trada: 0xc98a3a, chedau: 0xb5d68a, nuocmia: 0xe6e08a, caphe: 0x8a5a3a, sinhto: 0xffb347 };
// Màu tường theo bậc sửa quán: lá -> gỗ -> gạch
const TIER_WALL = [null, 0xe6bb93, 0xe39a7f];

const rel = (x, z, y = 0) => new THREE.Vector3(REST_ORIGIN.x + x, y, REST_ORIGIN.z + z);

export class RestaurantView {
  constructor(world, models) {
    this.world = world;
    this.M = models;
    this.scene = world.scene;
    this.tables = [];
    this.customers = new Map(); // id -> { mesh, label }
    this.counterPlates = [];
    this.decorMeshes = {};
    this._buildFixed();
  }

  _hit(w, h, d, pos) {
    return this.world._addHitbox(w, h, d, pos.x, pos.y, pos.z);
  }

  _buildFixed() {
    const M = this.M;
    // Quầy món (cạnh bếp)
    const counter = new THREE.Group();
    counter.add(M.box(2.0, 0.9, 0.7, this.world.P.wood, 0, 0.45, 0));
    counter.add(M.box(2.1, 0.08, 0.8, this.world.P.woodDark, 0, 0.94, 0));
    counter.position.copy(rel(0.6, -1.95, FLOOR_Y));
    this.scene.add(counter);
    this.counterPos = counter.position.clone();
    this.world.obstacles.push({ minX: this.counterPos.x - 1.05, maxX: this.counterPos.x + 1.05, minZ: this.counterPos.z - 0.4, maxZ: this.counterPos.z + 0.4 });
    this.counter = this.world._addInteractable({
      type: 'counter', name: 'Quầy món',
      hitbox: this._hit(2.2, 1.6, 1.0, rel(0.6, -1.95, 0.9)),
      stand: rel(0.6, -0.95),
      anchor: rel(0.6, -1.95, 1.9),
    });
    // Bếp chính có sẵn trong mô hình quán; bếp 2 thêm khi nâng cấp
    this.stoves = [
      this.world._addInteractable({
        type: 'stove', slot: 0, name: 'Bếp',
        hitbox: this._hit(2.0, 1.8, 1.0, rel(-1.6, -1.75, 0.9)),
        stand: rel(-1.6, -0.75),
        anchor: rel(-1.6, -1.75, 2.1),
      }),
    ];
    this.world.obstacles.push({ minX: rel(-2.5, 0).x, maxX: rel(-0.7, 0).x, minZ: rel(0, -2.2).z, maxZ: rel(0, -1.3).z });
    this.stove2Mesh = M.stove();
    this.stove2Mesh.scale.setScalar(0.8);
    this.stove2Mesh.rotation.y = Math.PI / 2;
    this.stove2Mesh.position.copy(rel(-2.45, 0.35, FLOOR_Y));
    this.stove2Mesh.visible = false;
    this.scene.add(this.stove2Mesh);
    this.stoves.push(
      this.world._addInteractable({
        type: 'stove', slot: 1, name: 'Bếp 2',
        hitbox: this._hit(1.0, 1.6, 1.6, rel(-2.45, 0.35, 0.8)),
        stand: rel(-1.5, 0.35),
        anchor: rel(-2.45, 0.35, 2.0),
      })
    );
    this.stoves[1].hidden = true;
    // Quầy nước (GĐ6)
    const bar = this.M.drinkStation();
    bar.position.copy(rel(2.45, -1.95, FLOOR_Y));
    this.scene.add(bar);
    this.barPos = bar.position.clone();
    this.world.obstacles.push({ minX: this.barPos.x - 0.6, maxX: this.barPos.x + 0.6, minZ: this.barPos.z - 0.4, maxZ: this.barPos.z + 0.4 });
    this.drinkBar = this.world._addInteractable({
      type: 'drinks', name: 'Quầy nước',
      hitbox: this._hit(1.3, 1.6, 1.0, rel(2.45, -1.95, 0.9)),
      stand: rel(2.0, -1.0),
      anchor: rel(2.45, -1.95, 1.8),
    });
    this.cups = [];
    // Đồ trên tay nông dân
    this.carryMesh = new THREE.Group();
    this.scene.add(this.carryMesh);
  }

  // Bàn: thêm khi nâng cấp
  syncTables(state) {
    const n = tableCount(state);
    while (this.tables.length < n) {
      const i = this.tables.length;
      const [x, z] = TABLE_SPOTS[i];
      const t = this.M.table();
      t.position.copy(rel(x, z, FLOOR_Y));
      const stool = this.M.stool();
      stool.position.copy(rel(x, z + 0.85, FLOOR_Y));
      const dirty = new THREE.Group();
      dirty.add(this.M.dish(0xffffff, 0xc8b49a));
      const cup = this.M.mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 6), 0xd9eef7);
      cup.position.set(0.28, 0.07, -0.1);
      dirty.add(cup);
      dirty.position.copy(rel(x, z, FLOOR_Y + 0.83));
      dirty.visible = false;
      const plate = new THREE.Group();
      plate.position.copy(rel(x, z + 0.15, FLOOR_Y + 0.83));
      this.scene.add(t, stool, dirty, plate);
      this.world.obstacles.push({ x: t.position.x, z: t.position.z, r: 0.5 });
      const def = this.world._addInteractable({
        type: 'table', index: i, name: 'Bàn ' + (i + 1),
        hitbox: this._hit(1.5, 1.6, 2.2, rel(x, z + 0.4, 0.8)),
        stand: rel(x + 0.95, z + 0.45),
        anchor: rel(x, z + 0.85, 2.3),
      });
      this.tables.push({ table: t, stool, dirty, plate, def, seat: rel(x, z + 0.85), plateKey: '' });
      this.navDirty = true; // cần tính lại đường đi vì có vật cản mới
    }
    const s2 = stoveCount(state) > 1;
    this.stove2Mesh.visible = s2;
    this.stoves[1].hidden = !s2;
  }

  _foodPlate(dish) {
    return this.M.dish(0xffffff, DISH_COLOR[dish] || 0xffffff);
  }

  syncCounter(state) {
    const items = state.restaurant.counter;
    const key = items.join(',');
    if (key === this._counterKey) return;
    this._counterKey = key;
    this.counterPlates.forEach((p) => this.scene.remove(p));
    this.counterPlates = items.map((d, i) => {
      const p = this._foodPlate(d);
      p.position.copy(this.counterPos).add(new THREE.Vector3(-0.75 + (i % 6) * 0.3, 0.75, 0.05));
      p.scale.setScalar(0.7);
      this.scene.add(p);
      return p;
    });
  }

  _cup(drink) {
    const g = new THREE.Group();
    const glass = this.M.mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.2, 7), DRINK_COLOR[drink] || 0xffffff);
    glass.position.y = 0.1;
    const ice = this.M.box(0.1, 0.03, 0.1, 0xffffff, 0, 0.21, 0);
    g.add(glass, ice);
    return g;
  }

  syncDrinks(state) {
    const key = state.restaurant.drinkCounter.join(',');
    if (key === this._drinkKey) return;
    this._drinkKey = key;
    this.cups.forEach((c) => this.scene.remove(c));
    this.cups = state.restaurant.drinkCounter.map((d, i) => {
      const c = this._cup(d);
      c.position.copy(this.barPos).add(new THREE.Vector3(0.1 + (i % 4) * 0.2, 0.92, 0.2));
      this.scene.add(c);
      return c;
    });
  }

  // Đổi màu tường theo bậc sửa quán
  applyTier(level) {
    if (this._tier === level) return;
    this._tier = level;
    const P = this.world.P;
    this.world.restaurant.traverse((m) => {
      if (!m.isMesh) return;
      if (m.userData.origColor === undefined) m.userData.origColor = m.material.color.getHex();
      if (m.userData.origColor === new THREE.Color(P.wall).getHex()) m.material = this.M.mat(TIER_WALL[level] || P.wall);
    });
  }

  syncCarry(state, playerPos) {
    const d = state.restaurant.carry;
    if (d !== this._carryKey) {
      this._carryKey = d;
      this.carryMesh.clear();
      if (d) this.carryMesh.add(DRINKS[d] ? this._cup(d) : this._foodPlate(d));
    }
    if (d) this.carryMesh.position.set(playerPos.x, playerPos.y + 1.05, playerPos.z).add(this._carryOffset || new THREE.Vector3());
  }

  syncDecor(state) {
    const M = this.M;
    const P = this.world.P;
    const add = (id, build) => {
      if (state.decor[id] && !this.decorMeshes[id]) {
        const g = build();
        this.scene.add(g);
        this.decorMeshes[id] = g;
      }
    };
    add('denlong', () => {
      const g = new THREE.Group();
      g.add(M.box(6, 0.04, 0.04, P.woodDark, 0, 2.3, 0));
      for (let i = 0; i < 5; i++) {
        const l = M.lantern();
        l.scale.setScalar(0.8);
        l.position.set(-2.4 + i * 1.2, 2.05, 0);
        g.add(l);
      }
      g.position.copy(rel(0, 2.45));
      return g;
    });
    add('chauhoa', () => {
      const g = new THREE.Group();
      [-1.1, 1.1].forEach((x) => {
        const pot = M.mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.4, 7), P.roof);
        pot.position.set(x, 0.2, 0);
        const b = M.bush(x, 0, 0.55);
        b.position.y = 0.3;
        b.children.forEach((c, i) => (c.material = M.mat(P.flower[i % P.flower.length])));
        g.add(pot, b);
      });
      g.position.copy(rel(0, 3.1));
      return g;
    });
    add('caycanh', () => {
      const g = new THREE.Group();
      const trunk = M.mesh(new THREE.CylinderGeometry(0.1, 0.16, 2.4, 6), P.trunk);
      trunk.position.y = 1.2;
      g.add(trunk);
      for (let i = 0; i < 6; i++) {
        const leaf = M.mesh(new THREE.ConeGeometry(0.18, 1.3, 4), P.leaf2);
        const a = (i / 6) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.45, 2.35, Math.sin(a) * 0.45);
        leaf.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
        g.add(leaf);
      }
      g.position.copy(rel(3.9, -3.1));
      return g;
    });
    add('chuonggio', () => {
      const g = new THREE.Group();
      g.add(M.box(0.04, 0.5, 0.04, P.woodDark, 0, 2.0, 0));
      for (let i = 0; i < 4; i++) {
        const t = M.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 5), P.water);
        t.position.set(-0.12 + i * 0.08, 1.6, 0);
        g.add(t);
      }
      g.position.copy(rel(2.9, 2.3));
      return g;
    });
    add('xichdu', () => {
      const g = new THREE.Group();
      [-0.7, 0.7].forEach((x) => g.add(M.box(0.12, 2, 0.12, P.woodDark, x, 1, 0)));
      g.add(M.box(1.6, 0.12, 0.12, P.woodDark, 0, 2, 0));
      g.add(M.box(0.9, 0.08, 0.4, P.wood, 0, 0.55, 0));
      [-0.4, 0.4].forEach((x) => g.add(M.box(0.02, 1.45, 0.02, P.woodDark, x, 1.28, 0)));
      g.position.copy(rel(4.3, 2.0));
      g.rotation.y = -0.6;
      return g;
    });
    add('banggo', () => {
      const g = new THREE.Group();
      g.add(M.box(0.08, 1.1, 0.08, P.woodDark, -0.35, 0.55, 0), M.box(0.08, 1.1, 0.08, P.woodDark, 0.35, 0.55, 0));
      g.add(M.box(0.9, 0.7, 0.06, 0x4a5a4a, 0, 1.0, 0.02));
      g.position.copy(rel(-3.9, 2.4));
      g.rotation.y = 0.6;
      return g;
    });
  }

  // ---- Khách ----
  _makeCustomer(c) {
    let mesh;
    if (c.regular) {
      const reg = REGULARS.find((g) => g.id === c.regular);
      mesh = this.M.person({ shirt: reg.color, pants: this.world.P.pants, skin: this.world.P.skin, hair: [0xdddddd, 0x3a2a20, 0x6b4a2e, 0x1f1f2a][REGULARS.indexOf(reg)] });
    } else {
      mesh = this.M.customer(c.look);
    }
    if (c.vip) {
      const crown = this.M.mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.16, 5, 1, true), 0xffd34e);
      crown.position.y = 1.5;
      mesh.add(crown);
    }
    mesh.scale.setScalar(0.92);
    this.scene.add(mesh);
    return { mesh, walkT: 0 };
  }

  _pathPos(points, t) {
    // t trong [0,1] dọc theo đường gấp khúc
    const segs = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const d = points[i].distanceTo(points[i - 1]);
      segs.push(d);
      total += d;
    }
    let dist = Math.min(1, Math.max(0, t)) * total;
    for (let i = 0; i < segs.length; i++) {
      if (dist <= segs[i] || i === segs.length - 1) {
        const k = segs[i] ? Math.min(1, dist / segs[i]) : 1;
        const pos = points[i].clone().lerp(points[i + 1], k);
        const dir = points[i + 1].clone().sub(points[i]);
        return { pos, dir };
      }
      dist -= segs[i];
    }
    return { pos: points.at(-1).clone(), dir: new THREE.Vector3(0, 0, -1) };
  }

  update(state, dt, time) {
    const r = state.restaurant;
    this.syncTables(state);
    this.syncCounter(state);
    this.syncDecor(state);
    this.syncDrinks(state);
    this.applyTier(state.upgrades.renovate || 0);
    // Bàn bẩn
    this.tables.forEach((t, i) => (t.dirty.visible = !!r.dirty[i]));
    // Khách
    const alive = new Set();
    r.customers.forEach((c) => {
      alive.add(c.id);
      let v = this.customers.get(c.id);
      if (!v) {
        v = this._makeCustomer(c);
        this.customers.set(c.id, v);
      }
      const t = this.tables[c.table];
      if (!t) return;
      const m = v.mesh;
      const parts = m.userData.parts;
      let walking = false;
      if (c.state === 'arriving') {
        const { pos, dir } = this._pathPos([STREET_IN, ENTRANCE, t.seat], c.t / RESTAURANT.walkIn);
        m.position.copy(pos);
        m.rotation.y = Math.atan2(dir.x, dir.z);
        walking = true;
      } else if (c.state === 'leaving') {
        const { pos, dir } = this._pathPos([t.seat, ENTRANCE, STREET_OUT], c.t / 3);
        m.position.copy(pos);
        m.rotation.y = Math.atan2(dir.x, dir.z);
        walking = true;
      } else {
        // Ngồi trên ghế, quay mặt vào bàn
        m.position.set(t.seat.x, FLOOR_Y + 0.12, t.seat.z);
        m.rotation.y = Math.PI;
      }
      v.walkT += dt * 10;
      const sw = walking ? Math.sin(v.walkT) * 0.6 : 0;
      if (walking) {
        parts.legL.rotation.x = sw;
        parts.legR.rotation.x = -sw;
        m.position.y = Math.abs(Math.sin(v.walkT)) * 0.06;
      } else {
        parts.legL.rotation.x = parts.legR.rotation.x = -1.3;
      }
      // Ăn: tay đưa lên xuống
      const eating = c.state === 'eating';
      parts.armR.rotation.x = eating ? -1 - Math.max(0, Math.sin(time * 6)) * 0.6 : walking ? -sw : 0;
      parts.armL.rotation.x = walking ? sw : 0;
      // Đĩa trên bàn
      const plateKey = eating ? c.served : '';
      if (t.plateKey !== plateKey) {
        t.plateKey = plateKey;
        t.plate.clear();
        if (plateKey) t.plate.add(this._foodPlate(plateKey));
      }
    });
    for (const [id, v] of this.customers) {
      if (!alive.has(id)) {
        this.scene.remove(v.mesh);
        this.customers.delete(id);
      }
    }
    this.tables.forEach((t) => {
      if (t.plateKey && !r.customers.some((c) => c.state === 'eating' && this.tables[c.table] === t)) {
        t.plateKey = '';
        t.plate.clear();
      }
    });
  }

  customerMesh(id) {
    return this.customers.get(id)?.mesh;
  }
}
