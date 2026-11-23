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
    text: 'Mỗi sáng đất khô lại, nhớ tưới nhé. Đến 17:00 sẽ tổng kết ngày. Quà khởi nghiệp: <b>💰 20 xu</b> và <b>🌾 2 hạt lúa</b>!',
    wait: 'button',
    button: 'Chơi thôi!',
    focus: 'farm',
  },
];
