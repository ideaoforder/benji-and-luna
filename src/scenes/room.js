import { W, H, RES, CATS, SPECIALS, TOOLS, POWERUPS, DROPS, PICKUP_LIFE, HIT_CHAIN_MS, aim } from '../config.js';
import { SOURCES, consume } from '../input.js';
import { blip } from '../sound.js';
import { state, resetState } from '../state.js';
import { parseMap, ROOMS } from '../maps.js';
import { frame, sheet } from '../sprites.js';
import { overlaps, bodyRect, frontRect } from '../geom.js';
import { Officer } from '../officer.js';

const ROLL_PIVOT = 0.64;   // the cat's visual centre within its bottom-aligned frame
const FONT = 'system-ui, sans-serif';
const maxHp = p => p.cat.hp + state.bonusHp;
const hex = (s, fallback) => s ? parseInt(String(s).replace('#', ''), 16) : fallback;

const THEMES = {
  alley: { sky: [0x2a2148, 0x3a2c62, 0x553a7c, 0x7a4c8f, 0xa8648f, 0xd68a8a], ground: 0x3b3350, wall: 0x4a3f66, wallLine: 0x40365a, wallTop: 0x574a78, wallH: 120 },
  yard:  { sky: [0x24304a, 0x34456a, 0x4f5f86, 0x7c7a9a, 0xb58f96, 0xe0a98a], ground: 0x4b4038, wall: 0x3c4a44, wallLine: 0x2f3b36, wallTop: 0x566a60, wallH: 150 },
  roof:  { sky: [0x141228, 0x1c1a3a, 0x27244f, 0x353062, 0x4a3b74, 0x6a4a84], ground: 0x4a4f60, wall: 0x3a3f50, wallLine: 0x30344a, wallTop: 0x5c6278, wallH: 34, stars: true }
};

// One room, built from a Tiled map. Started with { room, door }: which map, and which door we came in by.
export class Room extends Phaser.Scene {
  constructor() { super('room'); }

  init(data) { this.roomKey = data.room || ROOMS[0]; this.fromDoor = data.door || null; }

  create() {
    const map = this.map = parseMap(this.cache.json.get('map-' + this.roomKey));
    this.theme = THEMES[map.theme] || THEMES.alley;
    this.physics.world.setBounds(0, 0, map.w, H + 200);
    this.ui = this.scene.get('hud'); this.viewX = 0;
    aim(this.cameras.main, 0);
    this.groundY = Math.min(...map.solids.filter(s => s.cls === 'ground').map(s => s.y), H);
    this.drawBackdrop();

    this.solids = this.physics.add.staticGroup();
    this.breakables = []; this.gates = {};
    for (const s of map.solids) this.buildSolid(s);

    this.pendingPickups = [];
    this.doors = []; this.spawns = []; this.fishes = []; this.switches = []; this.start = { x: 200 };
    for (const t of map.things) this.buildThing(t);

    this.players = []; this.officers = []; this.balls = []; this.pickups = []; this.joined = {};
    this.cleared = !!state.cleared[this.roomKey];
    this.waveIdx = 0; this.nextWaveAt = 0; this.leaving = false; this.lastHeavyHint = 0;
    this.lastNow = 0; this.hitCount = 0; this.hitUntil = 0;
    for (const k of this.pendingPickups) this.spawnPickup(k.kind, k.x, k.y, k.flag);
    this.debug = false; this.strikes = [];      // recent attack boxes, kept briefly for the hitbox view
    this.dbg = this.add.graphics().setDepth(100);

    this.ui.showBanner('', 1);
    this.ui.showTitle(!state.party.length);
    if (state.party.length) {
      state.party.forEach(entry => this.addPlayer(entry));
      this.viewX = Phaser.Math.Clamp(this.players[0].sprite.x - W / 2, 0, map.w - W);
      aim(this.cameras.main, this.viewX);
      this.cameras.main.fadeIn(220);
      this.ui.showBanner(map.title, 1400);
    }
    window.__scene = this;
  }

  // ---------- building the room ----------
  drawBackdrop() {
    const th = this.theme, mw = this.map.w, G = this.groundY;
    const g = this.add.graphics().setScrollFactor(0.3).setDepth(-20);
    th.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(0, i * 80, mw, 82); });
    g.fillStyle(0xfff3d6, 0.9); g.fillCircle(720, 110, 34);
    if (th.stars) { g.fillStyle(0xffffff, 0.8); for (let i = 0; i < 90; i++) g.fillRect((i * 197) % mw, (i * 89) % 260, 2, 2); }
    const far = this.add.graphics().setScrollFactor(0.6).setDepth(-15);
    let x = -40, s = 7; const drop = th.stars ? 150 : 0;       // rooftops look down on the skyline
    while (x < mw + 200) {
      s = (s * 73 + 11) % 97; const w = 90 + s, h = 160 + (s * 3) % 190 - drop;
      far.fillStyle(0x2b2247, 1); far.fillRect(x, G - h, w, h);
      far.fillStyle(0xf6d77a, 0.55);
      for (let wy = G - h + 18; wy < G - 40; wy += 34)
        for (let wx = x + 12; wx < x + w - 16; wx += 28)
          if ((wx * 7 + wy * 13 + s) % 5 < 2) far.fillRect(wx, wy, 10, 14);
      x += w + 14;
    }
    const near = this.add.graphics().setDepth(-10);
    near.fillStyle(th.wall, 1); near.fillRect(0, G - th.wallH, mw, th.wallH);
    near.fillStyle(th.wallLine, 1);
    for (let bx = 0; bx < mw; bx += 40) near.fillRect(bx, G - th.wallH, 2, th.wallH);
    near.fillStyle(th.wallTop, 1); near.fillRect(0, G - th.wallH - 4, mw, 6);
  }

  rect(x, y, w, h, color, depth = -5) { return this.add.rectangle(x + w / 2, y + h / 2, w, h, color).setDepth(depth); }

  solid(s, color, oneWay) {
    const r = this.rect(s.x, s.y, s.w, s.h, color);
    this.physics.add.existing(r, true);
    if (oneWay) { const c = r.body.checkCollision; c.down = c.left = c.right = false; }
    this.solids.add(r);
    return r;
  }

  buildSolid(s) {
    const key = this.roomKey + ':' + s.name;
    if ((s.cls === 'breakable' || s.cls === 'gate') && state.flags[key]) return;     // already broken / opened
    if (s.cls === 'ground') this.solid(s, this.theme.ground);
    else if (s.cls === 'ledge') this.solid(s, hex(s.props.color, 0x6a5f8c), true);
    else if (s.cls === 'dumpster') { this.solid(s, 0x3f7a5c); this.rect(s.x - 4, s.y, s.w + 8, 10, 0x2c5a43, -4); }
    else if (s.cls === 'crate') { this.solid(s, 0x9a6b3f); this.rect(s.x - 3, s.y, s.w + 6, 8, 0x70492a, -4); }
    else if (s.cls === 'breakable') {                         // a stack of heavy crates: only Benji breaks it
      const parts = [this.solid(s, 0xa8743f)];
      const n = Math.max(1, Math.round(s.h / 57)), ch = s.h / n;
      for (let i = 0; i < n; i++) {
        parts.push(this.rect(s.x, s.y + i * ch, s.w, 6, 0x70492a, -4));
        parts.push(this.rect(s.x + s.w / 2 - 3, s.y + i * ch + 6, 6, ch - 6, 0x8a5c30, -4));
      }
      this.breakables.push({ key, parts, box: { x: s.x, y: s.y, w: s.w, h: s.h } });
    } else if (s.cls === 'gate') {
      const parts = [this.solid(s, 0x8b93a7)];
      for (let y = s.y + 20; y < s.y + s.h; y += 44) parts.push(this.rect(s.x - 3, y, s.w + 6, 6, 0x5c6278, -4));
      this.gates[s.name] = { key, parts };
    } else this.solid(s, hex(s.props.color, this.theme.wall));
  }

  buildThing(t) {
    const st = { fontFamily: FONT, fontSize: '13px', color: '#ffffff', stroke: '#1c1630', strokeThickness: 3, resolution: RES };
    if (t.cls === 'start') this.start = t;
    else if (t.cls === 'spawn') this.spawns.push(t);
    else if (t.cls === 'sign') this.add.text(t.x, t.y, t.props.text || '', { ...st, fontSize: '12px' }).setOrigin(0.5, 1).setAlpha(0.85).setDepth(-2);
    else if (t.cls === 'powerup') {
      const flag = this.roomKey + ':' + (t.name || t.props.kind + Math.round(t.x));
      if (!state.flags[flag]) this.pendingPickups.push({ kind: t.props.kind, x: t.x, y: t.y, flag });
    } else if (t.cls === 'fish') {
      const f = this.add.text(t.x, t.y, '🐟', { fontSize: '28px', resolution: RES }).setOrigin(0.5);
      this.tweens.add({ targets: f, y: t.y - 8, duration: 700, yoyo: true, repeat: -1 });
      this.fishes.push({ obj: f, backAt: 0 });
    } else if (t.cls === 'switch') {
      const on = !!state.flags[this.roomKey + ':' + t.props.opens];
      this.rect(t.x - 4, t.y, 8, 30, 0x5c6278, -3);
      const knob = this.add.circle(t.x, t.y, 9, on ? 0x6ee06e : 0xe05a5a).setStrokeStyle(2, 0x1c1630).setDepth(-2);
      this.switches.push({ knob, opens: t.props.opens, on, box: { x: t.x - 14, y: t.y - 14, w: 28, h: 44 } });
    } else if (t.cls === 'door') {
      this.rect(t.x - 4, t.y - 6, t.w + 8, t.h + 6, 0x8b7b5a, -8);
      this.rect(t.x, t.y, t.w, t.h, 0x15101f, -7);
      const left = t.x < this.map.w / 2;
      const label = this.add.text(t.x + t.w / 2, t.y - 10, '', st).setOrigin(0.5, 1).setDepth(-2);
      this.doors.push({ ...t, left, label, box: { x: t.x, y: t.y, w: t.w, h: t.h } });
    }
  }

  // ---------- players ----------
  join(src) {
    if (state.party.length >= 4 || this.joined[src]) return;
    const entry = { src, catKey: state.party.length % 2 ? 'luna' : 'benji', hp: null, tool: state.tools[0] || null, special: state.specials[0] };
    state.party.push(entry);
    this.addPlayer(entry);
    if (state.party.length === 1) { this.ui.showTitle(false); this.ui.showBanner(this.map.title, 1400); }
    blip(660, 0.15, 'triangle');
  }

  addPlayer(entry) {
    this.joined[entry.src] = true;
    const n = this.players.length;
    const p = { entry, src: entry.src, n, prev: {}, face: 1, attackUntil: 0, nextAttack: 0,
                combo: 0, comboUntil: 0, tumble: null, spinUsed: false,
                nextSpecial: 0, nextTool: 0, usesLeft: {},            // tool uses refill in every room
                invulnUntil: 0, downUntil: 0, hurtUntil: 0, jumpsLeft: 0, frenzyUntil: 0, shield: !!entry.shield };
    const door = this.doors.find(d => d.name === this.fromDoor);
    let x = this.start.x + n * 70;
    if (door) { x = door.left ? door.x + door.w + 70 + n * 60 : door.x - 70 - n * 60; p.face = door.left ? 1 : -1; }
    else if (this.players.length) x = this.players[0].sprite.x + n * 40;     // late joiners appear beside P1
    p.sprite = this.physics.add.sprite(x, this.groundY - 120, entry.catKey, 0).setDepth(10 + n);
    p.sprite.setCollideWorldBounds(true);
    p.tag = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '13px', resolution: RES,
      color: ['#8fc4ff', '#ff8fc8', '#b6f09c', '#ffd27a'][n], stroke: '#1c1630', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(30);
    p.tag.setText('P' + (n + 1));
    p.ring = this.add.ellipse(0, 0, 10, 10).setStrokeStyle(3, 0xffd27a, 0.9).setDepth(31).setVisible(false); p.ring.isFilled = false;
    this.physics.add.collider(p.sprite, this.solids);
    this.setCat(p, entry.catKey, entry.hp);
    this.players.push(p);
  }

  setCat(p, key, hp) {
    const c = CATS[key], m = sheet(key); p.cat = c; p.entry.catKey = key; p.hp = hp || maxHp(p);
    const s = p.sprite; s.setTexture(key, 0); s.setScale(c.scale);
    s.body.setSize(c.body[0], c.body[1]);
    s.body.setOffset((m.frameWidth - c.body[0]) / 2, m.frameHeight - c.body[1]);
  }

  // True if a box overlaps anything solid (one-way ledges do not count).
  blocked(box) {
    return this.solids.getChildren().some(o => o.body && o.body.checkCollision.down && overlaps(box, bodyRect(o.body)));
  }

  // The frame for an action, falling back to a jump frame when the sheet has no dedicated row.
  catFrame(c, row, fallback, i = 0) {
    for (const r of row === 'tool' ? ['tool', 'claw'] : [row]) { const f = frame(c.key, r, i); if (f !== null) return f; }
    return frame(c.key, 'jump', fallback);
  }

  pouncing(p) { return !!p.tumble && p.tumble.kind === 'pounce'; }
  toolLeft(p) { const k = p.entry.tool; return k ? (p.usesLeft[k] ?? TOOLS[k].uses) : 0; }

  updatePlayer(p, now) {
    const raw = SOURCES[p.src]() || { x: 0 };
    const pressed = k => raw[k] && !p.prev[k];
    const s = p.sprite, b = s.body, c = p.cat;
    const onGround = b.blocked.down || b.touching.down;
    s.x = Phaser.Math.Clamp(s.x, this.viewX + 30, this.viewX + W - 30);

    if (p.downUntil) {                                   // netted: sit it out, then come back
      if (p.tumble) this.endTumble(p);
      s.anims.stop(); s.setFrame(frame(c.key, 'sit')); s.setAlpha(0.55); b.setVelocityX(0);
      if (now > p.downUntil) { p.downUntil = 0; p.hp = maxHp(p); p.invulnUntil = now + 1500; }
    } else {
      if (onGround) { p.jumpsLeft = c.jumps; p.spinUsed = false; }
      if (p.tumble) this.updateTumble(p, now, onGround);

      if (!this.pouncing(p)) {                           // a pounce is committed; everything else can steer
        if (now > p.hurtUntil) {
          const frenzy = now < p.frenzyUntil ? POWERUPS.catnip.speedMul : 1;
          b.setVelocityX((raw.x || 0) * c.speed * frenzy * (now < p.attackUntil && onGround ? 0.35 : 1));
          if (raw.x && !p.tumble) p.face = raw.x;
        }
        if (pressed('jump') && p.jumpsLeft > 0) {
          b.setVelocityY(-c.jump * (onGround || p.jumpsLeft === c.jumps ? 1 : 0.85));
          p.jumpsLeft--; blip(520, 0.12, 'square', 0.03);
        }
        if (!raw.jump && b.velocity.y < -220 && !p.tumble) b.setVelocityY(-220);    // short hop on early release
      }

      if (!p.tumble) {
        if (pressed('attack')) {
          if (!onGround && !p.spinUsed) this.startTumble(p, 'spin', now);            // attack in the air = tail somersault
          else if (now > p.nextAttack) this.claw(p, now);
        }
        if (pressed('special') && now > p.nextSpecial && now > p.hurtUntil) this.special(p, now);
        if (pressed('tool')) this.useTool(p, now);
        if (pressed('cycleTool')) this.cycle(p, 'tool', state.tools, TOOLS);
        if (pressed('cycleSpecial')) this.cycle(p, 'special', state.specials, SPECIALS);
        if (pressed('swap') && onGround) {
          const to = CATS[c.key === 'benji' ? 'luna' : 'benji'], tall = to.body[1] * to.scale;
          // No swapping into a bigger cat where it would not fit (under the container, say).
          if (this.blocked({ x: b.center.x - 20, y: b.bottom - tall, w: 40, h: tall - 4 })) { this.popText(s.x, b.top, 'No room!'); blip(160, 0.08, 'square', 0.04); }
          else {
            // The sprite is anchored at its centre, so a bigger cat would otherwise sink into the floor.
            const feet = b.bottom, share = p.hp / maxHp(p);
            this.setCat(p, to.key, 1); p.hp = Math.max(1, Math.round(share * maxHp(p)));
            s.y = feet - sheet(to.key).frameHeight * to.scale / 2; b.reset(s.x, s.y);
            blip(880, 0.1, 'triangle');
          }
        }

      }

      if (!p.tumble) {
        s.setFlipX(p.face < 0);
        if (now < p.hurtUntil && frame(c.key, 'hurt') !== null) { s.anims.stop(); s.setFrame(frame(c.key, 'hurt')); }
        else if (now < p.attackUntil) { s.anims.stop(); s.setFrame(this.catFrame(c, p.attackRow, 2, p.attackIdx)); }
        else if (!onGround) { s.anims.stop(); s.setFrame(frame(c.key, 'jump', b.velocity.y < 0 ? 2 : 3)); }
        else if (raw.x) s.anims.play(c.key + '-' + c.move, true);
        else s.anims.play(c.key + '-idle', true);
      }
      s.setAlpha(now < p.invulnUntil && Math.floor(now / 80) % 2 ? 0.35 : 1);
      if (now < p.frenzyUntil) s.setTint(Math.floor(now / 120) % 2 ? 0xb6ffa8 : 0xe4ffd8); else s.clearTint();
      for (const sw of this.switches) if (!sw.on && overlaps(bodyRect(b), sw.box)) this.flip(sw);
    }
    p.tag.setPosition(s.x, b.bottom - 86 * c.scale);
    p.ring.setVisible(p.shield && !p.downUntil).setPosition(b.center.x, b.center.y - 8).setSize(b.width + 46, b.height + 44);
    p.prev = raw;
  }

  // ---------- attacks ----------
  // The attack chain: each press inside the window steps to the next entry of the cat's combo.
  claw(p, now) {
    const c = p.cat, s = p.sprite;
    const frenzy = now < p.frenzyUntil, nip = POWERUPS.catnip;
    const i = now < p.comboUntil ? p.combo : 0, step = c.combo[i], last = i === c.combo.length - 1;
    p.combo = last ? 0 : i + 1;
    p.nextAttack = now + (last ? c.comboEnd : c.comboGap) * (frenzy ? nip.cooldownMul : 1);
    p.comboUntil = last ? 0 : p.nextAttack + c.comboWindow;
    p.attackUntil = now + (last ? 240 : 170); p.attackRow = 'claw'; p.attackIdx = i;      // one claw frame per combo step, if the sheet has them
    // The strike box starts at the cat's centre and reaches forward; the slash is drawn to fill it.
    const reach = step.reach || 1;
    const box = frontRect(s.x, p.face, 0, c.claw.w * reach, s.body.center.y - c.claw.h * reach / 2 - 6, c.claw.h * reach);
    this.strikes.push({ box, until: now + 170, color: 0xff4444 });
    const fx = this.add.image(box.x + box.w / 2, box.y + box.h / 2, 'slash')
      .setTint(last ? 0xffffff : c.slash).setFlipX(p.face < 0).setFlipY(i % 2 === 1).setDisplaySize(box.w * 0.8, box.h * 1.15).setDepth(40);
    this.tweens.add({ targets: fx, alpha: 0, x: fx.x + p.face * (last ? 30 : 14), duration: last ? 240 : 170, onComplete: () => fx.destroy() });
    blip((c.key === 'benji' ? 300 : 700) + i * 90, last ? 0.16 : 0.09, 'sawtooth', last ? 0.06 : 0.04);
    const heavy = c.interrupts || !!step.interrupts;
    for (const o of this.officers)
      if (!o.dead && overlaps(box, o.rect()))
        o.hurt(p, now, { dmg: step.dmg * (frenzy ? nip.dmgMul : 1), knock: step.knock, up: step.up, stun: step.stun, interrupts: heavy, heavy });
    for (const ball of this.balls)                       // bat a tennis ball or a net back
      if (!ball.friendly && ball.reflect && overlaps(box, this.ballRect(ball))) {
        ball.vx = p.face * Math.abs(ball.vx) * 1.3; ball.friendly = true; ball.owner = p;
        ball.obj.setFillStyle(c.slash, 1); ball.until = now + 2000; blip(1200, 0.07, 'square', 0.05);
      }
    this.hitScenery(p, box, now);
  }

  // A tumble is a spinning move that hits what it touches, once each.
  //   'spin':   tail somersault, the air attack. Steerable, can be hit, bounces off what it strikes.
  //   'pounce': a special. Committed dash along the ground, cannot be hit, launches.
  startTumble(p, kind, now) {
    const c = p.cat, s = p.sprite, cfg = kind === 'spin' ? c.spin : c.pounce;
    const pivot = (ROLL_PIVOT - 0.5) * sheet(c.key).frameHeight * c.scale;
    p.tumble = { kind, cfg, pivot, from: now, until: now + cfg.time, hit: new Set() };
    s.setOrigin(0.5, ROLL_PIVOT); s.y += pivot;          // spin about the cat's middle, not the frame's
    if (kind === 'spin') { p.spinUsed = true; s.body.setVelocityY(Math.min(s.body.velocity.y, -160)); }
    blip(c.key === 'benji' ? 260 : 420, kind === 'spin' ? 0.18 : 0.3, 'triangle', 0.05);
  }

  endTumble(p) {
    const s = p.sprite;
    s.angle = 0; s.setOrigin(0.5, 0.5); s.y -= p.tumble.pivot;
    if (p.tumble.kind === 'pounce') p.invulnUntil = Math.max(p.invulnUntil, this.time.now + 120);
    p.tumble = null;
  }

  updateTumble(p, now, onGround) {
    const t = p.tumble, c = p.cat, s = p.sprite, b = s.body, spin = t.kind === 'spin';
    if (!spin) b.setVelocityX(p.face * t.cfg.speed);
    s.anims.stop(); s.setFrame(this.catFrame(c, 'roll', 2));
    s.angle += p.face * 720 * this.dt * 1000 / t.cfg.time;
    const me = bodyRect(b); me.x -= 10; me.w += 20; me.y -= 10; me.h += 10;
    this.strikes.push({ box: me, until: now + 30, color: 0xff4444 });
    const frenzy = now < p.frenzyUntil ? POWERUPS.catnip.dmgMul : 1;
    for (const o of this.officers) {
      if (o.dead || t.hit.has(o) || !overlaps(me, o.rect())) continue;
      t.hit.add(o);
      if (spin) {
        o.hurt(p, now, { dmg: t.cfg.dmg * frenzy, knock: 120, up: 150, stun: 260, interrupts: c.interrupts, heavy: c.interrupts });
        b.setVelocityY(-t.cfg.bounce);                   // pogo off whatever it hit
      } else o.hurt(p, now, { dmg: t.cfg.dmg, knock: 110, up: t.cfg.launch, stun: 550, interrupts: true, heavy: c.interrupts });
    }
    this.hitScenery(p, me, now);
    if (now > t.until || (spin && onGround && now > t.from + 90)) this.endTumble(p);
  }

  special(p, now) {
    const kind = p.entry.special;
    p.nextSpecial = now + p.cat[kind].cooldown;
    if (kind === 'pounce') this.startTumble(p, 'pounce', now); else this.meow(p, now);
  }

  meow(p, now) {
    const c = p.cat, s = p.sprite, m = c.meow;
    p.attackUntil = now + 220; p.attackRow = 'meow'; p.attackIdx = 0;
    const box = frontRect(s.x, p.face, 10, m.w, s.body.center.y - m.h / 2 - 10, m.h);
    this.strikes.push({ box, until: now + 220, color: 0x66aaff });
    const cy = box.y + box.h / 2;
    for (let i = 0; i < 3; i++) {                          // three rings travelling outward
      const ring = this.add.ellipse(s.x + p.face * 30, cy, 14, m.h * 0.45).setStrokeStyle(4, c.slash, 1).setDepth(40);
      ring.isFilled = false;
      this.tweens.add({ targets: ring, x: s.x + p.face * (m.w + 10), scaleX: 2.2, scaleY: 2.1, alpha: 0,
        duration: 380, delay: i * 70, onComplete: () => ring.destroy() });
    }
    blip(c.key === 'benji' ? 380 : 760, 0.12, 'sine', 0.07);
    this.time.delayedCall(90, () => blip(c.key === 'benji' ? 520 : 1040, 0.28, 'sine', 0.07));
    for (const o of this.officers)
      if (!o.dead && overlaps(box, o.rect()))
        o.hurt(p, now, { dmg: 0, knock: m.push, up: 90, stun: m.stun, interrupts: true, dazed: true });
  }

  // ---------- tools ----------
  useTool(p, now) {
    const key = p.entry.tool; if (!key || now < p.nextTool) return;
    const T = TOOLS[key], s = p.sprite, b = s.body, left = this.toolLeft(p);
    p.nextTool = now + T.cooldown;
    if (!left) { this.popText(s.x, b.top, 'Empty'); blip(160, 0.08, 'square', 0.04); return; }
    p.usesLeft[key] = left - 1; p.attackUntil = now + 180; p.attackRow = 'tool'; p.attackIdx = 0;
    const x = s.x + p.face * 30, y = b.center.y - 8;
    if (key === 'fire') {
      const obj = this.add.circle(x, y, 10, 0xff8a3d).setStrokeStyle(3, 0xffe066).setDepth(20);
      this.balls.push({ obj, vx: p.face * T.speed, w: 22, h: 22, friendly: true, owner: p, until: now + 1500,
        hit: { dmg: T.dmg, knock: 260, up: 150, stun: 350, interrupts: true, heavy: true } });
      blip(520, 0.2, 'sawtooth', 0.05);
    } else if (key === 'sticky') {                       // lobbed; bursts on the ground or on an officer
      const obj = this.add.circle(x, y, 9, 0x9fd8ff).setStrokeStyle(3, 0xffffff).setDepth(20);
      this.balls.push({ obj, vx: p.face * T.vx, vy: T.vy, g: 1100, w: 20, h: 20, friendly: true, owner: p, until: now + 3000,
        burst: { radius: T.radius, freeze: T.freeze } });
      blip(340, 0.15, 'triangle', 0.05);
    } else if (key === 'heal') {                         // heals every cat nearby and frees netted ones
      this.pulse(s.x, b.center.y, T.radius, 0xff8fc8);
      for (const q of this.players) {
        if (Math.abs(q.sprite.x - s.x) > T.radius || Math.abs(q.sprite.y - s.y) > T.radius) continue;
        if (q.downUntil) { q.downUntil = 0; q.hp = T.heal; q.invulnUntil = now + 1500; }
        else q.hp = Math.min(maxHp(q), q.hp + T.heal);
        this.popText(q.sprite.x, q.sprite.body.top, '+' + T.heal);
      }
      blip(660, 0.15, 'sine', 0.06); this.time.delayedCall(120, () => blip(990, 0.3, 'sine', 0.06));
    }
  }

  pulse(x, y, radius, color) {
    const ring = this.add.ellipse(x, y, 20, 20).setStrokeStyle(5, color, 1).setDepth(40); ring.isFilled = false;
    this.tweens.add({ targets: ring, scale: radius / 10, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
  }

  burst(ball, now) {
    const x = ball.obj.x, y = ball.obj.y;
    this.pulse(x, y, ball.burst.radius, 0x9fd8ff);
    for (const o of this.officers) {
      const r = o.rect();
      if (!o.dead && Math.abs(r.x + r.w / 2 - x) < ball.burst.radius + r.w / 2 && Math.abs(r.y + r.h / 2 - y) < ball.burst.radius + r.h / 2)
        o.freeze(now, ball.burst.freeze);
    }
    blip(1400, 0.25, 'sine', 0.06); ball.until = 0;
  }

  // Step to the next tool or special the party owns.
  cycle(p, slot, owned, table) {
    if (owned.length < 2) return;
    const next = owned[(owned.indexOf(p.entry[slot]) + 1) % owned.length];
    p.entry[slot] = next;
    this.popText(p.sprite.x, p.sprite.body.top, table[next].icon + ' ' + table[next].name); blip(760, 0.07, 'triangle', 0.05);
  }

  countHit(now) { this.hitCount++; this.hitUntil = now + HIT_CHAIN_MS; }

  // Crates and switches react to claws and somersaults.
  hitScenery(p, box, now) {
    for (const br of this.breakables) {
      if (br.gone || !overlaps(box, br.box)) continue;
      if (p.cat.interrupts) this.smash(br);
      else if (now > this.lastHeavyHint) { this.popText(br.box.x + br.box.w / 2, br.box.y + 40, 'Too heavy!'); this.lastHeavyHint = now + 900; blip(160, 0.08, 'square', 0.04); }
    }
    for (const sw of this.switches) if (!sw.on && overlaps(box, sw.box)) this.flip(sw);
  }

  smash(br) {
    br.gone = true; state.flags[br.key] = true;
    br.parts.forEach(o => o.destroy());
    const b = br.box;
    for (let i = 0; i < 10; i++) {
      const bit = this.add.rectangle(b.x + Math.random() * b.w, b.y + Math.random() * b.h, 14, 10, 0xa8743f).setDepth(35);
      this.tweens.add({ targets: bit, x: bit.x + (Math.random() - 0.5) * 220, y: bit.y + 60 + Math.random() * 80,
        angle: 360 * (Math.random() - 0.5), alpha: 0, duration: 600, onComplete: () => bit.destroy() });
    }
    this.cameras.main.shake(120, 0.008); blip(110, 0.3, 'sawtooth', 0.07);
  }

  flip(sw) {
    sw.on = true; sw.knob.setFillStyle(0x6ee06e);
    const gate = this.gates[sw.opens];
    if (gate) { state.flags[gate.key] = true; gate.parts.forEach(o => o.destroy()); delete this.gates[sw.opens]; }
    this.popText(sw.box.x + 14, sw.box.y - 6, 'Gate open!'); blip(700, 0.12, 'triangle', 0.06);
    this.time.delayedCall(110, () => blip(1050, 0.2, 'triangle', 0.06));
  }

  hurtPlayer(p, dir, now) {
    if (p.downUntil || now < p.invulnUntil || this.pouncing(p)) return;
    if (p.shield) {                                      // the bell takes the hit
      p.shield = false; p.invulnUntil = now + 700; this.popText(p.sprite.x, p.sprite.body.top, 'Blocked!'); blip(900, 0.1, 'triangle', 0.06);
      return;
    }
    p.hp--; p.invulnUntil = now + 1000; p.hurtUntil = now + 260; p.combo = 0;
    p.sprite.body.setVelocity(dir * 260, -260);
    this.cameras.main.shake(80, 0.004); blip(180, 0.2, 'square', 0.05);
    if (p.hp <= 0) { p.downUntil = now + 3000; p.frenzyUntil = 0; p.sprite.clearTint(); }
  }

  // ---------- officers, waves, projectiles ----------
  spawnWave() {
    const types = [...this.map.waves[this.waveIdx]];
    if (this.players.length >= 3) types.push('uniform');
    const n = this.waveIdx + 1;
    let points = this.spawns.filter(s => s.props.wave === undefined || s.props.wave === n);
    const mid = this.players.reduce((a, p) => a + p.sprite.x, 0) / this.players.length;
    if (!points.length) points = [{ x: mid + 320, y: 100 }, { x: mid - 320, y: 100 }];
    points = [...points].sort((a, b) => Math.abs(b.x - mid) - Math.abs(a.x - mid));   // furthest from the cats first
    types.forEach((type, i) => {
      const sp = points[i % points.length];
      const x = Phaser.Math.Clamp(sp.x + Math.floor(i / points.length) * 70, 40, this.map.w - 40);
      const o = new Officer(this, type, x, sp.y, x > mid ? -1 : 1);
      if (o.t.boss) o.hp = o.maxHp = Math.round(o.hp * (1 + o.t.boss.perPlayer * (this.players.length - 1)));
      this.officers.push(o);
    });
    this.waveIdx++;
  }

  spawnBall(x, y, vx) { this.spawnShot('ball', x, y, vx); }

  // kind: 'ball' (tennis ball), 'net' (boss), 'wave' (ground shockwave; cannot be batted back)
  spawnShot(kind, x, y, vx) {
    let obj, w = 18, h = 18, reflect = true;
    if (kind === 'ball') obj = this.add.circle(x, y, 8, 0xd8f04a).setStrokeStyle(2, 0x1c1630);
    else if (kind === 'net') { obj = this.add.circle(x, y, 12, 0xffffff, 0.3).setStrokeStyle(3, 0xf5f5fa); w = h = 26; }
    else { obj = this.add.ellipse(x, y, 34, 26, 0xffe066, 0.85).setStrokeStyle(2, 0x1c1630); w = 30; h = 24; reflect = false; }
    this.balls.push({ obj: obj.setDepth(20), vx, w, h, reflect, friendly: false, owner: null, until: this.time.now + 2600 });
  }

  ballRect(ball) { return { x: ball.obj.x - ball.w / 2, y: ball.obj.y - ball.h / 2, w: ball.w, h: ball.h }; }

  nearest(x) {
    let best = null;
    for (const p of this.players) if (!p.downUntil && (!best || Math.abs(p.sprite.x - x) < Math.abs(best.sprite.x - x))) best = p;
    return best;
  }

  // Boss whistle: backup drops in on either side.
  summon(types, x) {
    types.forEach((type, i) => {
      const ox = Phaser.Math.Clamp(x + (i % 2 ? -1 : 1) * (260 + i * 30), 40, this.map.w - 40);
      this.officers.push(new Officer(this, type, ox, 80, ox > x ? -1 : 1));
    });
  }

  // ---------- power-ups ----------
  onDefeat(o) {
    if (o.t.boss) {                                      // the boss going down sends the rest running
      for (const other of this.officers) if (other !== o && !other.dead) other.hurt({ face: 1, sprite: o.sprite }, this.time.now, { dmg: 999, knock: 0, up: 0, stun: 0, dazed: true });
      return;
    }
    let r = Math.random();
    for (const [kind, chance] of DROPS) { if (r < chance) { this.spawnPickup(kind, o.sprite.x, o.sprite.body.center.y, null, true); return; } r -= chance; }
  }

  // flag: remember it was taken (map-placed pickups). dropped: falls to the ground and expires.
  spawnPickup(kind, x, y, flag, dropped) {
    const obj = this.add.text(x, y, POWERUPS[kind].icon, { fontSize: '26px', resolution: RES }).setOrigin(0.5).setDepth(9);
    this.physics.add.existing(obj);
    obj.body.setBounce(0.35); obj.body.setAllowGravity(!!dropped);
    if (dropped) { obj.body.setVelocityY(-320); this.physics.add.collider(obj, this.solids); }
    else this.tweens.add({ targets: obj, y: y - 6, duration: 700, yoyo: true, repeat: -1 });
    this.pickups.push({ kind, obj, flag, until: dropped ? this.time.now + PICKUP_LIFE : 0 });
  }

  updatePickups(now) {
    for (const k of this.pickups) {
      if (k.until) { if (now > k.until) k.gone = true; else if (k.until - now < 2500) k.obj.setAlpha(Math.floor(now / 120) % 2 ? 0.3 : 1); }
      const box = { x: k.obj.x - 18, y: k.obj.y - 18, w: 36, h: 36 };
      const p = !k.gone && this.players.find(q => !q.downUntil && overlaps(box, bodyRect(q.sprite.body)));
      if (p) {
        const u = POWERUPS[k.kind]; k.gone = true;
        if (k.kind === 'fish') p.hp = Math.min(maxHp(p), p.hp + u.heal);
        else if (k.kind === 'catnip') p.frenzyUntil = now + u.time;
        else if (k.kind === 'bell') p.shield = true;
        else if (k.kind === 'milk') { state.bonusHp++; this.players.forEach(q => { if (!q.downUntil) q.hp++; }); }
        else if (u.tool || u.special) {                  // found by one, owned by all; the finder equips it
          const slot = u.tool ? 'tool' : 'special', list = u.tool ? state.tools : state.specials, key = u.tool || u.special;
          if (!list.includes(key)) list.push(key);
          p.entry[slot] = key;
          this.ui.showBanner(u.name + '\n' + (u.tool ? 'RB, E or \' switches tools' : 'RT, T or ; switches specials'), 2600);
        }
        if (k.flag) state.flags[k.flag] = true;
        this.popText(k.obj.x, k.obj.y - 14, u.name); blip(880, 0.1, 'triangle', 0.06); this.time.delayedCall(90, () => blip(1320, 0.18, 'triangle', 0.06));
      }
      if (k.gone) k.obj.destroy();
    }
    this.pickups = this.pickups.filter(k => !k.gone);
  }

  updateBalls(now) {
    const dt = this.dt;
    for (const ball of this.balls) {
      ball.obj.x += ball.vx * dt;
      if (ball.g) { ball.vy += ball.g * dt; ball.obj.y += ball.vy * dt; }
      const r = this.ballRect(ball);
      if (this.debug) this.strikes.push({ box: r, until: now + 30, color: ball.friendly ? 0x66aaff : 0xff4444 });
      if (!ball.friendly) {
        for (const p of this.players)
          if (!p.downUntil && now > p.invulnUntil && !this.pouncing(p) && overlaps(r, bodyRect(p.sprite.body))) {
            this.hurtPlayer(p, Math.sign(ball.vx), now); ball.until = 0; break;
          }
      } else {
        const o = this.officers.find(o => !o.dead && overlaps(r, o.rect()));
        if (ball.burst) { if (o || ball.obj.y > this.groundY - 10) this.burst(ball, now); }
        else if (o) {
          const from = { face: Math.sign(ball.vx), sprite: ball.owner.sprite, hurtUntil: 0 };
          // A batted-back ball or net bonks: light damage, and it gets past a briefcase.
          o.hurt(from, now, ball.hit || { dmg: 1, knock: 160, up: 120, stun: 320, interrupts: true, dazed: true }); ball.until = 0;
        }
      }
      if (now > ball.until || ball.obj.x < -20 || ball.obj.x > this.map.w + 20) { ball.obj.destroy(); ball.gone = true; }
    }
    this.balls = this.balls.filter(b => !b.gone);
  }

  // ---------- room flow ----------
  popText(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffffff', resolution: RES,
      stroke: '#1c1630', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(45);
    this.tweens.add({ targets: t, y: y - 34, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  leave(door) {
    if (this.leaving) return;
    this.leaving = true;
    for (const p of this.players) { p.entry.hp = p.downUntil ? maxHp(p) : p.hp; p.entry.shield = p.shield; }
    this.cameras.main.fadeOut(180);
    this.time.delayedCall(200, () => this.scene.restart({ room: door.props.target, door: door.props.targetDoor }));
  }

  updateFlow(now) {
    if (!this.cleared && !this.officers.length) {
      if (this.waveIdx < this.map.waves.length) {
        if (!this.nextWaveAt) this.nextWaveAt = now + (this.waveIdx ? 1800 : 1300);
        else if (now > this.nextWaveAt) { this.nextWaveAt = 0; this.spawnWave(); }
      } else {
        this.cleared = state.cleared[this.roomKey] = true;
        blip(660, 0.12, 'triangle', 0.06); this.time.delayedCall(120, () => blip(990, 0.3, 'triangle', 0.06));
        if (this.map.final) this.ui.showBanner('You beat The Chief!\nMore rooms coming soon', 0);
        else this.ui.showBanner('All clear!', 1200);
      }
    }
    for (const d of this.doors) {
      d.label.setText(this.cleared ? (d.left ? '◀ ' + d.props.label : d.props.label + ' ▶') : 'Locked');
      d.label.setAlpha(this.cleared ? 0.75 + 0.25 * Math.sin(now / 200) : 0.5);
      // Walking into an open door takes everyone through. Being knocked into it does not.
      const going = p => !p.downUntil && (p.prev.x || 0) === (d.left ? -1 : 1) && overlaps(bodyRect(p.sprite.body), d.box);
      if (this.cleared && this.players.some(going)) this.leave(d);
    }
    for (const f of this.fishes) {
      if (!f.obj.visible) { if (now > f.backAt) f.obj.setVisible(true); continue; }
      if (this.players.some(p => Math.abs(p.sprite.x - f.obj.x) < 40 && Math.abs(p.sprite.body.center.y - f.obj.y) < 50)) {
        this.players.forEach(q => { if (!q.downUntil) q.hp = maxHp(q); });
        f.obj.setVisible(false); f.backAt = now + 15000; blip(990, 0.25, 'triangle', 0.05);
      }
    }
  }

  drawDebug(now) {
    const g = this.dbg; g.clear();
    this.strikes = this.strikes.filter(k => k.until > now);
    if (!this.debug) return;
    const box = (r, color) => { g.lineStyle(2, color, 1); g.strokeRect(r.x, r.y, r.w, r.h); };
    for (const p of this.players) box(bodyRect(p.sprite.body), 0x55ff88);
    for (const o of this.officers) if (!o.dead) {
      box(o.rect(), 0xffe066);
      if (o.state === 'windup' && o.t.box && (o.t.attack === 'swing' || o.t.attack === 'slam')) box(o.attackRect(), 0xff9944);
    }
    for (const k of this.strikes) { g.fillStyle(k.color, 0.35); g.fillRect(k.box.x, k.box.y, k.box.w, k.box.h); }
  }

  update() {
    const now = this.time.now;
    this.dt = Math.min(0.1, (now - (this.lastNow || now)) / 1000); this.lastNow = now;   // real elapsed time, so slow frames do not slow things down
    if (consume('Backquote', 8)) this.debug = !this.debug;
    const restart = consume('KeyR', 9) | consume('Escape') | consume('Restart');
    if (restart && state.party.length) { resetState(); this.scene.restart({ room: ROOMS[0] }); return; }
    if (this.leaving) return;

    for (const src in SOURCES) {
      if (this.joined[src]) continue;
      const r = SOURCES[src]();
      if (r && (r.jump || r.attack || r.special || r.tool || r.swap || r.x)) this.join(src);
    }
    if (!this.players.length) return;

    for (const p of this.players) this.updatePlayer(p, now);
    for (const o of this.officers) o.update(now);
    this.officers = this.officers.filter(o => o.sprite.active);
    this.updateBalls(now);
    this.updatePickups(now);
    this.updateFlow(now);
    this.drawDebug(now);

    const mid = this.players.reduce((a, p) => a + p.sprite.x, 0) / this.players.length;
    this.viewX += (Phaser.Math.Clamp(mid - W / 2, 0, this.map.w - W) - this.viewX) * 0.08;
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
    const boss = this.officers.find(o => o.t.boss && !o.dead);
    this.ui.setBoss(boss ? { name: boss.t.name, hp: boss.hp / boss.maxHp, raging: boss.raging } : null);
    const waves = this.map.waves.length;
    this.ui.score.setText(this.map.title + (this.cleared ? '   clear' : '   wave ' + Math.min(this.waveIdx, waves) + '/' + waves) +
      '\nSent packing: ' + state.beaten);
  }
}
