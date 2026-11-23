// =====================================================================
//  DỮ LIỆU GAME — chỉnh giá, thời gian, số lượng ở đây, không cần sửa logic.
//  Thời gian tính bằng giây thực, tiền tính bằng "xu".
// =====================================================================

// Mọi vật phẩm trong kho (nông sản, trứng, cá...).
export const ITEMS = {
  rau:    { name: 'Rau muống', icon: '🥬', sellPrice: 6 },
  cachua: { name: 'Cà chua',   icon: '🍅', sellPrice: 9 },
  lua:    { name: 'Lúa',       icon: '🌾', sellPrice: 8 },
  trung:  { name: 'Trứng gà',  icon: '🥚', sellPrice: 7 },
  ca:     { name: 'Cá',        icon: '🐟', sellPrice: 10, buyPrice: 14 }, // mua ở chợ
};

// Cây trồng: gieo hạt -> tưới -> lớn dần (chỉ lớn khi đất ướt) -> thu hoạch.
export const CROPS = {
  rau:    { name: 'Rau muống', icon: '🥬', seedPrice: 4,  growTime: 30, harvestItem: 'rau',    harvestAmount: 2 },
  cachua: { name: 'Cà chua',   icon: '🍅', seedPrice: 7,  growTime: 50, harvestItem: 'cachua', harvestAmount: 2 },
  lua:    { name: 'Lúa',       icon: '🌾', seedPrice: 9,  growTime: 70, harvestItem: 'lua',    harvestAmount: 3 },
};
export const CROP_ORDER = ['rau', 'cachua', 'lua'];

// Ngưỡng giai đoạn lớn (tỉ lệ 0..1): hạt -> mầm -> cây non -> chín
export const CROP_STAGES = [0, 0.15, 0.5, 1];

// Chuồng gà
export const COOP = {
  chickens: 2,
  layTime: 40, // mỗi con đẻ 1 trứng sau bấy nhiêu giây
  maxEggs: 6,  // trứng chờ nhặt tối đa
};

// Thời gian trong ngày (phút trong game)
export const TIME = {
  dayStart: 6 * 60,   // 06:00 bắt đầu ngày
  evening: 17 * 60,   // 17:00 hết giờ làm nông
  minutesPerSecond: 3, // 1 giây thực = 3 phút trong game
};

// Trạng thái khi bắt đầu game mới
export const START = {
  money: 40,
  seeds: { rau: 4, cachua: 2, lua: 0 },
  items: { rau: 0, cachua: 0, lua: 0, trung: 0, ca: 0 },
  plotCount: 6,
};
