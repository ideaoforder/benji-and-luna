import { W, H, RES, BRAWL as B } from '../config.js';
import { state } from '../state.js';

// One street: what it looks like and where things can stand. Built from a Tiled map in maps/brawl/.
//
// Map layers (rectangles are floor footprints: x along the street, y = depth):
//   solids: dumpster | crate | hedge | bench | block   plain obstacles. Property `tall` = height in px, `color` optional.
//           breakable                  heavy crates only Benji breaks. Needs a name.
//           gate                       barrier removed by a switch. Needs a name.
//   things: start, door, pickup, switch, sign, and
//           pen                        a fenced enclosure only Luna can enter.
//           door                       at a street end, or in the back wall with property side = back.
//
// Art is optional. If assets/scenery.json lists bg-<map>-full (one picture of the whole room), or
// bg-<theme>-far / -wall / -floor (repeating strips), or prop-<class>, those pictures
// are used; anything missing is drawn as flat colour, so a room works with all, some or none of its art.

const FONT = 'system-ui, sans-serif';
const hex = (s, fallback) => s ? parseInt(String(s).replace('#', ''), 16) : fallback;
const darker = (c, k = 0.72) => [16, 8, 0].reduce((v, sh) => v | (Math.round(((c >> sh) & 255) * k) << sh), 0);

const THEMES = {
  alley: { sky: [0x2a2148, 0x3a2c62, 0x553a7c, 0x7a4c8f, 0xa8648f, 0xd68a8a], wall: 0x4a3f66, line: 0x40365a, cap: 0x574a78, floor: 0x4c4560, stripe: 0x575070, kerb: 0x3b3350 },
  yard:  { sky: [0x24304a, 0x34456a, 0x4f5f86, 0x7c7a9a, 0xb58f96, 0xe0a98a], wall: 0x3c4a44, line: 0x2f3b36, cap: 0x566a60, floor: 0x5a4d44, stripe: 0x66584d, kerb: 0x4b4038 },
  roof:  { sky: [0x141228, 0x1c1a3a, 0x27244f, 0x353062, 0x4a3b74, 0x6a4a84], wall: 0x3a3f50, line: 0x30344a, cap: 0x5c6278, floor: 0x4a4f60, stripe: 0x565c6e, kerb: 0x3a3f50, stars: true, low: true },
  park:    { sky: [0x1a2440, 0x24345a, 0x334a74, 0x4a6488, 0x6a8494, 0x8fa89a], wall: 0x2f5a3c, line: 0x274c33, cap: 0x4a7a55, floor: 0x4f6a4a, stripe: 0x5a7654, kerb: 0x3f553c, stars: true },
  market:  { sky: [0x20122e, 0x341a44, 0x52245a, 0x7a3068, 0xa8446a, 0xd66a62], wall: 0x5a3a4a, line: 0x4a2f3e, cap: 0xd8a04a, floor: 0x54464a, stripe: 0x615256, kerb: 0x40353a },
  depot:   { sky: [0x10141c, 0x161c28, 0x1e2634, 0x283242, 0x344052, 0x425064], wall: 0x5a6068, line: 0x4a5058, cap: 0xd8c84a, floor: 0x46494e, stripe: 0xb8a83c, kerb: 0x36393e },
  kennels: { sky: [0x0c1220, 0x121a2c, 0x1a2438, 0x222e46, 0x2c3a54, 0x384862], wall: 0x56606a, line: 0x2c3238, cap: 0x7a848e, floor: 0x5e6268, stripe: 0x6a6e74, kerb: 0x484c52, stars: true },
  lobby:    { indoor: true, upper: 0x8a4f42, wall: 0x6f7a5c, line: 0x5c664c, cap: 0xc9a04a, floor: 0x6e6468, stripe: 0x7a7074, kerb: 0x554c50 },
  corridor: { indoor: true, upper: 0x7a6a52, wall: 0x5c5f7a, line: 0x4c4f66, cap: 0xc9a04a, floor: 0x70553f, stripe: 0x7c604a, kerb: 0x574230 },
  pound: { sky: [0x0f1626, 0x162036, 0x1f2c48, 0x2b3a5a, 0x3a4a6a, 0x4c5c7c], wall: 0x4a5058, line: 0x3a4048, cap: 0x666e78, floor: 0x55585e, stripe: 0x62666c, kerb: 0x43464c, stars: true }
};
const LOOK = { dumpster: 0x3f7a5c, crate: 0x9a6b3f, breakable: 0xa8743f, gate: 0x8b93a7, block: 0x7d8597, hedge: 0x2f6f4a, bench: 0x8a5a38 };

export class Street {
  constructor(scene, key, map) {
    this.scene = scene; this.key = key; this.map = map; this.w = map.w;
    this.theme = THEMES[map.theme] || THEMES.yard;
    this.backdrop();
    this.obstacles = map.solids.map(s => this.obstacle(s)).filter(Boolean);
    this.pens = []; this.doors = []; this.switches = []; this.pickups = []; this.start = { x: 180, y: B.floorTop + 85 };
    const st = { fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#1c1630', strokeThickness: 3, resolution: RES };
    for (const t of map.things) {
      if (t.cls === 'start') this.start = t;
      else if (t.cls === 'sign') scene.add.text(t.x, t.y, t.props.text || '', st).setOrigin(0.5, 1).setAlpha(0.85).setDepth(B.floorTop - 1);
      else if (t.cls === 'pen') this.pen(t);
      else if (t.cls === 'door') this.door(t, st);
      else if (t.cls === 'switch') this.lever(t);
      else if (t.cls === 'pickup') this.pickups.push({ kind: t.props.kind, x: t.x, y: t.y, flag: key + ':' + (t.name || t.props.kind + Math.round(t.x)) });
    }
  }

  has(tex) { return this.scene.textures.exists(tex); }
  rect(x, y, w, h, color, depth, alpha = 1) { return this.scene.add.rectangle(x + w / 2, y + h / 2, w, h, color, alpha).setDepth(depth); }

  // ---------- looks ----------
  backdrop() {
    const s = this.scene, th = this.theme, w = this.w, top = B.floorTop, name = this.map.theme;
    const strip = (tex, y, h, factor, depth) => s.add.tileSprite(0, y, w + 600, h, tex).setOrigin(0, 0).setScrollFactor(factor, 1).setDepth(depth);

    // One picture of the whole room (interiors, anything that does not repeat): bg-<map name>-full, 540 high.
    // or in panels side by side, bg-<map name>-full-1, -full-2 ...
    const panels = this.has('bg-' + this.key + '-full') ? ['bg-' + this.key + '-full'] : [];
    for (let i = 1; this.has('bg-' + this.key + '-full-' + i); i++) panels.push('bg-' + this.key + '-full-' + i);
    this.full = panels.length > 0;
    if (this.full) { let x = 0; for (const k of panels) { const im = s.add.image(x, 0, k).setOrigin(0, 0).setDepth(-20); x += im.width; } return; }
    if (this.has('bg-' + name + '-far')) strip('bg-' + name + '-far', 0, 300, 0.4, -20);
    else if (th.indoor) {                                 // indoors: wall all the way up, with lamps instead of a skyline
      const g = s.add.graphics().setDepth(-20);
      g.fillStyle(th.upper, 1); g.fillRect(0, 0, w, top);
      g.fillStyle(darker(th.upper, 0.88), 1); for (let y = 20; y < top - 110; y += 24) g.fillRect(0, y, w, 2);
      for (let x = 140; x < w; x += 320) { g.fillStyle(0xffd98a, 0.16); g.fillCircle(x, 150, 70); g.fillStyle(0xffe9b0, 1); g.fillRect(x - 7, 138, 14, 24); }
    } else {
      const g = s.add.graphics().setScrollFactor(0.3).setDepth(-20);
      th.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(0, i * 52, w, 54); });
      g.fillStyle(0xfff3d6, 0.9); g.fillCircle(720, 90, 30);
      if (th.stars) { g.fillStyle(0xffffff, 0.8); for (let i = 0; i < 90; i++) g.fillRect((i * 197) % w, (i * 89) % 220, 2, 2); }
      const far = s.add.graphics().setScrollFactor(0.6).setDepth(-15);
      let x = -40, n = 7;
      while (x < w + 200) {
        n = (n * 73 + 11) % 97; const bw = 90 + n, bh = (th.low ? 30 : 110) + (n * 3) % (th.low ? 70 : 150);
        far.fillStyle(0x2b2247, 1); far.fillRect(x, top - 80 - bh, bw, bh + 80);
        far.fillStyle(0xf6d77a, 0.55);
        for (let wy = top - 70 - bh; wy < top - 110; wy += 34) for (let wx = x + 12; wx < x + bw - 16; wx += 28) if ((wx * 7 + wy * 13 + n) % 5 < 2) far.fillRect(wx, wy, 10, 14);
        x += bw + 14;
      }
    }
    if (this.has('bg-' + name + '-wall')) strip('bg-' + name + '-wall', top - 110, 110, 1, -12);
    else {
      const g = s.add.graphics().setDepth(-12), wh = th.low ? 40 : 110;
      g.fillStyle(th.wall, 1); g.fillRect(0, top - wh, w, wh);
      g.fillStyle(th.line, 1); for (let bx = 0; bx < w; bx += 40) g.fillRect(bx, top - wh, 2, wh);
      g.fillStyle(th.cap, 1); g.fillRect(0, top - wh - 4, w, 6);
    }
    if (this.has('bg-' + name + '-floor')) strip('bg-' + name + '-floor', top, H - top, 1, -10);
    else {
      const g = s.add.graphics().setDepth(-10);
      g.fillStyle(th.floor, 1); g.fillRect(0, top - 8, w, H - top + 8);
      g.fillStyle(th.kerb, 1); g.fillRect(0, B.floorBottom + 8, w, H);
      g.fillStyle(th.stripe, 1); for (let i = 0, y = top + 8; y < B.floorBottom; i++, y += 16 + i * 6) g.fillRect(0, y, w, 2);   // lines widen toward the front
    }
  }

  // A box on the floor: a lighter top face and a darker front face, or its picture if there is one.
  obstacle(s) {
    const o = { kind: s.cls, name: s.name, x: s.x, y: s.y, w: s.w, d: s.h, h: s.props.tall || 54, parts: [],
                flag: this.key + ':' + (s.name || s.cls + '@' + s.x + ',' + s.y) };
    o.wall = o.kind === 'breakable' || o.kind === 'gate';        // puzzle barriers: never climbed over, however high a cat jumps
    o.hp = o.kind === 'crate' ? 2 : 0;                           // ordinary crates take two heavy hits
    if ((o.wall || o.kind === 'crate') && state.flags[o.flag]) return null;      // already broken / opened
    const front = o.y + o.d, color = hex(s.props.color, LOOK[o.kind] || LOOK.block), tex = 'prop-' + o.kind;
    if (this.has(tex)) {                                   // picture: bottom-left corner on the front-left of the footprint
      const src = this.scene.textures.get(tex).getSourceImage(), k = o.w / src.width, ih = src.height * k;
      const rows = o.kind === 'breakable' ? Math.max(1, Math.round((o.h + o.d) / ih)) : 1;
      for (let i = 0; i < rows; i++) o.parts.push(this.scene.add.image(o.x, front - i * ih * 0.86, tex).setOrigin(0, 1).setScale(k).setDepth(front));
    } else if (o.kind === 'gate') {
      o.parts.push(this.rect(o.x, o.y - o.h, o.w, o.h + o.d, color, front, 0.3));
      for (let y = o.y - o.h; y < front; y += 20) o.parts.push(this.rect(o.x - 3, y, o.w + 6, 4, color, front));
      o.parts.push(this.rect(o.x, front - o.h, o.w, o.h, darker(color), front, 0.8));
    } else {
      o.parts.push(this.rect(o.x, o.y - o.h, o.w, o.d, color, front));                // top face
      o.parts.push(this.rect(o.x, front - o.h, o.w, o.h, darker(color), front));      // front face
      if (o.kind === 'crate' || o.kind === 'breakable') for (let y = front - o.h; y < front; y += 50) o.parts.push(this.rect(o.x, y, o.w, 4, 0x70492a, front));
    }
    return o;
  }

  // A fenced enclosure against the back wall. Only Luna gets in.
  pen(t) {
    const p = { x: t.x, y: t.y, w: t.w, d: t.h }, c = 0x9aa3b8, tall = 62, front = p.y + p.d;
    this.pens.push(p);
    if (this.has('prop-pen')) {                            // a painted front (a hedge arch): low clipped sides run back to the wall
      const green = 0x1f7a66, low = 30;                    // matched to the painted hedge
      for (const x of [p.x, p.x + p.w - 16]) { this.rect(x, p.y - low, 16, p.d, green, front - 1); this.rect(x, front - low - 1, 16, low, darker(green), front - 1); }
      const src = this.scene.textures.get('prop-pen').getSourceImage();
      this.scene.add.image(p.x, front, 'prop-pen').setOrigin(0, 1).setScale(p.w / src.width).setDepth(front);
      return;
    }
    for (const x of [p.x, p.x + p.w - 6]) {                                           // side fences, running back to the wall
      this.rect(x, p.y - tall, 6, tall + p.d, c, front - 1, 0.35);
      for (let y = p.y - tall + 6; y < front; y += 16) this.rect(x - 1, y, 8, 2, c, front - 1);
    }
    this.rect(p.x, front - tall, p.w, tall, c, front, 0.22);                           // front fence: see-through mesh
    for (let x = p.x; x <= p.x + p.w - 4; x += 18) this.rect(x, front - tall, 3, tall, c, front, 0.8);
    this.rect(p.x, front - tall, p.w, 4, c, front); this.rect(p.x, front - 30, p.w, 3, c, front, 0.8);
  }

  // A door is either at an end of the street (walk off that end) or, with property side = back, a doorway in the
  // back wall (stairs, a lift, a shop door): stand in front of it and walk up.
  door(t, st) {
    const s = this.scene, back = t.props.side === 'back', left = t.x < this.w / 2, x = left ? t.x : t.x + t.w - 14;
    if (back) { if (!this.full) this.rect(t.x, B.floorTop - 100, t.w, 100, 0x1c1630, -11, 0.85); }      // a room picture already shows the doorway
    else this.rect(x, B.floorTop - 96, 14, 96 + t.h, 0x8b7b5a, B.floorTop - 2);        // gate post at the end of the street
    const label = back ? s.add.text(t.x + t.w / 2, B.floorTop - 104, '', { ...st, fontSize: '14px' }).setOrigin(0.5, 1).setDepth(B.floorTop - 1)
      : s.add.text(left ? t.x + 8 : t.x + t.w - 8, B.floorTop - 100, '', { ...st, fontSize: '14px' }).setOrigin(left ? 0 : 1, 1).setDepth(B.floorTop - 1);
    this.doors.push({ name: t.name, left, back, x: t.x, y: t.y, w: t.w, d: t.h, target: t.props.target, targetDoor: t.props.targetDoor, text: t.props.label, label });
  }

  lever(t) {
    const flag = this.key + ':' + t.props.opens, on = !!state.flags[flag];
    this.rect(t.x - 3, t.y - 34, 6, 34, 0x5c6278, t.y);
    const knob = this.scene.add.circle(t.x, t.y - 36, 9, on ? 0x6ee06e : 0xe05a5a).setStrokeStyle(2, 0x1c1630).setDepth(t.y);
    this.switches.push({ x: t.x, y: t.y, opens: t.props.opens, on, knob });
  }

  // ---------- where things can stand ----------
  inPen(x, y, pad = 0) { return this.pens.some(p => x > p.x - pad && x < p.x + p.w + pad && y < p.y + p.d + pad * 0.4); }

  // The obstacle whose footprint (x, y) is over, tallest first; null on open floor.
  under(x, y) {
    let best = null;
    for (const o of this.obstacles)
      if (!o.gone && x > o.x - 16 && x < o.x + o.w + 16 && y > o.y - 3 && y < o.y + o.d + 3 && (!best || o.h > best.h)) best = o;
    return best;
  }

  // Can this cat or officer be at (x, y)? Cats can be over a box if they are high enough to be on top of it.
  free(x, y, ent) {
    const o = this.under(x, y);
    if (o && !(ent.cat && !o.wall && ent.z >= o.h - 6)) return false;
    if (!(ent.cat && ent.cat.small) && this.inPen(x, y, 14)) return false;
    return true;
  }

  // Move along the street and in depth separately, so walking into something slides along it.
  move(ent, dx, dy) {
    const cat = !!ent.cat, lo = cat ? this.scene.viewX + 30 : -90, hi = cat ? this.scene.viewX + W - 30 : this.w + 90;
    const stuck = !this.free(ent.x, ent.y, ent);            // should not happen; if it does, let them walk out
    const nx = Phaser.Math.Clamp(ent.x + dx, lo, hi);
    if (stuck || this.free(nx, ent.y, ent)) ent.x = nx;
    const ny = Phaser.Math.Clamp(ent.y + dy, B.floorTop, B.floorBottom);
    if (stuck || this.free(ent.x, ny, ent)) ent.y = ny;
  }

  // Full-depth barriers still standing (crate walls, shut gates). Officers must start on the cats' side of them.
  barriers() { return this.obstacles.filter(o => !o.gone && o.d >= B.floorBottom - B.floorTop); }

  remove(o) { o.gone = true; state.flags[o.flag] = true; o.parts.forEach(r => r.destroy()); }

  smash(o) {
    const s = this.scene; this.remove(o);
    for (let i = 0; i < 12; i++) {
      const bit = s.add.rectangle(o.x + Math.random() * o.w, o.y - o.h + Math.random() * (o.h + o.d), 14, 10, 0xa8743f).setDepth(o.y + o.d);
      s.tweens.add({ targets: bit, x: bit.x + (Math.random() - 0.5) * 240, y: bit.y + 40 + Math.random() * 80,
        angle: 360 * (Math.random() - 0.5), alpha: 0, duration: 600, onComplete: () => bit.destroy() });
    }
  }

  // Flip a switch: its gate goes for good.
  flip(sw) {
    sw.on = true; sw.knob.setFillStyle(0x6ee06e);
    const gate = this.obstacles.find(o => o.kind === 'gate' && o.name === sw.opens && !o.gone);
    if (gate) this.remove(gate);
    state.flags[this.key + ':' + sw.opens] = true;
  }
}
