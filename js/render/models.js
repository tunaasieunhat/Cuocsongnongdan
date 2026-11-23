// Mô hình low-poly tạo hoàn toàn bằng code (ghép khối cơ bản), không cần file asset.
// Mọi hàm nhận một "Models" đã gắn bảng màu, nên đổi phong cách chỉ cần đổi palette.
import * as THREE from '../../vendor/three.module.min.js';

export class Models {
  constructor(palette) {
    this.p = palette;
    this._mats = new Map();
    if (palette.toon) {
      // Dải 3 tông cho hiệu ứng đổ bóng hoạt hình
      const data = new Uint8Array([90, 170, 255]);
      this._gradient = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
      this._gradient.minFilter = THREE.NearestFilter;
      this._gradient.magFilter = THREE.NearestFilter;
      this._gradient.needsUpdate = true;
    }
  }

  // Vật liệu được cache theo màu để tiết kiệm bộ nhớ trên điện thoại
  mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    let m = this._mats.get(key);
    if (!m) {
      if (opts.emissive) {
        m = new THREE.MeshBasicMaterial({ color });
      } else if (this.p.toon) {
        m = new THREE.MeshToonMaterial({ color, gradientMap: this._gradient, ...opts });
      } else {
        m = new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });
      }
      this._mats.set(key, m);
    }
    return m;
  }

  mesh(geo, color, opts) {
    const m = new THREE.Mesh(geo, this.mat(color, opts));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  box(w, h, d, color, x = 0, y = 0, z = 0) {
    const m = this.mesh(new THREE.BoxGeometry(w, h, d), color);
    m.position.set(x, y, z);
    return m;
  }

  // ---------- Địa hình ----------

  // Đảo nổi kiểu "diorama": mặt cỏ + vách đất hai lớp
  island(w, d) {
    const g = new THREE.Group();
    const top = this.box(w, 0.4, d, this.p.grass, 0, -0.2, 0);
    top.castShadow = false;
    g.add(top);
    const c1 = this.box(w - 0.2, 1.2, d - 0.2, this.p.cliff, 0, -1, 0);
    const c2 = this.box(w - 0.8, 1.2, d - 0.8, this.p.cliffDark, 0, -2.2, 0);
    c1.castShadow = c2.castShadow = false;
    g.add(c1, c2);
    return g;
  }

  path(w, d, x, z) {
    const m = this.box(w, 0.06, d, this.p.path, x, 0.03, z);
    m.castShadow = false;
    return m;
  }

  grassTuft(x, z) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const c = this.mesh(new THREE.ConeGeometry(0.07, 0.35, 4), this.p.grassDark);
      c.position.set((i - 1) * 0.1, 0.17, (i % 2) * 0.06);
      c.rotation.z = (i - 1) * 0.35;
      g.add(c);
    }
    g.position.set(x, 0, z);
    return g;
  }

  flower(x, z, i = 0) {
    const g = new THREE.Group();
    const stem = this.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), this.p.leaf2);
    stem.position.y = 0.15;
    const head = this.mesh(new THREE.IcosahedronGeometry(0.09, 0), this.p.flower[i % this.p.flower.length]);
    head.position.y = 0.32;
    g.add(stem, head);
    g.position.set(x, 0, z);
    return g;
  }

  rock(x, z, s = 1) {
    const m = this.mesh(new THREE.DodecahedronGeometry(0.35 * s, 0), this.p.rock);
    m.position.set(x, 0.12 * s, z);
    m.scale.y = 0.6;
    m.rotation.y = x * 3.1;
    return m;
  }

  treeRound(x, z, s = 1) {
    const g = new THREE.Group();
    const trunk = this.mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.1, 6), this.p.trunk);
    trunk.position.y = 0.55;
    const a = this.mesh(new THREE.IcosahedronGeometry(0.9, 0), this.p.leaf);
    a.position.y = 1.6;
    const b = this.mesh(new THREE.IcosahedronGeometry(0.6, 0), this.p.leaf);
    b.position.set(0.45, 1.25, 0.2);
    g.add(trunk, a, b);
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    g.rotation.y = x + z;
    return g;
  }

  treePine(x, z, s = 1) {
    const g = new THREE.Group();
    const trunk = this.mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 6), this.p.trunk);
    trunk.position.y = 0.3;
    g.add(trunk);
    [[0.85, 1.0, 0.9], [0.65, 0.9, 1.45], [0.42, 0.75, 1.95]].forEach(([r, h, y]) => {
      const c = this.mesh(new THREE.ConeGeometry(r, h, 7), this.p.leaf2);
      c.position.y = y;
      g.add(c);
    });
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    return g;
  }

  bush(x, z, s = 1) {
    const g = new THREE.Group();
    [[0, 0.3, 0, 0.45], [0.35, 0.25, 0.1, 0.32], [-0.3, 0.22, 0.05, 0.3]].forEach(([bx, by, bz, r]) => {
      const b = this.mesh(new THREE.IcosahedronGeometry(r, 0), this.p.leaf);
      b.position.set(bx, by, bz);
      g.add(b);
    });
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    return g;
  }

  fence(length, x, z, rotY = 0) {
    const g = new THREE.Group();
    const posts = Math.max(2, Math.round(length / 1) + 1);
    for (let i = 0; i < posts; i++) {
      const px = -length / 2 + (length * i) / (posts - 1);
      g.add(this.box(0.14, 0.7, 0.14, this.p.wood, px, 0.35, 0));
    }
    g.add(this.box(length, 0.08, 0.06, this.p.wood, 0, 0.5, 0));
    g.add(this.box(length, 0.08, 0.06, this.p.wood, 0, 0.25, 0));
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    return g;
  }

  pond(x, z, r = 1.6) {
    const g = new THREE.Group();
    const rim = this.mesh(new THREE.CylinderGeometry(r + 0.25, r + 0.3, 0.12, 10), this.p.path);
    rim.position.y = 0.06;
    rim.castShadow = false;
    const water = this.mesh(new THREE.CylinderGeometry(r, r, 0.14, 10), this.p.water);
    water.position.y = 0.08;
    water.castShadow = false;
    g.add(rim, water);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      g.add(this.rock(Math.cos(a) * (r + 0.25), Math.sin(a) * (r + 0.25), 0.6 + (i % 3) * 0.2));
    }
    // Lá sen
    const pad = this.mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 7), this.p.leaf);
    pad.position.set(0.4, 0.17, -0.3);
    g.add(pad);
    g.position.set(x, 0, z);
    return g;
  }

  // ---------- Nông trại ----------

  // Ô đất: trả về group, soil có thể đổi màu khô/ướt qua setPlotWet
  plot() {
    const g = new THREE.Group();
    const rim = this.box(1.9, 0.18, 1.9, this.p.woodDark, 0, 0.09, 0);
    rim.castShadow = false;
    const soil = this.box(1.65, 0.22, 1.65, this.p.soil, 0, 0.12, 0);
    soil.castShadow = false;
    // Luống đất
    for (let i = -1; i <= 1; i++) {
      const ridge = this.box(1.5, 0.06, 0.18, this.p.soil, 0, 0.25, i * 0.5);
      ridge.castShadow = false;
      g.add(ridge);
      g.userData.ridges = (g.userData.ridges || []).concat(ridge);
    }
    g.add(rim, soil);
    g.userData.soil = soil;
    return g;
  }

  setPlotWet(plotGroup, wet) {
    const c = wet ? this.p.soilWet : this.p.soil;
    plotGroup.userData.soil.material = this.mat(c);
    plotGroup.userData.ridges.forEach((r) => (r.material = this.mat(c)));
  }

  // stage: 0 = vừa gieo, 1 = mầm, 2 = đang lớn, 3 = chín
  crop(type, stage) {
    const g = new THREE.Group();
    const spots = [-0.5, 0, 0.5];
    if (stage === 0) {
      spots.forEach((sx) =>
        spots.forEach((sz) => {
          const s = this.mesh(new THREE.IcosahedronGeometry(0.06, 0), this.p.woodDark);
          s.position.set(sx, 0.3, sz);
          g.add(s);
        })
      );
      return g;
    }
    if (type === 'lua') {
      const color = stage === 3 ? this.p.riceRipe : this.p.rice;
      const h = [0, 0.35, 0.65, 0.9][stage];
      spots.forEach((sx) =>
        spots.forEach((sz) => {
          for (let k = 0; k < 3; k++) {
            const c = this.mesh(new THREE.ConeGeometry(0.05, h, 3), color);
            c.position.set(sx + (k - 1) * 0.08, 0.28 + h / 2, sz + ((k * 7) % 3 - 1) * 0.05);
            c.rotation.z = (k - 1) * 0.25;
            if (stage === 3) c.rotation.x = 0.3;
            g.add(c);
          }
          if (stage === 3) {
            const head = this.mesh(new THREE.IcosahedronGeometry(0.09, 0), this.p.riceRipe);
            head.position.set(sx, 0.28 + h, sz + 0.12);
            head.scale.set(0.8, 1.4, 0.8);
            g.add(head);
          }
        })
      );
      return g;
    }
    if (type === 'rau') {
      const n = stage === 1 ? 2 : stage === 2 ? 4 : 6;
      const len = [0, 0.25, 0.4, 0.55][stage];
      [-0.42, 0.42].forEach((sx) =>
        [-0.42, 0.42].forEach((sz) => {
          for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2;
            const leaf = this.mesh(new THREE.ConeGeometry(0.09, len, 4), this.p.veg);
            leaf.position.set(sx + Math.cos(a) * 0.1, 0.28 + len / 2, sz + Math.sin(a) * 0.1);
            leaf.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
            g.add(leaf);
          }
        })
      );
      return g;
    }
    if (type === 'cachua') {
      const r = [0, 0.18, 0.3, 0.36][stage];
      [[-0.4, -0.4], [0.4, 0.4], [-0.4, 0.4], [0.4, -0.4]].forEach(([sx, sz], i) => {
        const stake = this.mesh(new THREE.CylinderGeometry(0.025, 0.025, r * 3, 4), this.p.woodDark);
        stake.position.set(sx, 0.28 + r * 1.5, sz);
        const bushM = this.mesh(new THREE.IcosahedronGeometry(r, 0), this.p.leaf);
        bushM.position.set(sx, 0.3 + r * 1.2, sz);
        g.add(stake, bushM);
        if (stage === 3) {
          for (let k = 0; k < 3; k++) {
            const t = this.mesh(new THREE.IcosahedronGeometry(0.1, 1), this.p.tomato);
            const a = k * 2.1 + i;
            t.position.set(sx + Math.cos(a) * r * 0.9, 0.25 + r * (0.9 + k * 0.25), sz + Math.sin(a) * r * 0.9);
            g.add(t);
          }
        }
      });
      return g;
    }
    return g;
  }

  chicken(x = 0, z = 0) {
    const g = new THREE.Group();
    const body = this.mesh(new THREE.IcosahedronGeometry(0.26, 0), this.p.chicken);
    body.position.y = 0.32;
    body.scale.set(1, 0.9, 1.2);
    const tail = this.mesh(new THREE.ConeGeometry(0.12, 0.25, 4), this.p.chicken);
    tail.position.set(0, 0.45, -0.28);
    tail.rotation.x = -0.8;
    const head = this.mesh(new THREE.IcosahedronGeometry(0.15, 0), this.p.chicken);
    head.position.set(0, 0.58, 0.22);
    const comb = this.box(0.04, 0.1, 0.14, this.p.comb, 0, 0.74, 0.22);
    const beak = this.mesh(new THREE.ConeGeometry(0.05, 0.12, 4), this.p.beak);
    beak.position.set(0, 0.56, 0.38);
    beak.rotation.x = Math.PI / 2;
    const legL = this.box(0.04, 0.14, 0.04, this.p.beak, -0.08, 0.07, 0);
    const legR = this.box(0.04, 0.14, 0.04, this.p.beak, 0.08, 0.07, 0);
    g.add(body, tail, head, comb, beak, legL, legR);
    g.position.set(x, 0, z);
    return g;
  }

  egg(x = 0, z = 0) {
    const e = this.mesh(new THREE.SphereGeometry(0.1, 6, 5), 0xfff6e0);
    e.scale.y = 1.3;
    e.position.set(x, 0.13, z);
    return e;
  }

  coop() {
    const g = new THREE.Group();
    // Nhà gà nhỏ trên cột
    const base = this.box(1.6, 0.9, 1.3, this.p.wood, 0, 0.75, -0.6);
    const roof = this.mesh(new THREE.ConeGeometry(1.3, 0.8, 4), this.p.roof);
    roof.position.set(0, 1.6, -0.6);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.85);
    const door = this.box(0.45, 0.5, 0.05, this.p.woodDark, 0, 0.6, 0.06);
    const ramp = this.box(0.4, 0.05, 0.8, this.p.woodDark, 0, 0.18, 0.4);
    ramp.rotation.x = 0.45;
    g.add(base, roof, door, ramp);
    [[-0.7, -1.15], [0.7, -1.15], [-0.7, -0.05], [0.7, -0.05]].forEach(([px, pz]) =>
      g.add(this.box(0.12, 0.35, 0.12, this.p.woodDark, px, 0.17, pz))
    );
    // Rào sân gà
    g.add(this.fence(3.2, 0, 1.6));
    g.add(this.fence(2.9, -1.6, 0.15, Math.PI / 2));
    g.add(this.fence(2.9, 1.6, 0.15, Math.PI / 2));
    // Máng ăn
    g.add(this.box(0.8, 0.15, 0.3, this.p.woodDark, 0.8, 0.08, 0.9));
    return g;
  }

  // ---------- Nhân vật ----------

  person({ shirt, pants, skin, hat = null, hair = null }) {
    const g = new THREE.Group();
    const legL = this.box(0.16, 0.4, 0.18, pants, -0.11, 0.2, 0);
    const legR = this.box(0.16, 0.4, 0.18, pants, 0.11, 0.2, 0);
    const body = this.mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.55, 6), shirt);
    body.position.y = 0.67;
    const armL = this.box(0.12, 0.42, 0.14, shirt, -0.33, 0.7, 0);
    const armR = this.box(0.12, 0.42, 0.14, shirt, 0.33, 0.7, 0);
    armL.rotation.z = 0.15;
    armR.rotation.z = -0.15;
    const head = this.mesh(new THREE.IcosahedronGeometry(0.27, 1), skin);
    head.position.y = 1.18;
    // Mắt
    const eyeMat = 0x2b2b2b;
    const eyeL = this.box(0.05, 0.08, 0.03, eyeMat, -0.09, 1.2, 0.25);
    const eyeR = this.box(0.05, 0.08, 0.03, eyeMat, 0.09, 1.2, 0.25);
    eyeL.castShadow = eyeR.castShadow = false;
    g.add(legL, legR, body, armL, armR, head, eyeL, eyeR);
    if (hat) {
      // Nón lá
      const n = this.mesh(new THREE.ConeGeometry(0.62, 0.4, 12), hat);
      n.position.y = 1.5;
      g.add(n);
    } else if (hair) {
      const h = this.mesh(new THREE.IcosahedronGeometry(0.29, 1), hair);
      h.position.set(0, 1.26, -0.04);
      h.scale.set(1, 0.8, 1);
      g.add(h);
    }
    g.userData.parts = { legL, legR, armL, armR, body, head };
    return g;
  }

  farmer() {
    return this.person({ shirt: this.p.shirt, pants: this.p.pants, skin: this.p.skin, hat: this.p.hat });
  }

  customer(i = 0) {
    const shirts = this.p.customers;
    const hairs = [0x3a2a20, 0x6b4a2e, 0x1f1f2a, 0x8a5a3a];
    return this.person({
      shirt: shirts[i % shirts.length],
      pants: this.p.pants,
      skin: this.p.skin,
      hair: hairs[i % hairs.length],
    });
  }

  // ---------- Công trình ----------

  house() {
    const g = new THREE.Group();
    g.add(this.box(3, 0.3, 2.6, this.p.woodDark, 0, 0.15, 0));
    g.add(this.box(2.8, 1.7, 2.4, this.p.wall, 0, 1.15, 0));
    const roof = this.mesh(new THREE.ConeGeometry(2.4, 1.4, 4), this.p.roof);
    roof.position.y = 2.7;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.05, 1, 0.95);
    g.add(roof);
    g.add(this.box(0.7, 1.1, 0.06, this.p.woodDark, 0, 0.85, 1.21));
    g.add(this.box(0.55, 0.5, 0.06, this.p.water, 0.9, 1.3, 1.21));
    g.add(this.box(0.55, 0.5, 0.06, this.p.water, -0.9, 1.3, 1.21));
    // Ống khói
    g.add(this.box(0.35, 0.8, 0.35, this.p.cliff, 0.8, 3.1, -0.4));
    return g;
  }

  // Sạp chợ bán hạt giống / mua nông sản
  marketStall() {
    const g = new THREE.Group();
    g.add(this.box(2, 0.8, 1, this.p.wood, 0, 0.4, 0));
    g.add(this.box(2.1, 0.08, 1.1, this.p.woodDark, 0, 0.84, 0));
    [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.45], [0.9, 0.45]].forEach(([px, pz]) =>
      g.add(this.box(0.1, 2, 0.1, this.p.woodDark, px, 1, pz))
    );
    // Mái sọc
    for (let i = 0; i < 6; i++) {
      const s = this.box(0.38, 0.08, 1.4, this.p.awning[i % 2], -0.95 + i * 0.38, 2.05, 0.1);
      s.rotation.x = -0.25;
      g.add(s);
    }
    // Sọt hàng
    const crates = [this.p.veg, this.p.tomato, this.p.riceRipe];
    crates.forEach((c, i) => {
      g.add(this.box(0.5, 0.25, 0.45, this.p.woodDark, -0.6 + i * 0.6, 1.0, 0.1));
      for (let k = 0; k < 3; k++) {
        const v = this.mesh(new THREE.IcosahedronGeometry(0.09, 0), c);
        v.position.set(-0.72 + i * 0.6 + k * 0.12, 1.18, 0.1 + (k % 2) * 0.08);
        g.add(v);
      }
    });
    // Bánh xe
    [-0.75, 0.75].forEach((px) => {
      const w = this.mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8), this.p.woodDark);
      w.rotation.x = Math.PI / 2;
      w.position.set(px, 0.3, 0.55);
      g.add(w);
    });
    return g;
  }

  table() {
    const g = new THREE.Group();
    const top = this.mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 8), this.p.wood);
    top.position.y = 0.75;
    const leg = this.mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.7, 6), this.p.woodDark);
    leg.position.y = 0.35;
    g.add(top, leg);
    return g;
  }

  stool() {
    const g = new THREE.Group();
    const seat = this.mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 6), this.p.roof);
    seat.position.y = 0.45;
    g.add(seat);
    [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]].forEach(([px, pz]) =>
      g.add(this.box(0.05, 0.45, 0.05, this.p.woodDark, px, 0.22, pz))
    );
    return g;
  }

  dish(color = 0xffffff, food = null) {
    const g = new THREE.Group();
    const plate = this.mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.05, 8), color);
    g.add(plate);
    if (food) {
      const f = this.mesh(new THREE.IcosahedronGeometry(0.13, 0), food);
      f.position.y = 0.08;
      f.scale.y = 0.6;
      g.add(f);
    }
    return g;
  }

  lantern() {
    const g = new THREE.Group();
    const body = this.mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 8), this.p.lantern, { emissive: true });
    body.scale.set(1, 1, 1);
    const top = this.box(0.22, 0.05, 0.22, this.p.accent, 0, 0.18, 0);
    const bot = this.box(0.22, 0.05, 0.22, this.p.accent, 0, -0.18, 0);
    g.add(body, top, bot);
    return g;
  }

  stove() {
    const g = new THREE.Group();
    g.add(this.box(1.8, 0.9, 0.8, this.p.wall, 0, 0.45, 0));
    g.add(this.box(1.9, 0.08, 0.9, this.p.woodDark, 0, 0.94, 0));
    // Nồi + chảo
    const pot = this.mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.3, 8), 0x9aa4ad);
    pot.position.set(-0.45, 1.13, 0);
    const pan = this.mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.08, 8), 0x4a4a52);
    pan.position.set(0.4, 1.02, 0);
    const handle = this.box(0.4, 0.04, 0.06, 0x4a4a52, 0.75, 1.03, 0);
    g.add(pot, pan, handle);
    return g;
  }

  // Quán ăn: sàn gỗ, 2 bức tường, mái hiên sọc, bảng hiệu, đèn lồng
  restaurant(tableCount = 3) {
    const g = new THREE.Group();
    const W = 6, D = 5;
    const floor = this.box(W, 0.25, D, this.p.wood, 0, 0.125, 0);
    floor.castShadow = false;
    g.add(floor);
    // Kẻ ván sàn
    for (let i = 1; i < 6; i++) {
      const line = this.box(0.03, 0.01, D, this.p.woodDark, -W / 2 + i, 0.255, 0);
      line.castShadow = false;
      g.add(line);
    }
    g.add(this.box(W, 2.2, 0.25, this.p.wall, 0, 1.35, -D / 2 + 0.12));
    g.add(this.box(0.25, 2.2, D, this.p.wall, -W / 2 + 0.12, 1.35, 0));
    // Chân tường gỗ
    g.add(this.box(W, 0.5, 0.3, this.p.woodDark, 0, 0.5, -D / 2 + 0.14));
    g.add(this.box(0.3, 0.5, D, this.p.woodDark, -W / 2 + 0.14, 0.5, 0));
    // Cửa sổ
    g.add(this.box(1, 0.7, 0.05, this.p.water, 1.5, 1.6, -D / 2 + 0.26));
    // Mái hiên sọc phía sau
    for (let i = 0; i < 8; i++) {
      const s = this.box(W / 8, 0.08, 1.2, this.p.awning[i % 2], -W / 2 + W / 16 + (i * W) / 8, 2.5, -D / 2 + 0.5);
      s.rotation.x = 0.35;
      g.add(s);
    }
    // Bảng hiệu
    const sign = this.box(2.2, 0.6, 0.12, this.p.accent, -0.6, 2.95, -D / 2 + 0.1);
    g.add(sign);
    g.add(this.box(2.0, 0.42, 0.02, this.p.woodDark, -0.6, 2.95, -D / 2 + 0.17));
    // Bếp
    const st = this.stove();
    st.position.set(-1.6, 0.25, -D / 2 + 0.75);
    g.add(st);
    g.userData.stove = st;
    // Bàn ghế
    const spots = [[0.2, 0.2], [2.0, -0.6], [1.6, 1.5], [-1.4, 1.4]];
    g.userData.tables = [];
    for (let i = 0; i < tableCount; i++) {
      const [tx, tz] = spots[i];
      const t = this.table();
      t.position.set(tx, 0.25, tz);
      const s = this.stool();
      s.position.set(tx + 0.75, 0.25, tz + 0.3);
      g.add(t, s);
      g.userData.tables.push({ table: t, stool: s });
    }
    // Đèn lồng
    [[-2.6, -1.9], [2.6, -1.9], [-2.6, 1.9]].forEach(([lx, lz]) => {
      const l = this.lantern();
      l.position.set(lx, 2.2, lz);
      g.add(l);
    });
    // Cột góc trước
    g.add(this.box(0.18, 2.2, 0.18, this.p.woodDark, W / 2 - 0.1, 1.35, D / 2 - 0.1));
    g.add(this.box(0.18, 2.2, 0.18, this.p.woodDark, -W / 2 + 0.1, 1.35, D / 2 - 0.1));
    // Chậu cây
    const potPlant = this.bush(W / 2 - 0.5, -D / 2 + 0.6, 0.6);
    potPlant.position.y = 0.25;
    g.add(potPlant);
    return g;
  }
  // ---------- Phong cách "Giấc Mơ": ruộng lô, cây hoa, đèn, cổng ----------

  // Khung lô ruộng gỗ nâng cao, bên trong chia ô
  lotFrame(size) {
    const g = new THREE.Group();
    const base = this.box(size, 0.22, size, this.p.woodDark, 0, 0.11, 0);
    base.castShadow = false;
    g.add(base);
    const t = 0.26, h = 0.42, c = this.p.wood;
    g.add(this.box(size + t, h, t, c, 0, h / 2, -size / 2));
    g.add(this.box(size + t, h, t, c, 0, h / 2, size / 2));
    g.add(this.box(t, h, size, c, -size / 2, h / 2, 0));
    g.add(this.box(t, h, size, c, size / 2, h / 2, 0));
    // Cọc góc
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
      g.add(this.box(0.34, h + 0.12, 0.34, this.p.woodDark, (sx * size) / 2, (h + 0.12) / 2, (sz * size) / 2))
    );
    return g;
  }

  // Một ô đất trong lô: cỏ khi chưa xới, đất luống khi đã xới
  cell(size = 1.6) {
    const g = new THREE.Group();
    const grass = this.box(size, 0.12, size, this.p.grassDark, 0, 0.28, 0);
    grass.castShadow = false;
    const tufts = new THREE.Group();
    [[-0.4, -0.3], [0.35, 0.2], [-0.1, 0.45], [0.45, -0.45]].forEach(([x, z]) => {
      const t = this.grassTuft(x, z);
      t.scale.setScalar(0.8);
      tufts.add(t);
    });
    tufts.position.y = 0.34;
    const soil = this.box(size, 0.16, size, this.p.soilTilled || this.p.soil, 0, 0.3, 0);
    soil.castShadow = false;
    const ridges = [];
    for (let i = -1; i <= 1; i++) {
      const r = this.box(size * 0.9, 0.07, 0.2, this.p.soilTilled || this.p.soil, 0, 0.41, i * (size / 3));
      r.castShadow = false;
      ridges.push(r);
      g.add(r);
    }
    g.add(grass, tufts, soil);
    g.userData = { grass, tufts, soil, ridges };
    return g;
  }

  setCellState(cell, { tilled, watered, locked }) {
    const u = cell.userData;
    const showSoil = tilled && !locked;
    u.grass.visible = !showSoil;
    u.tufts.visible = !showSoil;
    u.soil.visible = showSoil;
    u.ridges.forEach((r) => (r.visible = showSoil));
    const c = watered ? this.p.soilWet : this.p.soilTilled || this.p.soil;
    u.soil.material = this.mat(c);
    u.ridges.forEach((r) => (r.material = this.mat(c)));
    // Ô khoá: cỏ nhạt hơn và không có khóm cỏ, nhìn khác ô đã mở
    u.grass.material = this.mat(locked ? this.p.cliff : this.p.grassDark);
    if (locked) u.tufts.visible = false;
  }

  cherryTree(x, z, s = 1) {
    const g = new THREE.Group();
    const trunk = this.mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.2, 6), this.p.trunk);
    trunk.position.y = 0.6;
    g.add(trunk);
    const bl = this.p.blossom || [this.p.roof];
    [[0, 1.75, 0, 0.85], [0.5, 1.45, 0.25, 0.55], [-0.45, 1.5, -0.2, 0.55], [0.1, 2.25, -0.1, 0.5]].forEach(([bx, by, bz, r], i) => {
      const b = this.mesh(new THREE.IcosahedronGeometry(r, 0), bl[i % bl.length]);
      b.position.set(bx, by, bz);
      g.add(b);
    });
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    g.rotation.y = x * 1.7 + z;
    return g;
  }

  lampPost(x, z) {
    const g = new THREE.Group();
    const pole = this.mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.2, 6), this.p.lamp || this.p.woodDark);
    pole.position.y = 1.1;
    const lamp = this.mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.3, 6), this.p.lantern, { emissive: true });
    lamp.position.y = 2.32;
    const cap = this.mesh(new THREE.ConeGeometry(0.22, 0.18, 6), this.p.lamp || this.p.woodDark);
    cap.position.y = 2.56;
    const foot = this.mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.16, 6), this.p.lamp || this.p.woodDark);
    foot.position.y = 0.08;
    g.add(pole, lamp, cap, foot);
    g.position.set(x, 0, z);
    return g;
  }

  // Cổng vòm kết hoa
  flowerArch(x, z, rotY = 0, width = 2.4) {
    const g = new THREE.Group();
    const h = 2.2;
    [-1, 1].forEach((sx) => g.add(this.box(0.16, h, 0.16, this.p.wall, (sx * width) / 2, h / 2, 0)));
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * (i / n);
      const px = -Math.cos(a) * (width / 2);
      const py = h + Math.sin(a) * 0.55;
      const seg = this.box(0.32, 0.12, 0.18, this.p.wall, px, py, 0);
      seg.rotation.z = Math.PI / 2 - a;
      g.add(seg);
      const f = this.mesh(new THREE.IcosahedronGeometry(0.11, 0), this.p.flower[i % this.p.flower.length]);
      f.position.set(px, py + 0.1, 0.1);
      g.add(f);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    return g;
  }

  scarecrow(x, z) {
    const g = new THREE.Group();
    g.add(this.box(0.1, 1.7, 0.1, this.p.woodDark, 0, 0.85, 0));
    g.add(this.box(1.1, 0.08, 0.08, this.p.woodDark, 0, 1.25, 0));
    const shirt = this.mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.6, 6), this.p.roof);
    shirt.position.y = 1.15;
    const head = this.mesh(new THREE.IcosahedronGeometry(0.22, 0), this.p.hat);
    head.position.y = 1.65;
    const hat = this.mesh(new THREE.ConeGeometry(0.42, 0.3, 10), this.p.hat);
    hat.position.y = 1.9;
    g.add(shirt, head, hat);
    g.position.set(x, 0, z);
    return g;
  }

  signBoard(x, z, rotY = 0) {
    const g = new THREE.Group();
    g.add(this.box(0.1, 1.0, 0.1, this.p.woodDark, 0, 0.5, 0));
    g.add(this.box(0.9, 0.5, 0.08, this.p.wood, 0, 1.0, 0.05));
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    return g;
  }

  // Đường đá lát rải rác (mỗi viên là một lăng trụ dẹt)
  stones(points) {
    const g = new THREE.Group();
    points.forEach(([x, z], i) => {
      const r = 0.32 + ((i * 37) % 10) / 60;
      const st = this.mesh(new THREE.CylinderGeometry(r, r, 0.06, 7), this.p.stone || this.p.path);
      st.position.set(x, 0.04, z);
      st.rotation.y = i * 0.9;
      st.castShadow = false;
      g.add(st);
    });
    return g;
  }
}
