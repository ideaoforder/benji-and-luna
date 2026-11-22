// A climb: a tall side-view room (maps/climb/<key>.tmj) reached through a ★ door in a street, like the challenge rooms.
// Run and jump up one-way ledges to the top. No fighting and no hearts lost: stones tumble down from above and knock
// cats about, that is all. The camera follows the highest cat; a cat that drops off the bottom of the screen floats
// back up to the leader in a bubble, so a party never gets split up. Paws sit on the ledges; the top pays a chest
// (CHEST in config.js) and everyone goes back out to the street they came from.
//
// Map: layer "solids" holds the ledges (one-way: land on them from above, jump up through them); layer "things"
// holds `start` (where the cats arrive), `goal` (the top), `pickup` (kind = paw) and `out` (the way back, at the bottom).
// Properties: title, stones (ms between falling stones; 0 for none).
import { W, H, RES, CATS, PLAYER_COLORS, CHEST, skin, aim, DIFFICULTY } from '../config.js';
import { SOURCES, consume, held } from '../input.js';
import { state, run, resetState } from '../state.js';
import { save, addPaws, persist } from '../save.js';
import { sfx, music } from '../sound.js';
import { frame } from '../sprites.js';
import { parseMap, AREAS } from '../maps.js';
import { has, ICON } from '../fx.js';

const G = 1700, JUMP = 700, RUN = 230, FONT = 'system-ui, sans-serif';

export class Climb extends Phaser.Scene {
  constructor() { super('climb'); }

  init(data) { this.key = data.level; }

  create() {
    const map = this.map = parseMap(this.cache.json.get('climb-' + this.key));
    this.ui = this.scene.get('hud'); this.ui.showTitle(false); this.ui.setBoss(null);
    this.ledges = map.solids.map(s => ({ x: s.x, y: s.y, w: s.w }));
    const thing = cls => map.things.filter(t => t.cls === cls);
    this.goal = thing('goal')[0] || { x: 0, y: 0, w: W, h: 60 };
    this.start = thing('start')[0] || { x: 200, y: map.h - 80 };
    this.drawRoom();
    this.paws = thing('pickup').map(t => ({ x: t.x, y: t.y,
      obj: has(this, 'icons') ? this.add.image(t.x, t.y - 14, 'icons', ICON.paw).setDisplaySize(26, 26).setDepth(5)
        : this.add.text(t.x, t.y - 14, '🐾', { fontSize: '22px', resolution: RES }).setOrigin(0.5).setDepth(5) }));
    this.paws.forEach(k => this.tweens.add({ targets: k.obj, y: k.y - 22, duration: 700, yoyo: true, repeat: -1 }));
    this.stones = []; this.nextStone = 0; this.done = false; this.leaving = false;
    this.players = state.party.filter(e => e.team && e.team.length === 2).map((e, i) => this.addCat(e, i));
    this.viewY = Phaser.Math.Clamp(this.start.y - H * 0.7, 0, map.h - H);
    aim(this.cameras.main, 0, this.viewY);
    this.cameras.main.fadeIn(220);
    this.ui.showBanner(map.title + '\nClimb to the top!', 1800);
    window.__climb = this;
  }

  drawRoom() {
    const g = this.add.graphics().setDepth(-10), h = this.map.h;
    g.fillStyle(0x3a3550, 1); g.fillRect(0, 0, W, h);
    g.fillStyle(0x45405e, 1);
    for (let y = 0; y < h; y += 48) for (let x = (y / 48) % 2 ? -40 : 0; x < W; x += 96) g.fillRect(x + 3, y + 3, 90, 42);   // stone courses
    g.fillStyle(0x1c1630, 0.6); for (let y = 160; y < h; y += 420) { g.fillRect(140, y, 60, 110); g.fillRect(W - 200, y + 210, 60, 110); }   // windows
    g.fillStyle(0xffc85a, 0.9); for (let y = 260; y < h; y += 420) { g.fillCircle(W / 2, y, 8); }                                         // torches
    const l = this.add.graphics().setDepth(2);
    for (const s of this.ledges) { l.fillStyle(0x7a5a34, 1); l.fillRect(s.x, s.y, s.w, 16); l.fillStyle(0xa47a48, 1); l.fillRect(s.x, s.y, s.w, 5); }
    const goal = this.goal;
    this.add.text(goal.x + goal.w / 2, goal.y - 6, '★ TOP ★', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffe066',
      stroke: '#1c1630', strokeThickness: 5, resolution: RES }).setOrigin(0.5, 1).setDepth(3);
  }

  addCat(entry, i) {
    const n = state.party.indexOf(entry), c = CATS[entry.catKey];
    const p = { entry, n, src: entry.src, cat: c, x: this.start.x + i * 50, y: this.start.y, vx: 0, vy: 0, face: 1, onGround: false,
                jumpsLeft: c.jumps, prev: {}, stunUntil: 0, bubble: null };
    p.sprite = this.add.sprite(p.x, p.y, skin(c.key, n), 0).setOrigin(0.5, 1).setDepth(10 + i).setScale(c.scale);
    p.tag = this.add.text(0, 0, 'P' + (n + 1), { fontFamily: FONT, fontSize: '13px', resolution: RES, color: PLAYER_COLORS[n % 4].css,
      stroke: '#1c1630', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(20);
    p.ring = this.add.circle(0, 0, 44, 0x9fd8ff, 0.25).setStrokeStyle(3, 0xffffff, 0.8).setDepth(19).setVisible(false);
    return p;
  }

  setCat(p, key) {
    const c = CATS[key]; p.entry.hps[p.cat.key] = p.entry.hps[p.cat.key] ?? c.hp;
    p.cat = c; p.entry.catKey = key; p.sprite.setTexture(skin(key, p.n), 0).setScale(c.scale); p.jumpsLeft = Math.min(p.jumpsLeft, c.jumps);
    this.popText(p.x, p.y - 90, c.name); sfx('swap');
  }

  // The highest cat that is not in a bubble.
  get leader() { return this.players.filter(p => !p.bubble).sort((a, b) => a.y - b.y)[0] || this.players[0]; }

  updateCat(p, now, dt) {
    const raw = (SOURCES[p.src] && SOURCES[p.src]()) || { x: 0 }, pressed = k => raw[k] && !p.prev[k];
    if (p.bubble) {                                      // floating back up to the leader
      const L = this.leader, tx = L.x + (p.x < L.x ? -40 : 40), ty = L.y - 30;
      p.x += (tx - p.x) * Math.min(1, 4 * dt); p.y += (ty - p.y) * Math.min(1, 4 * dt);
      if ((Math.hypot(tx - p.x, ty - p.y) < 20 && now > p.bubble) || (pressed('jump') && now > p.bubble)) {
        p.bubble = null; p.vy = -200; p.ring.setVisible(false); sfx('catBack');
      }
    } else {
      const c = p.cat, stunned = now < p.stunUntil;
      p.vx = stunned ? p.vx * 0.9 : (raw.x || 0) * RUN * (c.speed / 240);
      if (raw.x && !stunned) p.face = raw.x;
      if (pressed('jump') && p.jumpsLeft > 0 && !stunned) {
        p.vy = -JUMP * (p.onGround ? 1 : 0.88) * Math.sqrt(c.jump / 580); p.jumpsLeft--; p.onGround = false; sfx('jump');
      }
      if (!raw.jump && p.vy < -260) p.vy = -260;                       // short hop on early release
      if (pressed('swap')) this.setCat(p, p.entry.team[p.entry.team[0] === c.key ? 1 : 0]);
      // exact for constant gravity, so a jump reaches the same height at 20 fps as at 60
      const was = p.y, vy0 = p.vy; p.vy = Math.min(900, p.vy + G * dt);
      p.x = Phaser.Math.Clamp(p.x + p.vx * dt, 20, W - 20); p.y += (vy0 + p.vy) / 2 * dt;
      p.onGround = false;
      if (p.vy >= 0) for (const s of this.ledges)                          // one-way ledges: land from above only
        if (p.x > s.x - 8 && p.x < s.x + s.w + 8 && was <= s.y + 1 && p.y >= s.y) { p.y = s.y; p.vy = 0; p.onGround = true; p.jumpsLeft = c.jumps; break; }
      // Off the bottom of the screen: bubble up to the leader (the leader itself just lands on the floor).
      if (p.y > this.viewY + H + 60 && this.players.some(q => q !== p && !q.bubble && q.y < p.y)) {
        p.bubble = now + 900; p.ring.setVisible(true); p.vx = 0; p.vy = 0; sfx('pause');
      }
    }
    p.prev = raw;
    // paws on the ledges
    for (const k of this.paws) if (!k.got && Math.abs(k.x - p.x) < 28 && Math.abs(k.y - p.y) < 40) {
      k.got = true; k.obj.destroy(); addPaws(1); sfx('paw'); this.popText(k.x, k.y - 30, '+1');
    }
    // the top
    const g = this.goal;
    if (!this.done && p.x > g.x && p.x < g.x + g.w && p.y <= g.y + g.h && p.y >= g.y - 10 && p.onGround) this.reachTop(p);
    // the way back out, at the bottom: walk off the left edge of the floor
    if (!this.leaving && p.x <= 22 && raw.x === -1 && p.y >= this.start.y - 4) this.exit();
    this.drawCat(p, now);
  }

  drawCat(p, now) {
    const s = p.sprite, c = p.cat, k = skin(c.key, p.n);
    s.setPosition(p.x, p.y).setFlipX(p.face < 0);
    if (p.bubble) { s.anims.stop(); s.setFrame(frame(c.key, 'jump', c.air[0])); }
    else if (!p.onGround) { s.anims.stop(); s.setFrame(frame(c.key, 'jump', c.air[p.vy < 0 ? 0 : 1])); }
    else if (Math.abs(p.vx) > 10) s.anims.play(k + '-' + (this.anims.exists(k + '-run') ? 'run' : 'walk'), true);
    else s.anims.play(k + '-idle', true);
    s.setAngle(now < p.stunUntil ? Math.sin(now / 40) * 12 : 0);
    p.tag.setPosition(p.x, p.y - s.displayHeight - 4);
    p.ring.setPosition(p.x, p.y - 34);
  }

  // Stones tumble down from above the camera, mostly where the cats are heading.
  updateStones(now, dt) {
    const every = this.map.props.stones ?? 1800, D = DIFFICULTY[run.difficulty] || DIFFICULTY.normal;
    if (every && !this.done && now > this.nextStone) {
      this.nextStone = now + every / D.speed * (0.7 + Math.random() * 0.6);
      const x = 40 + Math.random() * (W - 80), r = 12 + Math.random() * 8;
      this.stones.push({ x, y: this.viewY - 30, r, vy: 120, obj: this.add.circle(x, this.viewY - 30, r, 0x8a8698).setStrokeStyle(3, 0x4a4658).setDepth(15),
                         warn: this.add.text(x, this.viewY + 6, '!', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffe066',
                           stroke: '#1c1630', strokeThickness: 4, resolution: RES }).setOrigin(0.5, 0).setDepth(30) });
    }
    for (const k of this.stones) {
      k.vy = Math.min(520, k.vy + 700 * dt); k.y += k.vy * dt; k.obj.setPosition(k.x, k.y); k.obj.angle += 200 * dt;
      k.warn.setY(this.viewY + 6).setVisible(k.y < this.viewY);
      for (const p of this.players)
        if (!p.bubble && now > p.stunUntil && Math.abs(p.x - k.x) < k.r + 16 && p.y - 60 < k.y + k.r && p.y > k.y - k.r) {
          p.stunUntil = now + 500; p.vx = (p.x < k.x ? -1 : 1) * 260; p.vy = 120; sfx('catHurt'); this.cameras.main.shake(80, 0.004);
        }
      if (k.y > this.viewY + H + 80) { k.obj.destroy(); k.warn.destroy(); k.gone = true; }
    }
    this.stones = this.stones.filter(k => !k.gone);
  }

  reachTop(p) {
    this.done = true;
    const first = !(save.challenges || {})['climb:' + this.key];
    save.challenges = { ...(save.challenges || {}), ['climb:' + this.key]: true }; persist();
    const n = first ? CHEST.first : CHEST.again; addPaws(n);
    this.ui.showBanner('Top of the tower!\n+' + n + ' paws', 2200); sfx('bossBeaten');
    this.popText(p.x, p.y - 100, first ? 'Treasure!' : 'A few more paws');
    this.time.delayedCall(2600, () => this.exit());
  }

  exit() {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(200);
    const back = run.shopFrom || { room: AREAS[run.area].streets[0], door: null };
    this.time.delayedCall(220, () => this.scene.start('brawl', back));
  }

  popText(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffffff', resolution: RES,
      stroke: '#1c1630', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(950);
    this.tweens.add({ targets: t, y: y - 34, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  update() {
    const now = this.time.now, dt = Math.min(0.05, (now - (this.lastNow || now)) / 1000); this.lastNow = now;
    if (consume('KeyR') | held(9, 1200) | consume('Restart')) { resetState(); this.scene.start('brawl', { room: AREAS[run.area].streets[0] }); return; }
    if (this.leaving || !this.players.length) return;
    for (const p of this.players) this.updateCat(p, now, dt);
    this.updateStones(now, dt);
    // camera: keep the leader about 40% down the screen; never past the room's top or bottom
    const want = Phaser.Math.Clamp(this.leader.y - H * 0.55, 0, this.map.h - H);
    this.viewY += (want - this.viewY) * Math.min(1, 5 * dt);
    aim(this.cameras.main, 0, this.viewY);
    this.ui.setPaws(save.paws);
    this.ui.setPlayers(state.party.map(e => { const p = this.players.find(q => q.entry === e); return p ? { label: 'P' + (p.n + 1) + ' ' + p.cat.name + (p.bubble ? '  (floating up)' : '') } : null; }));
    this.ui.score.setText(this.map.title + '   ' + Math.max(0, Math.round((this.map.h - this.leader.y) / (this.map.h - this.goal.y) * 100)) + '% up');
  }
}
