// Chợ: mua hạt giống / nguyên liệu, bán nông sản dư.
import { CROPS, ITEMS } from '../config/gameData.js';

// price: giá mỗi hạt (chợ phiên có thể rẻ hơn giá gốc)
export function buySeed(state, cropId, qty = 1, price = CROPS[cropId].seedPrice) {
  const cost = price * qty;
  if (state.money < cost) return { ok: false, reason: 'Không đủ tiền.' };
  state.money -= cost;
  state.seeds[cropId] = (state.seeds[cropId] || 0) + qty;
  return { ok: true, cost };
}

export function buyItem(state, itemId, qty = 1) {
  const item = ITEMS[itemId];
  if (!item.buyPrice) return { ok: false, reason: 'Chợ không bán món này.' };
  const cost = item.buyPrice * qty;
  if (state.money < cost) return { ok: false, reason: 'Không đủ tiền.' };
  state.money -= cost;
  state.items[itemId] = (state.items[itemId] || 0) + qty;
  return { ok: true, cost };
}

export function sellItem(state, itemId, qty = 1) {
  const have = state.items[itemId] || 0;
  if (have < qty) return { ok: false, reason: 'Không đủ hàng để bán.' };
  const gain = ITEMS[itemId].sellPrice * qty;
  state.items[itemId] = have - qty;
  state.money += gain;
  state.stats.earned += gain;
  return { ok: true, gain };
}
