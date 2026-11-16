import { W, H, WORLD_W, GROUND, CELL_W, CELL_H, CATS, OFFICER } from '../config.js';
import { SOURCES, consume } from '../input.js';
import { blip } from '../sound.js';

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const bodyRect = body => ({ x: body.x, y: body.y, w: body.width, h: body.height });
// A box of size w x h that starts `near` px in front of x and extends forward.
const frontRect = (x, face, near, w, y, h) => ({ x: face > 0 ? x + near : x - near - w, y, w, h });

export class Alley extends Phaser.Scene {
  constructor() { super('alley'); }

  preload() {
    this.load.spritesheet('benji', 'assets/benji.png', { frameWidth: CELL_W, frameHeight: CELL_H });
    this.load.spritesheet('luna', 'assets/luna.png', { frameWidth: CELL_W, frameHeight: CELL_H });
    this.load.spritesheet('officer', 'assets/officer.png', { frameWidth: 180, frameHeight: 144 });
    this.load.image('slash', 'assets/slash.png');
  }

  create() {
    if (!this.anims.exists('officer-walk')) {
      for (const k of ['benji', 'luna']) {
        const fr = a => a.map(f => ({ key: k, frame: f }));
        this.anims.create({ key: k + '-idle', frames: fr([0, 1, 2, 1]), frameRate: 4, repeat: -1 });
        this.anims.create({ key: k + '-walk', frames: fr([5, 6, 7, 8, 9]), frameRate: 10, repeat: -1 });
        this.anims.create({ key: k + '-run', frames: fr([10, 11, 12, 13, 14]), frameRate: 14, repeat: -1 });
      }
      this.anims.create({ key: 'officer-walk', frames: [{ key: 'officer', frame: 0 }, { key: 'officer', frame: 1 }], frameRate: 5, repeat: -1 });
    }

    this.physics.world.setBounds(0, 0, WORLD_W, H + 200);
    this.cameras.main.setBounds(0, 0, WORLD_W, H);
    this.drawBackdrop();

    this.solids = this.physics.add.staticGroup();
    this.block(WORLD_W / 2, GROUND + 60, WORLD_W, 120, 0x3b3350, false);      // street
    this.block(470, GROUND - 36, 150, 72, 0x3f7a5c, false, 0x2c5a43);         // dumpster
    this.block(1210, GROUND - 26, 70, 52, 0x9a6b3f, false, 0x70492a);         // crate
    this.block(760, 322, 240, 14, 0x6a5f8c, true);                            // fire escape
    this.block(1040, 212, 180, 14, 0x6a5f8c, true);                           // high ledge (Luna only)
    this.block(1380, 350, 200, 14, 0xb2577a, true);                           // awning

    this.players = []; this.officers = []; this.joined = {};
    this.wave = 0; this.beaten = 0; this.nextWaveAt = 0;
    this.debug = false; this.strikes = [];      // recent attack boxes, kept briefly for the debug view
    this.dbg = this.add.graphics().setDepth(100);

    // fish treat on the high ledge: heals everyone, comes back later
    this.fish = this.add.text(1040, 178, '🐟', { fontSize: '28px' }).setOrigin(0.5);
    this.tweens.add({ targets: this.fish, y: 170, duration: 700, yoyo: true, repeat: -1 });
    this.fishBackAt = 0;

    const st = { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff', stroke: '#1c1630', strokeThickness: 4 };
    this.hud = this.add.text(12, 10, '', st).setScrollFactor(0).setDepth(50);
    this.score = this.add.text(W - 12, 10, '', st).setOrigin(1, 0).setScrollFactor(0).setDepth(50);
    this.title = this.add.text(W / 2, 130, 'BENJI & LUNA', { ...st, fontSize: '54px', fontStyle: 'bold', strokeThickness: 8 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(50);
    this.help = this.add.text(W / 2, 206,
      'Press a button to join (up to 4 cats)\n\n' +
      'Controller: stick / d-pad move   A jump   X claw   Y swap cat\n' +
      'Keyboard 1: A D move   W jump   F claw   G swap\n' +
      'Keyboard 2: ← → move   ↑ jump   Enter claw   Right Shift swap\n' +
      'Touch: buttons at the bottom of the screen\n' +
      'Start over: R, Start, or the ↻ button      Show hitboxes: H or Select',
      { ...st, align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(50);
    window.__scene = this;
  }

  drawBackdrop() {
    const g = this.add.graphics().setScrollFactor(0.3).setDepth(-20);
    const bands = [0x2a2148, 0x3a2c62, 0x553a7c, 0x7a4c8f, 0xa8648f, 0xd68a8a];
    bands.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(0, i * 80, WORLD_W, 82); });
    g.fillStyle(0xfff3d6, 0.9); g.fillCircle(720, 110, 34);
    const far = this.add.graphics().setScrollFactor(0.6).setDepth(-15);
    let x = -40, s = 7;
    while (x < WORLD_W + 200) {
      s = (s * 73 + 11) % 97; const w = 90 + s, h = 160 + (s * 3) % 190;
      far.fillStyle(0x2b2247, 1); far.fillRect(x, GROUND - h, w, h);
      far.fillStyle(0xf6d77a, 0.55);
      for (let wy = GROUND - h + 18; wy < GROUND - 40; wy += 34)
        for (let wx = x + 12; wx < x + w - 16; wx += 28)
          if ((wx * 7 + wy * 13 + s) % 5 < 2) far.fillRect(wx, wy, 10, 14);
      x += w + 14;
    }
    const near = this.add.graphics().setDepth(-10);
    near.fillStyle(0x4a3f66, 1); near.fillRect(0, GROUND - 120, WORLD_W, 120);       // back wall
    near.fillStyle(0x40365a, 1);
    for (let bx = 0; bx < WORLD_W; bx += 40) near.fillRect(bx, GROUND - 120, 2, 120);
    near.fillStyle(0x574a78, 1); near.fillRect(0, GROUND - 124, WORLD_W, 6);
    near.fillStyle(0x6a5f8c, 1);                                                     // ladder to fire escape
    near.fillRect(650, 322, 4, GROUND - 322); near.fillRect(676, 322, 4, GROUND - 322);
    for (let ly = 336; ly < GROUND; ly += 18) near.fillRect(650, ly, 30, 3);
  }

  block(x, y, w, h, color, oneWay, trim) {
    const r = this.add.rectangle(x, y, w, h, color).setDepth(-5);
    if (trim) this.add.rectangle(x, y - h / 2 + 5, w + 8, 10, trim).setDepth(-4);
    this.physics.add.existing(r, true);
    if (oneWay) { const c = r.body.checkCollision; c.down = c.left = c.right = false; }
    this.solids.add(r);
    return r;
  }

  // ---------- players ----------
  join(src) {
    if (this.players.length >= 4 || this.joined[src]) return;
    this.joined[src] = true;
    const n = this.players.length;
    const p = { src, n, prev: {}, catKey: n % 2 ? 'luna' : 'benji', face: 1, attackUntil: 0, nextAttack: 0,
                invulnUntil: 0, downUntil: 0, hurtUntil: 0, jumpsLeft: 0 };
    const cam = this.cameras.main;
    p.sprite = this.physics.add.sprite(cam.scrollX + 200 + n * 90, GROUND - 120, 'benji', 0).setDepth(10 + n);
    p.sprite.setCollideWorldBounds(true);
    p.tag = this.add.text(0, 0, 'P' + (n + 1), { fontFamily: 'system-ui, sans-serif', fontSize: '13px',
      color: ['#8fc4ff', '#ff8fc8', '#b6f09c', '#ffd27a'][n], stroke: '#1c1630', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(30);
    this.physics.add.collider(p.sprite, this.solids);
    this.setCat(p, p.catKey);
    this.players.push(p);
    this.title.setVisible(false); this.help.setVisible(false);
    if (!this.wave) this.nextWaveAt = this.time.now + 1500;
    blip(660, 0.15, 'triangle');
  }

  setCat(p, key) {
    const c = CATS[key]; p.catKey = key; p.cat = c; p.hp = c.hp;
    const s = p.sprite; s.setTexture(key, 0); s.setScale(c.scale);
    s.body.setSize(c.body[0], c.body[1]);
    s.body.setOffset((CELL_W - c.body[0]) / 2, CELL_H - c.body[1]);
  }

  updatePlayer(p, now) {
    const raw = SOURCES[p.src]() || { x: 0, jump: false, attack: false, swap: false };
    const pressed = k => raw[k] && !p.prev[k];
    const s = p.sprite, b = s.body, c = p.cat;
    const onGround = b.blocked.down || b.touching.down;
    const cam = this.cameras.main;
    s.x = Phaser.Math.Clamp(s.x, cam.scrollX + 30, cam.scrollX + W - 30);

    if (p.downUntil) {                                   // netted: sit it out, then come back
      s.anims.stop(); s.setFrame(20); s.setAlpha(0.55); b.setVelocityX(0);
      if (now > p.downUntil) { p.downUntil = 0; p.hp = c.hp; p.invulnUntil = now + 1500; }
    } else {
      if (onGround) p.jumpsLeft = c.jumps;
      if (now > p.hurtUntil) {
        b.setVelocityX(raw.x * c.speed * (now < p.attackUntil && onGround ? 0.35 : 1));
        if (raw.x) p.face = raw.x;
      }
      if (pressed('jump') && p.jumpsLeft > 0) {
        b.setVelocityY(-c.jump * (onGround || p.jumpsLeft === c.jumps ? 1 : 0.85));
        p.jumpsLeft--; blip(520, 0.12, 'square', 0.03);
      }
      if (!raw.jump && b.velocity.y < -220) b.setVelocityY(-220);       // short hop on early release
      if (pressed('attack') && now > p.nextAttack) this.claw(p, now);
      if (pressed('swap') && onGround) { this.setCat(p, p.catKey === 'benji' ? 'luna' : 'benji'); blip(880, 0.1, 'triangle'); }

      s.setFlipX(p.face < 0);
      if (now < p.attackUntil) { s.anims.stop(); s.setFrame(17); }
      else if (!onGround) { s.anims.stop(); s.setFrame(b.velocity.y < 0 ? 17 : 18); }
      else if (raw.x) s.anims.play(c.key + '-' + c.move, true);
      else s.anims.play(c.key + '-idle', true);
      s.setAlpha(now < p.invulnUntil && Math.floor(now / 80) % 2 ? 0.35 : 1);
    }
    p.tag.setPosition(s.x, b.bottom - 86 * c.scale);
    p.prev = raw;
  }

  claw(p, now) {
    const c = p.cat, s = p.sprite;
    p.attackUntil = now + 170; p.nextAttack = now + c.cooldown;
    // The strike box starts at the cat's centre and reaches forward; the slash is drawn to fill it.
    const box = frontRect(s.x, p.face, 0, c.claw.w, s.body.center.y - c.claw.h / 2 - 6, c.claw.h);
    this.strikes.push({ box, until: now + 170, color: 0xff4444 });
    const fx = this.add.image(box.x + box.w / 2, box.y + box.h / 2, 'slash')
      .setTint(c.slash).setFlipX(p.face < 0).setDisplaySize(box.w * 0.8, box.h * 1.15).setDepth(40);
    this.tweens.add({ targets: fx, alpha: 0, x: fx.x + p.face * 14, duration: 170, onComplete: () => fx.destroy() });
    blip(c.key === 'benji' ? 300 : 700, 0.09, 'sawtooth', 0.04);
    for (const o of this.officers)
      if (o.state !== 'dead' && overlaps(box, bodyRect(o.sprite.body))) this.hurtOfficer(o, p, now);
  }

  hurtPlayer(p, dir, now) {
    if (p.downUntil || now < p.invulnUntil) return;
    p.hp--; p.invulnUntil = now + 1000; p.hurtUntil = now + 260;
    p.sprite.body.setVelocity(dir * 260, -260);
    this.cameras.main.shake(80, 0.004); blip(180, 0.2, 'square', 0.05);
    if (p.hp <= 0) p.downUntil = now + 3000;
  }

  // ---------- Animal Control ----------
  spawnOfficer(i) {
    const cam = this.cameras.main, side = i % 2 ? -1 : 1;
    const x = Phaser.Math.Clamp(cam.scrollX + W / 2 + side * (W / 2 + 60 + i * 40), 40, WORLD_W - 40);
    const o = { hp: OFFICER.hp, state: 'walk', until: 0, face: -side, flashUntil: 0 };
    o.sprite = this.physics.add.sprite(x, GROUND - 100, 'officer', 0).setDepth(8);
    o.sprite.body.setSize(54, 126); o.sprite.body.setOffset(63, 18);
    o.sprite.setCollideWorldBounds(true);
    this.physics.add.collider(o.sprite, this.solids);
    o.bang = this.add.text(0, 0, '!', { fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold',
      color: '#ffe066', stroke: '#1c1630', strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(30).setVisible(false);
    this.officers.push(o);
  }

  netRect(o) {
    const n = OFFICER.net, b = o.sprite.body;
    return frontRect(o.sprite.x, o.face, n.near, n.w, b.bottom - n.h, n.h);
  }

  hurtOfficer(o, p, now) {
    const c = p.cat, s = o.sprite;
    o.hp -= c.dmg; s.setTint(0xffb0b0); o.flashUntil = now + 120;
    blip(c.key === 'benji' ? 140 : 240, 0.14, 'square', 0.06);
    if (c.key === 'benji') this.cameras.main.shake(70, 0.005);
    if (o.hp <= 0) {
      o.state = 'dead'; this.beaten++; o.bang.setVisible(false);
      s.anims.stop(); s.setFrame(4);
      s.body.setVelocity(p.face * 320, -420); s.body.checkCollision.none = true;
      s.setCollideWorldBounds(false);
      this.tweens.add({ targets: s, angle: p.face * 200, alpha: 0, duration: 900,
        onComplete: () => { s.destroy(); o.bang.destroy(); } });
      return;
    }
    // Mid wind-up or mid-swing he has poise: only a heavy hit (Benji) staggers him.
    const committed = o.state === 'windup' || o.state === 'swing';
    if (committed && !c.interrupts) return;
    o.state = 'hurt'; o.until = now + c.stun; o.bang.setVisible(false);
    s.anims.stop(); s.setFrame(4);
    s.body.setVelocity(p.face * c.knock, -170);
  }

  updateOfficer(o, now) {
    if (o.state === 'dead') return;
    const s = o.sprite, b = s.body;
    if (o.flashUntil && now > o.flashUntil && o.state !== 'hurt') { s.clearTint(); o.flashUntil = 0; }
    let target = null, best = 1e9;
    for (const p of this.players) {
      if (p.downUntil) continue;
      const d = Math.abs(p.sprite.x - s.x) + Math.abs(p.sprite.y - s.y) * 0.5;
      if (d < best) { best = d; target = p; }
    }
    o.bang.setPosition(s.x, b.top - 4);
    if (o.state === 'hurt') {
      if (now > o.until) { o.state = 'walk'; s.clearTint(); }
    } else if (o.state === 'windup') {
      b.setVelocityX(0); s.setFrame(2);
      if (now > o.until) {
        o.state = 'swing'; o.until = now + OFFICER.swing; s.setFrame(3); o.bang.setVisible(false);
        blip(220, 0.12, 'triangle', 0.05);
      }
    } else if (o.state === 'swing') {
      b.setVelocityX(o.face * OFFICER.lunge);                 // lunges forward, net out
      const net = this.netRect(o);
      this.strikes.push({ box: net, until: now + 30, color: 0xff4444 });
      for (const p of this.players)
        if (overlaps(net, bodyRect(p.sprite.body))) this.hurtPlayer(p, o.face, now);
      if (now > o.until) { o.state = 'recover'; o.until = now + OFFICER.recover; b.setVelocityX(0); }
    } else if (o.state === 'recover') {
      b.setVelocityX(0);
      if (now > o.until) { o.state = 'walk'; s.setFrame(0); }
    } else if (target) {
      const dx = target.sprite.x - s.x, level = Math.abs(b.bottom - target.sprite.body.bottom) < 60;
      o.face = dx < 0 ? -1 : 1;
      if (Math.abs(dx) < OFFICER.trigger && level) {
        o.state = 'windup'; o.until = now + OFFICER.windup; o.bang.setVisible(true); s.anims.stop();
      } else if (Math.abs(dx) > 30) {
        b.setVelocityX(o.face * (OFFICER.speed + this.wave * 6)); s.anims.play('officer-walk', true);
        if ((b.blocked.left || b.blocked.right) && b.blocked.down) b.setVelocityY(-560);   // hop obstacles
      } else { b.setVelocityX(0); s.anims.stop(); s.setFrame(0); }
    } else { b.setVelocityX(0); s.anims.stop(); s.setFrame(0); }
    s.setFlipX(o.face < 0);
  }

  drawDebug(now) {
    const g = this.dbg; g.clear();
    this.strikes = this.strikes.filter(k => k.until > now);
    if (!this.debug) return;
    const box = (r, color) => { g.lineStyle(2, color, 1); g.strokeRect(r.x, r.y, r.w, r.h); };
    for (const p of this.players) box(bodyRect(p.sprite.body), 0x55ff88);
    for (const o of this.officers) if (o.state !== 'dead') {
      box(bodyRect(o.sprite.body), 0xffe066);
      if (o.state === 'windup') box(this.netRect(o), 0xff9944);     // where the net is about to land
    }
    for (const k of this.strikes) { g.fillStyle(k.color, 0.35); g.fillRect(k.box.x, k.box.y, k.box.w, k.box.h); }
  }

  update() {
    const now = this.time.now;
    if (consume('KeyH', 8)) this.debug = !this.debug;
    const restart = consume('KeyR', 9) | consume('Escape') | consume('Restart');
    if (restart && this.players.length) { this.scene.restart(); return; }

    for (const src in SOURCES) {
      if (this.joined[src]) continue;
      const r = SOURCES[src]();
      if (r && (r.jump || r.attack || r.swap || r.x)) this.join(src);
    }
    if (!this.players.length) return;

    for (const p of this.players) this.updatePlayer(p, now);
    for (const o of this.officers) this.updateOfficer(o, now);
    this.officers = this.officers.filter(o => o.sprite.active);
    this.drawDebug(now);

    if (!this.officers.length) {
      if (!this.nextWaveAt) this.nextWaveAt = now + 2200;
      else if (now > this.nextWaveAt) {
        this.wave++; this.nextWaveAt = 0;
        const count = Math.min(this.wave, 2 + this.players.length);
        for (let i = 0; i < count; i++) this.spawnOfficer(i);
      }
    }

    if (this.fish.visible) {
      for (const p of this.players) {
        if (Math.abs(p.sprite.x - this.fish.x) < 40 && Math.abs(p.sprite.body.center.y - this.fish.y) < 50) {
          this.players.forEach(q => { if (!q.downUntil) q.hp = q.cat.hp; });
          this.fish.setVisible(false); this.fishBackAt = now + 15000; blip(990, 0.25, 'triangle', 0.05);
        }
      }
    } else if (now > this.fishBackAt) this.fish.setVisible(true);

    const cam = this.cameras.main;
    const mid = this.players.reduce((a, p) => a + p.sprite.x, 0) / this.players.length;
    cam.scrollX += (Phaser.Math.Clamp(mid - W / 2, 0, WORLD_W - W) - cam.scrollX) * 0.08;

    this.hud.setText(this.players.map(p => 'P' + (p.n + 1) + ' ' + p.cat.name + '  ' +
      (p.downUntil ? 'netted!' : '♥'.repeat(p.hp) + '♡'.repeat(p.cat.hp - p.hp))).join('\n'));
    this.score.setText('Wave ' + this.wave + '   Officers sent packing: ' + this.beaten);
  }
}
