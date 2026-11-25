# Bật chế độ online (Supabase)

Chế độ online cho phép: lưu nông trại lên mạng (chơi trên nhiều máy), kết bạn bằng mã 6 ký tự,
thăm quán bạn, tưới giúp ruộng, tặng nông sản và xem bảng xếp hạng. Không bật thì game vẫn chơi
offline bình thường (lưu trên máy).

Supabase có **gói miễn phí** (đủ cho vài nghìn người chơi). Không cần thẻ thanh toán.

## Các bước

1. Vào https://supabase.com → đăng ký → **New project** (chọn vùng Singapore cho gần Việt Nam).
2. Trong project: **SQL Editor** → **New query** → dán toàn bộ nội dung file `supabase/schema.sql` → **Run**.
3. **Project Settings → API**: chép
   - **Project URL** (dạng `https://xxxx.supabase.co`)
   - khoá **anon public**
4. Mở `js/config/online.js`, dán vào:
   ```js
   export const ONLINE = {
     supabaseUrl: 'https://xxxx.supabase.co',
     supabaseAnonKey: 'eyJhbGciOi...',
     cloudSaveEvery: 30,
   };
   ```
5. (Tuỳ chọn) **Authentication → Providers → Email**: tắt "Confirm email" nếu muốn đăng ký xong
   chơi luôn, không cần bấm link xác nhận trong email.
6. Commit, đẩy lên GitHub. Trong game: ⚙️ → **☁️ Tài khoản & bạn bè** → Đăng ký.

## An toàn

- Khoá **anon** được phép công khai trong code web. Dữ liệu được bảo vệ bằng Row Level Security
  trong `schema.sql`: mỗi người chỉ đọc/sửa được bản lưu của mình; hồ sơ công khai chỉ chủ sửa được.
- **Không bao giờ** dán khoá `service_role` vào game.
- Quà tặng giới hạn 20 món/người/ngày, tưới giúp 1 lần/bạn/ngày (ràng buộc trong cơ sở dữ liệu).

## Các bảng

| Bảng | Nội dung |
|---|---|
| `saves` | Bản lưu game (JSON) của từng người |
| `profiles` | Tên, tên quán, cấp, số khách, mã bạn bè, ảnh chụp nhanh để bạn bè xem |
| `friends` | Danh sách bạn (theo dõi một chiều) |
| `gifts` | Quà tặng chờ nhận |
| `helps` | Lượt tưới giúp chờ nhận |
