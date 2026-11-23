// Nông dân: đi tới điểm được chạm, tránh vật cản đơn giản, hoạt ảnh bước đi / làm việc.
import * as THREE from '../../vendor/three.module.min.js';
import { ISLAND } from './world.js';

const SPEED = 4.2;
const RADIUS = 0.35;

export class Player {
  constructor(mesh, obstacles, nav) {
    this.mesh = mesh;
    this.nav = nav;
    this.path = [];
    this.pos = mesh.position;
    this.obstacles = obstacles;
    this.dest = null;
    this.onArrive = null;
    this.walkT = 0;
    this.workT = 0;
    this._stuckT = 0;
    this._lastPos = new THREE.Vector3();
  }

  walkTo(point, onArrive = null) {
    const path = (this.nav && this.nav.find(this.pos, point)) || [{ x: point.x, z: point.z }];
    this.path = path.map((p) => new THREE.Vector3(p.x, 0, p.z));
    this.dest = this.path.shift();
    this.onArrive = onArrive;
    this._stuckT = 0;
  }

  faceTo(point) {
    this.mesh.rotation.y = Math.atan2(point.x - this.pos.x, point.z - this.pos.z);
  }

  // Hoạt ảnh làm việc (cúi người, vung tay)
  work() {
    this.workT = 0.45;
  }

  _collide() {
    const p = this.pos;
    for (const o of this.obstacles) {
      if (o.r !== undefined) {
        const dx = p.x - o.x, dz = p.z - o.z;
        const d = Math.hypot(dx, dz);
        const min = o.r + RADIUS;
        if (d < min && d > 1e-4) {
          p.x = o.x + (dx / d) * min;
          p.z = o.z + (dz / d) * min;
        }
      } else {
        const cx = THREE.MathUtils.clamp(p.x, o.minX, o.maxX);
        const cz = THREE.MathUtils.clamp(p.z, o.minZ, o.maxZ);
        const dx = p.x - cx, dz = p.z - cz;
        const d = Math.hypot(dx, dz);
        if (d < RADIUS) {
          if (d > 1e-4) {
            p.x = cx + (dx / d) * RADIUS;
            p.z = cz + (dz / d) * RADIUS;
          } else {
            // Đang nằm trong hộp: đẩy ra cạnh gần nhất
            const pushes = [[o.minX - RADIUS - p.x, 0], [o.maxX + RADIUS - p.x, 0], [0, o.minZ - RADIUS - p.z], [0, o.maxZ + RADIUS - p.z]];
            pushes.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
            p.x += pushes[0][0];
            p.z += pushes[0][1];
          }
        }
      }
    }
    p.x = THREE.MathUtils.clamp(p.x, -ISLAND.w / 2 + 0.6, ISLAND.w / 2 - 0.6);
    p.z = THREE.MathUtils.clamp(p.z, -ISLAND.d / 2 + 0.6, ISLAND.d / 2 - 0.6);
  }

  update(dt) {
    const parts = this.mesh.userData.parts;
    let moving = false;
    if (this.dest) {
      const dx = this.dest.x - this.pos.x, dz = this.dest.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.12) {
        if (this.path.length) this.dest = this.path.shift();
        else this._arrive();
      } else {
        const step = Math.min(dist, SPEED * dt);
        this._lastPos.copy(this.pos);
        this.pos.x += (dx / dist) * step;
        this.pos.z += (dz / dist) * step;
        this._collide();
        const targetRot = Math.atan2(dx, dz);
        let diff = targetRot - this.mesh.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.mesh.rotation.y += diff * Math.min(1, dt * 14);
        moving = true;
        // Bị kẹt sau vật cản: dừng lại, nếu đã gần mục tiêu thì vẫn làm việc
        const moved = this.pos.distanceTo(this._lastPos);
        this._stuckT = moved < step * 0.25 ? this._stuckT + dt : 0;
        if (this._stuckT > 0.35) {
          if (dist < 2.2 && !this.path.length) this._arrive();
          else {
            this.dest = null;
            this.path = [];
            this.onArrive = null;
          }
        }
      }
    }

    // Hoạt ảnh
    if (moving) this.walkT += dt * 11;
    const swing = moving ? Math.sin(this.walkT) * 0.7 : 0;
    parts.legL.rotation.x = swing;
    parts.legR.rotation.x = -swing;
    parts.armL.rotation.x = -swing * 0.8;
    parts.armR.rotation.x = swing * 0.8;
    this.pos.y = moving ? Math.abs(Math.sin(this.walkT)) * 0.08 : 0;
    if (this.workT > 0) {
      this.workT -= dt;
      const t = Math.sin((1 - this.workT / 0.45) * Math.PI);
      parts.armR.rotation.x = -1.6 * t;
      parts.armL.rotation.x = -1.2 * t;
      parts.body.rotation.x = 0.25 * t;
      parts.head.position.z = 0.1 * t;
    } else {
      parts.body.rotation.x = 0;
      parts.head.position.z = 0;
    }
    return moving;
  }

  _arrive() {
    this.dest = null;
    const cb = this.onArrive;
    this.onArrive = null;
    if (cb) cb();
  }
}
