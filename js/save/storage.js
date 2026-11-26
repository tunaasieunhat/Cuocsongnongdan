// Lưu tiến độ. Game chỉ gọi save()/load()/clear() qua một "adapter",
// nên sau này thêm CloudAdapter (gọi API server) mà không phải sửa logic game.

const KEY = 'nong-trai-quan-nho:save';

export class LocalStorageAdapter {
  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  async clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* bỏ qua */
    }
  }
}

// Ví dụ khung cho bản online sau này:
// export class CloudAdapter {
//   constructor(apiUrl, token) { ... }
//   async load()  { return (await fetch(`${apiUrl}/save`, {...})).json(); }
//   async save(s) { await fetch(`${apiUrl}/save`, { method: 'PUT', body: JSON.stringify(s) }); }
// }
