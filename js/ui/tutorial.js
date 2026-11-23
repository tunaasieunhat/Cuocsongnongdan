// Hướng dẫn từng bước: thẻ lời dẫn, làm nổi bật nút cần bấm, ngón tay chỉ vào vật thể 3D.
// Mỗi bước tự chuyển khi người chơi làm đúng việc (kiểm tra mỗi khung hình).
import { TUTORIAL_STEPS, TUTORIAL_REWARD } from '../config/tutorial.js';
import { CROP_ORDER } from '../config/gameData.js';
import { isRipe } from '../core/farm.js';

export class Tutorial {
  // ctx: { game, hud, world, focus(where), onFinish() }
  constructor(ctx) {
    this.ctx = ctx;
    this.steps = TUTORIAL_STEPS;
    this.flags = {};

    this.card = document.createElement('div');
    this.card.className = 'tut-card';
    this.card.hidden = true;
    this.card.setAttribute('role', 'dialog');
    this.card.setAttribute('aria-live', 'polite');

    this.hand = document.createElement('div');
    this.hand.className = 'tut-hand';
    this.hand.textContent = '👇';
    this.hand.hidden = true;

    ctx.hud.root.append(this.hand, this.card);
  }

  get state() {
    return this.ctx.game.state.tutorial;
  }

  get active() {
    return !!this.state && !this.state.done;
  }

  get step() {
    return this.steps[this.state.step];
  }

  start(fromBeginning = false) {
    const s = this.ctx.game.state;
    if (fromBeginning || !s.tutorial) s.tutorial = { step: 0, done: false, rewarded: s.tutorial?.rewarded || false };
    if (s.tutorial.done) return;
    // Bắt đầu bằng tay không, để bước "chọn công cụ Xới" có ý nghĩa
    this.ctx.hud.tutorialActive = true;
    if (s.tutorial.step === 0) this.ctx.hud.setTool('hand');
    this._enter();
  }

  // Sự kiện từ game (mở chợ...) để hoàn thành các bước kiểu "đã làm X"
  notify(flag) {
    this.flags[flag] = true;
  }

  skip() {
    this._finish(false);
  }

  _enter() {
    const { game, hud, focus } = this.ctx;
    const step = this.step;
    this.flags = {};
    this._harvestAtStart = game.state.stats.harvested;
    game.clockFrozen = true;
    game.growBoost = step.boost || 1;
    hud.tutorialActive = true;
    hud.tipEl.hidden = true;
    // Bước gieo mà hết sạch hạt: tặng 1 hạt rau để không bị kẹt
    if (step.id === 'pickPlant' && CROP_ORDER.every((id) => !game.state.seeds[id])) {
      game.state.seeds.rau = 1;
      game.emit('change');
    }
    if (step.focus) focus(step.focus);
    this._renderCard();
    this._highlight(step.ui);
    game.emit('change');
  }

  _renderCard() {
    const step = this.step;
    const n = this.state.step + 1;
    const total = this.steps.length;
    this.card.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'tut-head';
    head.innerHTML = `<span class="tut-count">💡 ${n}/${total}</span>${step.title ? `<b>${step.title}</b>` : ''}`;
    const skip = document.createElement('button');
    skip.className = 'tut-skip';
    skip.textContent = 'Bỏ qua';
    skip.onclick = () => {
      if (skip.dataset.confirm) return this.skip();
      skip.dataset.confirm = '1';
      skip.textContent = 'Bỏ qua thật?';
    };
    head.append(skip);
    const text = document.createElement('p');
    text.innerHTML = step.text;
    this.card.append(head, text);
    if (step.wait === 'button') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-pink tut-next';
      btn.textContent = step.button || 'Tiếp';
      btn.onclick = () => this._next();
      this.card.append(btn);
    }
    const bar = document.createElement('div');
    bar.className = 'tut-progress';
    bar.innerHTML = `<i style="width:${(n / total) * 100}%"></i>`;
    this.card.append(bar);
    this.card.classList.toggle('tut-big', step.wait === 'button');
    this.card.hidden = false;
  }

  _highlight(ui) {
    document.querySelectorAll('.tut-focus').forEach((el) => el.classList.remove('tut-focus'));
    if (!ui) return;
    const [kind, id] = ui.split(':');
    const hud = this.ctx.hud;
    const el = kind === 'tool' ? hud.toolBtns[id] : kind === 'side' ? hud.sideBtns[id] : null;
    if (el) el.classList.add('tut-focus');
  }

  _done(step) {
    const { game, hud } = this.ctx;
    const s = game.state;
    const w = step.wait;
    if (w.startsWith('tool:')) return hud.tool === w.slice(5);
    if (w === 'tilled') return s.plots.some((p) => p.tilled || p.crop);
    if (w === 'planted') return s.plots.some((p) => p.crop);
    if (w === 'watered') return s.plots.some((p) => p.crop && (p.watered || isRipe(p)));
    if (w === 'ripe') return s.plots.some((p) => isRipe(p));
    if (w === 'harvested') return s.stats.harvested > this._harvestAtStart;
    if (w === 'market') return !!this.flags.market;
    return false;
  }

  _next() {
    if (this.state.step >= this.steps.length - 1) return this._finish(true);
    this.state.step++;
    this.ctx.game.emit('change');
    this._enter();
  }

  _finish(completed) {
    const { game, hud } = this.ctx;
    const s = game.state;
    s.tutorial.done = true;
    if (completed && !s.tutorial.rewarded) {
      s.tutorial.rewarded = true;
      s.money += TUTORIAL_REWARD.money;
      Object.entries(TUTORIAL_REWARD.seeds).forEach(([id, n]) => (s.seeds[id] = (s.seeds[id] || 0) + n));
      hud.toast(`🎁 Nhận quà: ${TUTORIAL_REWARD.money} xu và hạt giống!`);
    }
    game.clockFrozen = false;
    game.growBoost = 1;
    hud.tutorialActive = false;
    this.card.hidden = true;
    this.hand.hidden = true;
    this._highlight(null);
    game.emit('change');
    this.ctx.onFinish?.();
  }

  // Ô đất / vật thể mà ngón tay cần chỉ vào ở bước hiện tại
  _pointAnchor(point) {
    const { game, world } = this.ctx;
    const plots = game.state.plots;
    const cell = (pred) => {
      const i = plots.findIndex(pred);
      return i >= 0 ? world.cellViews[i].interact.anchor : null;
    };
    switch (point) {
      case 'cell:untilled': return cell((p) => !p.tilled && !p.crop);
      case 'cell:tilled': return cell((p) => p.tilled && !p.crop);
      case 'cell:dry': return cell((p) => p.crop && !p.watered && !isRipe(p));
      case 'cell:growing': return cell((p) => p.crop && !isRipe(p));
      case 'cell:ripe': return cell((p) => isRipe(p));
      case 'market':
      case 'coop':
        return world.interactables.find((d) => d.type === point)?.anchor;
      default:
        return null;
    }
  }

  // Gọi mỗi khung hình
  update(toScreen) {
    if (!this.active) return;
    const step = this.step;
    // Đang mở cửa sổ (chợ...) thì ẩn thẻ cho đỡ rối, trừ khi cửa sổ đó chính là việc của bước này
    const modalOpen = !this.ctx.hud.modal.hidden;
    this.card.hidden = modalOpen;
    if (step.wait !== 'button' && this._done(step)) {
      this._next();
      return;
    }
    const anchor = step.point && !modalOpen ? this._pointAnchor(step.point) : null;
    // Ngón tay chạm sát mặt ô đất, hoặc ngay trên mái công trình
    const target = anchor ? anchor.clone().setY(step.point.startsWith('cell') ? 0.6 : anchor.y - 0.9) : null;
    const scr = target ? toScreen(target) : null;
    this.hand.hidden = !scr;
    if (scr) this.hand.style.transform = `translate(${scr.x}px, ${scr.y}px) translate(-50%, -100%)`;
  }
}
