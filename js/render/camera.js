// Camera isometric (orthographic): bám theo nông dân, kéo để xem xung quanh, chụm 2 ngón / lăn chuột để zoom.
import * as THREE from '../../vendor/three.module.min.js';
import { ISLAND } from './world.js';

const OFFSET = new THREE.Vector3(1, 1.05, 1).normalize().multiplyScalar(40);

export class CameraRig {
  constructor() {
    this.cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
    this.target = new THREE.Vector3();
    this.goal = new THREE.Vector3();
    this.zoom = 1;
    this.follow = null; // Vector3 cần bám theo
    this.resize(innerWidth, innerHeight);
  }

  resize(w, h) {
    const aspect = w / h;
    // Luôn thấy khoảng 22 đơn vị theo chiều ngang (màn ngang) hoặc 13 đơn vị (màn dọc)
    const halfW = aspect >= 1 ? 11 : 7;
    const halfH = halfW / aspect;
    Object.assign(this.cam, { left: -halfW, right: halfW, top: halfH, bottom: -halfH });
    this.cam.updateProjectionMatrix();
  }

  setZoom(z) {
    this.zoom = THREE.MathUtils.clamp(z, 0.6, 2.2);
    this.cam.zoom = this.zoom;
    this.cam.updateProjectionMatrix();
  }

  // Di chuyển mượt tới điểm (x, z)
  focus(x, z, instant = false) {
    this.goal.set(x, 0, z);
    this._clamp(this.goal);
    if (instant) this.target.copy(this.goal);
  }

  // Kéo màn hình: dời ngay lập tức theo ngón tay
  panBy(dx, dz) {
    this.target.x += dx;
    this.target.z += dz;
    this._clamp(this.target);
    this.goal.copy(this.target);
    this._apply();
  }

  _clamp(v) {
    v.x = THREE.MathUtils.clamp(v.x, -ISLAND.w / 2 + 2, ISLAND.w / 2 - 2);
    v.z = THREE.MathUtils.clamp(v.z, -ISLAND.d / 2 + 2, ISLAND.d / 2 - 1);
  }

  _apply() {
    this.cam.position.copy(this.target).add(OFFSET);
    this.cam.lookAt(this.target);
  }

  update(dt) {
    if (this.follow) this.focus(this.follow.x, this.follow.z);
    this.target.lerp(this.goal, 1 - Math.exp(-dt * 5));
    this._apply();
  }
}
