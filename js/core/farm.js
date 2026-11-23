// Logic ô đất theo công cụ: xới -> gieo -> tưới -> lớn -> thu hoạch (rồi đất về chưa xới).
import { CROPS, CROP_STAGES, FARM, FERTILIZER_BOOST } from '../config/gameData.js';
import { emptyPlot } from './state.js';

export function cropStage(plot) {
  if (!plot.crop) return -1;
  let stage = 0;
  for (let i = 0; i < CROP_STAGES.length; i++) if (plot.growth >= CROP_STAGES[i]) stage = i;
  return stage;
}

export function isRipe(plot) {
  return !!plot.crop && plot.growth >= 1;
}

// Kiểm tra công cụ dùng được trên ô không (không thay đổi state)
export function canApply(state, index, tool, seedId) {
  const plot = state.plots[index];
  if (!plot) return { ok: false, reason: 'Ô đất này chưa mở.' };
  switch (tool) {
    case 'till':
      if (plot.crop) return { ok: false, reason: 'Ô đang có cây rồi.' };
      if (plot.tilled) return { ok: false, reason: 'Đất đã xới rồi.' };
      return { ok: true };
    case 'plant':
      if (plot.crop) return { ok: false, reason: 'Ô đang có cây rồi.' };
      if (!plot.tilled) return { ok: false, reason: 'Đất chưa xới. Chọn 🪏 Xới trước nhé.' };
      if (!CROPS[seedId]) return { ok: false, reason: 'Chọn hạt giống trước đã.' };
      if ((state.seeds[seedId] || 0) <= 0) return { ok: false, reason: `Hết hạt ${CROPS[seedId].name}. Ra chợ mua thêm nhé!` };
      return { ok: true };
    case 'water':
      if (!plot.tilled && !plot.crop) return { ok: false, reason: 'Xới đất trước rồi mới tưới.' };
      if (isRipe(plot)) return { ok: false, reason: 'Cây chín rồi, thu hoạch thôi!' };
      if (plot.watered) return { ok: false, reason: 'Đất còn ẩm rồi.' };
      return { ok: true };
    case 'fert':
      if (!plot.crop) return { ok: false, reason: 'Gieo cây trước rồi mới bón phân.' };
      if (isRipe(plot)) return { ok: false, reason: 'Cây chín rồi, thu hoạch thôi!' };
      if (plot.fert) return { ok: false, reason: 'Ô này đã bón phân rồi.' };
      if ((state.items.phan || 0) <= 0) return { ok: false, reason: 'Hết phân bón. Ra chợ mua thêm nhé!' };
      return { ok: true };
    case 'harvest':
      if (!plot.crop) return { ok: false, reason: 'Ô này chưa có cây.' };
      if (!isRipe(plot)) return { ok: false, reason: `Cây chưa chín (${Math.round(plot.growth * 100)}%).` };
      return { ok: true };
    default:
      return { ok: false, reason: '' };
  }
}

export function applyTool(state, index, tool, seedId) {
  const check = canApply(state, index, tool, seedId);
  if (!check.ok) return check;
  const plot = state.plots[index];
  if (tool === 'till') {
    plot.tilled = true;
  } else if (tool === 'plant') {
    state.seeds[seedId]--;
    plot.crop = seedId;
    plot.growth = 0;
  } else if (tool === 'water') {
    plot.watered = true;
  } else if (tool === 'fert') {
    state.items.phan--;
    plot.fert = true;
  } else if (tool === 'harvest') {
    const crop = CROPS[plot.crop];
    state.items[crop.harvestItem] = (state.items[crop.harvestItem] || 0) + crop.harvestAmount;
    state.stats.harvested += crop.harvestAmount;
    Object.assign(plot, emptyPlot());
    return { ok: true, item: crop.harvestItem, amount: crop.harvestAmount };
  }
  return { ok: true };
}

// Giá mở ô đất tiếp theo (null nếu đã mở hết)
export function nextUnlockPrice(state) {
  if (state.plots.length >= FARM.cells) return null;
  return FARM.unlockPrices[state.plots.length - FARM.startOpen] ?? FARM.unlockPrices.at(-1);
}

export function unlockPlot(state) {
  const price = nextUnlockPrice(state);
  if (price === null) return { ok: false, reason: 'Đã mở hết ô đất.' };
  if (state.money < price) return { ok: false, reason: `Cần ${price} xu để mở ô đất.` };
  state.money -= price;
  state.plots.push(emptyPlot());
  return { ok: true, index: state.plots.length - 1, price };
}

// Trả về danh sách ô vừa đổi giai đoạn để phần hiển thị cập nhật
export function tickFarm(state, dt) {
  const changed = [];
  state.plots.forEach((plot, i) => {
    if (!plot.crop || !plot.watered || plot.growth >= 1) return;
    const before = cropStage(plot);
    const boost = plot.fert ? FERTILIZER_BOOST : 1;
    plot.growth = Math.min(1, plot.growth + (dt * boost) / CROPS[plot.crop].growTime);
    if (cropStage(plot) !== before) changed.push(i);
  });
  return changed;
}

// Sang ngày mới: đất khô lại, cần tưới tiếp
export function newDayFarm(state) {
  state.plots.forEach((p) => (p.watered = false));
}
