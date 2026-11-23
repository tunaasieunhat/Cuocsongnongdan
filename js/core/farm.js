// Logic ô đất: gieo, tưới, lớn, thu hoạch.
import { CROPS, CROP_STAGES } from '../config/gameData.js';

export function cropStage(plot) {
  if (!plot.crop) return -1;
  let stage = 0;
  for (let i = 0; i < CROP_STAGES.length; i++) if (plot.growth >= CROP_STAGES[i]) stage = i;
  return stage;
}

export function isRipe(plot) {
  return !!plot.crop && plot.growth >= 1;
}

// Hành động "mặc định" khi chạm vào ô đất
export function plotAction(plot) {
  if (!plot.crop) return 'plant';
  if (isRipe(plot)) return 'harvest';
  if (!plot.watered) return 'water';
  return 'wait';
}

export function plant(state, index, cropId) {
  const plot = state.plots[index];
  if (!plot || plot.crop) return { ok: false, reason: 'Ô đất đã có cây.' };
  if (!CROPS[cropId]) return { ok: false, reason: 'Chưa chọn hạt giống.' };
  if ((state.seeds[cropId] || 0) <= 0) return { ok: false, reason: `Hết hạt ${CROPS[cropId].name}. Ra chợ mua thêm nhé!` };
  state.seeds[cropId]--;
  plot.crop = cropId;
  plot.growth = 0;
  // Gieo xong đất vẫn giữ trạng thái ướt nếu đã tưới trước đó
  return { ok: true };
}

export function water(state, index) {
  const plot = state.plots[index];
  if (!plot) return { ok: false };
  if (plot.watered) return { ok: false, reason: 'Đất còn ướt rồi.' };
  plot.watered = true;
  return { ok: true };
}

export function harvest(state, index) {
  const plot = state.plots[index];
  if (!plot || !isRipe(plot)) return { ok: false, reason: 'Cây chưa chín.' };
  const crop = CROPS[plot.crop];
  state.items[crop.harvestItem] = (state.items[crop.harvestItem] || 0) + crop.harvestAmount;
  state.stats.harvested += crop.harvestAmount;
  plot.crop = null;
  plot.growth = 0;
  return { ok: true, item: crop.harvestItem, amount: crop.harvestAmount };
}

// Trả về danh sách ô vừa đổi giai đoạn để phần hiển thị cập nhật
export function tickFarm(state, dt) {
  const changed = [];
  state.plots.forEach((plot, i) => {
    if (!plot.crop || !plot.watered || plot.growth >= 1) return;
    const before = cropStage(plot);
    plot.growth = Math.min(1, plot.growth + dt / CROPS[plot.crop].growTime);
    if (cropStage(plot) !== before) changed.push(i);
  });
  return changed;
}

// Sang ngày mới: đất khô lại, cần tưới tiếp
export function newDayFarm(state) {
  state.plots.forEach((p) => (p.watered = false));
}
