# Nông Trại & Quán Nhỏ

Game web 3D low-poly (Three.js) phong cách pastel: ban ngày làm nông, buổi tối mở quán ăn quê Việt Nam.
Chạy trên trình duyệt điện thoại và máy tính (màn ngang), cài được lên màn hình chính, chơi offline.

**Chơi ngay:** https://tunaasieunhat.github.io/Cuocsongnongdan/ (sau khi bật GitHub Pages, xem bên dưới)

## Có gì trong game

- 🌱 Ruộng 2 lô 3×3, 8 loại cây theo 4 mùa, phân bón, bình tưới lớn, người làm vườn
- 🐔 Gà, vịt, heo, bò sữa (cho ăn, vuốt ve); 🌳 vườn xoài, chuối; 🎣 câu cá
- 🍜 Quán: 16 món + 5 đồ uống, bếp, quầy, khách gọi món, tip, dọn bàn, khách VIP, đầu bếp & người phục vụ
- 📜 Cốt truyện "Quán của bà Út" (10 chương), nhiệm vụ hằng ngày, đơn đặt trước, Tết & Trung thu, chợ phiên
- 🏘️ Làng ven sông: tạp hoá ông Bảy, cô Ba lái đò, thằng Tí; 4 khách quen có chuyện riêng
- 👕 Đặt tên quán, trang phục, chó/mèo đi theo, đặt đồ trang trí vườn tự do
- ☁️ Online (tuỳ chọn): lưu lên mạng, kết bạn, thăm quán, tưới giúp, tặng quà, xếp hạng — xem `docs/ONLINE.md`

## Đưa lên GitHub Pages (miễn phí)

1. Gộp code vào nhánh `main`.
2. Trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Mỗi lần đẩy code lên `main`, workflow `.github/workflows/pages.yml` tự kiểm thử rồi đăng game.
   Xem tiến trình ở tab **Actions**. Link game: `https://<tên-tài-khoản>.github.io/Cuocsongnongdan/`.

## Chạy trên máy

Game dùng ES module nên cần máy chủ tĩnh:

```
npx serve .        # hoặc: python3 -m http.server
```

Kiểm thử logic: `node --test tests/*.test.mjs`

## Cấu trúc

- `js/config/`: dữ liệu game (cây, món, giá, nâng cấp, cốt truyện, online). Cân bằng game thì sửa ở đây.
- `js/core/`: logic thuần, không phụ thuộc Three.js hay DOM.
- `js/render/`: cảnh 3D, mô hình tạo bằng code, camera, nhân vật, tìm đường.
- `js/controllers/`: nối logic với hiển thị cho phần quán.
- `js/ui/`: giao diện HTML phủ trên cảnh, các cửa sổ, hướng dẫn chơi.
- `js/audio/`: nhạc nền và hiệu ứng tạo bằng Web Audio.
- `js/online/` + `supabase/schema.sql`: chế độ online (Supabase).
- `js/save/`: lưu tiến độ trên máy.
- `vendor/`: Three.js r170 (giấy phép MIT). `sw.js` + `manifest.json`: cài lên màn hình chính, chơi offline.

Chi tiết cho người phát triển: `CLAUDE.md`.
