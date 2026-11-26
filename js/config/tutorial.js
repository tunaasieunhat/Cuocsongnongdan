// Các bước hướng dẫn chơi lần đầu. Sửa lời thoại / thứ tự ở đây.
//  - text: lời hướng dẫn (được dùng HTML đơn giản như <b>)
//  - wait: điều kiện để tự sang bước sau (xem js/ui/tutorial.js), hoặc 'button' = bấm nút "Tiếp"
//  - ui:   nút giao diện cần làm nổi bật ('tool:till', 'side:market'...)
//  - point: vật thể 3D cần chỉ tay vào ('cell:untilled', 'market', 'coop'...)
//  - focus: camera dịch tới khu vực ('farm', 'market', 'coop')

export const TUTORIAL_REWARD = { money: 20, seeds: { lua: 2 } };

export const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Chào mừng đến Nông Trại & Quán Nhỏ!',
    text: 'Đây là mảnh ruộng nhỏ của bạn. Mình sẽ chỉ bạn trồng vụ rau đầu tiên nhé. Trong lúc học, đồng hồ sẽ tạm dừng.',
    wait: 'button',
    button: 'Bắt đầu',
    focus: 'farm',
  },
  { id: 'pickTill', text: 'Chọn <b>🪏 Xới</b> ở thanh công cụ bên dưới.', wait: 'tool:till', ui: 'tool:till', focus: 'farm' },
  { id: 'till', text: 'Chạm vào một <b>ô cỏ</b> để xới đất. Mẹo: giữ ngón tay và vuốt qua nhiều ô để xới liền một lượt.', wait: 'tilled', point: 'cell:untilled', focus: 'farm' },
  { id: 'pickPlant', text: 'Đất đã tơi xốp! Giờ chọn <b>🌱 Gieo</b>. Dãy hạt giống sẽ hiện ra, bạn đang có hạt <b>🥬 Rau muống</b>.', wait: 'tool:plant', ui: 'tool:plant', focus: 'farm' },
  { id: 'plant', text: 'Chạm vào <b>ô đất đã xới</b> để gieo hạt.', wait: 'planted', point: 'cell:tilled', focus: 'farm' },
  { id: 'pickWater', text: 'Hạt cần nước mới nảy mầm. Chọn <b>💧 Tưới</b>.', wait: 'tool:water', ui: 'tool:water', focus: 'farm' },
  { id: 'water', text: 'Chạm vào <b>ô vừa gieo</b> để tưới. Ô có biểu tượng 💧 là đất đang khô.', wait: 'watered', point: 'cell:dry', focus: 'farm' },
  { id: 'grow', text: 'Cây đang lớn! Thanh xanh trên ô cho biết tiến độ. Lần đầu mình cho cây lớn nhanh hơn một chút nhé…', wait: 'ripe', point: 'cell:growing', focus: 'farm', boost: 6 },
  { id: 'pickHarvest', text: 'Rau chín rồi! Chọn <b>🧺 Thu</b>.', wait: 'tool:harvest', ui: 'tool:harvest', focus: 'farm' },
  { id: 'harvest', text: 'Chạm vào <b>cây đã chín</b> (biểu tượng nhảy nhảy) để thu hoạch.', wait: 'harvested', point: 'cell:ripe', focus: 'farm' },
  { id: 'market', text: 'Nông sản nằm trong 🎒 Kho đồ. Giờ ghé <b>🛒 Chợ quê</b> để mua thêm hạt hoặc bán bớt: chạm vào sạp chợ.', wait: 'market', ui: 'side:market', point: 'market', focus: 'market' },
  {
    id: 'coop',
    text: 'Còn đây là <b>chuồng gà</b>. Gà tự đẻ trứng 🥚, khi thấy trứng thì chạm chuồng để nhặt. Trứng sẽ dùng để nấu món ở quán.',
    wait: 'button',
    button: 'Tiếp',
    point: 'coop',
    focus: 'coop',
  },
  {
    id: 'done',
    title: 'Bạn đã sẵn sàng!',
    text: 'Mỗi sáng đất khô lại, nhớ tưới nhé. 15:00 chuẩn bị thực đơn, 17:00 mở quán đón khách. Quà khởi nghiệp: <b>💰 20 xu</b> và <b>🌾 2 hạt lúa</b>!',
    wait: 'button',
    button: 'Chơi thôi!',
    focus: 'farm',
  },
];

// ---------- Hướng dẫn phần quán (tự bắt đầu lúc 15:00 sau khi đã học phần ruộng) ----------
export const TUTORIAL_QUAN_REWARD = { money: 30, seeds: {} };

export const TUTORIAL_QUAN_STEPS = [
  {
    id: 'q-welcome',
    title: 'Tới giờ mở quán rồi!',
    text: 'Chiều nào cũng vậy: lên thực đơn, nấu sẵn vài món, rồi mở cửa đón khách. Mình chỉ bạn lần đầu nhé. Trong lúc học, đồng hồ tạm dừng và khách không sốt ruột.',
    wait: 'button',
    button: 'Đi thôi',
    focus: 'restaurant',
  },
  { id: 'q-menu', text: 'Bấm nút <b>📋 Lên thực đơn</b> ở góc phải dưới, chọn món rồi bấm <b>Lưu thực đơn</b>.', wait: 'menuSet', ui: 'prep', focus: 'restaurant' },
  { id: 'q-cook', text: 'Chạm vào <b>🔥 bếp</b> và chọn một món để nấu. Nguyên liệu lấy từ kho của bạn.', wait: 'cookStarted', point: 'stove', focus: 'restaurant' },
  { id: 'q-wait', text: 'Đang nấu… Món nấu xong sẽ tự lên <b>quầy</b> bên cạnh bếp. Có thể nấu thêm món khác trong lúc chờ.', wait: 'cooked', point: 'stove', focus: 'restaurant' },
  { id: 'q-open', text: 'Có món rồi! Bấm <b>🏮 Mở quán</b> để đón khách luôn (bình thường quán tự mở lúc 17:00).', wait: 'opened', ui: 'prep', focus: 'restaurant' },
  { id: 'q-guest', text: 'Khách đang vào! Bong bóng trên đầu khách cho biết khách gọi món gì, kèm thanh kiên nhẫn.', wait: 'seated', focus: 'restaurant' },
  { id: 'q-serve', text: 'Chạm vào <b>bàn của khách</b>: nông dân sẽ tự lấy đúng món trên quầy và bưng ra. (Chạm quầy nếu muốn tự chọn món để bưng.)', wait: 'served', point: 'table:waiting', focus: 'restaurant' },
  { id: 'q-eat', text: 'Khách đang ăn 😋. Ăn xong khách trả tiền và <b>tip</b>: phục vụ càng nhanh, tip càng nhiều.', wait: 'dirtyAny', focus: 'restaurant' },
  { id: 'q-clean', text: 'Chạm vào <b>bàn bẩn</b> để dọn. Bàn bẩn thì khách mới không ngồi được.', wait: 'cleaned', point: 'table:dirty', focus: 'restaurant' },
  {
    id: 'q-done',
    title: 'Chủ quán xịn rồi!',
    text: 'Khách hài lòng giúp quán lên cấp ⭐. Vào <b>📖 Sổ công thức</b> học món mới, <b>🔨 Nâng cấp</b> để thêm bàn, bếp, thuê người phục vụ và trang trí quán. Quà: <b>💰 30 xu</b>!',
    wait: 'button',
    button: 'Bắt đầu buôn bán!',
    focus: 'restaurant',
  },
];
