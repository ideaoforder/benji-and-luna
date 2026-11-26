import { W, RES, PALETTES, PALETTE_ORDER, CATS, MOVES, PLAYER_COLORS, SWAP_ORDER, JOIN_ORDER, OFFICERS, SPECIALS, TOOLS, POWERUPS, DROPS, PICKUP_LIFE, HIT_CHAIN_MS, BRAWL as B, aim, hourly, DIFFICULTY, DIFFICULTY_ORDER, CRITTERS, PAWS, SHOPS, START_TOOLS, START_SPECIALS } from '../config.js';
import { save, addPaws, pawsOf, own, level, persist, CAMPAIGNS, currentCampaign, switchCampaign, eraseCampaign } from '../save.js';
import { Shop } from './shop.js';
import { SOURCES, consume, held } from '../input.js';
import { sfx, music, stopMusic, sections } from '../sound.js';
import { state, resetState, run, setDifficulty, setMode, kit, TITLE_MENU } from '../state.js';
import { storyOnce, bark, speaker } from '../dialog.js';
import { MODES, MODE_ORDER, shared, maxHpOf, storedHp, storeHp, nextCat, canTagIn, benchInfo } from '../team.js';
import { frame, sheet, skin } from '../sprites.js';
import { parseMap, AREAS, areaOf, SIDE_ROOMS } from '../maps.js';
import { Challenge } from './challenge.js';
import { Street } from './street.js';
import { Foe } from './foe.js';
import { SCALE, has, iconFrame, playFrames, burstFx } from '../fx.js';

// The game: streets you walk around on in depth, joined by doors.
//
// Nothing here uses the physics engine. Every character has x (along the street), y (depth: the on-screen
// y of its feet) and z (height above the floor). It is drawn at (x, y - z) with its feet as the anchor,
// casts a shadow at (x, y), and is drawn in depth order. Combos, specials, tools, pick-ups and the
// officer types all come from the same data in config.js as the platformer.

const FONT = 'system-ui, sans-serif', PIVOT = 0.36;
const PICK_ORDER = ['benji', 'luna', 'luca', 'cricket', 'simon'], BENCH_HEAL = 4000, WALL_HP = 6;     // heavy wall: a power lunge does 3, a fire yarn 2, Benji all of it   // the picker's order; ms per heart on the bench       // spin pivot: this far up the frame from the feet
const maxHp = p => maxHpOf(p.entry, p.cat.key);

export class Brawl extends Phaser.Scene {
  constructor() { super('brawl'); }

  init(data) { this.roomKey = (data && data.room) || AREAS[run.area].streets[0]; this.fromDoor = (data && data.door) || null; this.atBed = !!(data && data.bed); }

  // Fetch this street's backdrop pictures, and let go of the last street's: they are big, and an iPad has little room.
  preload() {
    const scenery = this.cache.json.get('scenery') || {}, mine = 'bg-' + this.roomKey + '-';
    for (const key of this.textures.getTextureKeys()) if (key.startsWith('bg-') && !key.startsWith(mine)) this.textures.remove(key);
    for (const key in scenery) if (key.startsWith(mine) && !this.textures.exists(key)) this.load.image(key, hourly('assets/scenery/' + scenery[key].file));
    // A lift going down (the Clockwork Shaft) has a painted wall that scrolls past and the lift in front (tools/import_airship.py).
    const raw = this.cache.json.get('street-' + this.roomKey), lift = raw && (raw.properties || []).find(q => q.name === 'lift');
    if (lift && lift.value === 'down') for (const [k, f] of [['lift-shaft', 'shaft.jpg'], ['lift-front', 'front.png']])
      if (!this.textures.exists(k)) this.load.image(k, hourly('assets/lift/' + f));
  }

  create() {
    const map = this.map = parseMap(this.cache.json.get('street-' + this.roomKey));
    this.ui = this.scene.get('hud'); this.viewX = 0;
    aim(this.cameras.main, 0);
    this.street = new Street(this, this.roomKey, map);

    this.players = []; this.foes = []; this.shots = []; this.pickups = []; this.joined = {};
    this.cleared = !!state.cleared[this.roomKey] || !!map.shop;      // a shop has no waves
    this.waveIdx = 0; this.nextWaveAt = 0; this.spawned = 0; this.leaving = false;
    this.lastNow = 0; this.hitCount = 0; this.hitUntil = 0; this.lastHint = 0;
    this.rings = []; this.debug = false; this.zones = [];          // recent attack areas, kept briefly for the hitbox view
    this.dbg = this.add.graphics().setDepth(940);
    for (const k of this.street.pickups) if (!state.flags[k.flag]) this.spawnPickup(k.kind, k.x, k.y, false, k.flag);

    this.ui.showBanner('', 1); this.ui.setBoss(null);
    if (state.party.length && !map.shop && !map.challenge) {                // walking into a new area makes it the one to restart in
      run.area = areaOf(this.roomKey);
      if (save.area !== run.area) { save.area = run.area; persist(); }       // and the one this campaign carries on from
    }
    this.ui.showTitle(!state.party.length);
    if (state.party.length) this.areaCheckpoint();
    this.wiping = false;
    if (map.shop) music('shop', { ifExists: true });                // no shop tune yet: the area's carries on
    else if (map.challenge) { /* the area's tune carries on */ }
    else music(state.party.length ? AREAS[areaOf(this.roomKey)].key : 'title');     // a track already playing carries on
    this.shop = map.shop && SHOPS[map.shop] ? new Shop(this, SHOPS[map.shop]) : null;
    this.challenge = map.challenge ? new Challenge(this, map.challenge) : map.props.lift ? new Challenge(this, 'lift', { down: map.props.lift === 'down', main: true }) : null;
    this.pickers = {};
    if (state.party.length) {
      state.party.forEach(e => e.team.length < 2 ? this.startPicker(e) : this.addPlayer(e));
      this.viewX = Phaser.Math.Clamp((this.players[0] ? this.players[0].x : W / 2) - W / 2, 0, map.w - W);
      aim(this.cameras.main, this.viewX);
      this.cameras.main.fadeIn(220);
      this.ui.showBanner(map.title, 1400);
    }
    if (state.party.length && !map.shop && !map.challenge) this.time.delayedCall(700, () => this.introduce());
    window.__scene = this;
  }

  // ---------- dialog (story/dialog.txt, src/dialog.js) ----------
  talkers() { return this.players.filter(p => !p.downUntil).map(p => ({ cat: p.cat.key, n: p.n })); }
  // A story section, once per campaign: the game waits for it.
  tell(key, done) { this.ui.story(storyOnce(key), () => this.talkers(), done); }
  // What to say on arriving in a street: the area's opening at its first street, the lift's on the lift.
  introduce() {
    if (!this.players.length || this.leaving) return;
    if (this.map.props.lift) this.tell('lift ' + this.roomKey);
    else if (AREAS[areaOf(this.roomKey)].streets[0] === this.roomKey) this.tell('area ' + AREAS[areaOf(this.roomKey)].key);
  }
  // A bark: one line from [bark key], in a bubble over whoever says it (a cat on screen) or at x, y in the street.
  // by: a particular cat says it (the one tagging in), whoever the line names.
  say(key, x, y, fallback, by) {
    const line = bark(key) || (fallback && { who: '', text: fallback });
    if (!line) return;
    const who = line.who ? speaker(line.who, () => this.talkers()) : {}, p = by || (who.cat && this.players.find(q => q.cat.key === who.cat));
    const sx = (p ? p.x : x) - this.viewX, sy = p ? p.y - p.z - p.sprite.displayHeight - 14 : y;
    this.ui.bubble(line.text, sx, sy);
  }

  move(ent, dx, dy) { this.street.move(ent, dx, dy); }

  // ---------- cats ----------
  // Joining: a player first picks two cats (a tag team, Double Dragon Gaiden style), then steps in. Swap flips
  // between the two; each has its own hearts, the one waiting on the bench slowly gets them back, and when the
  // active one is netted the partner tags in. Only when both are down does the player sit out.
  join(src) {
    if (state.party.length >= 4 || this.joined[src]) return;
    const entry = { src, team: [], catKey: null, hps: {}, shield: false, tool: START_TOOLS[0] || null, special: START_SPECIALS[0],
                    mode: MODES[run.mode] ? run.mode : 'A', colour: null };
    state.party.push(entry);
    entry.colour = PLAYER_COLORS[(state.party.length - 1) % 4].name;      // mode B players pick their own in the picker
    if (state.party.length === 1) { this.ui.showTitle(false); music(AREAS[areaOf(this.roomKey)].key); this.areaCheckpoint(); }
    sfx('join');
    this.startPicker(entry);
  }

  // The picker. Mode A: pick two cats. Mode B: pick one to five (jump when done), then a colour.
  startPicker(entry) {
    this.joined[entry.src] = true;
    const slot = state.party.indexOf(entry), raw = SOURCES[entry.src] ? SOURCES[entry.src]() : null;
    // Suggest the cat this slot used to start as, and after the first pick the next one along.
    entry.team = entry.team || [];
    this.pickers[entry.src] = { entry, slot, stage: 'cats', idx: Math.max(0, PICK_ORDER.indexOf(JOIN_ORDER[slot % JOIN_ORDER.length])), prev: raw || {},
                                colourIdx: Math.max(0, PALETTE_ORDER.indexOf(entry.colour)) };
    const k = this.pickers[entry.src];
    while (entry.team.includes(PICK_ORDER[k.idx]) && entry.team.length < PICK_ORDER.length) k.idx = (k.idx + 1) % PICK_ORDER.length;      // never offer one already picked
    this.drawPicker(entry.src);
  }

  drawPicker(src) {
    const k = this.pickers[src], M = MODES[k.entry.mode];
    this.ui.showPicker(k.slot, { key: k.stage === 'colour' ? k.entry.team[0] : PICK_ORDER[k.idx], chosen: k.entry.team, slot: k.slot,
      mode: k.entry.mode, min: M.min, max: M.max, stage: k.stage, colour: k.stage === 'colour' ? PALETTE_ORDER[k.colourIdx] : k.entry.colour });
  }

  updatePickers() {
    for (const src in this.pickers) {
      const k = this.pickers[src], raw = SOURCES[src] ? SOURCES[src]() : null, e = k.entry, M = MODES[e.mode];
      if (!raw) continue;
      const prev = k.prev || {}; k.prev = raw;
      const edge = b => raw[b] && !prev[b], turn = raw.x && raw.x !== (prev.x || 0);
      if (k.stage === 'colour') {                        // mode B: left/right through the palettes, the first cat wearing each
        if (turn) { k.colourIdx = (k.colourIdx + raw.x + PALETTE_ORDER.length) % PALETTE_ORDER.length; sfx('cycle'); this.drawPicker(src); }
        if (edge('special')) { k.stage = 'cats'; e.team.pop(); sfx('nope'); this.drawPicker(src); }
        else if (edge('attack') || edge('jump')) { e.colour = PALETTE_ORDER[k.colourIdx]; sfx('swap'); this.pickerDone(src, k, raw); }
        continue;
      }
      if (turn) {
        do k.idx = (k.idx + raw.x + PICK_ORDER.length) % PICK_ORDER.length; while (e.team.includes(PICK_ORDER[k.idx]));
        sfx('cycle'); this.drawPicker(src);
      }
      if (edge('special') && e.team.length) { e.team.pop(); sfx('nope'); this.drawPicker(src); }
      const done = () => { if (e.mode === 'B') { k.stage = 'colour'; this.drawPicker(src); } else this.pickerDone(src, k, raw); };
      // Mode B: jump says "that's my crew" once there is at least one.
      if (e.mode === 'B' && edge('jump') && e.team.length >= M.min) { sfx('swap'); done(); }
      else if (edge('attack') || (e.mode === 'A' && edge('jump'))) {
        e.team.push(PICK_ORDER[k.idx]); sfx('swap');
        if (e.team.length < M.max) {
          do k.idx = (k.idx + 1) % PICK_ORDER.length; while (e.team.includes(PICK_ORDER[k.idx]));
          this.drawPicker(src);
        } else done();
      }
    }
  }

  // Picked: in they come.
  pickerDone(src, k, raw) {
    delete this.pickers[src]; this.ui.showPicker(k.slot, null);
    k.entry.catKey = k.entry.team[0];
    this.addPlayer(k.entry);
    this.players[this.players.length - 1].prev = raw;          // the confirming press does not also attack
    if (this.players.length === 1) { this.ui.showBanner(this.map.title, 1400); this.time.delayedCall(900, () => this.introduce()); }
    else {                                         // joining a game already going: a moment to get their bearings
      const q = this.players[this.players.length - 1];
      q.invulnUntil = this.time.now + 2500; this.puff(q.x, q.y); this.popText(q.x, q.y - 110, 'P' + (q.n + 1) + ' joins!');
    }
  }

  addPlayer(entry) {
    this.joined[entry.src] = true;
    const n = state.party.indexOf(entry);              // the player number follows the party slot
    const door = this.street.doors.find(d => d.name === this.fromDoor), st = this.street.start;
    let x = st.x + n * 60, face = 1;                     // arriving through a door: just inside it, facing in
    let y = Phaser.Math.Clamp(st.y - 40 + n * 36, B.floorTop + 10, B.floorBottom - 10);
    if (door && door.back) { x = door.x + door.w / 2 + (n - 0.5) * 44; y = B.floorTop + 26 + n * 8; }       // stepping out of a doorway in the back wall
    else if (door) { x = door.left ? door.x + door.w + 60 + n * 50 : door.x - 60 - n * 50; face = door.left ? 1 : -1; }
    else if (this.players.length) x = this.players[0].x + (this.players.length) * 40;       // late joiners appear beside the others
    const cp = run.checkpoint;
    if (this.atBed && cp && cp.x !== null) { x = cp.x + (n - 1.5) * 46; y = Phaser.Math.Clamp(cp.y - 20 + n * 16, B.floorTop + 10, B.floorBottom - 10); face = 1; }   // back from being caught: around the bed
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
    this.players.push(p);
  }

  // Bring `key` in. Mode A: each cat keeps its own hearts; mode B: they share them (src/team.js).
  setCat(p, key) {
    const c = CATS[key];
    if (p.cat) storeHp(p.entry, p.cat.key, p.hp);
    p.cat = c; p.entry.catKey = key;
    p.hp = storedHp(p.entry, key);
    p.skin = skin(this, key, p.entry.colour);                             // same sheet layout, this player's colour
    p.sprite.setTexture(p.skin, 0).setScale(c.scale); p.sprite.anims.play(p.skin + '-idle', true);
    p.shadow.setSize(c.body[0] + 10, 14);
  }

  partner(p) { return nextCat(p.entry, p.cat.key); }
  benchHp(p) { return shared(p.entry) ? p.hp : storedHp(p.entry, this.partner(p)); }
  // Mode A: the benched cat gets a heart back every BENCH_HEAL ms. (Mode B shares hearts: nothing on the bench.)
  restBench(p, now) {
    if (shared(p.entry)) return;
    const k = this.partner(p), max = maxHpOf(p.entry, k), hp = this.benchHp(p);
    if (hp >= max) { p.restAt = now + BENCH_HEAL; return; }
    if (!p.restAt) p.restAt = now + BENCH_HEAL;
    if (now > p.restAt) { storeHp(p.entry, k, Math.min(max, hp + 1)); p.restAt = now + BENCH_HEAL; }
  }

  pouncing(p) { return !!p.tumble && p.tumble.kind === 'pounce'; }
  toolLeft(p) { const k = p.entry.tool; return k ? (p.usesLeft[k] ?? TOOLS[k].uses + (p.cat.extraUses || 0) + level('pouch')) : 0; }
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
    let raw = SOURCES[p.src]() || { x: 0, y: 0 };
    if (this.shop) raw = this.shop.input(p, raw, now);              // a cat at the counter only works the menu
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
        if (pressed('cycleTool')) this.cycle(p, 'tool', kit(p.entry, 'tools'), TOOLS);
        if (pressed('cycleSpecial')) this.cycle(p, 'special', kit(p.entry, 'specials'), SPECIALS);
        if (pressed('swap') && onGround) {
          const next = this.partner(p);
          if (next === p.cat.key) { /* a crew of one */ }
          else if (!CATS[next].small && this.street.inPen(p.x, p.y, 14)) { this.popText(p.x, p.y - 90, 'No room in here!'); sfx('nope'); }   // a bigger cat would be stuck
          else if (this.benchHp(p) <= 0) { this.popText(p.x, p.y - 90, CATS[next].name + ' needs a rest'); sfx('nope'); }
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
    const fx = this.slash(p.x + p.face * reach * 0.55, p.y - p.z - tall * 0.4, M.time).setTint(lunge ? 0xffe066 : 0xffffff)
      .setFlipX(p.face > 0).setDisplaySize(reach * 0.9, tall).setDepth(p.y + 1);
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
    const fx = this.slash(p.x + p.face * reach * 0.55, p.y - p.z - tall * 0.45, last ? 240 : 170)
      .setTint(last ? 0xffffff : c.slash).setFlipX(p.face > 0).setFlipY(i % 2 === 1).setDisplaySize(reach * 0.9, tall * 1.15).setDepth(p.y + 1);
    this.tweens.add({ targets: fx, alpha: 0, x: fx.x + p.face * (last ? 12 : 6), duration: last ? 240 : 170, onComplete: () => fx.destroy() });
    sfx(last ? 'clawFinish' : 'claw', { rate: c.pitch, step: i, cat: c.key });
    const heavy = c.interrupts || !!step.interrupts, depth = B.hitDepth + (last ? 8 : 0);
    this.zone(p.x, p.y, p.face, reach, depth, 0xff4444, 170);
    if (p.z < 70) for (const o of this.foes)
      if (!o.dead && o.z < 80 && this.ahead(p, o, reach, depth))
        o.hurt(p, now, { dmg: step.dmg * (frenzy ? nip.dmgMul : 1), knock: step.knock, up: step.up, stun: step.stun, interrupts: heavy, heavy });
    for (const b of this.shots)                           // bat a tennis ball back
      if (!b.friendly && b.reflect && this.ahead(p, b, reach, 22)) {
        b.vx = p.face * Math.abs(b.vx) * 1.3; b.friendly = true; b.owner = p; b.y = p.y;
        if (b.obj.setFillStyle) b.obj.setFillStyle(c.slash, 1); else b.obj.setTint(c.slash).setFlipX(b.vx < 0);
        b.until = now + 2000; sfx('batBack');
      }
    this.hitScenery(p, reach, now);
  }

  // The claw-slash picture: the drawn three-frame sweep if it exists, else the plain arc. The drawing bulges to the
  // LEFT, so it is flipped when the cat faces right: the crest leads, and is placed to end at the claw's reach.
  slash(x, y, ms) {
    if (!has(this, 'fx-slash')) return this.add.image(x, y, 'slash');
    const s = this.add.sprite(x, y, 'fx-slash', 0); playFrames(this, s, 0, 2, ms); return s;
  }

  // Splinters flying from a broken crate.
  splinters(x, y, depth) {
    if (!has(this, 'fx-crate')) return;
    for (let i = 0; i < 6; i++) {
      const s = this.add.sprite(x, y, 'fx-crate', i % 4).setScale(SCALE * (0.6 + Math.random() * 0.4)).setDepth(depth + 1);
      const dx = (Math.random() - 0.5) * 220, up = 60 + Math.random() * 70, ms = 520 + Math.random() * 200;
      this.tweens.add({ targets: s, x: x + dx, angle: (Math.random() - 0.5) * 720, duration: ms });
      this.tweens.add({ targets: s, y: y - up, duration: ms * 0.4, ease: 'Quad.Out', yoyo: true, hold: 0,
        onComplete: () => this.tweens.add({ targets: s, alpha: 0, duration: 200, onComplete: () => s.destroy() }) });
    }
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
        this.street.smash(o); sfx('crateBreak'); this.splinters(o.x + o.w / 2, o.y + o.d - o.h / 2, o.y + o.d);
        if (Math.random() < 0.3) this.spawnPickup(Math.random() < 0.25 ? 'stinky' : 'fish', o.x + o.w / 2, o.y + o.d + 4, true);    // sometimes there was something in it, not always nice
        if (Math.random() < PAWS.crateChance) this.spillPaws(Phaser.Math.Between(...PAWS.crate), o.x + o.w / 2, o.y + o.d + 4);
      } else if (p.cat.interrupts) this.chipWall(o, now, 99);                    // Benji: one smash
      else if (power) this.chipWall(o, now, 3);                                   // anyone's power lunge: two do it
      else if (now > this.lastHint) { this.popText(o.x + o.w / 2, o.y - o.h + 30, 'Too heavy! Try a power lunge'); this.lastHint = now + 1400; sfx('nope'); }
    }
    for (const sw of this.street.switches) if (!sw.on && Math.abs(sw.y - p.y) < 22 && (sw.x - p.x) * p.face > -10 && (sw.x - p.x) * p.face < reach) this.flip(sw);
  }

  // A heavy-crate wall takes WALL_HP of chipping before it goes.
  chipWall(o, now, dmg) {
    if (now < (o.hitAt || 0)) return;
    o.hitAt = now + 150; o.whp = (o.whp ?? WALL_HP) - dmg;
    if (o.whp > 0) {
      this.cameras.main.shake(70, 0.005); sfx('crateHit');
      o.parts.forEach(r => this.tweens.add({ targets: r, x: r.x + 4, duration: 40, yoyo: true, repeat: 2 }));
      this.popText(o.x + o.w / 2, o.y - o.h + 30, o.whp <= 1 ? 'Almost!' : 'Crack!');
      return;
    }
    this.street.smash(o); this.cameras.main.shake(120, 0.008); sfx('crateBreak'); this.splinters(o.x + o.w / 2, o.y + o.d - 60, o.y + o.d);
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
    p.nextSpecial = now + this.cooldown(p, kind);
    if (kind === 'pounce') this.startTumble(p, 'pounce', now); else this.meow(p, now);
  }
  // A special's numbers: this cat's own version if it has one (meow, pounce), otherwise the shared one in SPECIALS.
  spec(p, kind) { return p.cat[kind] || SPECIALS[kind]; }
  maxHp(p) { return maxHp(p); }
  cooldown(p, kind) { return this.spec(p, kind).cooldown * (1 - 0.2 * level('focus')); }      // Focus training at the dojo

  meow(p, now) {
    const c = p.cat, m = c.meow;
    p.attackUntil = now + 220; p.attackRow = 'meow'; p.attackIdx = 0;
    for (let i = 0; i < 3; i++) {                          // three rings travelling outward
      if (has(this, 'fx-meow')) {                          // drawn rings, growing as they go
        const ring = this.add.sprite(p.x + p.face * 30, p.y - p.z - 34, 'fx-meow', 0).setTint(c.slash).setDepth(p.y + 1).setVisible(false);
        ring.setScale(m.h * 1.1 / ring.height);
        this.time.delayedCall(i * 70, () => { ring.setVisible(true); playFrames(this, ring, 0, 2, 380); });
        this.tweens.add({ targets: ring, x: p.x + p.face * (m.w + 10), alpha: 0, duration: 380, delay: i * 70, onComplete: () => ring.destroy() });
        continue;
      }
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
      const obj = has(this, 'fx-fireball') ? this.add.sprite(0, 0, 'fx-fireball').play('fx-fireball').setScale(SCALE * 1.1).setFlipX(p.face < 0)
        : this.add.circle(0, 0, 10, 0xff8a3d).setStrokeStyle(3, 0xffe066);
      this.shots.push({ obj, x: p.x + p.face * 30, y: p.y, z: p.z + 30, vx: p.face * T.speed, half: 11, friendly: true, owner: p, until: now + 1500,
        hit: { dmg: T.dmg, knock: 260, up: 150, stun: 350, interrupts: true, heavy: true } });
      sfx('fireYarn');
    } else if (key === 'sticky') {                       // lobbed; bursts where it lands
      const obj = has(this, 'fx-sticky') ? this.add.sprite(0, 0, 'fx-sticky').play('fx-sticky-fly').setScale(SCALE * 0.8).setFlipX(p.face < 0)
        : this.add.circle(0, 0, 9, 0x9fd8ff).setStrokeStyle(3, 0xffffff);
      this.shots.push({ obj, x: p.x + p.face * 30, y: p.y, z: p.z + 30, vx: p.face * T.vx, vz: -T.vy, half: 10, friendly: true, owner: p, until: now + 3000,
        burst: { radius: T.radius, freeze: T.freeze } });
      sfx('stickyYarn');
    } else if (key === 'heal') {                         // heals every cat nearby and frees netted ones
      if (has(this, 'fx-heal')) burstFx(this, 'fx-heal', p.x, p.y - 40, T.radius * 1.6, p.y + 1, 0, 3, 560); else this.pulse(p.x, p.y - 20, T.radius, 0xff8fc8, p.y);
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
    this.outOfHearts(p, now);
  }

  // A cat ate the stinky fish: hearts lost, no knockback. Luca (stinky: 0) does not mind.
  sicken(p, now) {
    const u = POWERUPS.stinky, n = 'stinky' in p.cat ? p.cat.stinky : u.dmg;
    for (let i = 0; i < 5; i++) {                        // a green whiff either way
      const puff = this.add.ellipse(p.x + (i - 2) * 14, p.y - p.z - 40, 22, 16, 0x9be36a, 0.55).setDepth(p.y + 2);
      this.tweens.add({ targets: puff, y: puff.y - 40, scale: 1.6, alpha: 0, duration: 600 + i * 60, onComplete: () => puff.destroy() });
    }
    if (!n) { this.popText(p.x, p.y - 100, p.cat.name + ': Yum!'); sfx('pickup'); return; }
    this.popText(p.x, p.y - 100, 'Yuck! -' + n); sfx('fishBurst'); sfx('catHurt');
    p.hp = Math.max(0, p.hp - n); p.combo = 0; p.hurtUntil = now + 300; p.invulnUntil = Math.max(p.invulnUntil, now + 800);
    p.sprite.setTint(0xa8e070); this.time.delayedCall(500, () => { if (!p.frenzyUntil || this.time.now > p.frenzyUntil) p.sprite.clearTint(); });
    this.outOfHearts(p, now);
  }

  // Feather toy: every enemy on screen floats up for a moment, and a big feather dances across the sky.
  levitate(now) {
    const u = POWERUPS.feather, left = this.viewX - 40, right = this.viewX + W + 40;
    for (const o of this.foes) if (!o.dead && o.x > left && o.x < right) o.float(now, u.time, u.height);
    const f = has(this, 'feather') ? this.add.image(this.viewX + 120, B.floorTop - 120, 'feather').setScale(2.4) : this.add.text(this.viewX + 120, B.floorTop - 120, u.icon, { fontSize: '60px' });
    f.setDepth(950);
    this.tweens.add({ targets: f, x: this.viewX + W - 120, duration: u.time / 2, yoyo: true, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: f, angle: { from: -25, to: 25 }, y: f.y + 30, duration: 320, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: f, alpha: 0, delay: u.time - 300, duration: 300, onComplete: () => { this.tweens.killTweensOf(f); f.destroy(); } });
    sfx('feather');
  }

  // ---------- checkpoints ----------
  // Where to go back to, with the progress made up to then: rooms cleared and pick-ups taken since are undone.
  setCheckpoint(x, y) {
    run.checkpoint = { room: this.roomKey, x, y, cleared: { ...state.cleared }, flags: { ...state.flags }, beaten: state.beaten, bonusHp: state.bonusHp };
  }
  // Starting an area (or a new game) without a bed yet: being caught goes back to the start of the area.
  areaCheckpoint() {
    if (this.map.shop || this.map.challenge) return;
    const cp = run.checkpoint;
    if (!cp || areaOf(cp.room) !== areaOf(this.roomKey)) this.setCheckpoint(null, null);
  }
  // A cat steps onto the bed: a nap. Everyone is back to full hearts, and this is where being caught comes back to.
  nap(now) {
    const bed = this.street.bed;
    if (!bed || this.wiping) return;
    const p = this.players.find(q => !q.downUntil && Math.abs(q.x - bed.x) < 46 && Math.abs(q.y - bed.y) < 34 && q.z < 20);
    if (!p) return;
    const cp = run.checkpoint, here = cp && cp.room === this.roomKey && cp.x === bed.x;
    if (here && now < (this.napAgain || 0)) return;
    this.napAgain = now + 8000;
    for (const q of this.players) if (!q.downUntil) q.hp = Math.max(q.hp, maxHp(q));
    if (!here) { this.setCheckpoint(bed.x, bed.y); this.ui.showBanner('Cat nap!\nIf everyone is caught, you come back here', 2400); sfx('nap'); this.say('nap', bed.x, bed.y - 100); }
    for (let i = 0; i < 3; i++) this.time.delayedCall(i * 260, () => this.popText(bed.x + 20 + i * 12, bed.y - 50 - i * 14, 'z'));
    if (bed.obj) { this.tweens.killTweensOf(bed.obj); bed.obj.setScale(0.75); this.tweens.add({ targets: bed.obj, scaleY: 0.68, duration: 160, yoyo: true }); }
  }
  // Every cat netted at once: caught! Back to the checkpoint, with everything since then undone.
  caught() {
    const cp = run.checkpoint;
    if (this.wiping || !cp) return;
    this.wiping = true; this.leaving = true;
    sfx('caught'); stopMusic(0.6); this.say('caught', W / 2 + this.viewX, 300);
    this.ui.showBanner('Caught!\n' + (cp.x !== null ? 'Back to the cat bed' : 'Back to the start of ' + AREAS[areaOf(cp.room)].name), 2200);
    this.time.delayedCall(2200, () => {
      this.cameras.main.fadeOut(350);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        state.cleared = { ...cp.cleared }; state.flags = { ...cp.flags }; state.beaten = cp.beaten; state.bonusHp = cp.bonusHp;
        for (const e of state.party) { e.hps = {}; e.shield = false; if (e.team.length) e.catKey = e.team.includes(e.catKey) ? e.catKey : e.team[0]; }
        this.scene.restart({ room: cp.room, bed: cp.x !== null });
      });
    });
  }

  // Out of hearts: the partner tags in if it has any left, otherwise the cat is netted for a while.
  outOfHearts(p, now) {
    if (p.hp <= 0 && canTagIn(p.entry, p.cat.key) && !(!CATS[this.partner(p)].small && this.street.inPen(p.x, p.y, 14))) {      // tag!
      const out = p.cat.name; this.setCat(p, this.partner(p)); p.invulnUntil = now + 1400; p.hurtUntil = 0; p.kvx = 0;
      this.say('tag', p.x, p.y - 120, null, p);
      this.puff(p.x, p.y); this.popText(p.x, p.y - 100, 'Tag! ' + out + ' is out'); sfx('swap'); sfx('catNetted');
    } else if (p.hp <= 0) { sfx('catNetted'); p.downUntil = now + 3000; p.frenzyUntil = 0; p.sprite.clearTint(); }
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
    const kinds = !OFFICERS[types[0]].boss && (CRITTERS[this.map.theme] || CRITTERS[AREAS[areaOf(this.roomKey)].key]);
    if (kinds) types.push(kinds[Math.floor(Math.random() * kinds.length)]);
    const mid = this.players.reduce((a, p) => a + p.x, 0) / this.players.length;
    types.forEach((type, i) => this.foes.push(this.walkIn(type, i % 2 ? -1 : 1, i, mid)));
    const first = this.foes[this.foes.length - types.length];
    if (first && !first.t.boss && Math.random() < 0.35) this.time.delayedCall(900, () => { if (!first.dead) this.say('foe', first.x, first.y - first.height - 20 - first.z); });
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
    if (o.t.boss) this.time.delayedCall(900, () => this.tell('boss ' + o.t.name.replace(/^The /, '').toLowerCase()));
    if (o.t.boss) {                                        // the area's own boss mix if there is one, else the shared boss tune
      const own = AREAS[areaOf(this.roomKey)].key + '-boss';
      if (sections(own).length) music(own, { sync: true }); else music('boss', { ifExists: true });
    }
    const D = DIFFICULTY[run.difficulty] || DIFFICULTY.normal;
    if (o.t.boss) o.hp = o.maxHp = Math.round(o.hp * D.hp * (1 + o.t.boss.perPlayer * (this.players.length - 1)));
    else o.hp = o.maxHp = Math.max(1, Math.round(o.hp * this.map.tough * D.hp));
    if (this.challenge) this.challenge.dropIn(o);                  // a lift: they come down from above
    return o;
  }

  // Boss stomp: a ring spreads across the floor from where he lands. Jump it.
  shockwave(x, y, radius) {
    const ring = this.add.ellipse(x, y, 10, 5).setStrokeStyle(6, 0xfff2a8, 0.95).setDepth(B.floorTop - 1); ring.isFilled = false;
    const waves = has(this, 'fx-wave') ? [1, -1].map(d => this.add.sprite(x, y, 'fx-wave').play('fx-wave').setScale(SCALE * 1.4).setFlipX(d < 0).setOrigin(0.5, 1).setDepth(y + 1)) : [];
    this.rings.push({ x, y, r: 20, max: radius, ring, waves, hit: new Set() });
  }
  updateRings(now, dt) {
    for (const k of this.rings) {
      k.r += 520 * dt;
      k.ring.setSize(k.r * 2, k.r).setPosition(k.x, k.y).setAlpha(1 - k.r / k.max * 0.7);
      k.waves.forEach((w, i) => w.setPosition(k.x + (i ? -1 : 1) * k.r, k.y + 6).setAlpha(1 - k.r / k.max * 0.6));
      for (const p of this.players) {
        const d = Math.hypot(p.x - k.x, (p.y - k.y) * 2);              // the floor is drawn half as deep as it is wide
        if (!k.hit.has(p) && Math.abs(d - k.r) < 18 && p.z < 18) { k.hit.add(p); this.hurtPlayer(p, Math.sign(p.x - k.x) || 1, now); }
      }
      if (k.r >= k.max) { k.ring.destroy(); k.waves.forEach(w => w.destroy()); k.gone = true; }
    }
    this.rings = this.rings.filter(k => !k.gone);
  }

  // Boss whistle: backup walks in from both sides.
  summon(types) {
    const mid = this.players.reduce((a, p) => a + p.x, 0) / Math.max(1, this.players.length);
    types.forEach((type, i) => this.foes.push(this.walkIn(type, i % 2 ? -1 : 1, i, mid)));
  }

  // A hostile shot travels along the street at a fixed depth y and height z. kind: 'ball', 'net', 'spray' or 'ice'.
  spawnShot(kind, x, y, z, vx) {
    if (kind === 'spray' || kind === 'ice') {             // the botanist's short cloud, the cryo tech's freeze shot: not batted back
      const spray = kind === 'spray';
      const obj = spray ? this.add.ellipse(0, 0, 34, 22, 0x9be36a, 0.55).setStrokeStyle(2, 0xd8f7b8, 0.8)
        : this.add.circle(0, 0, 9, 0xbfe9ff).setStrokeStyle(3, 0xffffff);
      if (spray) this.tweens.add({ targets: obj, scaleX: 1.8, scaleY: 1.5, alpha: 0.25, duration: 1100 });
      this.shots.push({ obj, x, y, z, vx: spray ? vx * 0.8 : vx, half: spray ? 18 : 10, reflect: false, friendly: false, owner: null,
                        until: this.time.now + (spray ? 1100 : 2400) });
      return;
    }
    const net = kind === 'net';
    const sheet = net ? 'fx-net' : 'fx-ball';
    const obj = has(this, sheet) ? this.add.sprite(0, 0, sheet).play(sheet).setScale(SCALE * (net ? 1 : 1.1))
      : net ? this.add.circle(0, 0, 13, 0xffffff, 0.3).setStrokeStyle(3, 0xf5f5fa) : this.add.circle(0, 0, 8, 0xd8f04a).setStrokeStyle(2, 0x1c1630);
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
        // Yarn flies through the bars of a nook and flips the switch inside, so a team without Luna is never stuck.
        const sw = this.street.switches.find(s => !s.on && Math.abs(s.x - b.x) < 20 + b.half && Math.abs(s.y - b.y) < 30 && b.z < 70);
        if (sw) { this.flip(sw); if (b.burst) this.burst(b, now); b.obj.destroy(); b.gone = true; continue; }
        // Fire yarn chips heavy-crate walls (three break one).
        const wall = b.hit && this.street.obstacles.find(o => !o.gone && o.kind === 'breakable' && b.x > o.x - b.half && b.x < o.x + o.w + b.half && b.y > o.y - 12 && b.y < o.y + o.d + 12);
        if (wall) { this.chipWall(wall, now, 2); b.obj.destroy(); b.gone = true; continue; }
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
    } else { sfx('stickyBurst'); if (has(this, 'fx-sticky')) burstFx(this, 'fx-sticky', b.x, b.y - 20, k.radius * 1.5, b.y + 2, 2, 4, 420); }
    b.until = 0;
  }

  // Golden paws spill out around (x, y).
  spillPaws(n, x, y) { for (let i = 0; i < n; i++) this.spawnPickup('paw', x + (Math.random() - 0.5) * Math.min(200, 30 + n * 12), Phaser.Math.Clamp(y + (Math.random() - 0.5) * 60, B.floorTop + 10, B.floorBottom - 6), true); }

  onDefeat(o) {
    this.spillPaws(o.t.boss ? PAWS.boss : o.t.critter ? PAWS.critter : PAWS.officer, o.x, o.y);
    if (o.t.boss) {                                      // the boss going down sends the rest running
      stopMusic(1.2);
      for (const other of this.foes) if (other !== o && !other.dead) other.hurt({ x: o.x, face: 1 }, this.time.now, { dmg: 999, knock: 0, up: 0, stun: 0, dazed: true });
      return;
    }
    let r = Math.random();
    for (const [kind, chance] of DROPS) { if (r < chance) { this.spawnPickup(kind, o.x + 30, o.y, true); return; } r -= chance; }
  }

  // flag: remember it was taken (map-placed pick-ups). dropped: left by an officer; expires.
  spawnPickup(kind, x, y, dropped, flag) {
    const u = POWERUPS[kind], frame = iconFrame(u.tool || u.special || kind);
    const obj = has(this, 'icons') && frame !== undefined ? this.add.image(x, y - 16, 'icons', frame).setDisplaySize(30, 30)
      : u.image && has(this, u.image) ? this.add.image(x, y - 16, u.image).setScale(0.6)
      : this.add.text(x, y - 16, u.icon, { fontSize: '26px', resolution: RES }).setOrigin(0.5);
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
        if (u.paw) { addPaws(p.n, u.paw); sfx('paw'); this.popText(k.x, k.y - 40, '+' + u.paw); k.obj.destroy(); continue; }
        if (k.kind === 'stinky') { this.sicken(p, now); k.obj.destroy(); continue; }
        if (k.kind === 'feather') this.levitate(now);
        if (k.kind === 'fish') p.hp = Math.min(maxHp(p), p.hp + u.heal);
        else if (k.kind === 'catnip') p.frenzyUntil = now + u.time;
        else if (k.kind === 'bell') p.shield = true;
        else if (k.kind === 'milk') { state.bonusHp++; this.players.forEach(q => { if (!q.downUntil) q.hp++; }); }
        else if (u.tool || u.special) {
          const slot = u.tool ? 'tool' : 'special', key = u.tool || u.special;      // (none are placed now: they are sold in the shops)
          own(state.party.indexOf(p.entry), u.tool ? 'tools' : 'specials', key);      // the finder's, like bought
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
    for (const p of this.players) { storeHp(p.entry, p.cat.key, p.downUntil ? maxHp(p) : p.hp); p.entry.shield = p.shield; }
    // A shop's way out goes back to wherever the cats came in from.
    const side = /^(climb|cart|fly):(.+)$/.exec(door.target);   // a climb, a cart ride or a flight is its own scene (src/climb, src/cart, src/fly)
    if (side) {
      run.shopFrom = { room: this.roomKey, door: door.name };
      this.cameras.main.fadeOut(180);
      this.time.delayedCall(200, () => this.scene.start(side[1], { level: side[2] }));
      return;
    }
    let to = { room: door.target, door: door.targetDoor };
    if (door.target === ':return') to = run.shopFrom || { room: AREAS[run.area].streets[0], door: null };
    else if (SIDE_ROOMS.includes(door.target)) run.shopFrom = { room: this.roomKey, door: door.name };
    this.cameras.main.fadeOut(180);
    this.time.delayedCall(200, () => this.scene.restart(to));
  }

  updateFlow(now, mid) {
    const waves = this.map.waves;
    if (!this.cleared && !this.foes.length) {
      if (this.challenge && this.challenge.holdsClear) { /* the challenge decides when the room is beaten */ }
      else if (this.waveIdx >= waves.length) {
        this.cleared = state.cleared[this.roomKey] = true;
        const boss = this.map.waves.flat().map(k => OFFICERS[k]).find(t => t.boss);
        sfx(boss ? 'bossBeaten' : 'streetClear');
        if (boss) this.time.delayedCall(1200, () => this.tell('beaten ' + boss.name.replace(/^The /, '').toLowerCase(), () => { if (this.map.final) this.tell('ending'); }));
        if (this.map.final) this.ui.showBanner('You beat ' + boss.name + '!\nThe cats are free!', 0);
        else if (boss) this.ui.showBanner('You beat ' + boss.name + '!', 2600); else this.ui.showBanner('All clear!', 1200);
      } else if (mid >= (this.map.waveAt[this.waveIdx] || 0)) {
        if (!this.nextWaveAt) this.nextWaveAt = now + (this.waveIdx ? 1600 : 1200);
        else if (now > this.nextWaveAt) { this.nextWaveAt = 0; this.spawnWave(); }
      }
    }
    for (const p of this.players) if ((p.prev.y || 0) !== -1) p.arriving = false;      // still holding up from the last doorway: do not bounce straight back
    for (const d of this.street.doors) {
      const open = this.cleared || d.target === ':return';            // the way out of a side room is never locked
      d.label.setText(open ? (d.back ? '\u25B2 ' + d.text : d.left ? '\u25C0 ' + d.text : d.text + ' \u25B6') : 'Locked').setAlpha(open ? 0.75 + 0.25 * Math.sin(now / 200) : 0.5);
      // Walking into an open door takes everyone through. Being knocked into it does not.
      const going = p => !p.downUntil && (d.back ? !p.arriving && (p.prev.y || 0) === -1 && p.x > d.x && p.x < d.x + d.w && p.y < B.floorTop + 12
        : (p.prev.x || 0) === (d.left ? -1 : 1) && p.x > d.x - 10 && p.x < d.x + d.w + 10);
      if (open && this.players.some(going)) this.leave(d);
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
      // The title menu: up and down pick a line, left and right change it; any button joins. Lines: TITLE_MENU.
      if (!state.party.length && r.y && r.y !== (run.stickY[src] || 0)) {
        run.menuRow = (run.menuRow + r.y + TITLE_MENU.length) % TITLE_MENU.length; run.eraseArmed = false; sfx('cycle'); this.ui.showTitle(true);
      }
      if (!state.party.length && r.x && r.x !== (run.stick[src] || 0)) {
        run.stick[src] = r.x;                              // remembered across the restart, so one push moves one step
        const step = (list, cur) => list[(list.indexOf(cur) + r.x + list.length) % list.length], line = TITLE_MENU[run.menuRow];
        if (line === 'campaign') {                         // another campaign: its paws, purchases and the area it reached
          switchCampaign((currentCampaign() + r.x + CAMPAIGNS) % CAMPAIGNS); run.area = save.area || 0; sfx('areaPick');
          this.scene.restart({ room: AREAS[run.area].streets[0] }); return;
        }
        if (line === 'area' && AREAS.length > 1) {
          run.area = (run.area + r.x + AREAS.length) % AREAS.length; sfx('areaPick');
          this.scene.restart({ room: AREAS[run.area].streets[0] }); return;
        }
        if (line === 'difficulty') setDifficulty(step(DIFFICULTY_ORDER, run.difficulty));
        if (line === 'mode') setMode(step(MODE_ORDER, run.mode));
        if (line === 'erase') {                            // two pushes: the first asks, the second erases
          if (!run.eraseArmed) { run.eraseArmed = true; sfx('nope'); this.ui.showTitle(true); continue; }
          run.eraseArmed = false; eraseCampaign(currentCampaign()); run.area = 0; sfx('catNetted');
          this.scene.restart({ room: AREAS[0].streets[0] }); return;
        }
        sfx('areaPick'); this.ui.showTitle(true);
      }
      run.stickY[src] = r.y || 0;
      run.stick[src] = r.x || 0;
      if (r.jump || r.attack || r.special || r.tool || r.swap) this.join(src);
    }
    if (!this.players.length) { this.updatePickers(); return; }

    this.updatePickers();
    for (const p of this.players) { this.updatePlayer(p, now, dt); this.restBench(p, now); }
    if (this.players.every(p => p.downUntil)) { this.caught(); return; }
    this.nap(now);
    for (const o of this.foes) o.update(now, dt);
    this.foes = this.foes.filter(o => !o.gone);
    this.updateShots(now, dt); this.updateRings(now, dt);
    this.updatePickups(now);
    if (this.challenge) { this.challenge.update(now, dt); this.challenge.updateChest(); }

    const mid = this.players.reduce((a, p) => a + p.x, 0) / this.players.length;
    this.updateFlow(now, mid);
    this.drawDebug(now);

    this.viewX += (Phaser.Math.Clamp(mid - W / 2, 0, this.map.w - W) - this.viewX) * Math.min(1, 5 * dt);
    aim(this.cameras.main, this.viewX);

    if (now > this.hitUntil) this.hitCount = 0;
    this.ui.setCombo(this.hitCount);
    const boss = this.foes.find(o => o.t.boss && !o.dead);
    this.ui.setBoss(boss ? { name: boss.t.name, hp: boss.hp / boss.maxHp, raging: boss.raging } : null);
    this.ui.setPaws(null);                                     // each player's paws are in their own row now
    this.ui.setPlayers(state.party.map(e => {                   // one row per party slot, so colours match P-numbers
      const p = this.players.find(q => q.entry === e);
      if (!p) return { picking: true };
      const sp = p.entry.special, tool = p.entry.tool;
      return {
        n: p.n, hp: p.downUntil ? 0 : p.hp, max: maxHp(p), down: !!p.downUntil, paws: pawsOf(p.n),
        partner: benchInfo(p.entry, p.cat.key),
        status: (p.shield ? POWERUPS.bell.icon : '') + (now < p.frenzyUntil ? POWERUPS.catnip.icon : ''),
        special: { icon: SPECIALS[sp].icon, image: SPECIALS[sp].image, frame: iconFrame(sp), charge: Phaser.Math.Clamp(1 - (p.nextSpecial - now) / this.cooldown(p, sp), 0, 1) },
        tool: tool ? { icon: TOOLS[tool].icon, frame: iconFrame(tool), left: this.toolLeft(p) } : null
      };
    }));
    const n = this.map.waves.length;
    this.ui.score.setText(this.map.title + (this.cleared ? '   clear' : '   wave ' + Math.min(this.waveIdx, n) + '/' + n) + '   Sent packing: ' + state.beaten);
  }
}
