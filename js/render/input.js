// Xử lý chạm/chuột trên màn hình 3D: chạm = chọn, kéo = xoay góc nhìn, chụm 2 ngón / lăn chuột = zoom.
import * as THREE from '../../vendor/three.module.min.js';

const TAP_MOVE = 10; // px: di chuyển ít hơn mức này vẫn tính là chạm

export class PointerInput {
  // canPaint(x,y): trả true nếu vuốt bắt đầu ở đây sẽ "quét" công cụ qua nhiều ô thay vì kéo camera
  constructor(canvas, rig, { onTap, canPaint = () => false, onPaint = () => {} }) {
    this.canvas = canvas;
    this.rig = rig;
    this.onTap = onTap;
    this.canPaint = canPaint;
    this.onPaint = onPaint;
    this.pointers = new Map();
    this.ray = new THREE.Raycaster();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._ndc = new THREE.Vector2();
    this._tmp = new THREE.Vector3();

    canvas.addEventListener('pointerdown', (e) => this._down(e));
    canvas.addEventListener('pointermove', (e) => this._move(e));
    canvas.addEventListener('pointerup', (e) => this._up(e));
    canvas.addEventListener('pointercancel', (e) => this.pointers.delete(e.pointerId));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      rig.setZoom(rig.zoom * (e.deltaY < 0 ? 1.1 : 0.9));
    }, { passive: false });
  }

  setRay(x, y) {
    const r = this.canvas.getBoundingClientRect();
    this._ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this._ndc, this.rig.cam);
    return this.ray;
  }

  groundPoint(x, y) {
    this.setRay(x, y);
    return this.ray.ray.intersectPlane(this.ground, new THREE.Vector3());
  }

  _down(e) {
    this.canvas.setPointerCapture(e.pointerId);
    const paint = this.pointers.size === 0 && this.canPaint(e.clientX, e.clientY);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, drag: false, paint });
    if (this.pointers.size === 2) this._pinchStart();
    else this._grab = this.groundPoint(e.clientX, e.clientY);
  }

  _pinchStart() {
    const [a, b] = [...this.pointers.values()];
    this._pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    this._pinchZoom = this.rig.zoom;
    this.pointers.forEach((p) => {
      p.drag = true;
      p.paint = false;
    });
  }

  _move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.rig.setZoom(this._pinchZoom * (d / this._pinchDist));
      return;
    }
    if (!p.drag && Math.hypot(p.x - p.sx, p.y - p.sy) > TAP_MOVE) {
      p.drag = true;
      if (p.paint) this.onPaint(p.sx, p.sy);
      else this.rig.follow = null; // người chơi tự xem xung quanh thì thôi bám theo
    }
    if (p.paint) {
      if (p.drag) this.onPaint(p.x, p.y);
      return;
    }
    if (p.drag && this._grab) {
      const now = this.groundPoint(p.x, p.y);
      if (now) this.rig.panBy(this._grab.x - now.x, this._grab.z - now.z);
    }
  }

  _up(e) {
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (!p) return;
    if (this.pointers.size === 1) {
      // Còn 1 ngón sau khi chụm: lấy lại điểm nắm để kéo tiếp không bị giật
      const rest = [...this.pointers.values()][0];
      this._grab = this.groundPoint(rest.x, rest.y);
      return;
    }
    if (!p.drag) this.onTap(e.clientX, e.clientY);
  }
}
