import { W, H, RES, CATS, SPECIALS, TOOLS, POWERUPS, DROPS, PICKUP_LIFE, HIT_CHAIN_MS, BRAWL as B, aim } from '../config.js';
import { SOURCES, consume } from '../input.js';
import { blip } from '../sound.js';
import { state, resetState } from '../state.js';
import { frame, sheet } from '../sprites.js';
import { ROOM } from './room.js';
import { Foe } from './foe.js';

// River City style variant: one street you walk around on in depth. Start with ?mode=brawler.
//
// Nothing here uses the physics engine. Every character has x (along the street), y (depth: the on-screen
// y of its feet) and z (height above the floor). It is drawn at (x, y - z) with its feet as the anchor,
// casts a shadow at (x, y), and is drawn in depth order. Combos, specials, tools, pick-ups and the
// officer types all come from the same data in config.js as the platformer.

const FONT = 'system-ui, sans-serif', PIVOT = 0.36;       // spin pivot: this far up the frame from the feet
const maxHp = p => p.cat.hp + state.bonusHp;

export class Brawl extends Phaser.Scene {
  constructor() { super('brawl'); }

  create() {
    this.room = ROOM; this.ui = this.scene.get('hud'); this.viewX = 0;
    aim(this.cameras.main, 0);
    this.drawBackdrop();
    this.obstacles = ROOM.obstacles.map(o => this.buildObstacle({ ...o }));
    const st = { fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#1c1630', strokeThickness: 3, resolution: RES };
    for (const s of ROOM.signs) this.add.text(s.x, s.y, s.text, st).setOrigin(0.5, 1).setAlpha(0.85).setDepth(B.floorTop - 1);

    this.players = []; this.foes = []; this.shots = []; this.pickups = []; this.joined = {};
    this.waveIdx = 0; this.nextWaveAt = 0; this.cleared = false; this.spawned = 0;
    this.lastNow = 0; this.hitCount = 0; this.hitUntil = 0; this.lastHint = 0;
    for (const k of ROOM.pickups) this.spawnPickup(k.kind, k.x, k.y, false);

    this.ui.showBanner('', 1); this.ui.setBoss(null);
    this.ui.showTitle(!state.party.length);
    state.party.forEach(e => this.addPlayer(e));
    window.__scene = this;
  }

  // ---------- the street ----------
  drawBackdrop() {
    const w = ROOM.w, top = B.floorTop;
    const g = this.add.graphics().setScrollFactor(0.3).setDepth(-20);
    [0x24304a, 0x34456a, 0x4f5f86, 0x7c7a9a, 0xb58f96, 0xe0a98a].forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(0, i * 52, w, 54); });
    g.fillStyle(0xfff3d6, 0.9); g.fillCircle(720, 90, 30);
    const far = this.add.graphics().setScrollFactor(0.6).setDepth(-15);
    let x = -40, s = 7;
    while (x < w + 200) {
      s = (s * 73 + 11) % 97; const bw = 90 + s, bh = 110 + (s * 3) % 150;
      far.fillStyle(0x2b2247, 1); far.fillRect(x, top - 80 - bh, bw, bh + 80);
      far.fillStyle(0xf6d77a, 0.55);
      for (let wy = top - 70 - bh; wy < top - 110; wy += 34) for (let wx = x + 12; wx < x + bw - 16; wx += 28) if ((wx * 7 + wy * 13 + s) % 5 < 2) far.fillRect(wx, wy, 10, 14);
      x += bw + 14;
    }
    const near = this.add.graphics().setDepth(-10);
    near.fillStyle(0x3c4a44, 1); near.fillRect(0, top - 110, w, 110);                      // back wall
    near.fillStyle(0x2f3b36, 1); for (let bx = 0; bx < w; bx += 40) near.fillRect(bx, top - 110, 2, 110);
    near.fillStyle(0x566a60, 1); near.fillRect(0, top - 114, w, 6);
    near.fillStyle(0x5a4d44, 1); near.fillRect(0, top - 8, w, H - top + 8);                // the floor
    near.fillStyle(0x4b4038, 1); near.fillRect(0, B.floorBottom + 8, w, H);                // kerb
    near.fillStyle(0x66584d, 1);                                                           // lines that widen toward the front
    for (let i = 0, y = top + 8; y < B.floorBottom; i++, y += 16 + i * 6) near.fillRect(0, y, w, 2);
  }

  // Draw an obstacle as a box: a lighter top face and a darker front face.
  buildObstacle(o) {
    const front = o.y + o.d;
    const shade = [16, 8, 0].reduce((c, sh) => c | (Math.round(((o.color >> sh) & 255) * 0.72) << sh), 0);   // darker front face
    o.parts = [];
    const rect = (x, y, w, h, c, a = 1) => { const r = this.add.rectangle(x + w / 2, y + h / 2, w, h, c, a).setDepth(front); o.parts.push(r); return r; };
    if (o.kind === 'fence') {                                       // see-through: posts and rails
      rect(o.x, o.y - o.h, o.w, o.h + o.d, o.color, 0.25);
      for (let y = o.y - o.h; y < front; y += 22) rect(o.x - 2, y, o.w + 4, 3, o.color);
      rect(o.x, front - o.h, o.w, o.h, o.color, 0.55);
    } else {
      rect(o.x, o.y - o.h, o.w, o.d, o.color);                      // top face
      rect(o.x, front - o.h, o.w, o.h, shade);                      // front face
      if (o.kind !== 'dumpster') for (let y = front - o.h; y < front; y += 50) rect(o.x, y, o.w, 4, 0x70492a);
    }
    return o;
  }

  // Can something stand at (x, y)? `ent` is whoever is asking.
  free(x, y, ent) {
    for (const o of this.obstacles) {
      if (o.gone) continue;
      if (o.kind === 'fence' && ent.cat && (ent.cat.key === 'luna' || ent.x > o.x + o.w)) continue;   // Luna slips through; nobody is trapped behind it
      if (x > o.x - 16 && x < o.x + o.w + 16 && y > o.y - 3 && y < o.y + o.d + 3) return false;
    }
    return true;
  }

  // Move along the street and in depth separately, so walking into something slides along it.
  move(ent, dx, dy) {
    const cat = !!ent.cat, lo = cat ? this.viewX + 30 : -90, hi = cat ? this.viewX + W - 30 : ROOM.w + 90;
    const nx = Phaser.Math.Clamp(ent.x + dx, lo, hi);
    if (this.free(nx, ent.y, ent)) ent.x = nx;
    const ny = Phaser.Math.Clamp(ent.y + dy, B.floorTop, B.floorBottom);
    if (this.free(ent.x, ny, ent)) ent.y = ny;
  }

  // ---------- cats ----------
  join(src) {
    if (state.party.length >= 4 || this.joined[src]) return;
    const entry = { src, catKey: state.party.length % 2 ? 'luna' : 'benji', hp: null, tool: state.tools[0] || null, special: state.specials[0] };
    state.party.push(entry); this.addPlayer(entry);
    if (state.party.length === 1) { this.ui.showTitle(false); this.ui.showBanner(ROOM.title, 1400); }
    blip(660, 0.15, 'triangle');
  }

  addPlayer(entry) {
    this.joined[entry.src] = true;
    const n = this.players.length;
    const p = { entry, src: entry.src, n, prev: {}, face: 1, x: this.viewX + 180 + n * 60, y: B.floorTop + 50 + n * 36, z: 0, vz: 0, kvx: 0,
                attackUntil: 0, nextAttack: 0, combo: 0, comboUntil: 0, tumble: null, spinUsed: false, jumpsLeft: 0,
                nextSpecial: 0, nextTool: 0, usesLeft: {}, invulnUntil: 0, downUntil: 0, hurtUntil: 0, frenzyUntil: 0, shield: false };
    p.shadow = this.add.ellipse(p.x, p.y, 60, 14, 0x000000, 0.28);
    p.sprite = this.add.sprite(p.x, p.y, entry.catKey, 0).setOrigin(0.5, 1);
    p.tag = this.add.text(0, 0, 'P' + (n + 1), { fontFamily: FONT, fontSize: '13px', resolution: RES,
      color: ['#8fc4ff', '#ff8fc8', '#b6f09c', '#ffd27a'][n], stroke: '#1c1630', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(900);
    p.ring = this.add.ellipse(0, 0, 10, 10).setStrokeStyle(3, 0xffd27a, 0.9).setVisible(false); p.ring.isFilled = false;
    this.setCat(p, entry.catKey);
    this.players.push(p);
  }

  setCat(p, key) {
    const c = CATS[key], share = p.cat ? p.hp / maxHp(p) : 1;
    p.cat = c; p.entry.catKey = key; p.hp = Math.max(1, Math.round(share * maxHp(p)));
    p.sprite.setTexture(key, 0).setScale(c.scale); p.sprite.anims.play(key + '-idle', true);
    p.shadow.setSize(c.body[0] + 10, 14);
  }

  pouncing(p) { return !!p.tumble && p.tumble.kind === 'pounce'; }
  toolLeft(p) { const k = p.entry.tool; return k ? (p.usesLeft[k] ?? TOOLS[k].uses) : 0; }
  catFrame(c, row, i = 0) {
    for (const r of row === 'tool' ? ['tool', 'claw'] : [row]) { const f = frame(c.key, r, i); if (f !== null) return f; }
    return frame(c.key, 'jump', c.air[0]);
  }
  // Is a target at (x, y) within `reach` in front of this cat and close enough in depth?
  ahead(p, o, reach, depth = B.hitDepth) {
    const d = (o.x - p.x) * p.face;
    return d > -12 && d < reach + (o.half || 0) && Math.abs(o.y - p.y) <= depth;
  }

  updatePlayer(p, now, dt) {
    const raw = SOURCES[p.src]() || { x: 0, y: 0 };
    const pressed = k => raw[k] && !p.prev[k];
    const s = p.sprite, c = p.cat, onGround = p.z === 0;

    if (p.downUntil) {                                   // netted: sit it out, then come back
      if (p.tumble) this.endTumble(p);
      s.anims.stop(); s.setFrame(frame(c.key, 'sit')); s.setAlpha(0.55); p.kvx = 0;
      if (now > p.downUntil) { p.downUntil = 0; p.hp = maxHp(p); p.invulnUntil = now + 1500; }
    } else {
      if (onGround) { p.jumpsLeft = c.jumps; p.spinUsed = false; }
      if (p.tumble) this.updateTumble(p, now, dt, onGround);

      let mx = 0, my = 0;
      if (this.pouncing(p)) mx = p.face * c.pounce.speed;                 // a pounce is committed
      else {
        if (now > p.hurtUntil) {
          const k = c.speed * (now < p.frenzyUntil ? POWERUPS.catnip.speedMul : 1) * (now < p.attackUntil && onGround ? 0.35 : 1);
          mx = (raw.x || 0) * k; my = (raw.y || 0) * k * B.depthSpeed;
          if (raw.x && !p.tumble) p.face = raw.x;
        }
        if (pressed('jump') && p.jumpsLeft > 0) {
          p.vz = c.jump * B.jumpMul * (onGround || p.jumpsLeft === c.jumps ? 1 : 0.85); p.z = Math.max(p.z, 1);
          p.jumpsLeft--; blip(520, 0.12, 'square', 0.03);
        }
        if (!raw.jump && p.vz > 220 && !p.tumble) p.vz = 220;             // short hop on early release
      }
      this.move(p, (mx + p.kvx) * dt, my * dt);
      p.kvx -= p.kvx * Math.min(1, 7 * dt); if (Math.abs(p.kvx) < 8) p.kvx = 0;
      if (p.z > 0 || p.vz > 0) { p.vz -= B.gravity * dt; p.z = Math.max(0, p.z + p.vz * dt); if (p.z === 0) p.vz = 0; }

      if (!p.tumble) {
        if (pressed('attack')) {
          if (!onGround && !p.spinUsed) this.startTumble(p, 'spin', now);  // attack in the air = tail somersault
          else if (now > p.nextAttack) this.claw(p, now);
        }
        if (pressed('special') && now > p.nextSpecial && now > p.hurtUntil) this.special(p, now);
        if (pressed('tool')) this.useTool(p, now);
        if (pressed('cycleTool')) this.cycle(p, 'tool', state.tools, TOOLS);
        if (pressed('cycleSpecial')) this.cycle(p, 'special', state.specials, SPECIALS);
        if (pressed('swap') && onGround) { this.setCat(p, c.key === 'benji' ? 'luna' : 'benji'); blip(880, 0.1, 'triangle'); }
      }

      if (!p.tumble && p.cat === c) {
        s.setFlipX(p.face < 0);
        if (now < p.hurtUntil && frame(c.key, 'hurt') !== null) { s.anims.stop(); s.setFrame(frame(c.key, 'hurt')); }
        else if (now < p.attackUntil) { s.anims.stop(); s.setFrame(this.catFrame(c, p.attackRow, p.attackIdx)); }
        else if (p.z > 0) { s.anims.stop(); s.setFrame(frame(c.key, 'jump', c.air[p.vz > 0 ? 0 : 1])); }
        else if (raw.x || raw.y) s.anims.play(c.key + '-' + c.move, true);
        else s.anims.play(c.key + '-idle', true);
      }
      s.setAlpha(now < p.invulnUntil && Math.floor(now / 80) % 2 ? 0.35 : 1);
      if (now < p.frenzyUntil) s.setTint(Math.floor(now / 120) % 2 ? 0xb6ffa8 : 0xe4ffd8); else s.clearTint();
    }
    this.drawPlayer(p);
    p.prev = raw;
  }

  drawPlayer(p) {
    const s = p.sprite, h = sheet(p.cat.key).frameHeight * p.cat.scale, lift = p.tumble ? h * PIVOT : 0;
    s.setOrigin(0.5, p.tumble ? 1 - PIVOT : 1).setPosition(p.x, p.y - p.z - lift).setDepth(p.y);
    p.shadow.setPosition(p.x, p.y).setDepth(p.y - 0.5).setScale(1 - Math.min(0.5, p.z / 300));
    p.tag.setPosition(p.x, p.y - p.z - h - 2);
    p.ring.setVisible(p.shield && !p.downUntil).setPosition(p.x, p.y - p.z - h * 0.4).setSize(p.cat.body[0] + 46, h + 10).setDepth(p.y + 0.5);
  }

  // ---------- attacks ----------
  claw(p, now) {
    const c = p.cat, frenzy = now < p.frenzyUntil, nip = POWERUPS.catnip;
    const i = now < p.comboUntil ? p.combo : 0, step = c.combo[i], last = i === c.combo.length - 1;
    p.combo = last ? 0 : i + 1;
    p.nextAttack = now + (last ? c.comboEnd : c.comboGap) * (frenzy ? nip.cooldownMul : 1);
    p.comboUntil = last ? 0 : p.nextAttack + c.comboWindow;
    p.attackUntil = now + (last ? 240 : 170); p.attackRow = 'claw'; p.attackIdx = i;
    const reach = c.claw.w * (step.reach || 1), tall = c.claw.h * (step.reach || 1);
    const fx = this.add.image(p.x + p.face * reach * 0.5, p.y - p.z - tall * 0.45, 'slash')
      .setTint(last ? 0xffffff : c.slash).setFlipX(p.face < 0).setFlipY(i % 2 === 1).setDisplaySize(reach * 0.8, tall * 1.15).setDepth(p.y + 1);
    this.tweens.add({ targets: fx, alpha: 0, x: fx.x + p.face * (last ? 30 : 14), duration: last ? 240 : 170, onComplete: () => fx.destroy() });
    blip((c.key === 'benji' ? 300 : 700) + i * 90, last ? 0.16 : 0.09, 'sawtooth', last ? 0.06 : 0.04);
    const heavy = c.interrupts || !!step.interrupts, depth = B.hitDepth + (last ? 8 : 0);
    if (p.z < 70) for (const o of this.foes)
      if (!o.dead && o.z < 80 && this.ahead(p, o, reach, depth))
        o.hurt(p, now, { dmg: step.dmg * (frenzy ? nip.dmgMul : 1), knock: step.knock, up: step.up, stun: step.stun, interrupts: heavy, heavy });
    for (const b of this.shots)                           // bat a tennis ball back
      if (!b.friendly && b.reflect && this.ahead(p, b, reach, 22)) {
        b.vx = p.face * Math.abs(b.vx) * 1.3; b.friendly = true; b.owner = p; b.y = p.y;
        b.obj.setFillStyle(c.slash, 1); b.until = now + 2000; blip(1200, 0.07, 'square', 0.05);
      }
    this.hitScenery(p, reach, now);
  }

  hitScenery(p, reach, now) {
    for (const o of this.obstacles) {
      if (o.gone || o.kind !== 'breakable') continue;
      const d = p.face > 0 ? o.x - p.x : p.x - (o.x + o.w);
      if (d < -o.w || d > reach) continue;
      if (p.cat.interrupts) this.smash(o);
      else if (now > this.lastHint) { this.popText(o.x + o.w / 2, o.y - o.h + 30, 'Too heavy!'); this.lastHint = now + 900; blip(160, 0.08, 'square', 0.04); }
    }
  }

  smash(o) {
    o.gone = true; o.parts.forEach(r => r.destroy());
    for (let i = 0; i < 12; i++) {
      const bit = this.add.rectangle(o.x + Math.random() * o.w, o.y - o.h + Math.random() * (o.h + o.d), 14, 10, 0xa8743f).setDepth(o.y + o.d);
      this.tweens.add({ targets: bit, x: bit.x + (Math.random() - 0.5) * 240, y: bit.y + 40 + Math.random() * 80,
        angle: 360 * (Math.random() - 0.5), alpha: 0, duration: 600, onComplete: () => bit.destroy() });
    }
    this.cameras.main.shake(120, 0.008); blip(110, 0.3, 'sawtooth', 0.07);
  }

  // 'spin': tail somersault, the air attack. 'pounce': a special, a committed dash that cannot be hit.
  startTumble(p, kind, now) {
    const c = p.cat, cfg = kind === 'spin' ? c.spin : c.pounce;
    p.tumble = { kind, cfg, from: now, until: now + cfg.time, hit: new Set() };
    if (kind === 'spin') { p.spinUsed = true; p.vz = Math.max(p.vz, 160); }
    blip(c.key === 'benji' ? 260 : 420, kind === 'spin' ? 0.18 : 0.3, 'triangle', 0.05);
  }

  endTumble(p) {
    p.sprite.angle = 0;
    if (p.tumble.kind === 'pounce') p.invulnUntil = Math.max(p.invulnUntil, this.time.now + 120);
    p.tumble = null;
  }

  updateTumble(p, now, dt, onGround) {
    const t = p.tumble, c = p.cat, s = p.sprite, spin = t.kind === 'spin';
    s.anims.stop(); s.setFrame(this.catFrame(c, 'roll'));
    s.angle += p.face * 720 * dt * 1000 / t.cfg.time;
    const frenzy = now < p.frenzyUntil ? POWERUPS.catnip.dmgMul : 1;
    for (const o of this.foes) {
      if (o.dead || t.hit.has(o) || Math.abs(o.x - p.x) > o.half + 34 || Math.abs(o.y - p.y) > B.hitDepth + 4 || p.z > o.height) continue;
      t.hit.add(o);
      if (spin) {
        o.hurt(p, now, { dmg: t.cfg.dmg * frenzy, knock: 120, up: 150, stun: 260, interrupts: c.interrupts, heavy: c.interrupts });
        p.vz = t.cfg.bounce;                             // pogo off whatever it hit
      } else o.hurt(p, now, { dmg: t.cfg.dmg, knock: 110, up: t.cfg.launch, stun: 550, interrupts: true, heavy: c.interrupts });
    }
    this.hitScenery(p, 30, now);
    if (now > t.until || (spin && onGround && now > t.from + 90)) this.endTumble(p);
  }

  special(p, now) {
    const kind = p.entry.special;
    p.nextSpecial = now + p.cat[kind].cooldown;
    if (kind === 'pounce') this.startTumble(p, 'pounce', now); else this.meow(p, now);
  }

  meow(p, now) {
    const c = p.cat, m = c.meow;
    p.attackUntil = now + 220; p.attackRow = 'meow'; p.attackIdx = 0;
    for (let i = 0; i < 3; i++) {                          // three rings travelling outward
      const ring = this.add.ellipse(p.x + p.face * 30, p.y - p.z - 34, 14, m.h * 0.45).setStrokeStyle(4, c.slash, 1).setDepth(p.y + 1);
      ring.isFilled = false;
      this.tweens.add({ targets: ring, x: p.x + p.face * (m.w + 10), scaleX: 2.2, scaleY: 2.1, alpha: 0, duration: 380, delay: i * 70, onComplete: () => ring.destroy() });
    }
    blip(c.key === 'benji' ? 380 : 760, 0.12, 'sine', 0.07);
    this.time.delayedCall(90, () => blip(c.key === 'benji' ? 520 : 1040, 0.28, 'sine', 0.07));
    for (const o of this.foes)
      if (!o.dead && this.ahead(p, o, m.w, 36)) o.hurt(p, now, { dmg: 0, knock: m.push, up: 90, stun: m.stun, interrupts: true, dazed: true });
  }

  // ---------- tools ----------
  useTool(p, now) {
    const key = p.entry.tool; if (!key || now < p.nextTool) return;
    const T = TOOLS[key], left = this.toolLeft(p);
    p.nextTool = now + T.cooldown;
    if (!left) { this.popText(p.x, p.y - p.z - 80, 'Empty'); blip(160, 0.08, 'square', 0.04); return; }
    p.usesLeft[key] = left - 1; p.attackUntil = now + 180; p.attackRow = 'tool'; p.attackIdx = 0;
    if (key === 'fire') {
      const obj = this.add.circle(0, 0, 10, 0xff8a3d).setStrokeStyle(3, 0xffe066);
      this.shots.push({ obj, x: p.x + p.face * 30, y: p.y, z: p.z + 30, vx: p.face * T.speed, half: 11, friendly: true, owner: p, until: now + 1500,
        hit: { dmg: T.dmg, knock: 260, up: 150, stun: 350, interrupts: true, heavy: true } });
      blip(520, 0.2, 'sawtooth', 0.05);
    } else if (key === 'sticky') {                       // lobbed; bursts where it lands
      const obj = this.add.circle(0, 0, 9, 0x9fd8ff).setStrokeStyle(3, 0xffffff);
      this.shots.push({ obj, x: p.x + p.face * 30, y: p.y, z: p.z + 30, vx: p.face * T.vx, vz: -T.vy, half: 10, friendly: true, owner: p, until: now + 3000,
        burst: { radius: T.radius, freeze: T.freeze } });
      blip(340, 0.15, 'triangle', 0.05);
    } else if (key === 'heal') {                         // heals every cat nearby and frees netted ones
      this.pulse(p.x, p.y - 20, T.radius, 0xff8fc8, p.y);
      for (const q of this.players) {
        if (Math.hypot(q.x - p.x, (q.y - p.y) * 1.6) > T.radius) continue;
        if (q.downUntil) { q.downUntil = 0; q.hp = T.heal; q.invulnUntil = now + 1500; } else q.hp = Math.min(maxHp(q), q.hp + T.heal);
        this.popText(q.x, q.y - 90, '+' + T.heal);
      }
      blip(660, 0.15, 'sine', 0.06); this.time.delayedCall(120, () => blip(990, 0.3, 'sine', 0.06));
    }
  }

  pulse(x, y, radius, color, depth) {
    const ring = this.add.ellipse(x, y, 20, 12).setStrokeStyle(5, color, 1).setDepth(depth + 1); ring.isFilled = false;
    this.tweens.add({ targets: ring, scale: radius / 10, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
  }

  cycle(p, slot, owned, table) {
    if (owned.length < 2) return;
    const next = owned[(owned.indexOf(p.entry[slot]) + 1) % owned.length];
    p.entry[slot] = next;
    this.popText(p.x, p.y - p.z - 90, table[next].icon + ' ' + table[next].name); blip(760, 0.07, 'triangle', 0.05);
  }

  countHit(now) { this.hitCount++; this.hitUntil = now + HIT_CHAIN_MS; }

  hurtPlayer(p, dir, now) {
    if (p.downUntil || now < p.invulnUntil || this.pouncing(p)) return;
    if (p.shield) { p.shield = false; p.invulnUntil = now + 700; this.popText(p.x, p.y - 90, 'Blocked!'); blip(900, 0.1, 'triangle', 0.06); return; }
    p.hp--; p.invulnUntil = now + 1000; p.hurtUntil = now + 260; p.combo = 0;
    p.kvx = dir * 300; p.vz = 230; p.z = Math.max(p.z, 1);
    this.cameras.main.shake(80, 0.004); blip(180, 0.2, 'square', 0.05);
    if (p.hp <= 0) { p.downUntil = now + 3000; p.frenzyUntil = 0; p.sprite.clearTint(); }
  }

  // ---------- officers, waves, shots, pick-ups ----------
  nearest(x, y) {
    let best = null, bd = 1e9;
    for (const p of this.players) { if (p.downUntil) continue; const d = Math.abs(p.x - x) + Math.abs(p.y - y) * 2; if (d < bd) { bd = d; best = p; } }
    return best;
  }

  spawnWave() {
    const types = [...ROOM.waves[this.waveIdx].foes];
    if (this.players.length >= 3) types.push('uniform');
    types.forEach((type, i) => {                         // they walk in from just off both edges of the screen
      const side = i % 2 ? -1 : 1, x = this.viewX + W / 2 + side * (W / 2 + 60 + i * 30);
      const y = B.floorTop + 30 + ((i * 53 + this.waveIdx * 31) % (B.floorBottom - B.floorTop - 50));
      const start = { x, y, cat: null };
      // do not start an officer on the far side of something he cannot get past
      this.foes.push(new Foe(this, type, this.reachable(start) ? x : this.viewX + W / 2 - side * (W / 2 + 60), y, this.spawned++));
    });
    this.waveIdx++;
  }

  // Is this spot on the same side of every full-width barrier as the cats?
  reachable(spot) {
    const mid = this.players.reduce((a, p) => a + p.x, 0) / this.players.length;
    return !this.obstacles.some(o => !o.gone && o.d >= B.floorBottom - B.floorTop && (o.x + o.w / 2 - mid) * (o.x + o.w / 2 - spot.x) < 0);
  }

  // kind: 'ball'. A shot travels along the street at a fixed depth y and height z.
  spawnShot(kind, x, y, z, vx) {
    const obj = this.add.circle(0, 0, 8, 0xd8f04a).setStrokeStyle(2, 0x1c1630);
    this.shots.push({ obj, x, y, z, vx, half: 9, reflect: true, friendly: false, owner: null, until: this.time.now + 2600 });
  }

  updateShots(now, dt) {
    for (const b of this.shots) {
      b.x += b.vx * dt;
      if (b.vz !== undefined) { b.vz -= 1100 * dt; b.z += b.vz * dt; }
      b.obj.setPosition(b.x, b.y - b.z).setDepth(b.y + 0.2);
      if (!b.friendly) {
        const p = this.players.find(p => !p.downUntil && now > p.invulnUntil && !this.pouncing(p) &&
          Math.abs(p.x - b.x) < 26 && Math.abs(p.y - b.y) <= 16 && Math.abs(p.z + 25 - b.z) < 42);
        if (p) { this.hurtPlayer(p, Math.sign(b.vx), now); b.until = 0; }
      } else {
        const o = this.foes.find(o => !o.dead && Math.abs(o.x - b.x) < o.half + b.half && Math.abs(o.y - b.y) <= B.hitDepth + 4);
        if (b.burst) { if (o || b.z <= 0) this.burst(b, now); }
        else if (o) { o.hurt({ x: b.owner.x, face: Math.sign(b.vx) }, now, b.hit || { dmg: 1, knock: 160, up: 120, stun: 320, interrupts: true, dazed: true }); b.until = 0; }
      }
      if (now > b.until || b.x < -120 || b.x > ROOM.w + 120) { b.obj.destroy(); b.gone = true; }
    }
    this.shots = this.shots.filter(b => !b.gone);
  }

  burst(b, now) {
    this.pulse(b.x, b.y, b.burst.radius, 0x9fd8ff, b.y);
    for (const o of this.foes) if (!o.dead && Math.hypot(o.x - b.x, (o.y - b.y) * 1.6) < b.burst.radius + o.half) o.freeze(now, b.burst.freeze);
    blip(1400, 0.25, 'sine', 0.06); b.until = 0;
  }

  onDefeat(o) {
    let r = Math.random();
    for (const [kind, chance] of DROPS) { if (r < chance) { this.spawnPickup(kind, o.x, o.y, true); return; } r -= chance; }
  }

  spawnPickup(kind, x, y, dropped) {
    const obj = this.add.text(x, y - 16, POWERUPS[kind].icon, { fontSize: '26px', resolution: RES }).setOrigin(0.5).setDepth(y);
    this.tweens.add({ targets: obj, y: y - 24, duration: 700, yoyo: true, repeat: -1 });
    this.pickups.push({ kind, obj, x, y, until: dropped ? this.time.now + PICKUP_LIFE : 0 });
  }

  updatePickups(now) {
    for (const k of this.pickups) {
      if (k.until) { if (now > k.until) k.gone = true; else if (k.until - now < 2500) k.obj.setAlpha(Math.floor(now / 120) % 2 ? 0.3 : 1); }
      const p = !k.gone && this.players.find(q => !q.downUntil && Math.abs(q.x - k.x) < 34 && Math.abs(q.y - k.y) < 22 && q.z < 40);
      if (p) {
        const u = POWERUPS[k.kind]; k.gone = true;
        if (k.kind === 'fish') p.hp = Math.min(maxHp(p), p.hp + u.heal);
        else if (k.kind === 'catnip') p.frenzyUntil = now + u.time;
        else if (k.kind === 'bell') p.shield = true;
        else if (k.kind === 'milk') { state.bonusHp++; this.players.forEach(q => { if (!q.downUntil) q.hp++; }); }
        else if (u.tool || u.special) {
          const slot = u.tool ? 'tool' : 'special', list = u.tool ? state.tools : state.specials, key = u.tool || u.special;
          if (!list.includes(key)) list.push(key);
          p.entry[slot] = key;
          this.ui.showBanner(u.name + '\n' + (u.tool ? 'RB, E or \' switches tools' : 'RT, T or ; switches specials'), 2600);
        }
        this.popText(k.x, k.y - 40, u.name); blip(880, 0.1, 'triangle', 0.06); this.time.delayedCall(90, () => blip(1320, 0.18, 'triangle', 0.06));
      }
      if (k.gone) k.obj.destroy();
    }
    this.pickups = this.pickups.filter(k => !k.gone);
  }

  popText(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffffff', resolution: RES,
      stroke: '#1c1630', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(950);
    this.tweens.add({ targets: t, y: y - 34, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  // ---------- frame ----------
  update() {
    const now = this.time.now;
    this.dt = Math.min(0.05, (now - (this.lastNow || now)) / 1000); this.lastNow = now;
    const dt = this.dt;
    const restart = consume('KeyR', 9) | consume('Escape') | consume('Restart');
    if (restart && state.party.length) { resetState(); this.scene.restart(); return; }
    consume('Backquote', 8);

    for (const src in SOURCES) {
      if (this.joined[src]) continue;
      const r = SOURCES[src]();
      if (r && (r.jump || r.attack || r.special || r.tool || r.swap || r.x || r.y)) this.join(src);
    }
    if (!this.players.length) return;

    for (const p of this.players) this.updatePlayer(p, now, dt);
    for (const o of this.foes) o.update(now, dt);
    this.foes = this.foes.filter(o => !o.gone);
    this.updateShots(now, dt);
    this.updatePickups(now);

    const mid = this.players.reduce((a, p) => a + p.x, 0) / this.players.length;
    if (!this.cleared && !this.foes.length) {
      const wave = ROOM.waves[this.waveIdx];
      if (!wave) { this.cleared = true; this.ui.showBanner('All clear!\nThat is the whole test room', 0); blip(660, 0.12, 'triangle', 0.06); }
      else if (mid >= wave.at) {
        if (!this.nextWaveAt) this.nextWaveAt = now + (this.waveIdx ? 1600 : 1200);
        else if (now > this.nextWaveAt) { this.nextWaveAt = 0; this.spawnWave(); }
      }
    }

    this.viewX += (Phaser.Math.Clamp(mid - W / 2, 0, ROOM.w - W) - this.viewX) * Math.min(1, 5 * dt);
    aim(this.cameras.main, this.viewX);

    if (now > this.hitUntil) this.hitCount = 0;
    this.ui.setCombo(this.hitCount);
    this.ui.setPlayers(this.players.map(p => {
      const sp = p.entry.special, tool = p.entry.tool;
      return {
        label: 'P' + (p.n + 1) + ' ' + p.cat.name + '  ' +
          (p.downUntil ? 'netted!' : '♥'.repeat(p.hp) + '♡'.repeat(Math.max(0, maxHp(p) - p.hp))) +
          (p.shield ? '  ' + POWERUPS.bell.icon : '') + (now < p.frenzyUntil ? '  ' + POWERUPS.catnip.icon : ''),
        color: p.cat.slash,
        special: { icon: SPECIALS[sp].icon, charge: Phaser.Math.Clamp(1 - (p.nextSpecial - now) / p.cat[sp].cooldown, 0, 1) },
        tool: tool ? { icon: TOOLS[tool].icon, left: this.toolLeft(p) } : null
      };
    }));
    const waves = ROOM.waves.length;
    this.ui.score.setText(ROOM.title + (this.cleared ? '   clear' : '   wave ' + Math.min(this.waveIdx, waves) + '/' + waves) + '\nSent packing: ' + state.beaten);
  }
}
