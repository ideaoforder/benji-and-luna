import { W, RES, CATS, MOVES, PLAYER_COLORS, SWAP_ORDER, JOIN_ORDER, skin, OFFICERS, SPECIALS, TOOLS, POWERUPS, DROPS, PICKUP_LIFE, HIT_CHAIN_MS, BRAWL as B, aim, hourly } from '../config.js';
import { SOURCES, consume, held } from '../input.js';
import { sfx, music, stopMusic } from '../sound.js';
import { state, resetState, run } from '../state.js';
import { frame, sheet } from '../sprites.js';
import { parseMap, AREAS, areaOf } from '../maps.js';
import { Street } from './street.js';
import { Foe } from './foe.js';

// The game: streets you walk around on in depth, joined by doors.
//
// Nothing here uses the physics engine. Every character has x (along the street), y (depth: the on-screen
// y of its feet) and z (height above the floor). It is drawn at (x, y - z) with its feet as the anchor,
// casts a shadow at (x, y), and is drawn in depth order. Combos, specials, tools, pick-ups and the
// officer types all come from the same data in config.js as the platformer.

const FONT = 'system-ui, sans-serif', PIVOT = 0.36;       // spin pivot: this far up the frame from the feet
const maxHp = p => p.cat.hp + state.bonusHp;

export class Brawl extends Phaser.Scene {
  constructor() { super('brawl'); }

  init(data) { this.roomKey = (data && data.room) || AREAS[run.area].streets[0]; this.fromDoor = (data && data.door) || null; }

  // Fetch this street's backdrop pictures, and let go of the last street's: they are big, and an iPad has little room.
  preload() {
    const scenery = this.cache.json.get('scenery') || {}, mine = 'bg-' + this.roomKey + '-';
    for (const key of this.textures.getTextureKeys()) if (key.startsWith('bg-') && !key.startsWith(mine)) this.textures.remove(key);
    for (const key in scenery) if (key.startsWith(mine) && !this.textures.exists(key)) this.load.image(key, hourly('assets/scenery/' + scenery[key].file));
  }

  create() {
    const map = this.map = parseMap(this.cache.json.get('street-' + this.roomKey));
    this.ui = this.scene.get('hud'); this.viewX = 0;
    aim(this.cameras.main, 0);
    this.street = new Street(this, this.roomKey, map);

    this.players = []; this.foes = []; this.shots = []; this.pickups = []; this.joined = {};
    this.cleared = !!state.cleared[this.roomKey];
    this.waveIdx = 0; this.nextWaveAt = 0; this.spawned = 0; this.leaving = false;
    this.lastNow = 0; this.hitCount = 0; this.hitUntil = 0; this.lastHint = 0;
    this.rings = []; this.debug = false; this.zones = [];          // recent attack areas, kept briefly for the hitbox view
    this.dbg = this.add.graphics().setDepth(940);
    for (const k of this.street.pickups) if (!state.flags[k.flag]) this.spawnPickup(k.kind, k.x, k.y, false, k.flag);

    this.ui.showBanner('', 1); this.ui.setBoss(null);
    if (state.party.length) run.area = areaOf(this.roomKey);        // walking into a new area makes it the one to restart in
    this.ui.showTitle(!state.party.length);
    music(state.party.length ? AREAS[areaOf(this.roomKey)].key : 'title');     // a track already playing carries on
    if (state.party.length) {
      state.party.forEach(e => this.addPlayer(e));
      this.viewX = Phaser.Math.Clamp(this.players[0].x - W / 2, 0, map.w - W);
      aim(this.cameras.main, this.viewX);
      this.cameras.main.fadeIn(220);
      this.ui.showBanner(map.title, 1400);
    }
    window.__scene = this;
  }

  move(ent, dx, dy) { this.street.move(ent, dx, dy); }

  // ---------- cats ----------
  join(src) {
    if (state.party.length >= 4 || this.joined[src]) return;
    const entry = { src, catKey: JOIN_ORDER[state.party.length % JOIN_ORDER.length], hp: null, shield: false, tool: state.tools[0] || null, special: state.specials[0] };
    state.party.push(entry); this.addPlayer(entry);
    if (state.party.length === 1) { this.ui.showTitle(false); this.ui.showBanner(this.map.title, 1400); }
    sfx('join');
    if (state.party.length === 1) music(AREAS[areaOf(this.roomKey)].key);
  }

  addPlayer(entry) {
    this.joined[entry.src] = true;
    const n = this.players.length;
    const door = this.street.doors.find(d => d.name === this.fromDoor), st = this.street.start;
    let x = st.x + n * 60, face = 1;                     // arriving through a door: just inside it, facing in
    let y = Phaser.Math.Clamp(st.y - 40 + n * 36, B.floorTop + 10, B.floorBottom - 10);
    if (door && door.back) { x = door.x + door.w / 2 + (n - 0.5) * 44; y = B.floorTop + 26 + n * 8; }       // stepping out of a doorway in the back wall
    else if (door) { x = door.left ? door.x + door.w + 60 + n * 50 : door.x - 60 - n * 50; face = door.left ? 1 : -1; }
    else if (this.players.length) x = this.players[0].x + n * 40;       // late joiners appear beside P1
    const p = { entry, src: entry.src, n, prev: {}, face, x, y, z: 0, vz: 0, kvx: 0,
                attackUntil: 0, nextAttack: 0, combo: 0, comboUntil: 0, tumble: null, spinUsed: false, jumpsLeft: 0,
                nextSpecial: 0, nextTool: 0, usesLeft: {},           // tool uses refill in every room
                invulnUntil: 0, downUntil: 0, hurtUntil: 0, frenzyUntil: 0, shield: !!entry.shield, arriving: true,
                slideX: 0, slideY: 0, tapDir: 0, tapAt: 0, tapPrevDir: 0, tapPrevAt: 0, dashUntil: 0, running: 0, nextLunge: 0 };
    p.shadow = this.add.ellipse(p.x, p.y, 60, 14, 0x000000, 0.28);
    p.sprite = this.add.sprite(p.x, p.y, entry.catKey, 0).setOrigin(0.5, 1);
    p.tag = this.add.text(0, 0, 'P' + (n + 1), { fontFamily: FONT, fontSize: '13px', resolution: RES,
      color: PLAYER_COLORS[n % 4].css, stroke: '#1c1630', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(900);
    p.ring = this.add.ellipse(0, 0, 10, 10).setStrokeStyle(3, 0xffd27a, 0.9).setVisible(false); p.ring.isFilled = false;
    this.setCat(p, entry.catKey);
    if (entry.hp) p.hp = Math.min(entry.hp, maxHp(p));
    this.players.push(p);
  }

  setCat(p, key) {
    const c = CATS[key], share = p.cat ? p.hp / maxHp(p) : 1;
    p.cat = c; p.entry.catKey = key; p.hp = Math.max(1, Math.round(share * maxHp(p)));
    p.skin = skin(key, p.n);                             // same sheet layout, this player's colour
    p.sprite.setTexture(p.skin, 0).setScale(c.scale); p.sprite.anims.play(p.skin + '-idle', true);
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
    const s = p.sprite, c = p.cat;
    let g = this.groundAt(p);                            // height of whatever is underfoot: 0 on the street, a box's height on top of it
    const onGround = p.z <= g;

    if (p.downUntil) {                                   // netted: sit it out, then come back
      if (p.tumble) this.endTumble(p);
      s.anims.stop(); s.setFrame(frame(c.key, 'sit')); s.setAlpha(0.55); p.kvx = 0;
      if (now > p.downUntil) { p.downUntil = 0; p.hp = maxHp(p); p.invulnUntil = now + 1500; sfx('catBack'); }
    } else {
      if (onGround) { p.jumpsLeft = c.jumps; p.spinUsed = false; }
      if (p.tumble) this.updateTumble(p, now, dt, onGround);

      // Stick taps, remembered for the moves that are read from them: twice the same way = dash, away then toward = lunge.
      const tap = raw.x && raw.x !== (p.prev.x || 0) ? raw.x : 0, D = MOVES.dash;
      if (tap) {
        if (this.knows('dash') && tap === p.tapDir && now - p.tapAt < D.tapMs && onGround && now > p.hurtUntil && !p.tumble) {
          p.dashUntil = now + D.time; p.running = tap; sfx('dash'); this.puff(p.x, p.y);
        }
        p.tapPrevDir = p.tapDir; p.tapPrevAt = p.tapAt; p.tapDir = tap; p.tapAt = now;
      }
      if (p.running && raw.x !== p.running) { p.running = 0; p.dashUntil = 0; }   // let go or turned: back to a walk

      let mx = 0, my = 0;
      if (this.pouncing(p)) mx = p.face * c.pounce.speed;                 // a pounce is committed
      else {
        if (now > p.hurtUntil) {
          const k = c.speed * (now < p.frenzyUntil ? POWERUPS.catnip.speedMul : 1) * (now < p.attackUntil && onGround ? 0.35 : 1) *
            (now < p.dashUntil ? D.speedMul : p.running ? D.runMul : 1);
          mx = (raw.x || 0) * k; my = (raw.y || 0) * k * B.depthSpeed;
          if (raw.x && !p.tumble) p.face = raw.x;
        }
        if (pressed('jump') && p.jumpsLeft > 0) {
          p.vz = c.jump * B.jumpMul * (onGround || p.jumpsLeft === c.jumps ? 1 : 0.85); p.z = Math.max(p.z, g + 1);
          p.jumpsLeft--; sfx('jump');
        }
        if (!raw.jump && p.vz > 220 && !p.tumble) p.vz = 220;             // short hop on early release
      }
      if (this.map.slippery && onGround && !this.pouncing(p)) {      // ice: speed builds up and bleeds off slowly
        const k = Math.min(1, 2.6 * dt); p.slideX += (mx - p.slideX) * k; p.slideY += (my - p.slideY) * k; mx = p.slideX; my = p.slideY;
      } else { p.slideX = mx; p.slideY = my; }
      this.move(p, (mx + p.kvx) * dt, my * dt);
      p.kvx -= p.kvx * Math.min(1, 7 * dt); if (Math.abs(p.kvx) < 8) p.kvx = 0;
      g = this.groundAt(p);                                // may have stepped onto or off something
      if (p.z > g || p.vz > 0) { p.vz -= B.gravity * dt; p.z = Math.max(g, p.z + p.vz * dt); if (p.z === g) p.vz = 0; }
      else p.z = g;

      if (!p.tumble) {
        if (pressed('attack')) {
          if (!onGround && !p.spinUsed) this.startTumble(p, 'spin', now);  // attack in the air = tail somersault
          else if (now > p.nextAttack) {
            const L = MOVES.lunge, floored = raw.y === 1 && this.knows('stomp') && this.flooredNear(p);
            if (this.knows('lunge') && now > p.nextLunge && raw.x && p.tapDir === raw.x && p.tapPrevDir === -raw.x &&
                p.tapAt - p.tapPrevAt < L.tapMs && now - p.tapAt < L.tapMs) this.thrust(p, now, 'lunge');
            else if (this.knows('dashAttack') && (now < p.dashUntil || p.running)) this.thrust(p, now, 'dashAttack');
            else if (floored) this.stomp(p, floored, now);
            else this.claw(p, now);
          }
        }
        if (pressed('special') && now > p.nextSpecial && now > p.hurtUntil) this.special(p, now);
        if (pressed('tool')) this.useTool(p, now);
        if (pressed('cycleTool')) this.cycle(p, 'tool', state.tools, TOOLS);
        if (pressed('cycleSpecial')) this.cycle(p, 'special', state.specials, SPECIALS);
        if (pressed('swap') && onGround) {
          const next = SWAP_ORDER[(SWAP_ORDER.indexOf(c.key) + 1) % SWAP_ORDER.length];
          if (!CATS[next].small && this.street.inPen(p.x, p.y, 14)) { this.popText(p.x, p.y - 90, 'No room in here!'); sfx('nope'); }   // a bigger cat would be stuck
          else { this.setCat(p, next); this.popText(p.x, p.y - 90, CATS[next].name); sfx('swap'); }
        }
      }

      if (!p.tumble && p.cat === c) {
        s.setFlipX(p.face < 0);
        if (now < p.hurtUntil && frame(c.key, 'hurt') !== null) { s.anims.stop(); s.setFrame(frame(c.key, 'hurt')); }
        else if (now < p.attackUntil) { s.anims.stop(); s.setFrame(this.catFrame(c, p.attackRow, p.attackIdx)); }
        else if (p.z > g) { s.anims.stop(); s.setFrame(frame(c.key, 'jump', c.air[p.vz > 0 ? 0 : 1])); }
        else if (raw.x || raw.y) s.anims.play(p.skin + '-' + (p.running ? 'run' : c.move), true);
        else s.anims.play(p.skin + '-idle', true);
      }
      s.setAlpha(now < p.invulnUntil && Math.floor(now / 80) % 2 ? 0.35 : 1);
      if (now < p.frenzyUntil) s.setTint(Math.floor(now / 120) % 2 ? 0xb6ffa8 : 0xe4ffd8); else s.clearTint();
      for (const sw of this.street.switches) if (!sw.on && Math.abs(sw.x - p.x) < 26 && Math.abs(sw.y - p.y) < 18) this.flip(sw);
    }
    this.drawPlayer(p);
    p.prev = raw;
  }

  drawPlayer(p) {
    const s = p.sprite, h = sheet(p.cat.key).frameHeight * p.cat.scale, lift = p.tumble ? h * PIVOT : 0;
    // Over a box (standing on it or in the air above it) the cat is drawn in front of the box, and its shadow falls on the top.
    const o = p.over, g = o ? o.h : 0, depth = o ? Math.max(p.y, o.y + o.d) + 1 : p.y;
    s.setOrigin(0.5, p.tumble ? 1 - PIVOT : 1).setPosition(p.x, p.y - p.z - lift).setDepth(depth);
    p.shadow.setPosition(p.x, p.y - g).setDepth(depth - 0.5).setScale(1 - Math.min(0.5, (p.z - g) / 300));
    p.tag.setPosition(p.x, p.y - p.z - h - 2);
    p.ring.setVisible(p.shield && !p.downUntil).setPosition(p.x, p.y - p.z - h * 0.4).setSize(p.cat.body[0] + 46, h + 10).setDepth(p.y + 0.5);
  }

  groundAt(p) { p.over = p.downUntil ? null : this.street.under(p.x, p.y); return p.over ? p.over.h : 0; }

  // ---------- attacks ----------
  knows(move) { return state.moves.includes(move); }
  puff(x, y) {
    const d = this.add.ellipse(x, y - 4, 26, 10, 0xffffff, 0.5).setDepth(y - 1);
    this.tweens.add({ targets: d, scaleX: 2.2, scaleY: 1.6, alpha: 0, duration: 260, onComplete: () => d.destroy() });
  }

  // Dash attack and power lunge: one committed hit that carries the cat forward and puts officers on the floor.
  thrust(p, now, kind) {
    const c = p.cat, M = MOVES[kind], lunge = kind === 'lunge', frenzy = now < p.frenzyUntil ? POWERUPS.catnip.dmgMul : 1;
    const last = c.combo.length - 1, dmg = (c.combo[last].dmg + M.bonus) * frenzy, reach = c.claw.w * M.reach, depth = B.hitDepth + 8;
    p.combo = 0; p.comboUntil = 0; p.running = 0; p.dashUntil = 0; p.tapDir = 0;
    p.kvx = p.face * M.slide; p.attackUntil = now + M.time; p.attackRow = 'claw'; p.attackIdx = last; p.nextAttack = now + M.recover;
    if (lunge) { p.nextLunge = now + M.cooldown; p.invulnUntil = Math.max(p.invulnUntil, now + 220); this.cameras.main.shake(110, 0.007); }
    const tall = c.claw.h * (lunge ? 1.7 : 1.3);
    const fx = this.add.image(p.x + p.face * reach * 0.45, p.y - p.z - tall * 0.4, 'slash').setTint(lunge ? 0xffe066 : 0xffffff)
      .setFlipX(p.face < 0).setDisplaySize(reach * 0.9, tall).setDepth(p.y + 1);
    this.tweens.add({ targets: fx, alpha: 0, x: fx.x + p.face * M.slide * 0.14, duration: M.time, onComplete: () => fx.destroy() });
    this.puff(p.x, p.y); sfx(kind, { rate: c.pitch, cat: c.key });
    this.zone(p.x, p.y, p.face, reach, depth, 0xff4444, M.time);
    for (const o of this.foes)
      if (!o.dead && o.z < 80 && this.ahead(p, o, reach, depth))
        o.hurt(p, now, { dmg, knock: M.knock, up: M.up, stun: M.stun, interrupts: true, heavy: !!M.heavy || c.interrupts });
    this.hitScenery(p, reach, now, !!M.heavy || c.interrupts);
  }

  // An officer lying on the floor within reach, nearest first.
  flooredNear(p) {
    let best = null, bd = MOVES.stomp.range;
    for (const o of this.foes) {
      const d = Math.abs(o.x - p.x) - o.half;
      if (o.state === 'down' && d < bd && Math.abs(o.y - p.y) <= B.hitDepth + 12) { bd = d; best = o; }
    }
    return best;
  }

  // Ground pounce: hop onto a floored officer and land with full weight.
  stomp(p, o, now) {
    const c = p.cat, M = MOVES.stomp, dmg = (c.combo[c.combo.length - 1].dmg + M.bonus) * (now < p.frenzyUntil ? POWERUPS.catnip.dmgMul : 1);
    p.combo = 0; p.comboUntil = 0; p.nextAttack = now + M.recover; p.attackUntil = now + M.recover * 0.7; p.attackRow = 'roll'; p.attackIdx = 0;
    p.face = o.x < p.x ? -1 : 1; p.kvx = (o.x - p.x) * 6; p.vz = M.hop; p.z = Math.max(p.z, 1); p.spinUsed = true;
    sfx('stompHop', { rate: c.pitch, cat: c.key });
    this.time.delayedCall(M.delay, () => {
      if (o.dead || p.downUntil) return;
      o.hurt(p, this.time.now, { dmg, knock: 0, up: 0, stun: 0, ground: true, heavy: true });
      this.cameras.main.shake(90, 0.006); this.puff(o.x, o.y); sfx('stompLand');
    });
  }

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
    sfx(last ? 'clawFinish' : 'claw', { rate: c.pitch, step: i, cat: c.key });
    const heavy = c.interrupts || !!step.interrupts, depth = B.hitDepth + (last ? 8 : 0);
    this.zone(p.x, p.y, p.face, reach, depth, 0xff4444, 170);
    if (p.z < 70) for (const o of this.foes)
      if (!o.dead && o.z < 80 && this.ahead(p, o, reach, depth))
        o.hurt(p, now, { dmg: step.dmg * (frenzy ? nip.dmgMul : 1), knock: step.knock, up: step.up, stun: step.stun, interrupts: heavy, heavy });
    for (const b of this.shots)                           // bat a tennis ball back
      if (!b.friendly && b.reflect && this.ahead(p, b, reach, 22)) {
        b.vx = p.face * Math.abs(b.vx) * 1.3; b.friendly = true; b.owner = p; b.y = p.y;
        b.obj.setFillStyle(c.slash, 1); b.until = now + 2000; sfx('batBack');
      }
    this.hitScenery(p, reach, now);
  }

  // Crates and switches react to claws, somersaults and pounces.
  // power: is this hit strong enough to break an ordinary crate (anything of Benji's, anyone's power lunge)?
  hitScenery(p, reach, now, power = p.cat.interrupts) {
    for (const o of this.street.obstacles) {
      if (o.gone || (o.kind !== 'breakable' && o.kind !== 'crate') || o === p.over || p.y < o.y - 12 || p.y > o.y + o.d + 12 || p.z > o.h + 10) continue;
      const d = p.face > 0 ? o.x - p.x : p.x - (o.x + o.w);
      if (d < -o.w || d > reach) continue;
      if (o.kind === 'crate') {
        if (!power || now < (o.hitAt || 0)) continue;
        o.hitAt = now + 150; this.cameras.main.shake(70, 0.005); sfx('crateHit');
        if (--o.hp > 0) { o.parts.forEach(r => this.tweens.add({ targets: r, x: r.x + 4, duration: 40, yoyo: true, repeat: 2 })); continue; }
        this.street.smash(o); sfx('crateBreak');
        if (Math.random() < 0.3) this.spawnPickup('fish', o.x + o.w / 2, o.y + o.d + 4, true);    // sometimes there was something in it
      } else if (p.cat.interrupts) { this.street.smash(o); this.cameras.main.shake(120, 0.008); sfx('crateBreak'); }
      else if (now > this.lastHint) { this.popText(o.x + o.w / 2, o.y - o.h + 30, 'Too heavy!'); this.lastHint = now + 900; sfx('nope'); }
    }
    for (const sw of this.street.switches) if (!sw.on && Math.abs(sw.y - p.y) < 22 && (sw.x - p.x) * p.face > -10 && (sw.x - p.x) * p.face < reach) this.flip(sw);
  }

  flip(sw) {
    this.street.flip(sw);
    this.popText(sw.x, sw.y - 50, 'Gate open!'); sfx('gateOpen');
  }

  // Remember an attack's reach on the floor for the hitbox view: `reach` forward of x, `depth` either side of y.
  zone(x, y, face, reach, depth, color, ms, near = 0) {
    this.zones.push({ x: face > 0 ? x + near : x - near - reach, y: y - depth, w: reach, h: depth * 2, color, until: this.time.now + ms });
  }

  // 'spin': tail somersault, the air attack. 'pounce': a special, a committed dash that cannot be hit.
  startTumble(p, kind, now) {
    const c = p.cat, cfg = kind === 'spin' ? c.spin : c.pounce;
    p.tumble = { kind, cfg, from: now, until: now + cfg.time, hit: new Set() };
    if (kind === 'spin') { p.spinUsed = true; p.vz = Math.max(p.vz, 160); }
    sfx(kind, { rate: c.pitch, cat: c.key });
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
    p.nextSpecial = now + this.spec(p, kind).cooldown;
    if (kind === 'pounce') this.startTumble(p, 'pounce', now); else if (kind === 'fish') this.lobFish(p, now); else this.meow(p, now);
  }
  // A special's numbers: this cat's own version if it has one (meow, pounce), otherwise the shared one in SPECIALS.
  spec(p, kind) { return p.cat[kind] || SPECIALS[kind]; }

  lobFish(p, now) {
    const S = SPECIALS.fish;
    p.attackUntil = now + 200; p.attackRow = 'tool'; p.attackIdx = 0;
    const obj = this.add.image(0, 0, S.image).setDisplaySize(44, 23).setFlipX(p.face < 0);
    this.shots.push({ obj, x: p.x + p.face * 30, y: p.y, z: p.z + 34, vx: p.face * S.vx, vz: -S.vy, spin: p.face * 540, half: 12, friendly: true, owner: p, until: now + 3000,
      burst: { radius: S.radius, color: 0x9be36a, hit: { dmg: S.dmg, knock: S.knock, up: S.up, stun: S.stun, interrupts: true, heavy: true } } });
    sfx('fishLob');
  }

  meow(p, now) {
    const c = p.cat, m = c.meow;
    p.attackUntil = now + 220; p.attackRow = 'meow'; p.attackIdx = 0;
    for (let i = 0; i < 3; i++) {                          // three rings travelling outward
      const ring = this.add.ellipse(p.x + p.face * 30, p.y - p.z - 34, 14, m.h * 0.45).setStrokeStyle(4, c.slash, 1).setDepth(p.y + 1);
      ring.isFilled = false;
      this.tweens.add({ targets: ring, x: p.x + p.face * (m.w + 10), scaleX: 2.2, scaleY: 2.1, alpha: 0, duration: 380, delay: i * 70, onComplete: () => ring.destroy() });
    }
    sfx('meow', { rate: c.pitch, cat: c.key });
    this.zone(p.x, p.y, p.face, m.w, 36, 0x66aaff, 220);
    for (const o of this.foes)
      if (!o.dead && this.ahead(p, o, m.w, 36)) o.hurt(p, now, { dmg: 0, knock: m.push, up: 90, stun: m.stun, interrupts: true, dazed: true });
  }

  // ---------- tools ----------
  useTool(p, now) {
    const key = p.entry.tool; if (!key || now < p.nextTool) return;
    const T = TOOLS[key], left = this.toolLeft(p);
    p.nextTool = now + T.cooldown;
    if (!left) { this.popText(p.x, p.y - p.z - 80, 'Empty'); sfx('nope'); return; }
    p.usesLeft[key] = left - 1; p.attackUntil = now + 180; p.attackRow = 'tool'; p.attackIdx = 0;
    if (key === 'fire') {
      const obj = this.add.circle(0, 0, 10, 0xff8a3d).setStrokeStyle(3, 0xffe066);
      this.shots.push({ obj, x: p.x + p.face * 30, y: p.y, z: p.z + 30, vx: p.face * T.speed, half: 11, friendly: true, owner: p, until: now + 1500,
        hit: { dmg: T.dmg, knock: 260, up: 150, stun: 350, interrupts: true, heavy: true } });
      sfx('fireYarn');
    } else if (key === 'sticky') {                       // lobbed; bursts where it lands
      const obj = this.add.circle(0, 0, 9, 0x9fd8ff).setStrokeStyle(3, 0xffffff);
      this.shots.push({ obj, x: p.x + p.face * 30, y: p.y, z: p.z + 30, vx: p.face * T.vx, vz: -T.vy, half: 10, friendly: true, owner: p, until: now + 3000,
        burst: { radius: T.radius, freeze: T.freeze } });
      sfx('stickyYarn');
    } else if (key === 'heal') {                         // heals every cat nearby and frees netted ones
      this.pulse(p.x, p.y - 20, T.radius, 0xff8fc8, p.y);
      for (const q of this.players) {
        if (Math.hypot(q.x - p.x, (q.y - p.y) * 1.6) > T.radius) continue;
        if (q.downUntil) { q.downUntil = 0; q.hp = T.heal; q.invulnUntil = now + 1500; } else q.hp = Math.min(maxHp(q), q.hp + T.heal);
        this.popText(q.x, q.y - 90, '+' + T.heal);
      }
      sfx('healYarn');
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
    this.popText(p.x, p.y - p.z - 90, table[next].icon + ' ' + table[next].name); sfx('cycle');
  }

  countHit(now) { this.hitCount++; this.hitUntil = now + HIT_CHAIN_MS; }

  hurtPlayer(p, dir, now) {
    if (p.downUntil || now < p.invulnUntil || this.pouncing(p)) return;
    if (p.shield) { p.shield = false; p.invulnUntil = now + 700; this.popText(p.x, p.y - 90, 'Blocked!'); sfx('shieldBlock'); return; }
    const steady = p.cat.steady;                         // Luca: barely budges
    p.hp--; if (p.hp > 0) sfx('catHurt'); p.invulnUntil = now + 1000; p.hurtUntil = now + (steady ? 120 : 260); p.combo = 0;
    p.kvx = dir * (steady ? 90 : 300); p.vz = steady ? 90 : 230; p.z = Math.max(p.z, 1);
    this.cameras.main.shake(80, 0.004);
    if (p.hp <= 0) { sfx('catNetted'); p.downUntil = now + 3000; p.frenzyUntil = 0; p.sprite.clearTint(); }
  }

  // ---------- officers, waves, shots, pick-ups ----------
  nearest(x, y) {
    let best = null, bd = 1e9;
    for (const p of this.players) { if (p.downUntil) continue; const d = Math.abs(p.x - x) + Math.abs(p.y - y) * 2; if (d < bd) { bd = d; best = p; } }
    return best;
  }

  spawnWave() {
    const types = [...this.map.waves[this.waveIdx]];
    if (this.players.length >= 3 && !OFFICERS[types[0]].boss) types.push('uniform');
    const mid = this.players.reduce((a, p) => a + p.x, 0) / this.players.length;
    types.forEach((type, i) => this.foes.push(this.walkIn(type, i % 2 ? -1 : 1, i, mid)));
    this.waveIdx++;
  }

  // An officer walks in from just off one edge of the screen, on the cats' side of any barrier still standing.
  walkIn(type, side, i, mid) {
    const edge = s => Phaser.Math.Clamp(this.viewX + W / 2 + s * (W / 2 + 60 + i * 30), -80, this.map.w + 80);
    const cut = x => this.street.barriers().some(o => (o.x + o.w / 2 - mid) * (o.x + o.w / 2 - x) < 0);
    let x = edge(side); if (cut(x)) x = edge(-side);
    if (cut(x)) x = mid + side * 300;                    // boxed in on both sides: appear nearby instead
    const y = B.floorTop + 30 + ((i * 53 + this.waveIdx * 31) % (B.floorBottom - B.floorTop - 50));
    const o = new Foe(this, type, x, y, this.spawned++);
    if (o.t.boss) music('boss', { ifExists: true });
    if (o.t.boss) o.hp = o.maxHp = Math.round(o.hp * (1 + o.t.boss.perPlayer * (this.players.length - 1)));
    else o.hp = o.maxHp = Math.round(o.hp * this.map.tough);
    return o;
  }

  // Boss stomp: a ring spreads across the floor from where he lands. Jump it.
  shockwave(x, y, radius) {
    const ring = this.add.ellipse(x, y, 10, 5).setStrokeStyle(6, 0xfff2a8, 0.95).setDepth(B.floorTop - 1); ring.isFilled = false;
    this.rings.push({ x, y, r: 20, max: radius, ring, hit: new Set() });
  }
  updateRings(now, dt) {
    for (const k of this.rings) {
      k.r += 520 * dt;
      k.ring.setSize(k.r * 2, k.r).setPosition(k.x, k.y).setAlpha(1 - k.r / k.max * 0.7);
      for (const p of this.players) {
        const d = Math.hypot(p.x - k.x, (p.y - k.y) * 2);              // the floor is drawn half as deep as it is wide
        if (!k.hit.has(p) && Math.abs(d - k.r) < 18 && p.z < 18) { k.hit.add(p); this.hurtPlayer(p, Math.sign(p.x - k.x) || 1, now); }
      }
      if (k.r >= k.max) { k.ring.destroy(); k.gone = true; }
    }
    this.rings = this.rings.filter(k => !k.gone);
  }

  // Boss whistle: backup walks in from both sides.
  summon(types) {
    const mid = this.players.reduce((a, p) => a + p.x, 0) / Math.max(1, this.players.length);
    types.forEach((type, i) => this.foes.push(this.walkIn(type, i % 2 ? -1 : 1, i, mid)));
  }

  // A hostile shot travels along the street at a fixed depth y and height z. kind: 'ball' or 'net'.
  spawnShot(kind, x, y, z, vx) {
    const net = kind === 'net';
    const obj = net ? this.add.circle(0, 0, 13, 0xffffff, 0.3).setStrokeStyle(3, 0xf5f5fa) : this.add.circle(0, 0, 8, 0xd8f04a).setStrokeStyle(2, 0x1c1630);
    this.shots.push({ obj, x, y, z, vx, half: net ? 14 : 9, reflect: true, friendly: false, owner: null, until: this.time.now + 2600 });
  }

  updateShots(now, dt) {
    for (const b of this.shots) {
      b.x += b.vx * dt;
      if (b.vz !== undefined) { b.vz -= 1100 * dt; b.z += b.vz * dt; }
      b.obj.setPosition(b.x, b.y - b.z).setDepth(b.y + 0.2); if (b.spin) b.obj.angle += b.spin * dt;
      if (this.debug) this.zones.push({ x: b.x - b.half, y: b.y - 16, w: b.half * 2, h: 32, color: b.friendly ? 0x66aaff : 0xff4444, until: now + 30 });
      if (!b.friendly) {
        const p = this.players.find(p => !p.downUntil && now > p.invulnUntil && !this.pouncing(p) &&
          Math.abs(p.x - b.x) < 26 && Math.abs(p.y - b.y) <= 16 && Math.abs(p.z + 25 - b.z) < 42);
        if (p) { this.hurtPlayer(p, Math.sign(b.vx), now); b.until = 0; }
      } else {
        const o = this.foes.find(o => !o.dead && Math.abs(o.x - b.x) < o.half + b.half && Math.abs(o.y - b.y) <= B.hitDepth + 4);
        if (b.burst) { if (o || b.z <= 0) this.burst(b, now); }
        else if (o) { o.hurt({ x: b.owner.x, face: Math.sign(b.vx) }, now, b.hit || { dmg: 1, knock: 160, up: 120, stun: 320, interrupts: true, dazed: true }); b.until = 0; }
      }
      if (now > b.until || b.x < -120 || b.x > this.map.w + 120) { b.obj.destroy(); b.gone = true; }
    }
    this.shots = this.shots.filter(b => !b.gone);
  }

  burst(b, now) {
    const k = b.burst;
    this.pulse(b.x, b.y, k.radius, k.color || 0x9fd8ff, b.y);
    for (const o of this.foes) {
      if (o.dead || Math.hypot(o.x - b.x, (o.y - b.y) * 1.6) > k.radius + o.half) continue;
      if (k.freeze) o.freeze(now, k.freeze);
      if (k.hit) o.hurt({ x: b.x, face: o.x < b.x ? -1 : 1 }, now, { ...k.hit });       // thrown outward from the middle
    }
    if (k.hit) {                                           // the smell hangs about for a moment
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2, puff = this.add.ellipse(b.x + Math.cos(a) * k.radius * 0.5, b.y - 18 + Math.sin(a) * k.radius * 0.25, 44, 30, k.color, 0.5).setDepth(b.y + 2);
        this.tweens.add({ targets: puff, y: puff.y - 34, scale: 1.7, alpha: 0, duration: 650 + i * 40, onComplete: () => puff.destroy() });
      }
      this.cameras.main.shake(120, 0.007); sfx('fishBurst');
    } else sfx('stickyBurst');
    b.until = 0;
  }

  onDefeat(o) {
    if (o.t.boss) {                                      // the boss going down sends the rest running
      stopMusic(1.2);
      for (const other of this.foes) if (other !== o && !other.dead) other.hurt({ x: o.x, face: 1 }, this.time.now, { dmg: 999, knock: 0, up: 0, stun: 0, dazed: true });
      return;
    }
    let r = Math.random();
    for (const [kind, chance] of DROPS) { if (r < chance) { this.spawnPickup(kind, o.x, o.y, true); return; } r -= chance; }
  }

  // flag: remember it was taken (map-placed pick-ups). dropped: left by an officer; expires.
  spawnPickup(kind, x, y, dropped, flag) {
    const obj = this.add.text(x, y - 16, POWERUPS[kind].icon, { fontSize: '26px', resolution: RES }).setOrigin(0.5);
    this.pickups.push({ kind, obj, x, y, z: -1, flag, until: dropped ? this.time.now + PICKUP_LIFE : 0 });      // z is set on the first update
  }

  updatePickups(now) {
    for (const k of this.pickups) {
      if (k.until) { if (now > k.until) k.gone = true; else if (k.until - now < 2500) k.obj.setAlpha(Math.floor(now / 120) % 2 ? 0.3 : 1); }
      const o = this.street.under(k.x, k.y), z = o ? o.h : 0;       // a pick-up placed on a box sits on top of it, and drops if the box goes
      if (z !== k.z) {
        k.z = z; this.tweens.killTweensOf(k.obj); k.obj.setY(k.y - 16 - z).setDepth(o ? o.y + o.d + 1 : k.y);
        this.tweens.add({ targets: k.obj, y: k.y - 24 - z, duration: 700, yoyo: true, repeat: -1 });
      }
      const p = !k.gone && this.players.find(q => !q.downUntil && Math.abs(q.x - k.x) < 34 && Math.abs(q.y - k.y) < 22 && Math.abs(q.z - z) < 40);
      if (p) {
        const u = POWERUPS[k.kind]; k.gone = true; if (k.flag) state.flags[k.flag] = true;
        if (k.kind === 'fish') p.hp = Math.min(maxHp(p), p.hp + u.heal);
        else if (k.kind === 'catnip') p.frenzyUntil = now + u.time;
        else if (k.kind === 'bell') p.shield = true;
        else if (k.kind === 'milk') { state.bonusHp++; this.players.forEach(q => { if (!q.downUntil) q.hp++; }); }
        else if (u.tool || u.special) {
          const slot = u.tool ? 'tool' : 'special', list = u.tool ? state.tools : state.specials, key = u.tool || u.special;
          if (!list.includes(key)) list.push(key);
          p.entry[slot] = key;
          this.ui.showBanner(u.name + '\n' + (u.tool ? 'Select + top button switches tools' : 'Select + right button switches specials'), 2600);
        }
        this.popText(k.x, k.y - 40, u.name); sfx('pickup');
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

  // ---------- room flow ----------
  leave(door) {
    if (this.leaving) return;
    this.leaving = true;
    for (const p of this.players) { p.entry.hp = p.downUntil ? maxHp(p) : p.hp; p.entry.shield = p.shield; }
    this.cameras.main.fadeOut(180);
    this.time.delayedCall(200, () => this.scene.restart({ room: door.target, door: door.targetDoor }));
  }

  updateFlow(now, mid) {
    const waves = this.map.waves;
    if (!this.cleared && !this.foes.length) {
      if (this.waveIdx >= waves.length) {
        this.cleared = state.cleared[this.roomKey] = true;
        const boss = this.map.waves.flat().map(k => OFFICERS[k]).find(t => t.boss);
        sfx(boss ? 'bossBeaten' : 'streetClear');
        if (this.map.final) this.ui.showBanner('You beat ' + boss.name + '!\nThe cats are free!', 0);
        else if (boss) this.ui.showBanner('You beat ' + boss.name + '!', 2600); else this.ui.showBanner('All clear!', 1200);
      } else if (mid >= (this.map.waveAt[this.waveIdx] || 0)) {
        if (!this.nextWaveAt) this.nextWaveAt = now + (this.waveIdx ? 1600 : 1200);
        else if (now > this.nextWaveAt) { this.nextWaveAt = 0; this.spawnWave(); }
      }
    }
    for (const p of this.players) if ((p.prev.y || 0) !== -1) p.arriving = false;      // still holding up from the last doorway: do not bounce straight back
    for (const d of this.street.doors) {
      d.label.setText(this.cleared ? (d.back ? '\u25B2 ' + d.text : d.left ? '\u25C0 ' + d.text : d.text + ' \u25B6') : 'Locked').setAlpha(this.cleared ? 0.75 + 0.25 * Math.sin(now / 200) : 0.5);
      // Walking into an open door takes everyone through. Being knocked into it does not.
      const going = p => !p.downUntil && (d.back ? !p.arriving && (p.prev.y || 0) === -1 && p.x > d.x && p.x < d.x + d.w && p.y < B.floorTop + 12
        : (p.prev.x || 0) === (d.left ? -1 : 1) && p.x > d.x - 10 && p.x < d.x + d.w + 10);
      if (this.cleared && this.players.some(going)) this.leave(d);
    }
  }

  // Hitbox view (backquote key). Everything is shown on the floor, because that is where hits are decided:
  // green = where a cat stands, yellow = an officer, orange = where a wound-up attack will land, red/blue = attacks.
  drawDebug(now) {
    const g = this.dbg; g.clear();
    this.zones = this.zones.filter(k => k.until > now);
    if (!this.debug) return;
    const box = (x, y, w, h, color) => { g.lineStyle(2, color, 1); g.strokeRect(x, y, w, h); };
    for (const p of this.players) box(p.x - 16, p.y - B.hitDepth, 32, B.hitDepth * 2, 0x55ff88);
    for (const o of this.foes) if (!o.dead) {
      box(o.x - o.half, o.y - 6, o.half * 2, 12, 0xffe066);
      const k = o.reach();
      if (k && o.state === 'windup') box(k.x, k.y, k.w, k.h, 0xff9944);
    }
    for (const k of this.zones) { g.fillStyle(k.color, 0.35); g.fillRect(k.x, k.y, k.w, k.h); }
  }

  // ---------- frame ----------
  update() {
    const now = this.time.now;
    this.dt = Math.min(0.05, (now - (this.lastNow || now)) / 1000); this.lastNow = now;
    const dt = this.dt;
    const restart = consume('KeyR') | held(9, 1200) | consume('Restart');      // hold Start; a tap does nothing
    if (restart && state.party.length) { resetState(); this.scene.restart({ room: AREAS[run.area].streets[0] }); return; }
    if (consume('Backquote')) this.debug = !this.debug;
    if (this.leaving) return;

    for (const src in SOURCES) {
      if (this.joined[src]) continue;
      const r = SOURCES[src]();
      if (!r) continue;
      // On the title screen left and right choose the area to start in; any button joins.
      if (!state.party.length && r.x && r.x !== (run.stick[src] || 0) && AREAS.length > 1) {
        run.stick[src] = r.x;                              // remembered across the restart, so one push moves one area
        run.area = (run.area + r.x + AREAS.length) % AREAS.length; sfx('areaPick');
        this.scene.restart({ room: AREAS[run.area].streets[0] }); return;
      }
      run.stick[src] = r.x || 0;
      if (r.jump || r.attack || r.special || r.tool || r.swap) this.join(src);
    }
    if (!this.players.length) return;

    for (const p of this.players) this.updatePlayer(p, now, dt);
    for (const o of this.foes) o.update(now, dt);
    this.foes = this.foes.filter(o => !o.gone);
    this.updateShots(now, dt); this.updateRings(now, dt);
    this.updatePickups(now);

    const mid = this.players.reduce((a, p) => a + p.x, 0) / this.players.length;
    this.updateFlow(now, mid);
    this.drawDebug(now);

    this.viewX += (Phaser.Math.Clamp(mid - W / 2, 0, this.map.w - W) - this.viewX) * Math.min(1, 5 * dt);
    aim(this.cameras.main, this.viewX);

    if (now > this.hitUntil) this.hitCount = 0;
    this.ui.setCombo(this.hitCount);
    const boss = this.foes.find(o => o.t.boss && !o.dead);
    this.ui.setBoss(boss ? { name: boss.t.name, hp: boss.hp / boss.maxHp, raging: boss.raging } : null);
    this.ui.setPlayers(this.players.map(p => {
      const sp = p.entry.special, tool = p.entry.tool;
      return {
        n: p.n, hp: p.downUntil ? 0 : p.hp, max: maxHp(p), down: !!p.downUntil,
        status: (p.shield ? POWERUPS.bell.icon : '') + (now < p.frenzyUntil ? POWERUPS.catnip.icon : ''),
        special: { icon: SPECIALS[sp].icon, image: SPECIALS[sp].image, charge: Phaser.Math.Clamp(1 - (p.nextSpecial - now) / this.spec(p, sp).cooldown, 0, 1) },
        tool: tool ? { icon: TOOLS[tool].icon, left: this.toolLeft(p) } : null
      };
    }));
    const n = this.map.waves.length;
    this.ui.score.setText(this.map.title + (this.cleared ? '   clear' : '   wave ' + Math.min(this.waveIdx, n) + '/' + n) + '   Sent packing: ' + state.beaten);
  }
}
