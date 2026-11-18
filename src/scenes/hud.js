import { W, H, RES, MODE, PLAYER_COLORS, CATS, MOVES, SPECIALS, TOOLS, POWERUPS, aim } from '../config.js';
import { consume, held } from '../input.js';
import { state, resetState } from '../state.js';
import { ROOMS, STREETS } from '../maps.js';

const st = { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff', stroke: '#1c1630',
             strokeThickness: 4, resolution: RES };

// Everything pinned to the screen. Runs on top of the current room and survives room changes.
export class Hud extends Phaser.Scene {
  constructor() { super('hud'); }

  create() {
    aim(this.cameras.main);
    // One panel per player, four across the top (two each side of the centre buttons): P-number and hearts above,
    // the equipped special with its charge bar and the equipped tool with uses left below.
    this.gauges = this.add.graphics();
    this.rows = [10, 222, 530, 742].map((x, i) => {
      const y = 8, icon = { ...st, fontSize: '14px' };
      return { x, y, tag: this.add.text(x, y, 'P' + (i + 1), { ...st, fontStyle: 'bold', color: PLAYER_COLORS[i].css }),
               label: this.add.text(x + 28, y, '', st), special: this.add.text(x, y + 23, '', icon),
               picture: this.add.image(x, y + 34, 'slash').setOrigin(0, 0.5).setVisible(false),      // for specials whose icon is a drawing
               tool: this.add.text(0, y + 23, '', icon), left: this.add.text(0, y + 23, '', icon) };
    });
    this.setPlayers([]);
    this.combo = this.add.text(14, 84, '', { ...st, fontSize: '26px', fontStyle: 'bold', color: '#ffe066', strokeThickness: 6 }).setVisible(false);
    this.comboShown = 0;
    // A page that loses focus stops receiving the controller. Say so, instead of leaving the cats frozen.
    this.focusHint = this.add.text(W / 2, 300, 'Tap the screen to give the controller back to the game',
      { ...st, fontSize: '22px', fontStyle: 'bold', color: '#ffe066', strokeThickness: 6 }).setOrigin(0.5).setVisible(false);
    this.bossBar = this.add.graphics();
    this.bossName = this.add.text(W / 2, 50, '', { ...st, fontSize: '15px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.score = this.add.text(W - 12, 56, '', { ...st, fontSize: '14px', align: 'right' }).setOrigin(1, 0);
    this.banner = this.add.text(W / 2, 120, '', { ...st, fontSize: '40px', fontStyle: 'bold', strokeThickness: 7, align: 'center' })
      .setOrigin(0.5).setAlpha(0);
    this.shade = this.add.rectangle(W / 2, H / 2, W, H, 0x100c20, 0.6).setVisible(false);
    this.shade.setFillStyle(0x100c20, 0.82);
    this.pausedText = this.add.text(W / 2, 84, 'PAUSED', { ...st, fontSize: '34px', fontStyle: 'bold', strokeThickness: 7 }).setOrigin(0.5).setVisible(false);
    this.pausedHint = this.add.text(W / 2, 512, 'Start or P: carry on        Hold Start or press R: start over', { ...st, fontSize: '16px', color: '#ffe066' }).setOrigin(0.5).setVisible(false);
    // The pause screen doubles as the manual. Tools, specials and pick-ups are read from config, so new ones show up here.
    const up = MODE === 'brawler';
    const pages = [
      ['CONTROLLER', [
        'Move: stick or d-pad' + (up ? ' (up and down too)' : ''),
        'Jump: bottom button', 'Attack: left button', 'Special: right button', 'Tool: top button',
        'Swap cat: Select', 'Next tool: Select + top', 'Next special: Select + right',
        'Pause: Start', '',
        'KEYBOARD', up ? 'WASD move   Space jump' : 'A D move   W jump', 'F attack   G special   H tool', 'Q swap   E next tool   T next special']],
      ['MOVES', [
        'Combo: keep pressing attack', 'Tail somersault: attack in the air',
        ...(up ? Object.values(MOVES).map(m => m.name + ': ' + m.how) : []), '',
        'THE CATS  (Select swaps)', ...Object.values(CATS).map(c => c.name + ': ' + c.blurb), '',
        'SPECIALS  (the bar must be full)',
        ...Object.values(SPECIALS).map(s => s.icon + '  ' + s.name + ': ' + s.tip)]],
      ['TOOLS  (uses refill in each street)', [
        ...Object.values(TOOLS).map(t => t.icon + '  ' + t.name + ' \u00D7' + t.uses + ': ' + t.tip), '',
        'PICK-UPS',
        ...Object.values(POWERUPS).filter(u => !u.tool && !u.special).map(u => u.icon + '  ' + u.name.replace(/!$/, '') +
          (u.time ? ': double damage for ' + u.time / 1000 + ' s' : u === POWERUPS.bell ? ': blocks one hit' : '')), '',
        'DOORS', 'Beat every wave and the doors open.', up ? 'Wall doors: stand in front, walk up.' : '']]];
    this.manual = pages.flatMap(([head, lines], i) => {
      const x = 34 + i * 306;
      return [this.add.text(x, 112, head, { ...st, fontSize: '15px', fontStyle: 'bold', color: '#ffe066' }),
              this.add.text(x, 136, lines.join('\n'), { ...st, fontSize: '13px', strokeThickness: 3, lineSpacing: 5, wordWrap: { width: 292 } })];
    });
    this.manual.forEach(o => o.setVisible(false));
    this.paused = false;
    this.title = this.add.text(W / 2, 130, 'BENJI & LUNA', { ...st, fontSize: '54px', fontStyle: 'bold', strokeThickness: 8 }).setOrigin(0.5);
    const platformer = [
      'Controller buttons by position: bottom jump   left attack   right special   top tool',
      'Select swaps cat   Select + top: next tool   Select + right: next special',
      'Keyboard 1: A D move   W jump   F attack   G special   H tool   Q swap   E next tool   T next special',
      'Keyboard 2: \u2190 \u2192 move   \u2191 jump   , attack   . special   / tool   Right Shift swap   \' next tool   ; next special'];
    const brawler = [
      'Controller buttons by position: bottom jump   left attack   right special   top tool',
      'Select swaps cat   Select + top: next tool   Select + right: next special',
      'Keyboard 1: W A S D move   Space jump   F attack   G special   H tool   Q swap   E next tool   T next special',
      'Keyboard 2: arrows move   Enter jump   , attack   . special   / tool   Right Shift swap   \' next tool   ; next special'];
    this.help = this.add.text(W / 2, 186,
      'Press a button to join (up to 4 cats)\n\n' + (MODE === 'brawler' ? brawler : platformer).join('\n') + '\n' +
      'Keep pressing attack for a combo. Attack in the air for a tail somersault.\n' +
      'Touch: buttons at the bottom of the screen\n' +
      'Pause: Start or P      Start over: R, hold Start, or tap \u21BB twice      Hitboxes: `',
      { ...st, fontSize: '14px', align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0);
  }

  // list: [{ n, hp, max, down, status, special: { icon, charge: 0..1 }, tool: { icon, left } | null }], in player order.
  // (The platformer still sends { label, color } instead of n/hp/max; that is shown as plain text.)
  setPlayers(list) {
    const g = this.gauges; g.clear();
    this.rows.forEach((row, i) => {
      const p = list[i];
      for (const k of ['tag', 'label', 'special', 'tool', 'left']) row[k].setVisible(!!p && (k === 'tag' || k === 'label' || k === 'special' || !!p.tool));
      if (!p) { row.picture.setVisible(false); return; }
      const color = p.color || PLAYER_COLORS[i].hex;
      if (p.label) { row.tag.setVisible(false); row.label.setX(row.x).setText(p.label); }
      else row.label.setText((p.down ? 'netted!' : '\u2665'.repeat(p.hp) + '\u2661'.repeat(Math.max(0, p.max - p.hp))) + (p.status ? ' ' + p.status : ''))
        .setFontSize(p.max > 9 ? 13 : 16);
      const ready = p.special.charge >= 1, w = 44, h = 8, by = row.y + 30;
      const drawn = !!p.special.image;
      row.special.setText(p.special.icon).setAlpha(ready ? 1 : 0.45).setVisible(!drawn);
      row.picture.setVisible(drawn).setAlpha(ready ? 1 : 0.45);
      if (drawn) row.picture.setTexture(p.special.image).setDisplaySize(26, 14);
      const bx = row.x + (drawn ? 26 : row.special.width) + 5;
      g.fillStyle(0x1c1630, 1); g.fillRect(bx - 2, by - 2, w + 4, h + 4);
      g.fillStyle(0xffffff, 0.18); g.fillRect(bx, by, w, h);
      g.fillStyle(ready ? color : 0xffffff, ready ? 1 : 0.5); g.fillRect(bx, by, w * p.special.charge, h);
      if (!p.tool) return;
      const x = bx + w + 14;
      row.tool.setText(p.tool.icon).setX(x).setAlpha(p.tool.left ? 1 : 0.35);
      row.left.setText('\u00D7' + p.tool.left).setX(x + row.tool.width + 3).setAlpha(p.tool.left ? 1 : 0.45);
    });
  }

  // Party hit counter: shown from 3 hits up, pops when it grows.
  setCombo(n) {
    this.combo.setVisible(n >= 3);
    if (n >= 3 && n !== this.comboShown) {
      this.combo.setText(n + ' HITS'); this.combo.setScale(1.3);
      this.tweens.killTweensOf(this.combo); this.tweens.add({ targets: this.combo, scale: 1, duration: 140 });
    }
    this.comboShown = n;
  }

  // boss: { name, hp: 0..1, raging } or null
  setBoss(boss) {
    const g = this.bossBar; g.clear(); this.bossName.setVisible(!!boss);
    if (!boss) return;
    this.bossName.setText(boss.name);
    const w = 380, x = W / 2 - w / 2, y = 74;
    g.fillStyle(0x1c1630, 1); g.fillRect(x - 3, y - 3, w + 6, 16);
    g.fillStyle(0xffffff, 0.18); g.fillRect(x, y, w, 10);
    g.fillStyle(boss.raging ? 0xff5a5a : 0xffb84a, 1); g.fillRect(x, y, w * Math.max(0, boss.hp), 10);
  }

  update() {
    this.focusHint.setVisible(!document.hasFocus());
    const toggle = consume('KeyP', 9) | consume('Pause');                             // always read, so a press on the title is not saved up
    if (!state.party.length) { if (this.paused) this.setPaused(false); return; }
    if (toggle) this.setPaused(!this.paused);          // Start / + on a controller
    else if (this.paused && (held(9, 1200) | consume('KeyR') | consume('Restart'))) {   // the game scene is asleep, so start over from here
      this.setPaused(false); resetState();
      this.scene.get(this.gameKey).scene.restart({ room: MODE === 'brawler' ? STREETS[0] : ROOMS[0] });
    }
  }

  // Pausing puts the game scene to sleep: its update, tweens, animations and timers all stop. Phaser's scene clock
  // would jump forward by the length of the pause on waking (it follows the game clock), and every "until" time in
  // the game is measured on it, so the clock is wrapped once to leave paused time out.
  get gameKey() { return MODE === 'brawler' ? 'brawl' : 'room'; }
  setPaused(on) {
    const game = this.scene.get(this.gameKey), clock = game.time, loop = this.game.loop;
    if (clock.skipped === undefined) {
      const update = clock.update, events = game.sys.events; clock.skipped = 0;
      clock.update = function (time, delta) { update.call(this, time - this.skipped, delta); };
      events.off('update', update, clock); events.on('update', clock.update, clock);      // swap the listener already registered; restarts pick up the new one
    }
    if (on === this.paused) return;
    this.paused = on;
    if (on) { this.pausedAt = loop.time; this.scene.pause(this.gameKey); }
    else { clock.skipped += loop.time - this.pausedAt; this.scene.resume(this.gameKey); }
    for (const o of [this.shade, this.pausedText, this.pausedHint, ...this.manual]) o.setVisible(on);
  }

  showTitle(on) { this.title.setVisible(on); this.help.setVisible(on); }

  // hold = ms before fading out; 0 keeps it up.
  showBanner(text, hold) {
    this.banner.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    if (hold) this.tweens.add({ targets: this.banner, alpha: 0, delay: hold, duration: 500 });
  }
}
