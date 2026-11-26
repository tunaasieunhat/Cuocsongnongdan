// Tìm đường A* trên lưới ô vuông nhỏ phủ cả đảo, để nhân vật đi vòng qua nhà, sạp, ao, hàng rào.
import { ISLAND } from './world.js';

const CELL = 0.5;
const CLEARANCE = 0.4; // nới vật cản ra một chút cho người không cọ vào

export class NavGrid {
  constructor(obstacles) {
    this.cols = Math.ceil(ISLAND.w / CELL);
    this.rows = Math.ceil(ISLAND.d / CELL);
    this.blocked = new Uint8Array(this.cols * this.rows);
    this.rebuild(obstacles);
  }

  rebuild(obstacles) {
    this.blocked.fill(0);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const { x, z } = this.toWorld(c, r);
        const edge = c === 0 || r === 0 || c === this.cols - 1 || r === this.rows - 1;
        if (edge || obstacles.some((o) => hits(o, x, z))) this.blocked[r * this.cols + c] = 1;
      }
    }
  }

  toCell(x, z) {
    return [
      Math.min(this.cols - 1, Math.max(0, Math.floor((x + ISLAND.w / 2) / CELL))),
      Math.min(this.rows - 1, Math.max(0, Math.floor((z + ISLAND.d / 2) / CELL))),
    ];
  }

  toWorld(c, r) {
    return { x: -ISLAND.w / 2 + (c + 0.5) * CELL, z: -ISLAND.d / 2 + (r + 0.5) * CELL };
  }

  free(c, r) {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows && !this.blocked[r * this.cols + c];
  }

  // Ô trống gần nhất (khi điểm bấm nằm trong vật cản)
  nearestFree(c, r) {
    if (this.free(c, r)) return [c, r];
    for (let rad = 1; rad < 12; rad++) {
      let best = null, bestD = Infinity;
      for (let dr = -rad; dr <= rad; dr++)
        for (let dc = -rad; dc <= rad; dc++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad || !this.free(c + dc, r + dr)) continue;
          const d = dc * dc + dr * dr;
          if (d < bestD) (bestD = d), (best = [c + dc, r + dr]);
        }
      if (best) return best;
    }
    return [c, r];
  }

  // Trả về danh sách điểm {x,z} từ from tới to (đã làm mượt), hoặc null
  find(from, to) {
    const [sc, sr] = this.nearestFree(...this.toCell(from.x, from.z));
    const [ec, er] = this.nearestFree(...this.toCell(to.x, to.z));
    const N = this.cols * this.rows;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const start = sr * this.cols + sc, end = er * this.cols + ec;
    const h = (i) => {
      const c = i % this.cols, r = (i / this.cols) | 0;
      const dx = Math.abs(c - ec), dz = Math.abs(r - er);
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
    };
    const open = [start];
    g[start] = 0;
    const f = new Float32Array(N).fill(Infinity);
    f[start] = h(start);
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
      const cur = open[bi];
      open[bi] = open[open.length - 1];
      open.pop();
      if (cur === end) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const c = cur % this.cols, r = (cur / this.cols) | 0;
      for (const [dc, dr, cost] of dirs) {
        const nc = c + dc, nr = r + dr;
        if (!this.free(nc, nr)) continue;
        if (dc && dr && (!this.free(c + dc, r) || !this.free(c, r + dr))) continue; // không cắt góc
        const ni = nr * this.cols + nc;
        const ng = g[cur] + cost;
        if (ng < g[ni]) {
          g[ni] = ng;
          f[ni] = ng + h(ni);
          came[ni] = cur;
          open.push(ni);
        }
      }
    }
    if (start !== end && came[end] === -1) return null;
    const cells = [];
    for (let i = end; i !== -1; i = came[i]) {
      cells.push(i);
      if (i === start) break;
    }
    cells.reverse();
    const pts = cells.map((i) => this.toWorld(i % this.cols, (i / this.cols) | 0));
    pts[pts.length - 1] = { x: to.x, z: to.z };
    if (!this.free(...this.toCell(to.x, to.z))) pts[pts.length - 1] = this.toWorld(ec, er);
    return this.smooth({ x: from.x, z: from.z }, pts);
  }

  // Bỏ bớt điểm thừa: nếu nhìn thẳng thấy điểm xa hơn thì đi thẳng tới đó
  smooth(from, pts) {
    const out = [];
    let cur = from, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.lineFree(cur, pts[j])) j--;
      out.push(pts[j]);
      cur = pts[j];
      i = j + 1;
    }
    return out;
  }

  lineFree(a, b) {
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.ceil(d / (CELL * 0.5));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const [c, r] = this.toCell(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
      if (!this.free(c, r)) return false;
    }
    return true;
  }
}

function hits(o, x, z) {
  if (o.r !== undefined) return Math.hypot(x - o.x, z - o.z) < o.r + CLEARANCE;
  return x > o.minX - CLEARANCE && x < o.maxX + CLEARANCE && z > o.minZ - CLEARANCE && z < o.maxZ + CLEARANCE;
}
