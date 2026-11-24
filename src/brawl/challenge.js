// Challenge rooms: side rooms behind a back-wall door (like the shops) with a goal and a treasure chest.
// The map says which kind (property `challenge`); the way out (a door with target ':return') is always open.
//
//   plates  Paw plates on the floor (map objects of class `plate`). Standing on one lights it for a few seconds;
//           light them all at once. One player can dash between them; a party can just stand on them.
//   lift    A mine lift: the shaft scrolls past while the waves drop in from above. Clear them all to reach the top.
//           A street with map property lift = down is the same ride going down (the Tower's Clockwork Shaft): part of
//           the way through, not a side room, so no chest.
//
// The first time a challenge is beaten its chest holds CHEST.first paws, after that CHEST.again.
import { W, H, RES, BRAWL as B, CHEST } from '../config.js';
import { save, persist } from '../save.js';
import { sfx } from '../sound.js';
import { has, ICON } from '../fx.js';

const st = { fontFamily: 'system-ui, sans-serif', color: '#ffffff', stroke: '#1c1630', strokeThickness: 4, resolution: RES };

export class Challenge {
  constructor(scene, kind, opts = {}) {
    this.scene = scene; this.kind = kind; this.done = false; this.chest = null;
    this.down = !!opts.down; this.main = !!opts.main;          // main: on the way through (no chest)
    if (kind === 'plates') this.makePlates();
    if (kind === 'lift') this.makeLift();
  }

  // ---------- paw plates ----------
  makePlates() {
    const s = this.scene;
    this.plates = s.map.things.filter(t => t.cls === 'plate').map(t => {
      const x = t.x + t.w / 2, y = t.y + t.h / 2, r = Math.max(t.w, t.h) / 2;
      const base = s.add.ellipse(x, y, r * 2, r, 0x3a3150, 1).setStrokeStyle(4, 0xffe066, 0.6).setDepth(B.floorTop - 0.5);
      const glow = s.add.ellipse(x, y, r * 2, r, 0xffe066, 0.75).setDepth(B.floorTop - 0.4).setVisible(false);
      const paw = has(s, 'icons') ? s.add.image(x, y, 'icons', ICON.paw).setDisplaySize(r * 0.9, r * 0.6).setDepth(B.floorTop - 0.3).setAlpha(0.6)
        : s.add.text(x, y, '🐾', { fontSize: Math.round(r * 0.6) + 'px', resolution: RES }).setOrigin(0.5).setDepth(B.floorTop - 0.3);
      const timer = s.add.graphics().setDepth(B.floorTop - 0.2);
      return { x, y, r, base, glow, paw, timer, until: 0 };
    });
    this.hint = s.add.text(W / 2, B.floorTop - 14, 'Light every paw plate at once!', { ...st, fontSize: '18px', fontStyle: 'bold', color: '#ffe066' })
      .setOrigin(0.5, 1).setDepth(950);
  }

  // How long a plate stays lit: long enough for one cat to dash round them all; shorter with a crowd.
  get hold() { const n = this.scene.players.length; return n <= 1 ? 5200 : n === 2 ? 4000 : 3000; }

  updatePlates(now) {
    let lit = 0;
    for (const k of this.plates) {
      const on = this.scene.players.some(p => !p.downUntil && p.z < 20 && Math.hypot(p.x - k.x, (p.y - k.y) * 2) < k.r);
      if (on) { if (now > k.until) sfx('cycle'); k.until = now + this.hold; }
      const left = Math.max(0, k.until - now) / this.hold;
      k.glow.setVisible(left > 0).setAlpha(0.35 + 0.45 * left);
      k.paw.setAlpha(left > 0 ? 1 : 0.6);
      k.timer.clear();
      if (left > 0 && !on) { k.timer.lineStyle(4, 0xffffff, 0.9); k.timer.beginPath(); k.timer.arc(k.x, k.y - k.r * 0.8, 10, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); k.timer.strokePath(); }
      if (left > 0) lit++;
    }
    if (lit === this.plates.length && this.plates.length) {
      for (const k of this.plates) { k.until = Infinity; k.timer.clear(); k.glow.setVisible(true).setAlpha(0.8); }
      this.hint.setVisible(false); this.solve();
    }
  }

  // ---------- mine lift ----------
  makeLift() {
    const s = this.scene, top = B.floorTop;
    // The shaft: rock wall with timber beams and lanterns, scrolling down past the cats (the lift goes up).
    this.shaft = s.add.graphics().setDepth(-14);
    this.beams = 0; this.speed = 90; this.stopped = false;
    // Cables up from the platform's corners, and its rails.
    const g = s.add.graphics().setDepth(top - 1);
    g.fillStyle(0x6a6a7a, 1); g.fillRect(70, 0, 5, top + 10); g.fillRect(W - 75, 0, 5, top + 10);
    g.fillStyle(0x7a5a34, 1); g.fillRect(0, top - 8, W, 10); g.fillRect(0, B.floorBottom + 6, W, 12);
    this.drawShaft(0);
  }

  drawShaft(offset) {
    const g = this.shaft, top = B.floorTop;
    g.clear();
    if (this.down) {                                     // the Tower: violet masonry, brass gears and amber lamps, rising past
      g.fillStyle(0x2e2648, 1); g.fillRect(0, 0, W, top);
      for (let y = ((-offset) % 160 + 160) % 160 - 160; y < top; y += 160) {
        g.fillStyle(0x4a3e66, 1); for (let x = 0; x < W; x += 120) g.fillRect(x + 4, y + 4, 112, 72);          // stone courses
        g.fillStyle(0x3a305a, 1); for (let x = 60; x < W; x += 120) g.fillRect(x + 4, y + 84, 112, 72);
        g.fillStyle(0xc89a3a, 0.9); g.fillCircle(150, y + 80, 34); g.fillCircle(W - 170, y + 30, 26);       // gears
        g.fillStyle(0x2e2648, 1); g.fillCircle(150, y + 80, 12); g.fillCircle(W - 170, y + 30, 9);
        g.fillStyle(0xffc85a, 0.9); g.fillCircle(W / 2, y + 120, 7);                                          // a lamp
      }
      g.fillStyle(0x5ad8c8, 0.25); g.fillRect(60, 0, 30, top); g.fillRect(W - 90, 0, 30, top);              // teal light strips
      return;
    }
    g.fillStyle(0x2a2436, 1); g.fillRect(0, 0, W, top);
    for (let y = (offset % 140) - 140; y < top; y += 140) {
      g.fillStyle(0x5a4028, 1); g.fillRect(0, y, W, 16);                   // a timber beam
      g.fillStyle(0x3a3046, 1); for (let x = 30; x < W; x += 170) g.fillRect(x + ((y / 140) % 2) * 60, y + 40, 90, 40);   // rocks
      g.fillStyle(0xffc85a, 0.9); for (let x = 140; x < W; x += 340) g.fillCircle(x, y + 30, 7);                          // lanterns
    }
    g.fillStyle(0x5a8aff, 0.5); for (let x = 90; x < W; x += 260) g.fillTriangle(x, top - 2, x + 14, top - 40, x + 28, top - 2);   // crystals
  }

  updateLift(now, dt) {
    if (!this.stopped) { this.beams += this.speed * dt; this.drawShaft(this.beams); }
  }

  // Officers in a lift arrive from above.
  dropIn(o) {
    if (this.kind !== 'lift') return;
    o.x = 140 + Math.random() * (W - 280); o.y = B.floorTop + 30 + Math.random() * (B.floorBottom - B.floorTop - 60);
    o.z = 380 + Math.random() * 120; o.vz = 0; o.inside = true;
  }

  // ---------- common ----------
  update(now, dt) {
    if (this.kind === 'plates' && !this.done) this.updatePlates(now);
    if (this.kind === 'lift') {
      this.updateLift(now, dt);
      if (!this.done && this.scene.cleared) { this.stopped = true; this.scene.ui.showBanner(this.down ? 'Next floor down!' : 'Top floor!', 1600); this.solve(); }
    }
  }

  // Blocks the street's normal "all waves beaten" until the challenge itself is beaten.
  get holdsClear() { return this.kind === 'plates' && !this.done; }

  solve() {
    if (this.done) return;
    this.done = true;
    const s = this.scene;
    s.cleared = true; sfx('streetClear');
    if (this.kind === 'plates') s.ui.showBanner('All lit!', 1400);
    if (this.main) return;
    // The chest drops in the middle of the room.
    const x = W / 2, y = (B.floorTop + B.floorBottom) / 2;
    this.chest = { x, y, obj: s.add.text(x, y - 18, '🎁', { fontSize: '40px', resolution: RES }).setOrigin(0.5, 1).setDepth(y) };
    this.chest.obj.y -= 200; s.tweens.add({ targets: this.chest.obj, y: y - 18, duration: 500, ease: 'Bounce.Out' });
  }

  // Opened by the first cat to walk up to it.
  updateChest() {
    const c = this.chest; if (!c || c.opened) return;
    const p = this.scene.players.find(q => !q.downUntil && Math.abs(q.x - c.x) < 40 && Math.abs(q.y - c.y) < 26);
    if (!p) return;
    c.opened = true;
    const room = this.scene.roomKey, first = !(save.challenges || {})[room];
    save.challenges = { ...(save.challenges || {}), [room]: true }; persist();
    const n = first ? CHEST.first : CHEST.again;
    this.scene.spillPaws(n, c.x, c.y + 20);
    this.scene.popText(c.x, c.y - 70, first ? 'Treasure!' : 'A few more paws');
    sfx('buy');
    this.scene.tweens.add({ targets: c.obj, alpha: 0, y: c.obj.y - 30, duration: 500, onComplete: () => c.obj.destroy() });
  }
}
