# Nông Trại & Quán Nhỏ

Game web 3D low-poly (Three.js): ban ngày làm nông, buổi tối mở quán ăn quê.

Xem `CLAUDE.md` để biết cách chơi, cấu trúc code và danh sách việc tiếp theo.

## Chạy thử trên máy
Game dùng ES module nên cần mở qua một máy chủ tĩnh, ví dụ:

```
npx serve .        # hoặc: python3 -m http.server
```
rồi mở `http://localhost:3000` (hoặc cổng tương ứng).

- `index.html`: trang chính.
- `play.html`: bản rút gọn để đăng lên claude.ai.
- `style-preview.html?style=nang|keo|hoanghon`: xem 3 bảng màu.

## Cấu trúc
- `js/config/`: dữ liệu game (cây trồng, giá, thời gian) và bảng màu. Cân bằng game thì sửa ở đây.
- `js/core/`: logic thuần (ruộng, chuồng gà, chợ, quán, tiến trình), không phụ thuộc Three.js hay DOM.
- `js/controllers/`: nối logic với hiển thị cho phần quán.
- `js/render/`: cảnh 3D, mô hình tạo bằng code, camera, nhân vật, tìm đường.
- `js/ui/`: giao diện HTML phủ trên cảnh, các cửa sổ, hướng dẫn chơi.
- `js/audio/`: nhạc nền và hiệu ứng tạo bằng Web Audio.
- `js/save/`: lưu tiến độ (localStorage, có thể thay bằng lưu online).
- `vendor/`: Three.js r170 (giấy phép MIT).
