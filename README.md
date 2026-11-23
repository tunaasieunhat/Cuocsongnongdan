# Nông Trại & Quán Nhỏ

Game web 3D low-poly (Three.js): ban ngày làm nông, buổi tối mở quán ăn quê.

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
- `js/core/`: logic thuần, không phụ thuộc Three.js hay DOM.
- `js/render/`: cảnh 3D, mô hình tạo bằng code, camera, nhân vật, tìm đường.
- `js/ui/`: giao diện HTML phủ trên cảnh.
- `js/save/`: lưu tiến độ (localStorage, có thể thay bằng lưu online).
- `vendor/`: Three.js r170 (giấy phép MIT).
