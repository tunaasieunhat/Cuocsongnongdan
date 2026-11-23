// =====================================================================
//  DỮ LIỆU GAME — chỉnh giá, thời gian, số lượng ở đây, không cần sửa logic.
//  Thời gian tính bằng giây thực (trừ khi ghi "phút trong game"), tiền tính bằng "xu".
// =====================================================================

// ---------- Vật phẩm trong kho ----------
export const ITEMS = {
  rau:    { name: 'Rau muống', icon: '🥬', sellPrice: 6 },
  cachua: { name: 'Cà chua',   icon: '🍅', sellPrice: 9 },
  lua:    { name: 'Lúa',       icon: '🌾', sellPrice: 8 },
  cai:    { name: 'Cải bẹ',    icon: '🥦', sellPrice: 7 },
  trung:  { name: 'Trứng gà',  icon: '🥚', sellPrice: 7 },
  ca:     { name: 'Cá',        icon: '🐟', sellPrice: 10, buyPrice: 14 }, // mua ở chợ hoặc câu ở ao
  phan:   { name: 'Phân bón',  icon: '🧪', sellPrice: 2, buyPrice: 5, tool: true }, // dùng với công cụ Bón
};

// ---------- Mùa (mỗi mùa 7 ngày) ----------
export const SEASONS = [
  { id: 'xuan', name: 'Xuân', icon: '🌸', rainChance: 0.3 },
  { id: 'ha',   name: 'Hạ',   icon: '☀️', rainChance: 0.35 },
  { id: 'thu',  name: 'Thu',  icon: '🍂', rainChance: 0.25 },
  { id: 'dong', name: 'Đông', icon: '❄️', rainChance: 0.15 },
];
export const DAYS_PER_SEASON = 7;

// ---------- Cây trồng ----------
// seasons: chỉ số mùa bán hạt (0 Xuân, 1 Hạ, 2 Thu, 3 Đông). Cây đã gieo vẫn lớn bình thường khi hết mùa.
export const CROPS = {
  rau:    { name: 'Rau muống', icon: '🥬', seedPrice: 4, growTime: 30, harvestItem: 'rau',    harvestAmount: 2, seasons: [0, 1, 2] },
  cachua: { name: 'Cà chua',   icon: '🍅', seedPrice: 7, growTime: 50, harvestItem: 'cachua', harvestAmount: 2, seasons: [0, 1] },
  lua:    { name: 'Lúa',       icon: '🌾', seedPrice: 9, growTime: 70, harvestItem: 'lua',    harvestAmount: 3, seasons: [1, 2] },
  cai:    { name: 'Cải bẹ',    icon: '🥦', seedPrice: 5, growTime: 40, harvestItem: 'cai',    harvestAmount: 2, seasons: [3, 0] },
};
export const CROP_ORDER = ['rau', 'cachua', 'lua', 'cai'];
export const CROP_STAGES = [0, 0.15, 0.5, 1]; // hạt -> mầm -> cây non -> chín
export const FERTILIZER_BOOST = 1.6; // ô đã bón phân lớn nhanh gấp 1.6

// ---------- Chuồng gà ----------
export const COOP = {
  chickens: 2, // số gà ban đầu (nâng cấp thêm được)
  layTime: 40,
  maxEggs: 8,
};

// ---------- Thời gian trong ngày (phút trong game) ----------
export const TIME = {
  dayStart: 6 * 60,        // 06:00
  prep: 15 * 60,           // 15:00 nhắc chuẩn bị thực đơn
  open: 17 * 60,           // 17:00 mở quán
  lastOrder: 21 * 60 + 30, // 21:30 thôi đón khách mới
  close: 22 * 60 + 30,     // 22:30 đóng hẳn (khách còn lại ra về)
  minutesPerSecond: 3,     // ban ngày: 1 giây thực = 3 phút
  serviceMinutesPerSecond: 2, // giờ mở quán trôi chậm hơn
  // giữ tương thích tên cũ
  get evening() { return this.open; },
};

// ---------- Công cụ ----------
export const TOOLS = [
  { id: 'hand',    icon: '✋', label: 'Xem' },
  { id: 'till',    icon: '🪏', label: 'Xới' },
  { id: 'plant',   icon: '🌱', label: 'Gieo' },
  { id: 'water',   icon: '💧', label: 'Tưới' },
  { id: 'fert',    icon: '🧪', label: 'Bón' },
  { id: 'harvest', icon: '🧺', label: 'Thu' },
];

// ---------- Ruộng ----------
export const FARM = { cells: 9, startOpen: 6, unlockPrices: [30, 45, 60] };

// ---------- Món ăn ----------
// unlock: giá mở trong Sổ công thức (0 = có sẵn), level: cấp quán tối thiểu
export const RECIPES = {
  rauxao:    { name: 'Rau muống xào tỏi', icon: '🥗', ingredients: { rau: 2 },                       price: 28, cookTime: 3, unlock: 0,   level: 1 },
  trungchien:{ name: 'Trứng chiên cà chua', icon: '🍳', ingredients: { trung: 1, cachua: 1 },         price: 34, cookTime: 4, unlock: 0,   level: 1 },
  canhchua:  { name: 'Canh chua cá',      icon: '🍲', ingredients: { ca: 1, cachua: 1, rau: 1 },      price: 62, cookTime: 6, unlock: 0,   level: 1 },
  comphan:   { name: 'Cơm phần',          icon: '🍱', ingredients: { lua: 1, trung: 1, rau: 1 },      price: 55, cookTime: 5, unlock: 0,   level: 1 },
  canhcai:   { name: 'Canh cải',          icon: '🥣', ingredients: { cai: 2 },                        price: 32, cookTime: 4, unlock: 50,  level: 1 },
  comchien:  { name: 'Cơm chiên trứng',   icon: '🍛', ingredients: { lua: 1, trung: 2 },              price: 52, cookTime: 5, unlock: 100, level: 2 },
  cakho:     { name: 'Cá kho tộ',         icon: '🥘', ingredients: { ca: 2 },                         price: 60, cookTime: 6, unlock: 120, level: 2 },
  banhxeo:   { name: 'Bánh xèo',          icon: '🥞', ingredients: { lua: 1, trung: 1, rau: 1, cachua: 1 }, price: 85, cookTime: 7, unlock: 180, level: 3 },
};
export const RECIPE_ORDER = ['rauxao', 'trungchien', 'canhchua', 'comphan', 'canhcai', 'comchien', 'cakho', 'banhxeo'];

// ---------- Quán ----------
export const RESTAURANT = {
  startTables: 3,
  maxTables: 6,
  counterMax: 6,          // số món để sẵn trên quầy
  menuSize: (level) => Math.min(5, 2 + Math.ceil(level / 2)), // số món tối đa trong thực đơn
  spawnEvery: 12,         // giây giữa 2 lượt khách (cấp 1)
  walkIn: 4,              // giây khách đi từ đường vào bàn
  patience: 50,           // giây khách chờ món
  vipPatience: 38,
  eatTime: 6,
  wrongDishPenalty: 35,   // trừ điểm hài lòng khi nhận nhầm món
  tipMax: 0.4,            // tip tối đa = 40% giá món khi khách rất hài lòng
  vipLevel: 3,            // từ cấp quán này có khách VIP
  vipChance: 0.15,
  vipPay: 1.5,
};

// Cấp quán theo điểm danh tiếng (khách hài lòng cho nhiều điểm hơn)
export const REPUTATION_LEVELS = [0, 60, 170, 340, 600, 950];

// ---------- Nâng cấp ----------
// Mỗi nâng cấp có nhiều bậc: prices[i] là giá bậc i+1, level là cấp quán tối thiểu cho từng bậc
export const UPGRADES = [
  { id: 'tables',    group: 'quan', icon: '🪑', name: 'Thêm bàn',          desc: 'Thêm 1 bàn cho khách mỗi bậc.',                prices: [80, 150, 260], level: [1, 2, 3] },
  { id: 'fastStove', group: 'quan', icon: '🔥', name: 'Bếp lửa to',        desc: 'Nấu nhanh hơn 25% mỗi bậc.',                    prices: [90, 200],      level: [1, 2] },
  { id: 'stove2',    group: 'quan', icon: '🍳', name: 'Bếp thứ hai',       desc: 'Nấu 2 món cùng lúc.',                          prices: [220],          level: [2] },
  { id: 'waiter',    group: 'quan', icon: '🧑‍🍳', name: 'Thuê người phục vụ', desc: 'Tự bưng món có sẵn trên quầy và dọn bàn.',   prices: [250],          level: [2] },
  { id: 'bigCan',    group: 'trai', icon: '🚿', name: 'Bình tưới lớn',     desc: 'Tưới một lần cả hàng 3 ô.',                    prices: [70],           level: [1] },
  { id: 'chickens',  group: 'trai', icon: '🐔', name: 'Thêm gà',           desc: 'Thêm 1 con gà đẻ trứng mỗi bậc.',              prices: [60, 120],      level: [1, 2] },
  { id: 'gardener',  group: 'trai', icon: '👨‍🌾', name: 'Thuê người làm vườn', desc: 'Mỗi sáng tự tưới mọi ô đang có cây.',      prices: [180],          level: [2] },
];

// ---------- Trang trí (mua 1 lần, tăng hài lòng + tip) ----------
export const DECOR = [
  { id: 'denlong',  icon: '🏮', name: 'Dây đèn lồng',   price: 40, bonus: 0.03 },
  { id: 'chauhoa',  icon: '🌺', name: 'Chậu hoa giấy',  price: 30, bonus: 0.02 },
  { id: 'caycanh',  icon: '🌴', name: 'Cây cau cảnh',   price: 60, bonus: 0.04 },
  { id: 'chuonggio',icon: '🎐', name: 'Chuông gió',     price: 35, bonus: 0.02 },
  { id: 'xichdu',   icon: '🪢', name: 'Xích đu gỗ',     price: 90, bonus: 0.05 },
  { id: 'banggo',   icon: '🪧', name: 'Bảng thực đơn',  price: 50, bonus: 0.03 },
];

// ---------- Khách quen ----------
export const REGULARS = [
  { id: 'batu',  name: 'Bà Tư',  color: 0xc9a7f5, favorite: 'canhchua',
    story: ['Bà Tư khen canh chua giống hệt hồi con gái bà còn ở nhà.', 'Bà Tư kể ngày xưa bà bán canh chua ở chợ nổi, ai cũng nhớ mùi me.', 'Bà Tư tặng bạn công thức nêm của bà. Bà nói: "Quán này có hồn rồi."'] },
  { id: 'chuba', name: 'Chú Ba', color: 0x9fd6f0, favorite: 'comphan',
    story: ['Chú Ba làm thợ hồ, chiều nào cũng ghé ăn cơm phần cho chắc bụng.', 'Chú Ba nói cơm quán mình làm chú nhớ cơm vợ nấu ở quê.', 'Chú Ba hứa sửa giùm mái hiên quán. "Ăn ngon thì phải giúp chứ!"'] },
  { id: 'bena',  name: 'Bé Na',  color: 0xffcf7a, favorite: 'trungchien',
    story: ['Bé Na mê trứng chiên cà chua, ăn xong còn vẽ tặng bạn con gà.', 'Bé Na kể ở trường cô cho vẽ món ăn yêu thích, bé vẽ món của quán.', 'Bé Na dán bức tranh lên tường quán. Ai vào cũng cười.'] },
  { id: 'cohai', name: 'Cô Hai', color: 0xf6a6b9, favorite: 'rauxao',
    story: ['Cô Hai ăn chay ngày rằm, chỉ thích rau muống xào tỏi của quán.', 'Cô Hai dạy bạn mẹo xào rau giòn: lửa thật to, đảo thật nhanh.', 'Cô Hai giới thiệu cả xóm tới quán. "Rau nhà trồng, ăn là biết!"'] },
];
export const REGULAR_CHANCE = 0.35; // khả năng mỗi lượt khách là khách quen (nếu món ưa thích có trong thực đơn)

// ---------- Câu cá ----------
export const FISHING = { fishPerDay: 4, zoneWidth: 0.22, speed: 1.3 };

// ---------- Bắt đầu game mới ----------
export const START = {
  money: 40,
  seeds: { rau: 4, cachua: 2, lua: 0, cai: 0 },
  items: { rau: 0, cachua: 1, lua: 1, cai: 0, trung: 2, ca: 1, phan: 2 },
};
