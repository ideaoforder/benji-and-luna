// A shop counter. A cat that walks up to it (pushing up at the back of the room) opens the menu: up and down choose,
// attack buys, jump leaves. While a cat is shopping it stands still and its buttons only work the menu; the other cats
// play on. Stock and prices are SHOPS in src/config.js; paws and purchases live in src/save.js.
import { W, RES, TOOLS, SPECIALS, BRAWL as B } from '../config.js';
import { state, kit } from '../state.js';
import { save, addPaws, pawsOf, own, level, persist } from '../save.js';
import { sfx } from '../sound.js';
import { has, iconFrame } from '../fx.js';

const st = { fontFamily: 'system-ui, sans-serif', color: '#ffffff', stroke: '#1c1630', strokeThickness: 4, resolution: RES };

export class Shop {
  constructor(scene, shop) {
    this.scene = scene; this.shop = shop; this.p = null; this.idx = 0;
    // Drawn in the HUD scene (screen space, above everything); removed when the cats leave the room.
    const ui = scene.ui;
    scene.events.once('shutdown', () => this.objects.concat(this.prompt).forEach(o => o.destroy()));
    // The counter: the back of the room between these x's (the whole width unless the map says otherwise).
    this.zone = { x0: 140, x1: W - 140 };
    const x = W - 400, y = 116;
    this.panel = ui.add.rectangle(x - 16, y - 14, 392, 72 + shop.items.length * 54, 0x1c1630, 0.88).setOrigin(0, 0)
      .setStrokeStyle(3, 0xffe066, 0.9).setDepth(990);
    this.title = ui.add.text(x, y, shop.name, { ...st, fontSize: '20px', fontStyle: 'bold', color: '#ffe066' }).setDepth(991);
    this.purse = ui.add.text(x + 360, y + 3, '', { ...st, fontSize: '16px' }).setOrigin(1, 0).setDepth(991);
    this.rows = shop.items.map((item, i) => {
      const ry = y + 40 + i * 54, frame = iconFrame(item.icon || item.tool || item.special);
      return { item, cursor: ui.add.text(x - 6, ry + 6, '▶', { ...st, fontSize: '16px', color: '#ffe066' }).setDepth(991),
               icon: has(ui, 'icons') && frame !== undefined ? ui.add.image(x + 26, ry + 16, 'icons', frame).setDisplaySize(28, 28).setDepth(991)
                     : ui.add.text(x + 26, ry + 16, this.text(item, 'icon'), { fontSize: '22px', resolution: RES }).setOrigin(0.5).setDepth(991),
               name: ui.add.text(x + 48, ry, '', { ...st, fontSize: '16px', fontStyle: 'bold' }).setDepth(991),
               tip: ui.add.text(x + 48, ry + 21, '', { ...st, fontSize: '12px', strokeThickness: 3, color: '#d9d2f2' }).setDepth(991),
               price: ui.add.text(x + 360, ry + 2, '', { ...st, fontSize: '16px', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(991) };
    });
    this.help = ui.add.text(x, y + 46 + shop.items.length * 54 - 6, 'up/down choose    attack buy    jump leave', { ...st, fontSize: '12px', strokeThickness: 3, color: '#ffe066' })
      .setDepth(991);
    this.prompt = ui.add.text(W / 2, B.floorTop - 30, '▲ ' + shop.keeper, { ...st, fontSize: '15px' }).setOrigin(0.5, 1).setDepth(989);
    this.show(false);
  }

  get objects() { return [this.panel, this.title, this.purse, this.help, ...this.rows.flatMap(r => [r.cursor, r.icon, r.name, r.tip, r.price])]; }
  show(on) { this.objects.forEach(o => o.setVisible(on)); }

  text(item, what) {
    const T = item.tool && TOOLS[item.tool], S = item.special && SPECIALS[item.special];
    if (what === 'icon') return (T || S || {}).icon || '★';
    if (what === 'name') return item.name || (T ? T.name : S ? S.name : '?');
    return item.tip || (T ? T.tip + ' (×' + T.uses + ')' : S ? S.tip : '');
  }
  // 'owned' / 'max' / '' (buyable)
  status(item, p = this.p) {            // tools and specials: owned by the player at the counter, not the party
    if (item.tool) return p && kit(p.entry, 'tools').includes(item.tool) ? 'owned' : '';
    if (item.special) return p && kit(p.entry, 'specials').includes(item.special) ? 'owned' : '';
    if (item.upgrade) return level(item.upgrade) >= (item.max || 1) ? 'max' : '';
    return '';
  }

  draw() {
    const mine = this.p ? pawsOf(state.party.indexOf(this.p.entry)) : 0;      // the buyer's own paws
    this.purse.setText('🐾 ' + mine);
    this.rows.forEach((r, i) => {
      const s = this.status(r.item), on = i === this.idx, lv = r.item.upgrade ? level(r.item.upgrade) : 0;
      r.cursor.setVisible(this.open && on);
      r.name.setText(this.text(r.item, 'name') + (r.item.upgrade && r.item.max > 1 ? '  ' + '★'.repeat(lv) + '☆'.repeat(r.item.max - lv) : ''))
        .setColor(on ? '#ffe066' : '#ffffff');
      r.tip.setText(this.text(r.item, 'tip'));
      r.price.setText(s === 'owned' ? 'Owned' : s === 'max' ? 'Maxed' : '🐾 ' + r.item.price)
        .setColor(s ? '#9ad6a0' : mine >= r.item.price ? '#ffffff' : '#ff9b9b');
      r.icon.setAlpha(s ? 0.5 : 1);
    });
  }

  get open() { return !!this.p; }

  // Called for every cat, every frame, before the cat moves. Returns the input the cat should act on: none while it shops.
  input(p, raw, now) {
    const prev = p.shopPrev || {}; p.shopPrev = raw;
    const edge = k => raw[k] && !prev[k];
    const atCounter = p.x > this.zone.x0 && p.x < this.zone.x1 && p.y < B.floorTop + 26 && !p.downUntil && p.z <= 0;
    if (!this.p) {
      this.prompt.setVisible(this.scene.players.some(q => q.y < B.floorTop + 70));
      if (atCounter && raw.y === -1 && now > (p.shopAgain || 0)) {
        this.p = p; this.idx = 0; this.show(true); this.draw(); sfx('pause');
        this.scene.say(this.shop.talk, W / 2 + this.scene.viewX, B.floorTop - 60, this.shop.hello);     // story/dialog.txt, [bark scrappy] ...
        return { x: 0, y: 0 };
      }
      return raw;
    }
    if (this.p !== p) return raw;
    this.prompt.setVisible(false);
    const n = this.shop.items.length;
    if (raw.y && raw.y !== (prev.y || 0)) { this.idx = (this.idx + raw.y + n) % n; sfx('cycle'); this.draw(); }
    if (edge('attack')) this.buy(this.shop.items[this.idx]);
    if (edge('jump') || edge('special') || !this.scene.players.includes(p)) this.close(now);
    return { x: 0, y: 0 };
  }

  close(now) {
    if (this.p) { this.p.shopAgain = now + 700; this.p.prev = this.p.shopPrev || {}; this.p.y = Math.max(this.p.y, B.floorTop + 40); }
    this.p = null; this.show(false);
  }

  buy(item) {
    const scene = this.scene, p = this.p, s = this.status(item);
    if (s) { sfx('nope'); scene.popText(p.x, p.y - 100, s === 'owned' ? 'You have that one' : 'As good as it gets'); return; }
    const slot0 = state.party.indexOf(p.entry);
    if (pawsOf(slot0) < item.price) { sfx('nope'); scene.popText(p.x, p.y - 100, 'Not enough paws'); scene.say(this.shop.talk + ' broke', W / 2 + scene.viewX, B.floorTop - 60); return; }
    addPaws(slot0, -item.price);
    const slot = state.party.indexOf(p.entry);
    if (item.tool) { own(slot, 'tools', item.tool); p.entry.tool = item.tool; }
    if (item.special) { own(slot, 'specials', item.special); p.entry.special = item.special; }
    if (item.upgrade) { save.upgrades[item.upgrade] = level(item.upgrade) + 1; persist(); for (const q of scene.players) q.usesLeft = {}; }
    if (item.heal) for (const q of scene.players) { q.downUntil = 0; q.entry.hps = {}; q.hp = scene.maxHp(q); }      // both cats of every team
    sfx('buy'); scene.popText(p.x, p.y - 100, this.text(item, 'name') + '!');
    this.draw();
  }
}
