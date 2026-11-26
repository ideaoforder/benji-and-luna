// The Cloud Chase: the Airship's flying part, a side-scrolling shooter/slasher (maps/fly/<key>.tmj), entered through
// the Upper Rigging's east door. Each cat rides its own hoverboard and flies anywhere on the left of the screen,
// turning with the stick: jump or tool shoots yarn the way it faces, attack claws whatever is close in front, special is a meow that pops nearby nets
// and dazes enemies. Rotor drones and balloon drones throw nets (a net slows a cat as well as costing a heart);
// officers on boards line up with a cat, show a "!", then charge. Hearts and tagging work as on the street; a cat out
// of hearts drops away and flies back in a few seconds later, so the chase never stalls. At the end the Animal
// Control helicopter comes in; beating it lands everyone on the Tower's rooftop (map properties next / nextDoor).
//
// Every enemy, the board and the helicopter are drawn in code here until their art arrives (art/TODO.md section 9).
import { W, H, RES, CATS, PLAYER_COLORS, SPECIALS, aim, DIFFICULTY, hourly } from '../config.js';
import { SOURCES, consume, held } from '../input.js';
import { state, run, resetState } from '../state.js';
import { save, addPaws } from '../save.js';
import { sfx, music, stopMusic, sections } from '../sound.js';
import { frame, skin } from '../sprites.js';
import { maxHpOf, storedHp, storeHp, nextCat, canTagIn, benchInfo } from '../team.js';
import { parseMap, AREAS } from '../maps.js';
import { has, ICON, iconFrame } from '../fx.js';

const TOP = 80, BOTTOM = 505, FONT = 'system-ui, sans-serif';
export const FLY = {
  shot: { speed: 640, every: 230, dmg: 1 },                        // yarn
  enemy: {
    drone:   { hp: 2, r: 20, speed: 120, every: 3400, tell: 500, paws: 1 },
    balloon: { hp: 7, r: 34, speed: 55,  every: 3200, tell: 650, paws: 3 },
    board:   { hp: 4, r: 26, speed: 140, every: 0,    tell: 550, paws: 2, charge: 560 }
  },
  net: { speed: 300, r: 12 },
  heli: { hp: 90, gap: 1500, rage: 0.4 },
  downMs: 3000, slowMs: 1200
};
const st = (size, color = '#ffffff') => ({ fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color, stroke: '#1c1630', strokeThickness: 5, resolution: RES });

export class Fly extends Phaser.Scene {
  constructor() { super('fly'); }

  init(data) { this.key = data.level; }

  // The chase's own pictures (tools/import_airship.py, assets/fly/fly.json): the sky layers, boards and the helicopter.
  preload() {
    const art = this.cache.json.get('fly-art') || {};
    for (const k in art) {
      const a = art[k], key = 'fly-' + k; if (!a.file || this.textures.exists(key)) continue;
      if (a.frames) this.load.spritesheet(key, hourly('assets/fly/' + a.file), { frameWidth: a.frameWidth, frameHeight: a.frameHeight });
      else this.load.image(key, hourly('assets/fly/' + a.file));
    }
  }

  create() {
    const map = this.map = parseMap(this.cache.json.get('fly-' + this.key));
    this.ui = this.scene.get('hud'); this.ui.showTitle(false); this.ui.setBoss(null);
    const D = this.D = DIFFICULTY[run.difficulty] || DIFFICULTY.normal;
    this.speed = Number(map.props.speed) || 170;
    this.course = map.things.filter(t => t.cls !== 'boss').sort((a, b) => a.x - b.x);
    this.bossAt = (map.things.find(t => t.cls === 'boss') || { x: map.w }).x;
    this.dist = 0; this.foes = []; this.shots = []; this.nets = []; this.paws = []; this.heli = null;
    this.done = false; this.leaving = false; this.got = 0;
    this.drawSky();
    const team = state.party.filter(e => e.team && e.team.length === 2);
    this.players = team.map((e, i) => this.addCat(e, i, team.length));
    aim(this.cameras.main, 0);
    this.cameras.main.fadeIn(300);
    this.ui.showBanner(map.title + '\nHop on your boards!', 1800);
    sfx('cartGo');
    window.__fly = this;
  }

  // ---------- the sky ----------
  drawSky() {
    this.far = []; this.clouds = []; this.layers = [];
    if (has(this, 'fly-sky')) {                              // the painted sky: a still sunset, far towers and two cloud bands
      this.add.image(0, 0, 'fly-sky').setOrigin(0, 0).setDisplaySize(W, H).setDepth(-20);
      const band = (key, y, h, k, depth, alpha = 1) => {
        const t = this.add.tileSprite(0, y, W, h, key).setOrigin(0, 0).setDepth(depth).setAlpha(alpha);
        t.tileScaleX = t.tileScaleY = h / this.textures.get(key).getSourceImage().height;
        this.layers.push({ t, k });
      };
      band('fly-far', 0, H, 0.15, -18);
      band('fly-clouds', 120, 130, 0.45, -16, 0.7);
      band('fly-clouds', 390, 200, 1.2, -10, 0.95);
      return;
    }
    const g = this.add.graphics().setDepth(-20);
    const bands = [0x2a1a48, 0x3e2260, 0x5a2a72, 0x86387a, 0xb8527a, 0xe0786e, 0xf8a06a, 0xffc878];
    bands.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(0, i * H / bands.length, W, H / bands.length + 1); });
    g.fillStyle(0xffe08a, 0.9); g.fillCircle(W * 0.72, H * 0.62, 60);
    // far floating towers, then two layers of clouds, all wrapping round
    for (let i = 0; i < 6; i++) {
      const t = this.add.graphics().setDepth(-18), x = i * 220, h = 60 + (i * 37) % 70;
      t.fillStyle(0x4a2a6a, 0.8); t.fillRect(-30, -h, 60, h + 40); t.fillTriangle(-36, -h, 36, -h, 0, -h - 40);
      t.fillStyle(0xffc85a, 0.8); t.fillRect(-10, -h + 20, 8, 10); t.fillRect(6, -h + 40, 8, 10);
      t.setPosition(x, 470); this.far.push({ obj: t, k: 0.15 });
    }
    for (let i = 0; i < 14; i++) {
      const near = i % 2, c = this.add.graphics().setDepth(near ? -10 : -16);
      const w = near ? 220 : 150;
      c.fillStyle(near ? 0xffd0d8 : 0xd8a0c0, near ? 0.9 : 0.6);
      c.fillEllipse(0, 0, w, w * 0.32); c.fillEllipse(-w * 0.25, -w * 0.08, w * 0.5, w * 0.3); c.fillEllipse(w * 0.2, -w * 0.1, w * 0.45, w * 0.28);
      c.setPosition((i * 173) % (W + 300), near ? 430 + (i * 31) % 90 : 150 + (i * 57) % 280);
      this.clouds.push({ obj: c, k: near ? 1.2 : 0.45 });
    }
  }

  scrollSky(dt) {
    for (const l of this.layers) l.t.tilePositionX += this.speed * l.k * dt / l.t.tileScaleX;
    for (const o of [...this.far, ...this.clouds]) {
      o.obj.x -= this.speed * o.k * dt;
      if (o.obj.x < -260) o.obj.x += W + 520;
    }
  }

  // ---------- cats on boards ----------
  addCat(entry, i, n) {
    const slot = state.party.indexOf(entry), c = CATS[entry.catKey];
    const p = { entry, n: slot, src: entry.src, cat: c, x: 160, y: TOP + 90 + i * (BOTTOM - TOP - 140) / Math.max(1, n - 1 || 1),
                prev: {}, face: 1, hp: storedHp(entry, c.key), invulnUntil: 0, downUntil: 0, slowUntil: 0, nextShot: 0, nextAttack: 0, attackUntil: 0,
                nextSpecial: 0, hurtUntil: 0, kx: 0 };
    if (n === 1) p.y = (TOP + BOTTOM) / 2;
    if (has(this, 'fly-board')) {                            // the painted board, its deck at the cat's feet, the fans' glow under it
      p.board = this.add.image(0, 0, 'fly-board').setOrigin(0.5, 0.12).setScale(0.5).setDepth(30 + i);
      p.glow = [this.add.sprite(0, 0, 'fly-glow', 0).setOrigin(0.5, 0).setScale(0.5).setDepth(29.5 + i)];
    } else {
      p.board = this.add.graphics().setDepth(30 + i);
      const b = p.board;                                     // stand-in hoverboard: deck, brass trim, two glowing fans
      b.fillStyle(0x1c1630, 1); b.fillRoundedRect(-46, -4, 92, 16, 7);
      b.fillStyle(0x2e8a86, 1); b.fillRoundedRect(-43, -2, 86, 11, 5);
      b.fillStyle(0xd8a84a, 1); b.fillRect(-43, -2, 86, 3); b.fillCircle(0, 4, 4);
      b.fillStyle(0x1c1630, 1); b.fillEllipse(-24, 13, 26, 10); b.fillEllipse(24, 13, 26, 10);
      p.glow = [-24, 24].map(dx => this.add.ellipse(0, 0, 18, 8, 0x9ff0ff, 0.9).setDepth(30 + i));
    }
    p.sprite = this.add.sprite(0, 0, skin(this, c.key, entry.colour), 0).setOrigin(0.5, 1).setDepth(31 + i).setScale(c.scale * 0.85);
    p.tag = this.add.text(0, 0, 'P' + (slot + 1), { fontFamily: FONT, fontSize: '13px', resolution: RES, color: PLAYER_COLORS[slot % 4].css,
      stroke: '#1c1630', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(60);
    return p;
  }

  partner(p) { return nextCat(p.entry, p.cat.key); }
  maxHp(p) { return maxHpOf(p.entry, p.cat.key); }
  setCat(p, key) {
    storeHp(p.entry, p.cat.key, p.hp);
    const c = CATS[key]; p.cat = c; p.entry.catKey = key; p.hp = storedHp(p.entry, key);
    p.sprite.setTexture(skin(this, key, p.entry.colour), 0).setScale(c.scale * 0.85); this.popText(p.x, p.y - 90, c.name); sfx('swap');
  }

  updateCat(p, now, dt) {
    const raw = (SOURCES[p.src] && SOURCES[p.src]()) || { x: 0 }, pressed = k => raw[k] && !p.prev[k], c = p.cat;
    if (p.downUntil) {                                       // fell off: drifting down out of sight, back in a moment
      p.y = Math.min(H + 120, p.y + 260 * dt);
      if (now > p.downUntil) { p.downUntil = 0; p.hp = this.maxHp(p); p.x = -60; p.y = (TOP + BOTTOM) / 2; p.invulnUntil = now + 2200; sfx('catBack'); }
      p.prev = raw; this.drawCat(p, now); return;
    }
    if (p.x < 120) p.x += 300 * dt;                          // flying back in from the left
    const slow = now < p.slowUntil ? 0.5 : 1, sp = (230 + (c.speed - 240) * 0.5) * slow;
    p.x = Phaser.Math.Clamp(p.x + ((raw.x || 0) * sp + p.kx) * dt, 30, W * 0.62);
    p.y = Phaser.Math.Clamp(p.y + (raw.y || 0) * sp * dt, TOP + 60, BOTTOM);
    p.kx *= Math.max(0, 1 - 4 * dt);
    if (raw.x) p.face = raw.x;                              // turn with the stick
    if ((raw.tool || raw.jump) && now > p.nextShot) this.shoot(p, now);
    if (pressed('attack') && now > p.nextAttack) this.claw(p, now);
    if (pressed('special') && now > p.nextSpecial) this.meow(p, now);
    if (pressed('swap') && this.partner(p) !== c.key && storedHp(p.entry, this.partner(p)) > 0) this.setCat(p, this.partner(p));
    p.prev = raw;
    // paws
    for (const k of this.paws) if (!k.got && Math.abs(k.x - p.x) < 34 && Math.abs(k.y - (p.y - 30)) < 44) {
      k.got = true; k.obj.destroy(); addPaws(1); this.got++; sfx('paw'); this.popText(k.x, k.y - 20, '+1');
    }
    this.drawCat(p, now);
  }

  drawCat(p, now) {
    const s = p.sprite, c = p.cat, bob = Math.sin(now / 220 + p.n) * 3, y = p.y + bob;
    p.board.setPosition(p.x, y).setAngle(Phaser.Math.Clamp(((p.prev.y || 0) * 6), -8, 8));
    if (p.glow.length === 1) p.glow[0].setPosition(p.x + 2 * p.face, y + 10).setFrame(Math.floor(now / 90 + p.n) % 3).setFlipX(p.face < 0);
    else p.glow.forEach((g, i) => g.setPosition(p.x + (i ? 24 : -24), y + 18).setAlpha(0.5 + 0.5 * Math.abs(Math.sin(now / 60 + i))));
    s.setPosition(p.x, y - 2).setFlipX(p.face < 0); p.board.scaleX = Math.abs(p.board.scaleX) * p.face;
    if (p.downUntil || now < p.hurtUntil) { s.anims.stop(); s.setFrame(frame(c.key, 'hurt', 0)); }
    else if (now < p.attackUntil) { s.anims.stop(); s.setFrame(frame(c.key, 'claw', 1)); }
    else if (p.prev.y) { s.anims.stop(); s.setFrame(frame(c.key, 'jump', c.air[p.prev.y < 0 ? 0 : 1])); }
    else s.anims.play(skin(this, c.key, p.entry.colour) + '-idle', true);
    const blink = now < p.invulnUntil && Math.floor(now / 90) % 2;
    for (const o of [s, p.board, ...p.glow]) o.setAlpha(blink ? 0.35 : 1);
    s.setTint(now < p.slowUntil ? 0xb8c8ff : 0xffffff);
    p.tag.setPosition(p.x, y - s.displayHeight - 6);
  }

  // Both shooting and clawing go the way the cat faces: it turns with the stick, so an enemy that gets behind
  // can still be dealt with.
  shoot(p, now) {
    const S = FLY.shot, x = p.x + p.face * 40; p.nextShot = now + S.every;
    const obj = has(this, 'icons') ? this.add.image(x, p.y - 34, 'icons', ICON.fire).setDisplaySize(22, 22).setDepth(40).setFlipX(p.face < 0)
      : this.add.circle(x, p.y - 34, 9, 0xff7ab8).setDepth(40);
    this.shots.push({ x, y: p.y - 34, vx: p.face * S.speed, obj, p });
    sfx('fireYarn');
  }

  claw(p, now) {
    const c = p.cat, reach = c.claw.w + 16, h = c.claw.h, cy = p.y - 36, f = p.face;
    const x0 = f > 0 ? p.x - 10 : p.x - reach, x1 = f > 0 ? p.x + reach : p.x + 10;      // the strike, ahead of the cat
    p.attackUntil = now + 200; p.nextAttack = now + 300;
    sfx('claw', { rate: c.pitch, cat: c.key });
    const fx = has(this, 'fx-slash') ? this.add.sprite(p.x + f * reach * 0.55, cy, 'fx-slash', 1) : this.add.image(p.x + f * reach * 0.55, cy, 'slash');
    fx.setFlipX(f > 0).setDisplaySize(reach * 0.9, h * 1.2).setTint(c.slash).setDepth(45);
    this.tweens.add({ targets: fx, alpha: 0, x: fx.x + f * 16, duration: 200, onComplete: () => fx.destroy() });
    const dmg = c.combo[0].dmg + 1;
    for (const e of this.foes) if (!e.dead && e.x - e.r < x1 && e.x + e.r > x0 && Math.abs(e.y - cy) < h / 2 + e.r) this.hit(e, dmg, now);
    const hl = this.heli;
    if (hl && !hl.dead && hl.x - 110 < x1 && hl.x + 110 > x0 && Math.abs(hl.y - cy) < 60 + h / 2) this.hitHeli(dmg, now);
    for (const n of this.nets) if (!n.gone && n.x > x0 - 10 && n.x < x1 + 10 && Math.abs(n.y - cy) < h / 2 + 10) this.popNet(n);   // claw nets out of the air
  }

  meow(p, now) {
    p.nextSpecial = now + (p.cat.meow ? p.cat.meow.cooldown : 2600);
    sfx('meow', { rate: p.cat.pitch, cat: p.cat.key });
    const ring = this.add.circle(p.x, p.y - 36, 30).setStrokeStyle(5, p.cat.slash, 1).setDepth(44);
    this.tweens.add({ targets: ring, scale: 7, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
    for (const n of this.nets) if (!n.gone && Math.hypot(n.x - p.x, n.y - p.y) < 220) this.popNet(n);
    for (const e of this.foes) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 220) { e.stunUntil = now + 1200; e.tellUntil = 0; }
  }

  hurt(p, now, net) {
    if (p.downUntil || now < p.invulnUntil) return;
    p.hp--; p.invulnUntil = now + 1300; p.hurtUntil = now + 300; p.kx = -260;
    if (net) p.slowUntil = now + FLY.slowMs;
    sfx('catHurt'); this.cameras.main.shake(80, 0.004);
    if (p.hp > 0) return;
    const mate = this.partner(p);
    if (canTagIn(p.entry, p.cat.key)) { const out = p.cat.name; this.setCat(p, mate); p.invulnUntil = now + 1500; this.popText(p.x, p.y - 100, 'Tag! ' + out + ' is out'); }
    else { p.downUntil = now + FLY.downMs; sfx('catNetted'); this.popText(p.x, p.y - 100, 'Back in a moment!'); }
  }

  // ---------- enemies ----------
  spawn(t) {
    const kind = t.props.kind || 'drone', n = Number(t.props.count) || 1;
    for (let i = 0; i < n; i++) {
      const E = FLY.enemy[kind], y = Phaser.Math.Clamp(t.y + (kind === 'board' ? i * 120 : i * 45), TOP + 50, BOTTOM - 10);
      const e = { kind, x: W + 60 + i * (kind === 'drone' ? 70 : 160), y, y0: y, hp: Math.round(E.hp * this.D.hp), r: E.r, t0: this.time.now + i * 300,
                  nextShot: this.time.now + 1200 + i * 400 + Math.random() * 800, tellUntil: 0, stunUntil: 0, state: 'come' };
      e.obj = this.drawFoe(kind);
      this.foes.push(e);
    }
  }

  drawFoe(kind) {
    // The painted enemies face right as drawn; they fly at the cats from the right, so they are mirrored.
    const sheet = { drone: 'fly-drone', balloon: 'fly-balloon', board: 'fly-officer' }[kind];
    if (this.textures.exists(sheet)) {
      if (kind !== 'board') { const sp = this.add.sprite(0, 0, sheet, frame(sheet, kind === 'drone' ? 'fly' : 'float')).setFlipX(true).setDepth(35); sp.look = sp; return sp; }
      const parts = [];
      if (has(this, 'fly-board-officer')) parts.push(this.add.image(0, 22, 'fly-board-officer').setScale(-0.5, 0.5).setOrigin(0.5, 0.12));
      const rider = this.add.sprite(0, 24, sheet, frame(sheet, 'ride')).setOrigin(0.5, 1).setFlipX(true);
      parts.push(rider);
      const c = this.add.container(0, 0, parts).setDepth(35); c.look = rider; return c;
    }
    const g = this.add.graphics().setDepth(35);
    if (kind === 'drone') {                                  // a brass ball with a glass dome, a rotor and a net
      g.fillStyle(0x1c1630, 1); g.fillCircle(0, 0, 21); g.fillStyle(0xc89a3a, 1); g.fillCircle(0, 0, 18);
      g.fillStyle(0x9ff0ff, 0.9); g.fillCircle(0, -4, 9); g.fillStyle(0x3a2e52, 1); g.fillRect(-2, -30, 4, 12);
      g.fillStyle(0x3a2e52, 1); g.fillRect(-26, -32, 52, 4);
      g.lineStyle(2, 0xffffff, 0.8); g.strokeCircle(-12, 26, 9);
    } else if (kind === 'balloon') {                         // a cream balloon with a paw badge and a gondola
      g.fillStyle(0x1c1630, 1); g.fillEllipse(0, -14, 70, 60); g.fillStyle(0xf0e0c0, 1); g.fillEllipse(0, -14, 64, 54);
      g.fillStyle(0x7a8a3a, 1); g.fillCircle(0, -14, 12); g.fillStyle(0xf0e0c0, 1); g.fillCircle(0, -12, 5);
      g.lineStyle(2, 0x5a4a3a, 1); g.lineBetween(-16, 10, -10, 22); g.lineBetween(16, 10, 10, 22);
      g.fillStyle(0xc89a3a, 1); g.fillRoundedRect(-14, 20, 28, 14, 4);
    } else {                                                 // an officer on a board: the officer is a sprite on top
      g.fillStyle(0x1c1630, 1); g.fillRoundedRect(-44, 8, 88, 14, 6); g.fillStyle(0x8a3a3a, 1); g.fillRoundedRect(-41, 10, 82, 9, 4);
      g.fillStyle(0xffa64a, 0.9); g.fillEllipse(-22, 24, 18, 7); g.fillEllipse(22, 24, 18, 7);
      if (this.textures.exists('officer-uniform')) {
        const o = this.add.sprite(0, 10, 'officer-uniform', frame('officer-uniform', 'idle')).setOrigin(0.5, 1).setScale(0.62).setFlipX(true);
        return this.add.container(0, 0, [g, o]).setDepth(35);
      }
    }
    return g;
  }

  updateFoes(now, dt) {
    const live = this.players.filter(p => !p.downUntil);
    for (const e of this.foes) {
      if (e.dead) continue;
      const E = FLY.enemy[e.kind], dazed = now < e.stunUntil, near = live.sort((a, b) => Math.abs(a.y - e.y) - Math.abs(b.y - e.y))[0];
      if (e.kind === 'drone') {
        if (!dazed) { e.x -= (E.speed * this.D.speed) * dt * (e.x > W - 160 ? 1.6 : 1); e.y = e.y0 + Math.sin((now - e.t0) / 500) * 50; }
      } else if (e.kind === 'balloon') {
        if (!dazed) { e.x -= (e.x > W - 200 ? 140 : E.speed) * dt; e.y = e.y0 + Math.sin((now - e.t0) / 900) * 20; }
      } else {                                               // board officer: line up with a cat, warn, charge
        if (e.state === 'come' && !dazed) { e.x -= (e.x > W - 150 ? 220 : 0) * dt; if (near) e.y += Phaser.Math.Clamp(near.y - 20 - e.y, -1, 1) * 120 * dt;
          if (e.x <= W - 150 && near && Math.abs(near.y - 20 - e.y) < 30 && now > e.t0 + 900) { e.state = 'tell'; e.tellUntil = now + E.tell; this.bang(e); } }
        else if (e.state === 'tell' && now > e.tellUntil && !dazed) { e.state = 'charge'; sfx('foeLunge'); }
        else if (e.state === 'charge') e.x -= E.charge * this.D.speed * dt;
      }
      // throwing nets: blink first so there is time to move
      if (E.every && !dazed && e.x < W - 80) {
        if (!e.tellUntil && now > e.nextShot) { e.tellUntil = now + E.tell; this.bang(e); }
        else if (e.tellUntil && now > e.tellUntil) {
          e.tellUntil = 0; e.nextShot = now + E.every / this.D.speed * (0.8 + Math.random() * 0.4);
          if (near) this.throwNets(e.x - e.r, e.y, near, e.kind === 'balloon' ? 3 : 1);
        }
      }
      e.obj.setPosition(e.x, e.y).setAlpha(dazed ? 0.6 : 1);
      if (e.obj.look) {                                      // painted: pick the frame for what it is doing
        const sh = e.obj.look.texture.key, telling = now < e.tellUntil || e.state === 'tell', t = Math.floor(now / 160) % 2;
        const row = now < (e.hurtUntil || 0) ? 'hurt' : e.kind === 'board' ? (telling ? 'point' : e.state === 'charge' ? 'charge' : 'ride')
          : telling ? 'tell' : e.kind === 'drone' ? 'fly' : 'float';
        e.obj.look.setFrame(frame(sh, row, t));
      }
      if (e.mark) e.mark.setPosition(e.x, e.y - e.r - 20).setVisible(now < e.tellUntil || e.state === 'tell');
      // touching a cat hurts it
      for (const p of live) if (Math.abs(p.x - e.x) < e.r + 26 && Math.abs(p.y - 30 - e.y) < e.r + 30) this.hurt(p, now, false);
      if (e.x < -80) { e.dead = true; e.obj.destroy(); if (e.mark) e.mark.destroy(); }
    }
    this.foes = this.foes.filter(e => !e.dead || !e.obj.scene);
  }

  bang(e) {
    if (!e.mark) e.mark = this.add.text(e.x, e.y, '!', st(28, '#ffe066')).setOrigin(0.5, 1).setDepth(70);
    sfx('whistle');
  }

  throwNets(x, y, target, n) {
    const a0 = Math.atan2(target.y - 36 - y, target.x - x);
    for (let i = 0; i < n; i++) {
      const a = a0 + (i - (n - 1) / 2) * 0.28, speed = FLY.net.speed * this.D.speed;
      const obj = this.add.circle(x, y, FLY.net.r).setStrokeStyle(3, 0xffffff, 0.9).setDepth(50);
      const mesh = this.add.graphics().setDepth(50); mesh.lineStyle(1, 0xffffff, 0.7); mesh.lineBetween(-8, -8, 8, 8); mesh.lineBetween(-8, 8, 8, -8); mesh.lineBetween(-11, 0, 11, 0);
      this.nets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, obj, mesh });
    }
    sfx('netThrow');
  }

  popNet(n) { n.gone = true; n.obj.destroy(); n.mesh.destroy(); this.popText(n.x, n.y - 10, 'pop!'); }

  hit(e, dmg, now) {
    e.hp -= dmg; sfx('foeHit'); e.hurtUntil = now + 250;
    if (e.obj.setTint) { e.obj.setTint(0xffb0b0); this.time.delayedCall(120, () => e.obj.scene && e.obj.clearTint()); }
    this.tweens.add({ targets: e.obj, alpha: 0.4, duration: 60, yoyo: true });
    if (e.hp > 0) return;
    e.dead = true; sfx('foeHitHeavy'); if (e.mark) e.mark.destroy();
    this.tweens.add({ targets: e.obj, y: e.y + 300, angle: 200, alpha: 0, duration: 800, onComplete: () => e.obj.destroy() });
    const n = FLY.enemy[e.kind].paws; addPaws(n); this.got += n; this.popText(e.x, e.y - 30, '+' + n);
  }

  updateShots(now, dt) {
    for (const b of this.shots) {
      b.x += b.vx * dt; b.obj.setPosition(b.x, b.y).setAngle(b.x * 2);
      let used = false;
      for (const e of this.foes) if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 10) { this.hit(e, FLY.shot.dmg, now); used = true; break; }
      const hl = this.heli;
      if (!used && hl && !hl.dead && Math.abs(hl.x - b.x) < 110 && Math.abs(hl.y - b.y) < 60) { this.hitHeli(FLY.shot.dmg, now); used = true; }
      if (used || b.x > W + 30 || b.x < -30) { b.gone = true; b.obj.destroy(); }
    }
    this.shots = this.shots.filter(b => !b.gone);
    for (const n of this.nets) {
      if (n.gone) continue;
      n.x += n.vx * dt; n.y += n.vy * dt; n.obj.setPosition(n.x, n.y); n.mesh.setPosition(n.x, n.y).setAngle(n.x);
      for (const p of this.players) if (!p.downUntil && Math.abs(p.x - n.x) < 24 && Math.abs(p.y - 36 - n.y) < 32) { this.hurt(p, now, true); n.gone = true; break; }
      if (n.gone || n.x < -40 || n.y < -40 || n.y > H + 40 || n.x > W + 60) { n.gone = true; n.obj.destroy(); n.mesh.destroy(); }
    }
    this.nets = this.nets.filter(n => !n.gone);
  }

  // ---------- the course ----------
  updateCourse() {
    while (this.course.length && this.course[0].x <= this.dist) {
      const t = this.course.shift();
      if (t.cls === 'wave') this.spawn(t);
      else if (t.cls === 'paw') {
        const obj = has(this, 'icons') ? this.add.image(W + 30, t.y, 'icons', ICON.paw).setDisplaySize(28, 28).setDepth(36)
          : this.add.text(W + 30, t.y, '🐾', { fontSize: '22px', resolution: RES }).setOrigin(0.5).setDepth(36);
        this.paws.push({ x: W + 30, y: t.y, obj });
      } else if (t.cls === 'sign') {
        const s = this.add.text(W / 2, t.y, t.props.text || '', { ...st(20, '#ffe066'), align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5).setDepth(80);
        this.tweens.add({ targets: s, alpha: 0, delay: 3200, duration: 500, onComplete: () => s.destroy() });
      }
    }
    if (!this.heli && this.dist >= this.bossAt) this.startHeli();
  }

  // ---------- the helicopter ----------
  // Moves, one after another with a pause between: searchlight (a lane lights up, then nets fly down it), a fan of
  // nets, a rotor gust that pushes the cats back. Every third move its engine overheats: it stops, glows orange and
  // takes double damage. Below 40% it is angry and quicker.
  startHeli() {
    const H0 = FLY.heli, n = this.players.length;
    const hp = Math.round(H0.hp * this.D.hp * (1 + 0.35 * (n - 1)));
    const look = has(this, 'fly-heli-body') ? this.paintedHeli() : this.drawnHeli();
    this.heli = { box: look.box, look, x: W + 200, y: 260, hp, maxHp: hp, moveAt: this.time.now + 2600, moves: 0, state: 'enter',
                  dead: false, overheatUntil: 0 };
    this.ui.setBoss({ name: 'The Helicopter', hp: 1 });
    const own = 'airship-boss';
    if (sections(own).length) music(own, { sync: true }); else music('boss', { ifExists: true });
    sfx('bossLeap');
  }

  // Either look gives the same handles: box (moved about), spin(now), lamp(on), fire(on), engine(hot, now), wreck().
  // The painted one is assembled from its pieces at the points in fly.json, and mirrored to face the cats.
  paintedHeli() {
    const A = (this.cache.json.get('fly-art') || {}).heli, [bw, bh] = A.size, at = k => [A[k][0] - bw / 2, A[k][1] - bh / 2];
    const piece = (key, k, ox, oy) => this.add.sprite(...at(k), key, 0).setOrigin(ox, oy);
    const tail = piece('fly-heli-tail', 'tail', 0.5, 0.5), body = this.add.sprite(0, 0, 'fly-heli-body', 0);
    const rotor = piece('fly-heli-rotor', 'rotor', 0.5, 1), engine = piece('fly-heli-engine', 'engine', 0.5, 0.5);
    const launcher = piece('fly-heli-launcher', 'launcher', 0.5, 0), lamp = piece('fly-heli-lamp', 'lamp', 0.5, 0);
    const box = this.add.container(W + 200, 260, [tail, body, rotor, engine, launcher, lamp]).setScale(-0.5, 0.5).setDepth(38);
    return { box,
      spin: now => { rotor.setFrame(Math.floor(now / 50) % 3); tail.setFrame(Math.floor(now / 40) % 3); body.setFrame(Math.floor(now / 400) % 2); },
      lamp: on => lamp.setFrame(on ? 1 : 0), fire: on => launcher.setFrame(on ? 1 : 0),
      engine: (hot, now) => engine.setFrame(hot && Math.floor(now / 120) % 2 ? 1 : hot ? 1 : 0),
      wreck: () => { body.setTexture('fly-heli-hurt', 0); for (const o of [engine, launcher, lamp]) o.setVisible(false); },
      muzzle: () => { const [x, y] = at('launcher'); return { x: -x * 0.5, y: (y + 30) * 0.5 }; } };   // relative to the box, on screen
  }

  drawnHeli() {
    const g = this.add.graphics();
    g.fillStyle(0x1c1630, 1); g.fillEllipse(0, 0, 230, 96); g.fillRect(70, -22, 150, 26);
    g.fillStyle(0x6a7a3a, 1); g.fillEllipse(0, 0, 222, 88); g.fillRect(72, -18, 146, 18);                     // olive hull and tail boom
    g.fillStyle(0xf0e0c0, 1); g.fillEllipse(-10, 14, 180, 40);                                                  // cream belly
    g.fillStyle(0x9ff0ff, 0.9); g.fillEllipse(-70, -12, 70, 40);                                                // cockpit glass
    g.fillStyle(0xf0e0c0, 1); g.fillCircle(20, -6, 20); g.fillStyle(0x6a7a3a, 1); g.fillCircle(20, -4, 9);     // paw badge
    g.fillStyle(0x3a3a3a, 1); g.fillRect(-60, 46, 130, 6); g.fillRect(-40, 36, 6, 12); g.fillRect(40, 36, 6, 12);   // skids
    g.fillStyle(0x3a2e52, 1); g.fillRect(-6, -60, 12, 18);
    const rotor = this.add.rectangle(0, -62, 300, 6, 0x2a2438);
    const tail = this.add.circle(214, -10, 24).setStrokeStyle(5, 0x2a2438);
    const engine = this.add.circle(64, 4, 18, 0x5a3a2a).setStrokeStyle(4, 0x1c1630);
    const lamp = this.add.circle(-112, 10, 10, 0xffe08a);
    const box = this.add.container(W + 200, 260, [g, engine, lamp, rotor, tail]).setDepth(38);
    return { box,
      spin: now => { rotor.scaleX = Math.cos(now / 30); tail.setAngle(now); },
      lamp: on => lamp.setFillStyle(on ? 0xfff4b0 : 0xffe08a), fire: on => lamp.setFillStyle(on ? 0xff6a6a : 0xffe08a),
      engine: (hot, now) => engine.setFillStyle(hot ? (Math.floor(now / 120) % 2 ? 0xff8a2a : 0xffc04a) : 0x5a3a2a),
      wreck: () => {}, muzzle: () => ({ x: -110, y: 10 }) };
  }

  hitHeli(dmg, now) {
    const h = this.heli; if (!h || h.dead || h.state === 'enter') return;
    const k = now < h.overheatUntil ? 2 : 1;
    h.hp -= dmg * k; sfx(k > 1 ? 'foeHitHeavy' : 'foeHit');
    this.tweens.add({ targets: h.box, alpha: 0.6, duration: 50, yoyo: true });
    if (k > 1) this.popText(h.x + 60, h.y - 40, 'x2!');
    if (h.hp <= 0) this.heliDown();
  }

  updateHeli(now, dt) {
    const h = this.heli; if (!h || h.dead) return;
    h.look.spin(now);
    const angry = h.hp < h.maxHp * FLY.heli.rage, gap = FLY.heli.gap * (angry ? 0.7 : 1) / this.D.speed;
    if (h.state === 'enter') { h.x += (W - 190 - h.x) * Math.min(1, 1.5 * dt); if (Math.abs(h.x - (W - 190)) < 4) h.state = 'idle'; }
    const hot = now < h.overheatUntil;
    // it hunts one cat at a time (a new one after each move), so it always sits in someone's lane
    if (!h.target || h.target.downUntil) h.target = this.players.find(p => !p.downUntil) || null;
    const want = h.target ? h.target.y - 36 : this.aimY();
    if (!hot) h.y += (Phaser.Math.Clamp(want, TOP + 70, BOTTOM - 60) - h.y) * Math.min(1, 0.9 * dt);
    else h.y += (BOTTOM - 70 - h.y) * Math.min(1, 1.2 * dt);                       // sinks while it cools
    h.look.engine(hot, now);
    h.box.setPosition(h.x, h.y + Math.sin(now / 300) * 6);
    if (h.state === 'idle' && now > h.moveAt && !hot) {
      h.moves++;
      if (h.moves % 3 === 0) { h.overheatUntil = now + 3000; h.moveAt = now + 3000 + gap; this.ui.showBanner('The engine is overheating!\nHit it now!', 1400); sfx('fishBurst'); }
      else this.heliMove(['light', 'nets', 'gust'][Math.floor(Math.random() * 3)], now, gap);
    }
    if (h.gustUntil > now) for (const p of this.players) if (!p.downUntil) p.kx = Math.min(p.kx, -200);
    // touching it hurts
    for (const p of this.players) if (!p.downUntil && Math.abs(p.x - h.x) < 120 && Math.abs(p.y - 30 - h.y) < 50) this.hurt(p, now, false);
    this.ui.setBoss({ name: 'The Helicopter', hp: Math.max(0, h.hp / h.maxHp), raging: angry });
  }

  aimY() { const live = this.players.filter(p => !p.downUntil); return live.length ? live.reduce((a, p) => a + p.y, 0) / live.length : (TOP + BOTTOM) / 2; }

  heliMove(kind, now, gap) {
    const h = this.heli, live = this.players.filter(p => !p.downUntil);
    const target = live[Math.floor(Math.random() * Math.max(1, live.length))]; h.target = target;
    h.moveAt = now + gap + 1400;
    const m = () => { const o = h.look.muzzle(); return { x: h.x + o.x, y: h.y + o.y }; };
    if (kind === 'light' && target) {                        // the searchlight picks a lane; nets follow it a second later
      const y = target.y - 36, o = m(), beam = this.add.triangle(0, 0, o.x, o.y, 0, y - 40, 0, y + 40, 0xffe08a, 0.35).setOrigin(0, 0).setDepth(37);
      h.look.lamp(true); sfx('whistle');
      this.time.delayedCall(1000 / this.D.speed, () => {
        beam.destroy(); h.look.lamp(false); if (h.dead) return;
        for (let i = 0; i < 4; i++) this.time.delayedCall(i * 150, () => { if (!h.dead) { const q = m(); this.throwNets(q.x, q.y, { x: 0, y: y + 36 }, 1); } });
      });
    } else if (kind === 'nets' && target) {                  // the net launcher blinks, then a fan of five
      h.look.fire(true); sfx('whistle');
      this.time.delayedCall(650 / this.D.speed, () => { h.look.fire(false); if (!h.dead) { const q = m(); this.throwNets(q.x, q.y, target, 5); } });
    } else {                                                 // rotor gust: swirls first, then pushes everyone back
      const swirl = this.add.circle(h.x - 160, h.y, 50).setStrokeStyle(6, 0xffffff, 0.6).setDepth(37);
      this.tweens.add({ targets: swirl, scale: 2.5, alpha: 0, duration: 650, onComplete: () => swirl.destroy() });
      this.time.delayedCall(650, () => { h.gustUntil = this.time.now + 1500; this.cameras.main.shake(300, 0.004); sfx('fishBurst'); });
    }
  }

  heliDown() {
    const h = this.heli; h.dead = true;
    stopMusic(1.2); sfx('bossBeaten'); this.ui.setBoss(null);
    h.look.wreck();
    this.tweens.add({ targets: h.box, y: H + 200, angle: 40, duration: 1800, ease: 'Quad.In' });
    for (const e of this.foes) if (!e.dead) this.hit(e, 99, this.time.now);
    for (const n of this.nets) if (!n.gone) this.popNet(n);
    this.ui.showBanner('You beat the Helicopter!\nNext stop: the Tower', 3000);
    this.done = true;
    this.time.delayedCall(3600, () => this.exit(true));
  }

  exit(won) {
    if (this.leaving) return;
    this.leaving = true;
    for (const p of this.players) storeHp(p.entry, p.cat.key, p.downUntil ? this.maxHp(p) : p.hp);
    this.cameras.main.fadeOut(300);
    const to = won ? { room: this.map.props.next || AREAS[run.area].streets[0], door: this.map.props.nextDoor || null } : (run.shopFrom || { room: AREAS[run.area].streets[0] });
    this.time.delayedCall(320, () => this.scene.start('brawl', to));
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
    this.scrollSky(dt);
    if (!this.heli) this.dist += this.speed * dt;
    this.updateCourse();
    for (const k of this.paws) { k.x -= this.speed * dt; k.obj.setX(k.x); if (k.x < -40 && !k.got) { k.got = true; k.obj.destroy(); } }
    this.paws = this.paws.filter(k => !k.got);
    for (const p of this.players) this.updateCat(p, now, dt);
    this.updateFoes(now, dt); this.updateShots(now, dt); this.updateHeli(now, dt);
    this.ui.setPaws(save.paws);
    this.ui.setPlayers(state.party.map(e => {
      const p = this.players.find(q => q.entry === e); if (!p) return null;
      return { n: p.n, hp: p.downUntil ? 0 : p.hp, max: this.maxHp(p), down: !!p.downUntil, status: '',
               partner: benchInfo(e, p.cat.key),
               special: { icon: SPECIALS.meow.icon, frame: iconFrame('meow'), charge: Phaser.Math.Clamp(1 - (p.nextSpecial - now) / ((p.cat.meow || {}).cooldown || 2600), 0, 1) },
               tool: null };
    }), false);
    this.ui.score.setText(this.map.title + '   ' + (this.heli ? 'boss!' : Math.min(99, Math.round(this.dist / this.bossAt * 100)) + '%') + '   +' + this.got + ' paws');
  }
}
