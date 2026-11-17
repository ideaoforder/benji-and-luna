import { OFFICERS, BRAWL, RES } from '../config.js';
import { frame, count } from '../sprites.js';
import { blip } from '../sound.js';
import { state } from '../state.js';

const SLOTS = [0, 8, -8, 5, -5];       // small depth offsets so attackers do not stand on one spot

// An Animal Control officer in the brawler. Same types, numbers and states as the platformer's Officer
// (walk -> windup -> swing -> recover, plus hurt and frozen), but it moves on the floor in two directions
// and its attacks only land on cats that are close in depth.
export class Foe {
  constructor(scene, type, x, y, n) {
    this.scene = scene; this.type = type; this.t = OFFICERS[type]; this.key = 'officer-' + type;
    this.x = x; this.y = y; this.z = 0; this.vz = 0; this.kvx = 0;
    this.hp = this.maxHp = this.t.hp; this.state = 'walk'; this.until = 0; this.t0 = 0; this.face = -1;
    this.flashUntil = 0; this.nextThrow = 0; this.airborne = false;
    this.side = n % 2 ? -1 : 1; this.slot = SLOTS[n % SLOTS.length];       // which side of the cat to come at, and where in depth
    this.half = this.t.body[0] * this.t.scale / 2; this.height = this.t.body[1] * this.t.scale;
    this.shadow = scene.add.ellipse(x, y, this.half * 2 + 16, 14, 0x000000, 0.28);
    this.sprite = scene.add.sprite(x, y, this.key, frame(this.key, 'idle')).setOrigin(0.5, 1).setScale(this.t.scale);
    this.bang = scene.add.text(0, 0, '!', { fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold', resolution: RES,
      color: '#ffe066', stroke: '#1c1630', strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(900).setVisible(false);
  }

  get dead() { return this.state === 'dead'; }
  get progress() { return this.until > this.t0 ? Math.min(1, Math.max(0, (this.scene.time.now - this.t0) / (this.until - this.t0))) : 1; }
  pose(row, at = 0) {
    const n = count(this.key, row);
    this.sprite.anims.stop(); this.sprite.setFrame(frame(this.key, row, Math.min(n - 1, Math.floor(at * n))));
  }

  // hit = { dmg, knock, up, stun, interrupts, heavy, dazed }; p is the attacker (needs x and face).
  hurt(p, now, hit) {
    if (this.dead) return;
    const t = this.t, scene = this.scene;
    const guardUp = t.guard && !hit.dazed && (this.state === 'walk' || this.state === 'windup');
    if (guardUp && (p.x - this.x) * this.face > 0) {               // briefcase in the way
      blip(900, 0.06, 'square', 0.05); scene.popText(this.x, this.y - this.height, 'BLOCK');
      if (p.kvx !== undefined) { p.kvx = -p.face * 240; p.hurtUntil = now + 160; }
      return;
    }
    this.hp -= hit.dmg; this.sprite.setTint(hit.dazed ? 0xa8c4ff : 0xffb0b0); this.flashUntil = now + 120;
    if (hit.dmg) { scene.countHit(now); blip(hit.heavy ? 140 : 240, 0.14, 'square', 0.06); }
    if (hit.dmg && hit.heavy) scene.cameras.main.shake(70, 0.005);
    if (this.hp <= 0) {
      this.state = 'dead'; state.beaten++; this.bang.setVisible(false); this.pose('hurt'); this.shadow.destroy();
      scene.tweens.add({ targets: this.sprite, x: this.x + p.face * 160, y: this.y - 90, angle: p.face * 200, alpha: 0, duration: 800,
        onComplete: () => { this.sprite.destroy(); this.bang.destroy(); this.gone = true; } });
      scene.onDefeat(this);
      return;
    }
    if (this.state === 'frozen') return;
    const committed = this.state === 'windup' || this.state === 'swing';
    if (t.poise === 'heavy' && !hit.dazed && !hit.heavy) return;   // shrugs off light hits
    if (committed && !hit.interrupts) return;
    this.state = 'hurt'; this.until = now + hit.stun * (t.poise === 'heavy' ? 0.6 : 1); this.airborne = false;
    this.bang.setText('?').setVisible(!!hit.dazed);
    this.pose('hurt');
    this.kvx = p.face * hit.knock * t.knockMul; this.vz = hit.up * t.upMul;
  }

  freeze(now, ms) {
    if (this.dead) return;
    this.state = 'frozen'; this.until = now + ms; this.airborne = false; this.kvx = 0;
    this.bang.setVisible(false); this.sprite.anims.stop();
  }

  // Cats caught by this attack: in front within the box, close in depth, and not jumping over it.
  strike(now, near, w, depth, maxZ) {
    const sc = this.t.scale;
    for (const p of this.scene.players) {
      const ahead = (p.x - this.x) * this.face;
      if (ahead > near * sc - 10 && ahead < (near + w) * sc + 10 && Math.abs(p.y - this.y) <= depth && p.z < maxZ)
        this.scene.hurtPlayer(p, this.face, now);
    }
  }

  update(now, dt) {
    if (this.dead) return;
    const t = this.t, scene = this.scene, B = BRAWL;
    if (this.flashUntil && now > this.flashUntil && this.state !== 'hurt') { this.sprite.clearTint(); this.flashUntil = 0; }
    // knockback and gravity apply in every state
    if (this.kvx) { scene.move(this, this.kvx * dt, 0); this.kvx -= this.kvx * Math.min(1, 7 * dt); if (Math.abs(this.kvx) < 8) this.kvx = 0; }
    if (this.z > 0 || this.vz > 0) { this.vz -= B.gravity * dt; this.z = Math.max(0, this.z + this.vz * dt); if (this.z === 0) this.vz = 0; }

    const target = scene.nearest(this.x, this.y);
    const walk = (mx, my) => {
      const sp = t.speed + scene.waveIdx * 5;
      const bx = this.x; scene.move(this, mx * sp * dt, my * sp * B.depthSpeed * dt);
      if (mx && this.x === bx && !my) scene.move(this, 0, (this.y < (B.floorTop + B.floorBottom) / 2 ? 1 : -1) * sp * B.depthSpeed * dt);   // step around what is in the way
      if (mx || my) this.sprite.anims.play(this.key + '-walk', true); else this.pose('idle');
    };
    const windup = () => { this.state = 'windup'; this.t0 = now; this.until = now + t.windup; this.bang.setText('!').setVisible(true); };

    if (this.state === 'frozen') {
      if (!this.flashUntil) this.sprite.setTint(0x9fd8ff);
      if (now > this.until) { this.state = 'walk'; this.sprite.clearTint(); }

    } else if (this.state === 'hurt') {
      if (now > this.until) { this.state = 'walk'; this.sprite.clearTint(); this.bang.setVisible(false); }

    } else if (this.state === 'windup') {
      this.pose('windup', this.progress);
      if (now > this.until) {
        this.bang.setVisible(false); this.t0 = now; this.pose('swing');
        if (t.attack === 'throw') {
          scene.spawnShot('ball', this.x + this.face * 40, this.y, t.ball.height, this.face * t.ball.speed);
          this.state = 'recover'; this.until = now + t.recover; blip(600, 0.08, 'triangle', 0.05);
        } else if (t.attack === 'bounce') {                          // leap to where the cat was standing
          const air = 2 * -t.hop.vy / B.gravity, to = this.aim || { x: this.x, y: this.y };
          this.lvx = Phaser.Math.Clamp((to.x - this.x) / air, -t.hop.vx, t.hop.vx); this.lvy = (to.y - this.y) / air;
          this.vz = -t.hop.vy; this.z = 1; this.state = 'swing'; this.airborne = true; blip(200, 0.25, 'sine', 0.06);
        } else {
          this.state = 'swing'; this.until = now + t.swing;
          blip(t.attack === 'slam' ? 90 : 220, t.attack === 'slam' ? 0.3 : 0.12, 'triangle', 0.06);
          if (t.attack === 'slam') scene.cameras.main.shake(140, 0.008);
        }
      }

    } else if (this.state === 'swing') {
      if (this.airborne) {
        scene.move(this, this.lvx * dt, this.lvy * dt);
        if (this.z === 0) {                                          // lands: hits cats standing where he comes down
          this.airborne = false; this.state = 'recover'; this.until = now + t.recover; scene.cameras.main.shake(90, 0.005);
          for (const p of scene.players) if (Math.abs(p.x - this.x) < this.half + 30 && Math.abs(p.y - this.y) < 30 && p.z < 30) scene.hurtPlayer(p, Math.sign(p.x - this.x) || 1, now);
        }
      } else if (t.attack === 'slam') {
        this.strike(now, t.box.near, t.box.w, 40, 16); this.pose('swing', this.progress);
        if (now > this.until) { this.state = 'recover'; this.until = now + t.recover; }
      } else {
        scene.move(this, this.face * t.lunge * dt, 0);
        this.strike(now, t.box.near, t.box.w, B.hitDepth, t.box.h * t.scale); this.pose('swing', this.progress);
        if (now > this.until) { this.state = 'recover'; this.until = now + t.recover; }
      }

    } else if (this.state === 'recover') {
      if (now > this.until) { this.state = 'walk'; this.pose('idle'); }

    } else if (!target) {
      this.pose('idle');

    } else {
      const dx = target.x - this.x, dy = target.y - this.y, dist = Math.abs(dx);
      this.face = dx < 0 ? -1 : 1;
      const wantY = Phaser.Math.Clamp(target.y + this.slot, B.floorTop, B.floorBottom);
      const stepY = Math.abs(wantY - this.y) > 3 ? Math.sign(wantY - this.y) : 0;
      if (t.attack === 'throw') {                                    // hang back on the cat's line and serve
        const mid = (t.keep[0] + t.keep[1]) / 2, wantX = target.x - this.face * mid;
        const stepX = Math.abs(wantX - this.x) > 30 ? Math.sign(wantX - this.x) : 0;
        if (!stepX && Math.abs(dy) < 10 && now > this.nextThrow) { this.nextThrow = now + t.recover + t.windup + 300; windup(); }
        else walk(stepX, stepY);
      } else if (t.attack === 'bounce') {
        if (Math.hypot(dx, dy * 2) < t.trigger) { this.aim = { x: target.x, y: target.y }; windup(); } else walk(this.face, stepY);
      } else {
        const lined = Math.abs(dy) <= (t.attack === 'slam' ? 34 : B.hitDepth - 3);
        if (dist < t.trigger * t.scale && lined) windup();
        else {                                                       // come at the cat from this officer's own side
          const wantX = target.x + this.side * t.trigger * t.scale * 0.8;
          const stepX = dist < t.trigger * t.scale * 0.6 && !lined ? 0 : Math.abs(wantX - this.x) > 8 ? Math.sign(wantX - this.x) : 0;
          walk(stepX, stepY);
        }
      }
    }
    this.sprite.setFlipX(this.face < 0);
    this.draw();
  }

  draw() {
    this.sprite.setPosition(this.x, this.y - this.z).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y).setDepth(this.y - 0.5).setScale(1 - Math.min(0.5, this.z / 300));
    this.bang.setPosition(this.x, this.y - this.z - this.height - 4);
  }
}
