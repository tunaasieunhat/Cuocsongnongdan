// Tuỳ biến (GĐ9): tên, trang phục, thú cưng, trang trí vườn đặt tự do.
import { OUTFITS, PETS, GARDEN_DECOR, GARDEN_BONUS_EACH, GARDEN_BONUS_MAX } from '../config/gameData.js';

export function defaultCustom() {
  return {
    profile: { name: 'Chủ nông trại', shop: 'Quán Nhỏ' },
    outfit: { shirt: 'mint', hat: 'nonla', hair: 0 },
    owned: { shirts: ['mint', 'hong'], hats: ['nonla', 'khong'] },
    pets: { owned: [], active: null },
    garden: { owned: {}, placed: [] },
  };
}

const clean = (t, max) => String(t || '').replace(/[<>"'&`]/g, '').trim().slice(0, max);

export function setNames(state, name, shop) {
  const n = clean(name, 18);
  const s = clean(shop, 22);
  if (!n || !s) return { ok: false, reason: 'Tên không được để trống.' };
  state.custom.profile = { name: n, shop: s };
  return { ok: true };
}

export function buyOutfit(state, kind, id) {
  const list = OUTFITS[kind];
  const it = list.find((x) => x.id === id);
  const owned = state.custom.owned[kind];
  if (owned.includes(id)) return { ok: true, already: true };
  if (state.money < it.price) return { ok: false, reason: `Cần ${it.price} xu.` };
  state.money -= it.price;
  owned.push(id);
  return { ok: true };
}

export function wearOutfit(state, kind, id) {
  if (kind === 'hair') {
    state.custom.outfit.hair = id;
    return { ok: true };
  }
  if (!state.custom.owned[kind].includes(id)) return { ok: false, reason: 'Chưa mua món này.' };
  state.custom.outfit[kind === 'shirts' ? 'shirt' : 'hat'] = id;
  return { ok: true };
}

export function buyPet(state, id) {
  const p = PETS[id];
  const pets = state.custom.pets;
  if (pets.owned.includes(id)) return { ok: false, reason: 'Đã nuôi bé này rồi.' };
  if (state.money < p.price) return { ok: false, reason: `Cần ${p.price} xu.` };
  state.money -= p.price;
  pets.owned.push(id);
  pets.active = id;
  return { ok: true };
}

export function setActivePet(state, id) {
  const pets = state.custom.pets;
  if (id && !pets.owned.includes(id)) return { ok: false, reason: 'Chưa nuôi bé này.' };
  pets.active = id;
  return { ok: true };
}

// ---- Trang trí vườn ----
export function buyGarden(state, id) {
  const d = GARDEN_DECOR.find((x) => x.id === id);
  if (state.money < d.price) return { ok: false, reason: `Cần ${d.price} xu.` };
  state.money -= d.price;
  const g = state.custom.garden;
  g.owned[id] = (g.owned[id] || 0) + 1;
  return { ok: true };
}

export function gardenFree(state, id) {
  const g = state.custom.garden;
  return (g.owned[id] || 0) - g.placed.filter((p) => p.id === id).length;
}

export function placeGarden(state, id, x, z) {
  if (gardenFree(state, id) <= 0) return { ok: false, reason: 'Hết món này trong kho, mua thêm ở tạp hoá nhé.' };
  state.custom.garden.placed.push({ id, x: Math.round(x * 2) / 2, z: Math.round(z * 2) / 2, rot: 0 });
  return { ok: true, index: state.custom.garden.placed.length - 1 };
}

export function moveGarden(state, index, x, z) {
  const p = state.custom.garden.placed[index];
  if (!p) return { ok: false, reason: 'Không tìm thấy đồ trang trí.' };
  p.x = Math.round(x * 2) / 2;
  p.z = Math.round(z * 2) / 2;
  return { ok: true };
}

export function rotateGarden(state, index) {
  const p = state.custom.garden.placed[index];
  if (!p) return { ok: false };
  p.rot = (p.rot + 1) % 4;
  return { ok: true };
}

export function storeGarden(state, index) {
  const g = state.custom.garden;
  if (!g.placed[index]) return { ok: false };
  g.placed.splice(index, 1);
  return { ok: true };
}

export function gardenBonus(state) {
  return Math.min(GARDEN_BONUS_MAX, state.custom.garden.placed.length * GARDEN_BONUS_EACH);
}
