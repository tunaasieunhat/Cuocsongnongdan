# Nông Trại & Quán Nhỏ

Game web 3D low-poly, cozy, chạy trên trình duyệt điện thoại Android và máy tính (màn ngang).
Lấy cảm hứng *cách chơi* từ Farm & Feast (sáng làm nông, tối mở quán) và phong cách hình ảnh từ
game "Tiệm Hoa Giấc Mơ" của chủ dự án. Tên, nhân vật, hình ảnh đều là của riêng dự án — không dùng
tài nguyên hay tên của game khác. Món ăn và bối cảnh mang hơi hướng làng quê Việt Nam.

Trả lời chủ dự án bằng **tiếng Việt, ngắn gọn**. Hỏi trước khi dùng bất kỳ dịch vụ trả phí nào.

## Vòng chơi một ngày

1. **06:00–15:00 làm nông** — ruộng lô 3×3 (6 ô mở sẵn, 3 ô mua thêm). Thanh công cụ:
   ✋ Xem · 🪏 Xới · 🌱 Gieo · 💧 Tưới · 🧪 Bón · 🧺 Thu. Chạm hoặc vuốt qua nhiều ô; nông dân xếp hàng
   đi làm lần lượt. Cây chỉ lớn khi đất ẩm; sáng mỗi ngày đất khô lại (trời mưa thì được tưới sẵn).
   Ngoài ra: nhặt trứng ở chuồng gà, câu cá ở ao (mini-game, 4 lượt/ngày), mua bán ở chợ.
2. **15:00 chuẩn bị** — nút 📋 Lên thực đơn (tối đa 2–5 món tuỳ cấp quán), nấu sẵn ở 🔥 bếp.
3. **17:00–21:30 mở quán** — khách vào bàn, bong bóng hiện món + thanh kiên nhẫn. Chạm bàn khách:
   nông dân tự lấy đúng món trên quầy và bưng ra (hoặc chạm quầy để tự chọn món — có thể bưng nhầm).
   Khách ăn xong trả tiền + tip (nhanh = tip nhiều, trang trí tăng thêm), để lại bàn bẩn cần dọn.
   Chờ quá lâu thì khách bỏ về; nhầm món thì giảm hài lòng, không tip.
4. **Hết khách (hoặc 22:30)** — bảng tổng kết (doanh thu, số khách, hài lòng, món bán chạy) → "Ngày mới".

Mở rộng (GĐ5–10):
- **GĐ5** đồ hoạ Tự động/Nhẹ/Đẹp (tự hạ khi FPS < 38), hiện FPS, PWA (`manifest.json`, `sw.js`, `icons/`).
- **GĐ6** đồ uống (quầy nước, khách gọi kèm → tip +25%), đơn đặt trước, sửa quán lá→gỗ→gạch, đầu bếp tự nấu,
  2 bàn ngoài sân (tối đa 8 bàn).
- **GĐ7** lô ruộng 2 (9 ô), cây mới đậu/bí/ớt/mía, vườn xoài/chuối, vịt, heo (→ thịt), bò (→ sữa) cần cho ăn.
- **Map:** khu chơi 44×22 nằm giữa vành rừng (`FOREST` trong `world.js`, cây vẽ bằng InstancedMesh; mép nam/đông chỉ có bụi thấp để không che cảnh).
- **GĐ8** khu chơi rộng 44: khu chuồng trại phía tây, làng ven sông phía đông (tạp hoá ông Bảy, cô Ba, thằng Tí);
  cốt truyện 10 chương (`js/config/story.js`), 3 nhiệm vụ/ngày, Tết & Trung thu (món lễ, giá cao), chợ phiên.
- **GĐ9** đặt tên, trang phục (áo, mũ, tóc), chó/mèo theo chân, đặt đồ trang trí vườn tự do (nút 🪴).
- **GĐ10** online qua Supabase REST (`js/online/`, `supabase/schema.sql`, hướng dẫn `docs/ONLINE.md`).
  Chưa cấu hình (`js/config/online.js` trống) thì game chạy offline như cũ.

Tiến trình: danh tiếng → cấp quán (mở món, nâng cấp, khách VIP từ cấp 3); 📖 Sổ công thức (8 món);
🔨 Nâng cấp (thêm bàn, bếp nhanh, bếp 2, thuê người phục vụ, bình tưới lớn, thêm gà, người làm vườn)
và 🎨 Trang trí (6 món đồ, cộng % hài lòng/tip); 4 khách quen có món ưa thích và chuyện riêng;
4 mùa × 7 ngày, mỗi mùa bán hạt khác nhau, có ngày mưa. Hai phần hướng dẫn: ruộng (lúc bắt đầu)
và quán (lần đầu tới 15:00).

## Công nghệ

- Three.js r170 (`vendor/three.module.min.js`, MIT), ES modules thuần, **không có bước build**.
- Mô hình 3D tạo hoàn toàn bằng code (ghép khối cơ bản) — không có file asset.
- Âm thanh tạo bằng Web Audio (`js/audio/sound.js`) — không có file nhạc.
- Lưu bằng localStorage qua adapter (`js/save/storage.js`), có khung `CloudAdapter` cho bản online.
- Font Baloo 2 + Nunito từ Google Fonts.

## Cấu trúc

```
index.html            trang chính (mở qua máy chủ tĩnh, ES module không chạy với file://)
play.html             bản rút gọn để đăng lên claude.ai (không có thẻ html/head)
style-preview.html    so sánh các bảng màu (?style=giacmo|nang|keo|hoanghon)
css/style.css         toàn bộ giao diện; token màu ở :root
js/config/            DỮ LIỆU — sửa cân bằng game ở đây, không cần đụng logic
  gameData.js           vật phẩm, cây, mùa, thời gian, công cụ, món, quán, nâng cấp, trang trí, khách quen, câu cá
  palettes.js           bảng màu (ACTIVE_PALETTE = 'giacmo')
  tutorial.js           lời thoại + điều kiện các bước hướng dẫn (ruộng và quán)
js/core/              LOGIC thuần, không phụ thuộc Three.js hay DOM (chạy được bằng Node)
  state.js              hình dạng state + migrateState (tăng SAVE_VERSION khi đổi cấu trúc)
  game.js               lớp Game: nhịp ngày, phát sự kiện, gom các hành động
  farm.js coop.js market.js restaurant.js progress.js
js/render/            HIỂN THỊ 3D
  models.js             nhà máy mô hình low-poly theo bảng màu
  world.js              dựng đảo, ruộng, công trình, ánh sáng ngày/đêm, mưa, mùa
  restaurantView.js     bàn, bếp, quầy, khách đi/ngồi/ăn, đồ trang trí
  camera.js player.js input.js pathfinding.js (A* trên lưới 0.5)
js/controllers/       nối logic + hiển thị + UI cho phần quán (chạm bàn/bếp/quầy, người phục vụ)
js/ui/                hud.js (khung giao diện), dialogs.js (mọi cửa sổ), tutorial.js
js/save/storage.js    LocalStorageAdapter
js/online/            supabase.js (REST client), onlineUI.js (đăng nhập, bạn bè, xếp hạng)
js/main.js            khởi động, nối mọi thứ, vòng lặp
js/config/story.js    cốt truyện, nhiệm vụ ngày, sự kiện lễ, dân làng
js/config/online.js   URL + khoá anon Supabase (để trống = offline)
js/core/ animals.js orchard.js quests.js custom.js   (GĐ7–9)
js/ui/dialogsWorld.js cửa sổ GĐ6–9 (quầy nước, tạp hoá, chuồng, vườn, nhiệm vụ, tuỳ biến)
tests/logic.test.mjs  kiểm thử logic (node --test tests/*.test.mjs)
.github/workflows/pages.yml  kiểm thử + đăng GitHub Pages khi đẩy lên main
sw.js manifest.json icons/   PWA
supabase/schema.sql   bảng + Row Level Security cho online
```

Quy ước:
- Luật chơi chỉ nằm trong `js/core/`; render/UI chỉ đọc state và gọi hành động của `Game`.
- Mọi hành động trả về `{ ok, reason }`; `reason` là câu tiếng Việt hiện thẳng cho người chơi.
- Toạ độ thế giới: y hướng lên, camera nhìn từ (+x, +z); "phía trước" màn hình là +z.
- Thêm vật cản sau khi khởi động → tạo lại `NavGrid` (xem sự kiện `upgrade` trong `main.js`).
- Chữ hiển thị và chú thích code viết bằng tiếng Việt.

## Chạy & kiểm thử

- Chạy: `npx serve .` hoặc `python3 -m http.server`, mở trên trình duyệt.
- Logic chạy được bằng Node: `node --test tests/*.test.mjs` (chạy cả trên GitHub Actions).
- Kiểm thử giao diện: Playwright (Chromium có sẵn) phục vụ file qua `page.route` (môi trường cloud
  không cho mở cổng máy chủ). `window.__game` và `window.__debug` có sẵn để điều khiển khi test.
- Kích thước kiểm thử chuẩn: 844×390 (điện thoại nằm ngang).
- Đăng bản thử: publish `play.html` + toàn bộ `css/`, `js/`, `vendor/` qua công cụ Artifact
  (link riêng tư: https://claude.ai/artifact/1Eaovxjyn5nKKUgFpqVzLT).
- Playwright: tạo context với `serviceWorkers: 'block'` (nếu không, service worker chặn `page.route` sau khi reload).
- Chromium headless chỉ ~12 FPS (vẽ bằng CPU) nên game tự chuyển "đồ hoạ nhẹ"; ghi log ra file thay vì pipe.

## Việc tiếp theo

- [ ] Chủ dự án tạo project Supabase và điền `js/config/online.js` (xem `docs/ONLINE.md`), rồi thử online thật.
- [ ] Bật GitHub Pages (Settings > Pages > Source: GitHub Actions) sau khi gộp vào `main`.
- [ ] Thử thật trên Android, cân bằng lại giá/thời gian theo cảm nhận chơi.
- [ ] Chương 2 cốt truyện; thêm dân làng và nhiệm vụ.
- [ ] Thăm quán bạn dạng 3D (hiện là thẻ thông tin); chơi chung (co-op).
- [ ] Đưa lên Google Play (cần tài khoản nhà phát triển 25 USD — hỏi trước).
