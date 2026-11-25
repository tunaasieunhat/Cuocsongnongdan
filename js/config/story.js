// =====================================================================
//  CÂU CHUYỆN, NHIỆM VỤ, SỰ KIỆN, DÂN LÀNG (GĐ8) — sửa lời thoại / mục tiêu ở đây.
// =====================================================================

// Cốt truyện chính "Quán của bà Út": làm lần lượt từng chương.
// goal.type: harvest | serve | recipes | level | talk | cells | tree | renovate | animals | days
export const STORY = [
  {
    id: 'c1', title: 'Lá thư của bà Út',
    text: 'Bà Út để lại cho bạn mảnh ruộng và gian quán lá. Lá thư viết: "Con cứ trồng rau, nấu cơm. Khói bếp lên thì quán sẽ sống lại."',
    goal: { type: 'harvest', n: 10, label: 'Thu hoạch 10 nông sản' }, reward: { money: 50 },
  },
  {
    id: 'c2', title: 'Những vị khách đầu tiên',
    text: 'Xóm nhỏ nghe mùi cơm mới, kéo nhau ghé thử. Ai cũng nhắc: "Hồi bà Út còn, quán đông lắm."',
    goal: { type: 'serve', n: 10, label: 'Phục vụ 10 khách' }, reward: { money: 80 },
  },
  {
    id: 'c3', title: 'Gặp ông Bảy tạp hoá',
    text: 'Ông Bảy ở đầu làng là bạn cũ của bà. Ông giữ giùm bà một cuốn sổ công thức. Qua làng chào ông một tiếng nhé.',
    goal: { type: 'talk', who: 'ongbay', n: 1, label: 'Nói chuyện với ông Bảy ở làng' }, reward: { money: 40, items: { caphe: 2, tra: 3 } },
  },
  {
    id: 'c4', title: 'Cuốn sổ của bà',
    text: 'Trong sổ còn kẹp tấm ảnh bà đứng trước quán, tay cầm vá. Nét chữ bà ghi: "Món ngon là món nấu cho người mình thương."',
    goal: { type: 'recipes', n: 6, label: 'Biết 6 món trong Sổ công thức' }, reward: { money: 100 },
  },
  {
    id: 'c5', title: 'Quán có tiếng',
    text: 'Người làng bên chèo đò sang ăn. Cô Ba lái đò cười: "Đò tui giờ chở khách đi ăn quán con hoài."',
    goal: { type: 'level', n: 2, label: 'Quán đạt cấp 2' }, reward: { money: 120 },
  },
  {
    id: 'c6', title: 'Ruộng của bà',
    text: 'Bạn dọn hết cỏ ở góc ruộng cuối và thấy cọc tre bà cắm đánh dấu luống. Ruộng đã về như xưa.',
    goal: { type: 'cells', n: 9, label: 'Mở đủ 9 ô ở lô ruộng đầu' }, reward: { money: 100, seeds: { dau: 3, ot: 3 } },
  },
  {
    id: 'c7', title: 'Cây xoài sau nhà',
    text: 'Ông Bảy kể bà Út từng trồng cây xoài sau nhà, trái ngọt nhất xóm. "Trồng lại đi con, cho tụi nhỏ có trái ăn."',
    goal: { type: 'tree', n: 1, label: 'Trồng 1 cây ăn trái trong vườn' }, reward: { money: 80 },
  },
  {
    id: 'c8', title: 'Chuồng trại rộn ràng',
    text: 'Sáng nào cũng nghe heo kêu, bò rống. Bé Na nói nhà mình giống trang trại trong sách tranh.',
    goal: { type: 'animals', n: 1, label: 'Nuôi heo hoặc bò' }, reward: { money: 150 },
  },
  {
    id: 'c9', title: 'Sửa lại quán',
    text: 'Chú Ba thợ hồ dẫn cả tổ thợ tới phụ. "Quán bà Út thì phải đẹp, tui làm không lấy công!"',
    goal: { type: 'renovate', n: 1, label: 'Sửa quán lên quán gỗ' }, reward: { money: 200 },
  },
  {
    id: 'c10', title: 'Ước mơ của bà Út',
    text: 'Tối đó quán chật kín người. Ông Bảy lấy ra lá thư thứ hai bà gửi lại: "Cảm ơn con đã thắp lại bếp lửa. Quán giờ là của con." Hết chương đầu. ❤️',
    goal: { type: 'level', n: 4, label: 'Quán đạt cấp 4' }, reward: { money: 500 },
  },
];

// Nhiệm vụ hằng ngày: mỗi sáng chọn ngẫu nhiên 3 mẫu. n = [tối thiểu, tối đa]
export const DAILY_TASKS = [
  { type: 'harvest', n: [6, 14], label: 'Thu hoạch {n} nông sản', reward: 25 },
  { type: 'serve', n: [4, 9], label: 'Phục vụ {n} khách', reward: 35 },
  { type: 'drinks', n: [2, 5], label: 'Bán {n} ly nước', reward: 25 },
  { type: 'eggs', n: [3, 6], label: 'Nhặt {n} quả trứng', reward: 20 },
  { type: 'fish', n: [1, 3], label: 'Câu được {n} con cá', reward: 25 },
  { type: 'water', n: [5, 10], label: 'Tưới {n} ô đất', reward: 15 },
  { type: 'happy', n: [3, 6], label: '{n} khách hài lòng trên 80%', reward: 40 },
];
export const DAILY_COUNT = 3;
export const DAILY_REP = 3; // điểm danh tiếng thưởng thêm mỗi nhiệm vụ

// Sự kiện theo mùa (chỉ số mùa: 0 Xuân, 1 Hạ, 2 Thu, 3 Đông; ngày trong mùa 1-7)
export const EVENTS = [
  {
    id: 'tet', name: 'Tết Nguyên Đán', icon: '🧧', season: 3, days: [6, 7],
    dish: 'banhchung', payMult: 1.4, eventChance: 0.5,
    text: 'Tết về! Khách gọi bánh chưng nhiều, trả thêm 40%. Quán treo đèn đỏ rực.',
  },
  {
    id: 'trungthu', name: 'Tết Trung Thu', icon: '🏮', season: 2, days: [4, 5],
    dish: 'banhtrungthu', payMult: 1.3, eventChance: 0.5,
    text: 'Rằm tháng Tám! Bánh trung thu bán chạy, trẻ con rước đèn quanh quán.',
  },
];
// Chợ phiên: ngày cuối mỗi mùa, chợ giảm giá hạt giống
export const MARKET_FAIR = { day: 7, discount: 0.3 };

// Dân làng (GĐ8): đứng ở khu làng, chạm để trò chuyện
export const VILLAGERS = [
  {
    id: 'ongbay', name: 'Ông Bảy', role: 'Chủ tiệm tạp hoá', color: 0xbf8f6a, hair: 0xdddddd, shop: 'taphoa',
    lines: [
      'Con là cháu bà Út hả? Giống bà quá trời! Ông giữ cuốn sổ của bà đây.',
      'Tiệm ông có trà, cà phê, cây giống với đồ trang trí vườn. Cần gì cứ ghé.',
      'Bà Út hồi đó nấu canh chua ngon nhất xóm, nhớ nêm chút me nghen.',
    ],
  },
  {
    id: 'coba', name: 'Cô Ba lái đò', role: 'Bến đò', color: 0x9fd6f0, hair: 0x1f1f2a,
    lines: [
      'Đò tui chở khách làng bên qua ăn quán con đó. Nấu ngon là khách tự tới!',
      'Mùa nước nổi cá nhiều lắm, ra ao câu thử coi.',
      'Chiều chiều ngồi bến nghe mùi khói bếp quán con, thấy nhớ bà Út ghê.',
    ],
  },
  {
    id: 'thangti', name: 'Thằng Tí', role: 'Cậu bé trong xóm', color: 0xffcf7a, hair: 0x3a2a20,
    lines: [
      'Anh chị cho em vuốt con chó/mèo nhà mình nha!',
      'Trung thu em rước đèn ông sao ngang quán nè.',
      'Em nghe nói lúc nào quán lên cấp, ông Bảy có quà bí mật đó!',
    ],
  },
];
