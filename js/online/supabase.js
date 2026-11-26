// Kết nối Supabase qua REST (không cần thư viện): đăng ký/đăng nhập, lưu game, bạn bè, quà, tưới giúp.
// Mọi hàm trả về { ok, data?, reason? } với reason tiếng Việt.
import { ONLINE } from '../config/online.js';

const SESSION_KEY = 'nong-trai-quan-nho:session';

export function isConfigured(cfg = ONLINE) {
  return !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
}

// Mã bạn bè 6 ký tự lấy từ id người dùng (dễ đọc cho nhau)
export function friendCode(userId) {
  return String(userId || '').replace(/-/g, '').slice(0, 6).toUpperCase();
}

export class SupabaseClient {
  constructor(cfg = ONLINE, fetchImpl = (...a) => fetch(...a), store = globalThis.localStorage) {
    this.url = (cfg.supabaseUrl || '').replace(/\/$/, '');
    this.key = cfg.supabaseAnonKey;
    this.fetch = fetchImpl;
    this.store = store;
    this.session = this._loadSession();
  }

  get user() {
    return this.session?.user || null;
  }

  get loggedIn() {
    return !!this.session?.access_token;
  }

  _loadSession() {
    try {
      return JSON.parse(this.store?.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  _saveSession(sess) {
    this.session = sess;
    try {
      if (sess) this.store?.setItem(SESSION_KEY, JSON.stringify(sess));
      else this.store?.removeItem(SESSION_KEY);
    } catch {
      /* bỏ qua */
    }
  }

  async _req(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
    try {
      const h = { apikey: this.key, 'Content-Type': 'application/json', ...headers };
      if (auth && this.session?.access_token) h.Authorization = `Bearer ${this.session.access_token}`;
      const res = await this.fetch(this.url + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (res.status === 401 && auth && this.session?.refresh_token && !path.includes('/auth/')) {
        if (await this.refresh()) return this._req(path, { method, body, auth, headers });
      }
      if (!res.ok) return { ok: false, status: res.status, reason: errText(data, res.status) };
      return { ok: true, data };
    } catch (e) {
      return { ok: false, reason: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.' };
    }
  }

  // ---------- Tài khoản ----------
  async signUp(email, password) {
    const r = await this._req('/auth/v1/signup', { method: 'POST', body: { email, password }, auth: false });
    if (!r.ok) return r;
    if (r.data?.access_token) {
      this._saveSession(r.data);
      return { ok: true, data: r.data };
    }
    return { ok: true, needConfirm: true, reason: 'Đã gửi email xác nhận. Mở email, bấm xác nhận rồi đăng nhập nhé.' };
  }

  async signIn(email, password) {
    const r = await this._req('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, auth: false });
    if (r.ok) this._saveSession(r.data);
    return r;
  }

  async refresh() {
    const r = await this._req('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: this.session.refresh_token }, auth: false });
    if (r.ok) this._saveSession(r.data);
    else this._saveSession(null);
    return r.ok;
  }

  signOut() {
    this._saveSession(null);
  }

  // ---------- Lưu game ----------
  async loadSave() {
    const r = await this._req(`/rest/v1/saves?user_id=eq.${this.user.id}&select=data,updated_at`);
    if (!r.ok) return r;
    return { ok: true, data: r.data[0] || null };
  }

  async writeSave(state) {
    return this._req('/rest/v1/saves', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: { user_id: this.user.id, data: state, updated_at: new Date().toISOString() },
    });
  }

  // Hồ sơ công khai cho bạn bè xem + bảng xếp hạng
  async writeProfile(p) {
    return this._req('/rest/v1/profiles', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: { user_id: this.user.id, code: friendCode(this.user.id), ...p, updated_at: new Date().toISOString() },
    });
  }

  // ---------- Bạn bè ----------
  async findByCode(code) {
    const c = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 6) return { ok: false, reason: 'Mã bạn bè gồm 6 ký tự.' };
    const r = await this._req(`/rest/v1/profiles?code=eq.${c}&select=*`);
    if (!r.ok) return r;
    if (!r.data.length) return { ok: false, reason: 'Không tìm thấy ai có mã này.' };
    return { ok: true, data: r.data[0] };
  }

  async addFriend(friendId) {
    if (friendId === this.user.id) return { ok: false, reason: 'Đây là mã của chính bạn mà!' };
    return this._req('/rest/v1/friends', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: { user_id: this.user.id, friend_id: friendId } });
  }

  async removeFriend(friendId) {
    return this._req(`/rest/v1/friends?user_id=eq.${this.user.id}&friend_id=eq.${friendId}`, { method: 'DELETE' });
  }

  async listFriends() {
    const f = await this._req(`/rest/v1/friends?user_id=eq.${this.user.id}&select=friend_id`);
    if (!f.ok) return f;
    const ids = f.data.map((x) => x.friend_id);
    if (!ids.length) return { ok: true, data: [] };
    return this._req(`/rest/v1/profiles?user_id=in.(${ids.join(',')})&select=*`);
  }

  async leaderboard() {
    return this._req('/rest/v1/profiles?select=name,shop,level,customers,day,code&order=level.desc,customers.desc&limit=20');
  }

  // ---------- Quà & tưới giúp ----------
  async sendGift(toId, item, qty) {
    return this._req('/rest/v1/gifts', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { from_id: this.user.id, to_id: toId, item, qty } });
  }

  async helpWater(toId) {
    const r = await this._req('/rest/v1/helps', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { from_id: this.user.id, to_id: toId } });
    if (!r.ok && r.status === 409) return { ok: false, reason: 'Hôm nay bạn đã tưới giúp người này rồi.' };
    return r;
  }

  // Lấy quà + lượt tưới giúp chưa nhận, rồi đánh dấu đã nhận
  async inbox() {
    const me = this.user.id;
    const g = await this._req(`/rest/v1/gifts?to_id=eq.${me}&claimed=eq.false&select=id,item,qty,from_id`);
    const h = await this._req(`/rest/v1/helps?to_id=eq.${me}&claimed=eq.false&select=id,from_id`);
    if (!g.ok || !h.ok) return { ok: false, reason: (g.ok ? h : g).reason };
    if (g.data.length) await this._req(`/rest/v1/gifts?id=in.(${g.data.map((x) => x.id).join(',')})`, { method: 'PATCH', body: { claimed: true } });
    if (h.data.length) await this._req(`/rest/v1/helps?id=in.(${h.data.map((x) => x.id).join(',')})`, { method: 'PATCH', body: { claimed: true } });
    return { ok: true, data: { gifts: g.data, helps: h.data } };
  }
}

function errText(data, status) {
  const m = (data && (data.error_description || data.msg || data.message || data.error)) || '';
  if (/invalid login/i.test(m)) return 'Sai email hoặc mật khẩu.';
  if (/already registered|already exists/i.test(m)) return 'Email này đã có tài khoản, hãy đăng nhập.';
  if (/password/i.test(m) && /6/.test(m)) return 'Mật khẩu cần ít nhất 6 ký tự.';
  if (/email not confirmed/i.test(m)) return 'Email chưa xác nhận. Mở email và bấm link xác nhận trước nhé.';
  if (status === 429) return 'Thao tác nhanh quá, thử lại sau ít phút.';
  return m ? `Lỗi máy chủ: ${m}` : `Lỗi máy chủ (${status}).`;
}
