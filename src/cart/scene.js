// The Mine Cart Ride: a side-view room (maps/cart/<key>.tmj) reached through a ★ door in Cart Tracks, like the climb.
// The whole party rides one cart that rolls on by itself. Each cat can shuffle left and right in the cart, jump (and land
// back in it: the cart rolls on underneath), duck (hold down) and claw. Low beams bonk a cat that is not ducking;
// a Drill Bot on the rails bonks every cat that is not in the air when it hits the cart, unless someone claws it first.
// A bonk only makes a cat dizzy for a moment: no hearts are lost. Paws float along the way and crystals hold two each;
// the end of the line pays the chest (CHEST in config.js), plus a bonus for a ride with no bonks.
//
// The course is the map's "things" layer (tools/cart_course.py writes it; Tiled can edit it): sign, paw, crystal,
// beam, bot, ramp (its width is how far the cart flies), goal. Map properties: title, speed (px/s), backdrop (a street
// whose pictures are shown behind the track).
import { W, H, RES, CATS, PLAYER_COLORS, CHEST, aim, DIFFICULTY, hourly } from '../config.js';
import { SOURCES, consume, held } from '../input.js';
import { state, run, resetState } from '../state.js';
import { save, addPaws, addPawsAll, pawsOf, persist } from '../save.js';
import { sfx } from '../sound.js';
import { frame, skin } from '../sprites.js';
import { nextCat, picked } from '../team.js';
import { storyOnce } from '../dialog.js';
import { parseMap, AREAS } from '../maps.js';
import { has, ICON } from '../fx.js';

const FLOOR = 440, RAIL = 474, G = 1700, JUMP = 640, SHUFFLE = 220, FONT = 'system-ui, sans-serif';
const BEAM_LOW = FLOOR - 52;               // the bottom of a low beam: a ducking cat fits under it, a standing one does not
const RAMP_UP = 90, RAMP_LIP = 30, FLY = 150;      // ramp run-up, lip height, and how high the cart flies
const NO_BONK_BONUS = 5;
const st = (size, color = '#ffffff') => ({ fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color, stroke: '#1c1630', strokeThickness: 5, resolution: RES });

export class Cart extends Phaser.Scene {
  constructor() { super('cart'); }

  init(data) { this.key = data.level; }

  // The backdrop is a street's own pictures (the brawler lets go of them between streets, so fetch them here).
  preload() {
    const map = this.cache.json.get('cart-' + this.key), back = (map.properties || []).find(p => p.name === 'backdrop');
    const scenery = this.cache.json.get('scenery') || {}, mine = back ? 'bg-' + back.value + '-full-' : null;
    for (const k of ['cart-left', 'cart-mid', 'cart-right', 'cart-wheel', 'cart-beam', 'cart-crystal'])    // tools/import_cart.py
      if (!this.textures.exists(k)) this.load.image(k, hourly('assets/cart/' + k + '.png'));
    this.panels = [];
    if (mine) for (const key of Object.keys(scenery).sort()) if (key.startsWith(mine)) {
      this.panels.push({ key, w: scenery[key].w });
      if (!this.textures.exists(key)) this.load.image(key, hourly('assets/scenery/' + scenery[key].file));
    }
  }

  create() {
    const map = this.map = parseMap(this.cache.json.get('cart-' + this.key));
    this.ui = this.scene.get('hud'); this.ui.showTitle(false); this.ui.setBoss(null);
    const D = DIFFICULTY[run.difficulty] || DIFFICULTY.normal;
    this.speed = (Number(map.props.speed) || 270) * (0.85 + 0.15 * D.speed / 1);
    const thing = cls => map.things.filter(t => t.cls === cls);
    this.goal = thing('goal')[0] || { x: map.w - 400 };
    this.ramps = thing('ramp').map(t => ({ x: t.x, w: t.w || 500 }));
    this.drawTrack(thing('sign'));
    this.beams = thing('beam').map(t => this.makeBeam(t.x));
    this.bots = thing('bot').map(t => this.makeBot(t.x));
    this.crystals = thing('crystal').map(t => this.makeCrystal(t.x, t.y));
    this.paws = thing('paw').map(t => ({ x: t.x, y: t.y,
      obj: has(this, 'icons') ? this.add.image(t.x, t.y, 'icons', ICON.paw).setDisplaySize(28, 28).setDepth(8)
        : this.add.text(t.x, t.y, '🐾', { fontSize: '22px', resolution: RES }).setOrigin(0.5).setDepth(8) }));
    this.paws.forEach((k, i) => this.tweens.add({ targets: k.obj, y: k.y - 8, duration: 500, yoyo: true, repeat: -1, delay: i * 60 }));

    this.got = 0; this.bonks = 0; this.done = false; this.leaving = false; this.lift = 0; this.wasFlying = false;
    const team = state.party.filter(picked);
    this.half = 70 + 34 * team.length;                       // the cart grows with the party
    this.cartX = 260;
    this.drawCart();
    this.players = team.map((e, i) => this.addCat(e, i, team.length));
    if (!this.players.length) this.time.delayedCall(300, () => this.exit());      // nobody ready to play here: back out rather than sit frozen
    this.viewX = 0; aim(this.cameras.main, 0);
    this.cameras.main.fadeIn(250);
    this.ui.showBanner(map.title + '\nAll aboard!', 1600);
    sfx('cartGo');
    this.time.delayedCall(500, () => this.ui.story(storyOnce('ride cart'), () => this.players.map(p => ({ cat: p.cat.key, n: p.n }))));
    window.__cart = this;
  }

  // ---------- the course ----------
  // The rails, with gaps where a ramp sends the cart flying, the ramps themselves, and the hint signs.
  drawTrack(signs) {
    const w = this.map.w, g = this.add.graphics().setDepth(-5);
    if (this.panels.length) {                                // the street's pictures, side by side, over and over
      for (let x = 0, i = 0; x < w + W; i++) { const p = this.panels[i % this.panels.length]; this.add.image(x, 0, p.key).setOrigin(0, 0).setDisplaySize(p.w, H).setDepth(-10); x += p.w; }
      this.add.rectangle(0, 0, w + W, H, 0x120c24, 0.35).setOrigin(0, 0).setDepth(-9);
    } else { g.fillStyle(0x2a2440, 1); g.fillRect(0, 0, w + W, H); }
    g.fillStyle(0x1a1428, 1); g.fillRect(0, RAIL, w + W, H - RAIL);                        // the rock bed under the rails
    const gaps = this.ramps.map(r => [r.x + 30, r.x + r.w - 30]);
    const solid = x => !gaps.some(([a, b]) => x > a && x < b);
    for (let x = 0; x < w + W; x += 36) if (solid(x)) { g.fillStyle(0x5a3c22, 1); g.fillRect(x, RAIL - 2, 22, 10); }   // ties
    for (const [a, b] of gaps) { g.fillStyle(0x07040c, 1); g.fillRect(a, RAIL - 4, b - a, H - RAIL + 4); }            // the drop
    let x0 = 0;
    for (const [a, b] of [...gaps, [w + W, w + W]]) { g.fillStyle(0xb8b4c8, 1); g.fillRect(x0, RAIL - 6, a - x0, 4); g.fillStyle(0x6a6680, 1); g.fillRect(x0, RAIL - 2, a - x0, 2); x0 = b; }
    for (const r of this.ramps) {                            // a wooden wedge up to the lip
      g.fillStyle(0x7a5a34, 1); g.fillTriangle(r.x - RAMP_UP, RAIL - 6, r.x + 30, RAIL - 6, r.x + 30, RAIL - 6 - RAMP_LIP);
      g.fillStyle(0xa47a48, 1); g.lineStyle(3, 0xa47a48, 1); g.lineBetween(r.x - RAMP_UP, RAIL - 6, r.x + 30, RAIL - 6 - RAMP_LIP);
    }
    for (const s of signs) this.add.text(s.x, 120, s.props.text || '', { ...st(22, '#ffe066'), align: 'center', wordWrap: { width: 520 } }).setOrigin(0.5).setDepth(30);
    const goal = this.goal;
    g.fillStyle(0xffe066, 1); g.fillRect(goal.x, 300, 8, RAIL - 300);
    this.add.text(goal.x, 290, '★ END ★', st(26, '#ffe066')).setOrigin(0.5, 1).setDepth(30);
  }

  makeBeam(x) {
    if (has(this, 'cart-beam')) {                            // the drawn beam: its striped lower edge is BEAM_LOW
      const img = this.add.image(x, BEAM_LOW, 'cart-beam').setOrigin(0.5, 1).setScale(0.5).setDepth(12);
      const g = this.add.graphics().setDepth(11.9), top = BEAM_LOW - img.displayHeight + 6;
      g.lineStyle(4, 0x6a2e5a, 1); for (const dx of [-45, 45]) g.lineBetween(x + dx, 0, x + dx, top);     // chains up to the roof
      return { x, hit: new Set() };
    }
    const g = this.add.graphics().setDepth(12);
    g.fillStyle(0x3a2a1a, 1); g.fillRect(x - 6, 0, 12, BEAM_LOW - 30);                       // a post hanging from the roof
    g.fillStyle(0x7a5a34, 1); g.fillRect(x - 60, BEAM_LOW - 34, 120, 34); g.fillStyle(0xa47a48, 1); g.fillRect(x - 60, BEAM_LOW - 34, 120, 8);
    g.fillStyle(0xffd24a, 1); for (let i = -48; i < 60; i += 32) g.fillTriangle(x + i, BEAM_LOW - 2, x + i + 14, BEAM_LOW - 2, x + i + 7, BEAM_LOW - 30);   // hazard marks
    return { x, hit: new Set() };
  }

  makeBot(x) {
    const key = 'officer-drillbot', ok = this.textures.exists(key);
    const obj = ok ? this.add.sprite(x, RAIL - 4, key, frame(key, 'walk')).setOrigin(0.5, 1).setFlipX(true).setDepth(14)
      : this.add.text(x, RAIL - 4, '🤖', { fontSize: '40px' }).setOrigin(0.5, 1).setDepth(14);
    if (ok && this.anims.exists(key + '-walk')) obj.anims.play(key + '-walk');
    return { x, obj, h: ok ? obj.displayHeight : 40, dead: false };
  }

  makeCrystal(x, y) {
    if (has(this, 'cart-crystal')) {
      const glow = this.add.circle(x, y - 26, 36, 0x9ff0ff, 0.2).setDepth(8);
      this.tweens.add({ targets: glow, alpha: 0.05, duration: 700, yoyo: true, repeat: -1 });
      return { x, y, g: this.add.image(x, y + 4, 'cart-crystal').setOrigin(0.5, 1).setScale(0.5).setDepth(9), glow, dead: false };
    }
    const g = this.add.graphics().setDepth(9);
    const shard = (dx, h, w, c) => { g.fillStyle(c, 1); g.fillTriangle(x + dx - w, y, x + dx + w, y, x + dx, y - h); };
    g.fillStyle(0x2a1f3a, 1); g.fillEllipse(x, y + 2, 64, 14);
    shard(-16, 34, 10, 0x6fd6ff); shard(14, 30, 9, 0xb48cff); shard(0, 50, 12, 0x9ff0ff); shard(0, 50, 5, 0xe8ffff);
    const glow = this.add.circle(x, y - 22, 34, 0x9ff0ff, 0.18).setDepth(8);
    this.tweens.add({ targets: glow, alpha: 0.05, duration: 700, yoyo: true, repeat: -1 });
    return { x, y, g, glow, dead: false };
  }

  // ---------- the cart and the cats ----------
  // The drawn cart is three pieces (tools/import_cart.py): the ends keep their size and the plain middle stretches,
  // since the cart grows with the party. Its top edge hides the riders' feet.
  drawCart() {
    const hw = this.half;
    this.cartBack = this.add.graphics().setDepth(5);
    this.cartBack.fillStyle(0x2a1a10, 1); this.cartBack.fillRect(-hw + 8, -34, hw * 2 - 16, 34);
    if (has(this, 'cart-left')) {
      const l = this.add.image(-hw, 0, 'cart-left').setOrigin(0, 0).setScale(0.5), r = this.add.image(hw, 0, 'cart-right').setOrigin(1, 0).setScale(0.5);
      const m = this.add.image(-hw + l.displayWidth - 1, 0, 'cart-mid').setOrigin(0, 0);
      m.setDisplaySize(hw * 2 - l.displayWidth - r.displayWidth + 2, l.displayHeight);
      this.cartFront = this.add.container(0, 0, [m, l, r]).setDepth(15); this.frontTop = -22;
      this.wheels = [0, 1].map(() => this.add.image(0, 0, 'cart-wheel').setScale(0.5).setDepth(16));     // in front of the body's lower edge
      this.wheelY = 18;                                       // wheel bottoms on the rail
      return;
    }
    this.cartFront = this.add.graphics().setDepth(15); this.frontTop = 0;
    const f = this.cartFront;
    f.fillStyle(0x1c1630, 1); f.fillRoundedRect(-hw - 4, -26, hw * 2 + 8, 34, 6);
    f.fillStyle(0x8a5a2e, 1); f.fillRoundedRect(-hw, -22, hw * 2, 28, 4);
    f.fillStyle(0xb07a44, 1); f.fillRect(-hw, -22, hw * 2, 6);
    f.fillStyle(0x6a6680, 1); for (let x = -hw + 14; x < hw; x += 40) f.fillCircle(x, -6, 3);      // rivets
    this.wheels = [0, 1].map(() => this.add.circle(0, 0, 13, 0x2a2438).setStrokeStyle(4, 0x8a86a0).setDepth(16));
    this.wheelY = 12;
  }

  addCat(entry, i, n) {
    const slot = state.party.indexOf(entry), c = CATS[entry.catKey];
    const off = n === 1 ? 0 : -this.half + 40 + i * (this.half * 2 - 80) / (n - 1);
    const p = { entry, n: slot, src: entry.src, cat: c, off, y: 0, vy: 0, prev: {}, stunUntil: 0, attackUntil: 0, nextAttack: 0, duck: false };
    p.sprite = this.add.sprite(0, 0, skin(this, c.key, entry.colour), 0).setOrigin(0.5, 1).setDepth(10 + i).setScale(c.scale);
    p.tag = this.add.text(0, 0, 'P' + (slot + 1), { fontFamily: FONT, fontSize: '13px', resolution: RES, color: PLAYER_COLORS[slot % 4].css,
      stroke: '#1c1630', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(20);
    return p;
  }

  setCat(p, key) {
    const c = CATS[key]; p.cat = c; p.entry.catKey = key;
    p.sprite.setTexture(skin(this, key, p.entry.colour), 0).setScale(c.scale); this.popText(this.wx(p), this.wy(p) - 90, c.name); sfx('swap');
  }

  wx(p) { return this.cartX + p.off; }
  wy(p) { return FLOOR - this.lift + p.y; }
  tall(p) { return p.duck ? 34 : p.sprite.displayHeight * 0.8; }

  updateCat(p, now, dt) {
    const raw = (SOURCES[p.src] && SOURCES[p.src]()) || { x: 0 }, pressed = k => raw[k] && !p.prev[k], c = p.cat;
    const dizzy = now < p.stunUntil, onFloor = p.y >= 0;
    if (!dizzy && !this.done) {
      const room = this.half - 30;
      p.off = Phaser.Math.Clamp(p.off + (raw.x || 0) * SHUFFLE * dt, -room, room);
      if (pressed('jump') && onFloor) { p.vy = -JUMP * Math.sqrt(c.jump / 580); p.y = -1; sfx('jump'); }
      if (pressed('attack') && now > p.nextAttack) this.claw(p, now);
      if (pressed('swap')) { const k = nextCat(p.entry, c.key); if (k !== c.key) this.setCat(p, k); }
    }
    p.duck = onFloor && raw.y === 1 && !dizzy;
    if (p.y < 0 || p.vy < 0) {                               // in the air: exact for constant gravity
      const vy0 = p.vy; p.vy += G * dt; p.y += (vy0 + p.vy) / 2 * dt;
      if (p.y >= 0) { p.y = 0; p.vy = 0; }
    }
    p.prev = raw;
    const x = this.wx(p), y = this.wy(p), top = y - this.tall(p);
    // paws: anywhere on the cat
    for (const k of this.paws) if (!k.got && Math.abs(k.x - x) < 30 && k.y > top - 16 && k.y < y + 10) {
      k.got = true; k.obj.destroy(); addPaws(p.n, 1); this.got++; sfx('paw'); this.popText(k.x, k.y - 20, '+1');
    }
    // low beams: duck under them
    for (const b of this.beams) if (!b.hit.has(p) && Math.abs(b.x - x) < 22 && top < BEAM_LOW && now > p.stunUntil) { b.hit.add(p); this.bonk(p, now); }
    this.drawCat(p, now);
  }

  claw(p, now) {
    const c = p.cat, x = this.wx(p), y = this.wy(p), reach = c.claw.w + 24, h = this.tall(p);
    p.attackUntil = now + 200; p.nextAttack = now + 280;
    sfx('claw', { rate: c.pitch, cat: c.key });
    const far = Math.max(x, this.cartX + this.half - 30) + reach;
    const fx = has(this, 'fx-slash') ? this.add.sprite(far - reach * 0.45, y - h * 0.5, 'fx-slash', 1) : this.add.image(far - reach * 0.45, y - h * 0.5, 'slash');
    fx.setFlipX(true).setDisplaySize(reach * 0.9, c.claw.h * 1.2).setTint(c.slash).setDepth(25);
    this.tweens.add({ targets: fx, alpha: 0, x: fx.x + 20, duration: 200, onComplete: () => fx.destroy() });
    // A claw reaches over the front of the cart from anywhere in it, a cat's own reach (its range) beyond the front.
    const inReach = (tx, ty0, ty1) => tx > x - 10 && tx < far && ty1 > y - h - 30 && ty0 < y + 10;
    for (const b of this.bots) if (!b.dead && inReach(b.x - 20, RAIL - b.h, RAIL)) this.smash(b, now, p);
    for (const k of this.crystals) if (!k.dead && inReach(k.x, k.y - 50, k.y)) this.breakCrystal(k, p);
  }

  smash(b, now, clawed) {          // clawed: the cat that did it (it gets the paws), or false when it hit the cart
    b.dead = true; if (b.obj.anims) b.obj.anims.stop();
    sfx(clawed ? 'foeHitHeavy' : 'foeSlam');
    this.tweens.add({ targets: b.obj, x: b.obj.x + (clawed ? 260 : -40), y: b.obj.y - 160, angle: clawed ? 540 : -300, alpha: 0, duration: 700, onComplete: () => b.obj.destroy() });
    if (clawed) { addPaws(clawed.n, 2); this.got += 2; this.popText(b.x, RAIL - 90, '+2'); }
  }

  breakCrystal(k, p) {
    k.dead = true; sfx('crateBreak');
    for (let i = 0; i < 6; i++) {
      const s = this.add.rectangle(k.x, k.y - 24, 8, 12, i % 2 ? 0x9ff0ff : 0xb48cff).setDepth(26);
      this.tweens.add({ targets: s, x: k.x + (Math.random() - 0.3) * 160, y: k.y - 60 - Math.random() * 80, angle: 360, alpha: 0, duration: 600, onComplete: () => s.destroy() });
    }
    k.g.destroy(); k.glow.destroy(); addPaws(p.n, 2); this.got += 2; this.popText(k.x, k.y - 60, '+2');
  }

  bonk(p, now) {
    p.stunUntil = now + 800; p.vy = -260; p.y = Math.min(p.y, -1); this.bonks++;
    sfx('catHurt'); this.cameras.main.shake(90, 0.005); this.popText(this.wx(p), this.wy(p) - 100, 'Bonk!');
  }

  drawCat(p, now) {
    const s = p.sprite, c = p.cat, k = skin(this, c.key, p.entry.colour), x = this.wx(p), y = this.wy(p);
    s.setPosition(x, y + (p.duck ? 6 : 0)).setFlipX(false);
    if (now < p.attackUntil) { s.anims.stop(); s.setFrame(frame(c.key, 'claw', 1)); }
    else if (p.duck) { s.anims.stop(); s.setFrame(frame(c.key, 'sit', 0)); }
    else if (p.y < 0) { s.anims.stop(); s.setFrame(frame(c.key, 'jump', c.air[p.vy < 0 ? 0 : 1])); }
    else s.anims.play(k + '-idle', true);
    s.setAngle(now < p.stunUntil ? Math.sin(now / 40) * 14 : 0);
    p.tag.setPosition(x, y - s.displayHeight - 4);
  }

  // ---------- the ride ----------
  updateCart(now, dt) {
    if (!this.done) this.cartX += this.speed * dt;
    // ramps: up the wedge, then a long arc over the gap
    let lift = 0;
    for (const r of this.ramps) {
      if (this.cartX > r.x - RAMP_UP && this.cartX <= r.x + 30) lift = RAMP_LIP * (this.cartX - (r.x - RAMP_UP)) / (RAMP_UP + 30);
      else if (this.cartX > r.x + 30 && this.cartX < r.x + r.w) { const t = (this.cartX - r.x - 30) / (r.w - 30); lift = RAMP_LIP * (1 - t) + FLY * 4 * t * (1 - t); }
    }
    const flying = lift > RAMP_LIP;
    if (flying && !this.wasFlying) sfx('jump');
    if (!flying && this.wasFlying) { this.cameras.main.shake(140, 0.008); sfx('stompLand'); }
    this.wasFlying = flying; this.lift = lift;
    const y = FLOOR - lift;
    this.cartBack.setPosition(this.cartX, y); this.cartFront.setPosition(this.cartX, y + this.frontTop);
    this.wheels.forEach((w, i) => w.setPosition(this.cartX + (i ? this.half - 34 : -this.half + 34), y + this.wheelY).setAngle(this.cartX * 3.8));   // 30 px across: 3.8 degrees a pixel
    // Drill Bots roll at the cart once they are on screen; claw them, or be in the air when they hit
    const front = this.cartX + this.half;
    for (const b of this.bots) {
      if (b.dead) continue;
      if (b.x < this.viewX + W + 40) b.x -= 70 * dt;
      b.obj.setX(b.x);
      if (b.x - 22 < front && b.x > this.cartX - this.half) {
        if (flying) continue;                                 // the cart sails over it
        for (const p of this.players) if (p.y > -50 && now > p.stunUntil) this.bonk(p, now);
        this.smash(b, now, false);
      }
    }
    if (!this.done && this.cartX >= this.goal.x) this.arrive();
  }

  arrive() {
    this.done = true;
    const first = !(save.challenges || {})['cart:' + this.key];
    save.challenges = { ...(save.challenges || {}), ['cart:' + this.key]: true }; persist();
    const chest = first ? CHEST.first : CHEST.again, bonus = this.bonks ? 0 : NO_BONK_BONUS;
    addPawsAll(chest + bonus, this.players.map(q => q.n));     // every player
    this.ui.showBanner('End of the line!\n' + this.got + ' paws on the way, +' + chest + ' treasure' + (bonus ? ', +' + bonus + ' for no bonks!' : ''), 2800);
    sfx('bossBeaten');
    this.time.delayedCall(3200, () => this.exit());
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
    this.updateCart(now, dt);
    for (const p of this.players) this.updateCat(p, now, dt);
    // the cart sits a third of the way across the screen, so what is coming can be seen in time
    this.viewX = Math.min(this.cartX - W * 0.3, this.map.w - W); aim(this.cameras.main, this.viewX);
    this.ui.setPaws(null);
    this.ui.setPlayers(state.party.map(e => { const p = this.players.find(q => q.entry === e); return p ? { label: 'P' + (p.n + 1) + ' ' + p.cat.name + (now < p.stunUntil ? '  (dizzy)' : ''), paws: pawsOf(p.n) } : null; }), false);
    this.ui.score.setText(this.map.title + '   ' + Math.min(100, Math.round(this.cartX / this.goal.x * 100)) + '%   +' + this.got + ' paws');
  }
}
