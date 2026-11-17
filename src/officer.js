import { OFFICERS } from './config.js';
import { frame } from './sprites.js';
import { overlaps, bodyRect, frontRect } from './geom.js';
import { blip } from './sound.js';
import { state } from './state.js';

// One Animal Control officer. All types share this state machine; OFFICERS[type] supplies the numbers
// and the attack style. The scene provides players, hurtPlayer(), popText(), spawnBall() and strikes[].
export class Officer {
  constructor(scene, type, x, y, face) {
    this.scene = scene; this.type = type; this.t = OFFICERS[type]; this.key = 'officer-' + type;
    this.hp = this.t.hp; this.state = 'walk'; this.until = 0; this.face = face; this.flashUntil = 0;
    this.nextHop = 0; this.airFrom = 0;
    const s = this.sprite = scene.physics.add.sprite(x, y, this.key, frame(this.key, 'idle')).setDepth(8).setScale(this.t.scale);
    const [bw, bh] = this.t.body;
    s.body.setSize(bw, bh); s.body.setOffset((s.width - bw) / 2, s.height - bh);
    s.setCollideWorldBounds(true);
    scene.physics.add.collider(s, scene.solids);
    this.bang = scene.add.text(0, 0, '!', { fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold',
      color: '#ffe066', stroke: '#1c1630', strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(30).setVisible(false);
  }

  get dead() { return this.state === 'dead'; }
  rect() { return bodyRect(this.sprite.body); }
  pose(row) { this.sprite.anims.stop(); this.sprite.setFrame(frame(this.key, row)); }

  attackRect() {
    const k = this.t.box, b = this.sprite.body, sc = this.t.scale;
    return frontRect(this.sprite.x, this.face, k.near * sc, k.w * sc, b.bottom - k.h * sc, k.h * sc);
  }

  // hit = { dmg, knock, up, stun, interrupts, heavy, dazed }; p is the attacking player.
  hurt(p, now, hit) {
    if (this.dead) return;
    const t = this.t, s = this.sprite, scene = this.scene;
    const guardUp = t.guard && !hit.dazed && (this.state === 'walk' || this.state === 'windup');
    if (guardUp && (p.sprite.x - s.x) * this.face > 0) {            // briefcase in the way
      blip(900, 0.06, 'square', 0.05); scene.popText(s.x, s.body.top, 'BLOCK');
      p.sprite.body.setVelocityX(-p.face * 240); p.hurtUntil = now + 160;
      return;
    }
    this.hp -= hit.dmg; s.setTint(hit.dazed ? 0xa8c4ff : 0xffb0b0); this.flashUntil = now + 120;
    if (hit.dmg) blip(hit.heavy ? 140 : 240, 0.14, 'square', 0.06);
    if (hit.dmg && hit.heavy) scene.cameras.main.shake(70, 0.005);
    if (this.hp <= 0) {
      this.state = 'dead'; state.beaten++; this.bang.setVisible(false); this.pose('hurt');
      s.body.setVelocity(p.face * 320, -420); s.body.checkCollision.none = true; s.setCollideWorldBounds(false);
      scene.tweens.add({ targets: s, angle: p.face * 200, alpha: 0, duration: 900,
        onComplete: () => { s.destroy(); this.bang.destroy(); } });
      return;
    }
    const committed = this.state === 'windup' || this.state === 'swing';
    if (t.poise === 'heavy' && !hit.dazed && !hit.heavy) return;     // shrugs off light hits
    if (committed && !hit.interrupts) return;
    this.state = 'hurt'; this.until = now + hit.stun * (t.poise === 'heavy' ? 0.6 : 1);
    this.bang.setText('?').setVisible(!!hit.dazed);
    this.pose('hurt');
    s.body.setVelocity(p.face * hit.knock * t.knockMul, -hit.up * t.upMul);
  }

  strike(now, rect) {
    const scene = this.scene;
    scene.strikes.push({ box: rect, until: now + 30, color: 0xff4444 });
    for (const p of scene.players)
      if (overlaps(rect, bodyRect(p.sprite.body))) scene.hurtPlayer(p, this.face, now);
  }

  update(now) {
    if (this.dead) return;
    const t = this.t, s = this.sprite, b = s.body, scene = this.scene;
    if (this.flashUntil && now > this.flashUntil && this.state !== 'hurt') { s.clearTint(); this.flashUntil = 0; }
    this.bang.setPosition(s.x, b.top - 4);

    let target = null, best = 1e9;
    for (const p of scene.players) {
      if (p.downUntil) continue;
      const d = Math.abs(p.sprite.x - s.x) + Math.abs(p.sprite.y - s.y) * 0.5;
      if (d < best) { best = d; target = p; }
    }

    if (this.state === 'hurt') {
      if (b.blocked.down && now > this.until - 200) b.setVelocityX(0);
      if (now > this.until) { this.state = 'walk'; s.clearTint(); this.bang.setVisible(false); }

    } else if (this.state === 'windup') {
      b.setVelocityX(0); this.pose('windup');
      if (now > this.until) {
        this.bang.setVisible(false); this.pose('swing');
        if (t.attack === 'throw') {
          scene.spawnBall(s.x + this.face * 40, b.bottom - t.ball.height, this.face * t.ball.speed);
          this.state = 'recover'; this.until = now + t.recover; blip(600, 0.08, 'triangle', 0.05);
        } else if (t.attack === 'bounce') {
          // Aim the leap: cover the distance to the cat during the time in the air.
          const air = 2 * -t.hop.vy / scene.physics.world.gravity.y;
          const vx = Phaser.Math.Clamp((this.hopDist || 200) / air, 120, t.hop.vx);
          b.setVelocity(this.face * vx, t.hop.vy);
          this.state = 'swing'; this.airFrom = now; blip(200, 0.25, 'sine', 0.06);
        } else {
          this.state = 'swing'; this.until = now + t.swing;
          blip(t.attack === 'slam' ? 90 : 220, t.attack === 'slam' ? 0.3 : 0.12, 'triangle', 0.06);
          if (t.attack === 'slam') scene.cameras.main.shake(140, 0.008);
        }
      }

    } else if (this.state === 'swing') {
      if (t.attack === 'bounce') {                                   // dangerous while in the air
        this.strike(now, this.rect());
        if (b.blocked.down && now > this.airFrom + 150) {
          this.state = 'recover'; this.until = now + t.recover; b.setVelocityX(0); scene.cameras.main.shake(90, 0.005);
        }
      } else {
        b.setVelocityX(this.face * t.lunge);
        this.strike(now, this.attackRect());
        if (now > this.until) { this.state = 'recover'; this.until = now + t.recover; b.setVelocityX(0); }
      }

    } else if (this.state === 'recover') {
      b.setVelocityX(0);
      if (now > this.until) { this.state = 'walk'; this.pose('idle'); }

    } else if (!target) {
      b.setVelocityX(0); this.pose('idle');

    } else {
      const dx = target.sprite.x - s.x, dist = Math.abs(dx);
      const rise = b.bottom - target.sprite.body.bottom;             // > 0: target is above
      this.face = dx < 0 ? -1 : 1;
      const walk = dir => { b.setVelocityX(dir * (t.speed + scene.waveIdx * 5)); s.anims.play(this.key + '-walk', true); };
      const startWindup = () => { this.state = 'windup'; this.until = now + t.windup; this.bang.setText('!').setVisible(true); };

      if (t.attack === 'throw') {
        const cornered = b.blocked.left || b.blocked.right || s.x < 60 || s.x > scene.map.w - 60;
        if (dist < t.keep[0] && !cornered) walk(-this.face);         // back off, still facing the cat
        else if (dist > t.keep[1]) walk(this.face);
        else startWindup();
      } else if (t.attack === 'bounce') {
        if (dist < t.trigger && b.blocked.down) { this.hopDist = dist; startWindup(); } else walk(this.face);
      } else if (dist < t.trigger && Math.abs(rise) < 60) {
        startWindup();
      } else if (dist > 30) {
        walk(this.face);
        const blocked = b.blocked.left || b.blocked.right;
        const chase = t.jumps && rise > 60 && dist < 240;            // punks jump up after you
        if (b.blocked.down && now > this.nextHop && (blocked || chase) && t.attack !== 'slam') {
          b.setVelocityY(chase ? -700 : -560); this.nextHop = now + 900;
        }
      } else if (rise < -60) { walk(this.face || 1);                 // cat is right below: step off the ledge
      } else { b.setVelocityX(0); this.pose('idle'); }
    }
    s.setFlipX(this.face < 0);
  }
}
