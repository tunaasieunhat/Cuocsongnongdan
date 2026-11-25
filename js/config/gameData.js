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
  // GĐ7: cây mới, trái cây, sản phẩm vật nuôi
  dau:    { name: 'Đậu xanh',  icon: '🫘', sellPrice: 7 },
  bi:     { name: 'Bí đỏ',     icon: '🎃', sellPrice: 12 },
  ot:     { name: 'Ớt',        icon: '🌶️', sellPrice: 5 },
  mia:    { name: 'Mía',       icon: '🎋', sellPrice: 9 },
  xoai:   { name: 'Xoài',      icon: '🥭', sellPrice: 14 },
  chuoi:  { name: 'Chuối',     icon: '🍌', sellPrice: 8 },
  thit:   { name: 'Thịt heo',  icon: '🥩', sellPrice: 22 },
  sua:    { name: 'Sữa bò',    icon: '🥛', sellPrice: 10 },
  // GĐ6: nguyên liệu đồ uống mua ở tiệm tạp hoá
  tra:    { name: 'Lá trà',    icon: '🍃', sellPrice: 1, buyPrice: 2, shop: 'taphoa' },
  caphe:  { name: 'Cà phê',    icon: '🫖', sellPrice: 3, buyPrice: 6, shop: 'taphoa' },
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
  dau:    { name: 'Đậu xanh',  icon: '🫘', seedPrice: 6, growTime: 45, harvestItem: 'dau',    harvestAmount: 3, seasons: [1, 2] },
  bi:     { name: 'Bí đỏ',     icon: '🎃', seedPrice: 10, growTime: 80, harvestItem: 'bi',    harvestAmount: 2, seasons: [2, 3] },
  ot:     { name: 'Ớt',        icon: '🌶️', seedPrice: 4, growTime: 35, harvestItem: 'ot',     harvestAmount: 3, seasons: [0, 1] },
  mia:    { name: 'Mía',       icon: '🎋', seedPrice: 8, growTime: 90, harvestItem: 'mia',    harvestAmount: 4, seasons: [1, 2, 3] },
};
export const CROP_ORDER = ['rau', 'cachua', 'lua', 'cai', 'dau', 'bi', 'ot', 'mia'];
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
// Lô 1: 9 ô (6 mở sẵn, 3 ô mua lẻ). Lô 2: 9 ô mua một lần qua nâng cấp "lot2" (cần mở hết lô 1).
export const FARM = { cells: 9, startOpen: 6, unlockPrices: [30, 45, 60], lot2Cells: 9 };

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
  // GĐ7: món từ cây, trái và vật nuôi mới
  canhbi:    { name: 'Canh bí đỏ',        icon: '🍵', ingredients: { bi: 2 },                         price: 40, cookTime: 4, unlock: 60,  level: 1 },
  chuoinuong:{ name: 'Chuối nướng',       icon: '🍢', ingredients: { chuoi: 2 },                      price: 36, cookTime: 3, unlock: 80,  level: 2 },
  dausotca:  { name: 'Đậu sốt cà',        icon: '🥫', ingredients: { dau: 2, cachua: 1 },             price: 48, cookTime: 5, unlock: 90,  level: 2 },
  canuong:   { name: 'Cá nướng muối ớt',  icon: '🐠', ingredients: { ca: 1, ot: 1 },                  price: 70, cookTime: 6, unlock: 140, level: 2 },
  banhflan:  { name: 'Bánh flan',         icon: '🍮', ingredients: { trung: 2, sua: 1 },              price: 58, cookTime: 5, unlock: 160, level: 3 },
  thitkho:   { name: 'Thịt kho trứng',    icon: '🍖', ingredients: { thit: 1, trung: 2 },             price: 95, cookTime: 8, unlock: 220, level: 3 },
  // GĐ8: món sự kiện (tự biết trong ngày lễ, bán giá cao)
  banhchung: { name: 'Bánh chưng',        icon: '🟩', ingredients: { lua: 2, dau: 1, thit: 1 },       price: 120, cookTime: 9, unlock: 0, level: 1, event: 'tet' },
  banhtrungthu: { name: 'Bánh trung thu', icon: '🥮', ingredients: { lua: 1, trung: 1, dau: 1 },      price: 90, cookTime: 7, unlock: 0, level: 1, event: 'trungthu' },
};
export const RECIPE_ORDER = ['rauxao', 'trungchien', 'canhchua', 'comphan', 'canhcai', 'canhbi', 'comchien', 'cakho', 'chuoinuong', 'dausotca', 'canuong', 'banhxeo', 'banhflan', 'thitkho', 'banhchung', 'banhtrungthu'];

// ---------- Đồ uống (GĐ6): pha ở quầy nước, nhanh, khách gọi kèm món ----------
export const DRINKS = {
  trada:   { name: 'Trà đá',          icon: '🧋', ingredients: { tra: 1 },          price: 8,  makeTime: 1.5, unlock: 0,   level: 1 },
  chedau:  { name: 'Chè đậu xanh',    icon: '🥤', ingredients: { dau: 2 },          price: 20, makeTime: 2,   unlock: 60,  level: 1 },
  nuocmia: { name: 'Nước mía',        icon: '🍹', ingredients: { mia: 1 },          price: 16, makeTime: 2,   unlock: 40,  level: 1 },
  caphe:   { name: 'Cà phê sữa đá',   icon: '☕', ingredients: { caphe: 1, sua: 1 }, price: 24, makeTime: 2,   unlock: 90,  level: 2 },
  sinhto:  { name: 'Sinh tố xoài',    icon: '🥭', ingredients: { xoai: 1, sua: 1 },  price: 30, makeTime: 2.5, unlock: 120, level: 3 },
};
export const DRINK_ORDER = ['trada', 'chedau', 'nuocmia', 'caphe', 'sinhto'];
// Món + đồ uống dùng chung một bảng tra (id không trùng nhau)
export const ALL_MENU = { ...RECIPES, ...DRINKS };

// ---------- Quán ----------
export const RESTAURANT = {
  startTables: 3,
  maxTables: 8,           // 6 trong quán + 2 ngoài sân
  drinkChance: 0.45,      // khả năng khách gọi kèm đồ uống (nếu đã biết pha)
  drinkTipBonus: 0.25,    // đưa đủ nước: tip thêm 25%
  drinkSat: 8,            // và +8 hài lòng
  drinkMax: 4,            // số ly để sẵn tối đa trên quầy nước
  renovateSat: 5,         // mỗi bậc sửa quán +5 hài lòng
  orderMax: 2,            // số đơn đặt trước cùng lúc
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
  { id: 'tables',    group: 'quan', icon: '🪑', name: 'Thêm bàn',          desc: 'Thêm 1 bàn mỗi bậc (bậc 4-5 là bàn ngoài sân).', prices: [80, 150, 260, 380, 520], level: [1, 2, 3, 4, 4] },
  { id: 'renovate',  group: 'quan', icon: '🏗️', name: 'Sửa quán',          desc: 'Quán lá → quán gỗ → nhà gạch. +5 hài lòng mỗi bậc.', prices: [300, 700], level: [2, 4] },
  { id: 'chef',      group: 'quan', icon: '👨‍🍳', name: 'Thuê đầu bếp',      desc: 'Tự nấu món khách đang chờ (nếu đủ nguyên liệu).', prices: [320], level: [3] },
  { id: 'fastStove', group: 'quan', icon: '🔥', name: 'Bếp lửa to',        desc: 'Nấu nhanh hơn 25% mỗi bậc.',                    prices: [90, 200],      level: [1, 2] },
  { id: 'stove2',    group: 'quan', icon: '🍳', name: 'Bếp thứ hai',       desc: 'Nấu 2 món cùng lúc.',                          prices: [220],          level: [2] },
  { id: 'waiter',    group: 'quan', icon: '🧑‍🍳', name: 'Thuê người phục vụ', desc: 'Tự bưng món có sẵn trên quầy và dọn bàn.',   prices: [250],          level: [2] },
  { id: 'bigCan',    group: 'trai', icon: '🚿', name: 'Bình tưới lớn',     desc: 'Tưới một lần cả hàng 3 ô.',                    prices: [70],           level: [1] },
  { id: 'chickens',  group: 'trai', icon: '🐔', name: 'Thêm gà',           desc: 'Thêm 1 con gà đẻ trứng mỗi bậc.',              prices: [60, 120],      level: [1, 2] },
  { id: 'gardener',  group: 'trai', icon: '👨‍🌾', name: 'Thuê người làm vườn', desc: 'Mỗi sáng tự tưới mọi ô đang có cây.',      prices: [180],          level: [2] },
  { id: 'lot2',      group: 'trai', icon: '🗺️', name: 'Lô ruộng thứ hai',  desc: 'Thêm 9 ô đất (cần mở hết lô 1).',              prices: [400],          level: [3] },
  { id: 'ducks',     group: 'trai', icon: '🦆', name: 'Nuôi vịt',          desc: 'Vịt bơi ở ao, đẻ thêm trứng vào chuồng.',     prices: [80, 140],      level: [1, 2] },
  { id: 'pigpen',    group: 'trai', icon: '🐖', name: 'Chuồng heo',        desc: 'Cho heo ăn rau/bí/cải mỗi ngày → có thịt.',  prices: [150],          level: [2] },
  { id: 'cowshed',   group: 'trai', icon: '🐄', name: 'Chuồng bò sữa',     desc: 'Cho bò ăn lúa mỗi ngày → có sữa.',           prices: [220],          level: [2] },
];

// ---------- Vật nuôi cần cho ăn (GĐ7) ----------
// Cho ăn trong ngày -> sáng hôm sau có sản phẩm. Vuốt ve đủ 5 lần -> thêm 1 sản phẩm mỗi ngày.
export const ANIMALS = {
  pig: { name: 'Heo', icon: '🐖', upgrade: 'pigpen', food: ['rau', 'bi', 'cai'], product: 'thit', amount: 1 },
  cow: { name: 'Bò sữa', icon: '🐄', upgrade: 'cowshed', food: ['lua'], product: 'sua', amount: 2 },
};
export const PET_LOVE_BONUS = 5;

// ---------- Vườn cây ăn trái (GĐ7) ----------
export const TREES = {
  xoai:  { name: 'Cây xoài',  icon: '🥭', saplingPrice: 40, growDays: 2, fruit: 'xoai',  amount: 2 },
  chuoi: { name: 'Cây chuối', icon: '🍌', saplingPrice: 30, growDays: 1, fruit: 'chuoi', amount: 3 },
};
export const ORCHARD_SLOTS = 3;

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

// ---------- Trang trí vườn đặt tự do (GĐ9): mua bao nhiêu cũng được, mỗi món +1% hài lòng (tối đa 10%) ----------
export const GARDEN_DECOR = [
  { id: 'ghenda',   icon: '🪨', name: 'Ghế đá',      price: 40 },
  { id: 'dench',    icon: '🏮', name: 'Đèn đá',      price: 50 },
  { id: 'congtre',  icon: '⛩️', name: 'Cổng tre',    price: 70 },
  { id: 'chuongchim', icon: '🐦', name: 'Chuồng chim', price: 45 },
  { id: 'luonuoc',  icon: '🏺', name: 'Lu nước',     price: 35 },
  { id: 'bonhoa',   icon: '🌷', name: 'Bồn hoa',     price: 30 },
  { id: 'caytrang', icon: '🌳', name: 'Cây bóng mát', price: 55 },
];
export const GARDEN_BONUS_EACH = 0.01;
export const GARDEN_BONUS_MAX = 0.1;

// ---------- Trang phục & thú cưng (GĐ9) ----------
export const OUTFITS = {
  shirts: [
    { id: 'mint', name: 'Áo bạc hà', color: 0x9fe0c4, price: 0 },
    { id: 'hong', name: 'Áo hồng', color: 0xf6a6b9, price: 0 },
    { id: 'vang', name: 'Áo vàng', color: 0xffd34e, price: 40 },
    { id: 'xanh', name: 'Áo xanh trời', color: 0x9fd6f0, price: 40 },
    { id: 'tim', name: 'Áo tím', color: 0xc9a7f5, price: 60 },
    { id: 'babahoa', name: 'Áo bà ba hoa', color: 0xef8fa8, price: 90 },
  ],
  hats: [
    { id: 'nonla', name: 'Nón lá', price: 0 },
    { id: 'khong', name: 'Không đội', price: 0 },
    { id: 'murom', name: 'Mũ rơm', price: 50 },
    { id: 'khanran', name: 'Khăn rằn', price: 80 },
  ],
  hair: [0x3a2a20, 0x6b4a2e, 0x1f1f2a, 0xb07a4a],
};
export const PETS = {
  cho: { name: 'Chó vàng', icon: '🐕', price: 120 },
  meo: { name: 'Mèo mướp', icon: '🐈', price: 120 },
};

// ---------- Câu cá ----------
export const FISHING = { fishPerDay: 4, zoneWidth: 0.22, speed: 1.3 };

// ---------- Bắt đầu game mới ----------
export const START = {
  money: 40,
  seeds: { rau: 4, cachua: 2, lua: 0, cai: 0, dau: 0, bi: 0, ot: 0, mia: 0 },
  items: { rau: 0, cachua: 1, lua: 1, cai: 0, trung: 2, ca: 1, phan: 2, tra: 3 },
};
