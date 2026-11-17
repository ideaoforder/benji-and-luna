import { W, RES, MODE, aim } from '../config.js';

const st = { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff', stroke: '#1c1630',
             strokeThickness: 4, resolution: RES };

// Everything pinned to the screen. Runs on top of the current room and survives room changes.
export class Hud extends Phaser.Scene {
  constructor() { super('hud'); }

  create() {
    aim(this.cameras.main);
    // One row per player: label and hearts, the equipped special with its charge bar, the equipped tool with uses left.
    this.gauges = this.add.graphics();
    this.rows = [0, 1, 2, 3].map(i => {
      const y = 10 + i * 24, icon = { ...st, fontSize: '14px' };
      return { y, label: this.add.text(12, y, '', st), special: this.add.text(0, y + 1, '', icon),
               tool: this.add.text(0, y + 1, '', icon), left: this.add.text(0, y + 1, '', icon) };
    });
    this.setPlayers([]);
    this.combo = this.add.text(14, 116, '', { ...st, fontSize: '26px', fontStyle: 'bold', color: '#ffe066', strokeThickness: 6 }).setVisible(false);
    this.comboShown = 0;
    // A page that loses focus stops receiving the controller. Say so, instead of leaving the cats frozen.
    this.focusHint = this.add.text(W / 2, 300, 'Tap the screen to give the controller back to the game',
      { ...st, fontSize: '22px', fontStyle: 'bold', color: '#ffe066', strokeThickness: 6 }).setOrigin(0.5).setVisible(false);
    this.bossBar = this.add.graphics();
    this.bossName = this.add.text(W / 2, 50, '', { ...st, fontSize: '15px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.score = this.add.text(W - 12, 10, '', { ...st, align: 'right' }).setOrigin(1, 0);
    this.banner = this.add.text(W / 2, 120, '', { ...st, fontSize: '40px', fontStyle: 'bold', strokeThickness: 7, align: 'center' })
      .setOrigin(0.5).setAlpha(0);
    this.title = this.add.text(W / 2, 130, 'BENJI & LUNA', { ...st, fontSize: '54px', fontStyle: 'bold', strokeThickness: 8 }).setOrigin(0.5);
    const platformer = [
      'Controller: A jump   X attack   Y special   RB tool   LB swap cat   RT next tool   LT next special',
      'Keyboard 1: A D move   W jump   F attack   G special   H tool   Q swap   E next tool   T next special',
      'Keyboard 2: \u2190 \u2192 move   \u2191 jump   , attack   . special   / tool   Right Shift swap   \' next tool   ; next special'];
    const brawler = [
      'Controller: stick moves in all four directions   A jump   X attack   Y special   RB tool   LB swap cat',
      'Keyboard 1: W A S D move   Space jump   F attack   G special   H tool   Q swap   E next tool   T next special',
      'Keyboard 2: arrows move   Enter jump   , attack   . special   / tool   Right Shift swap   \' next tool   ; next special'];
    this.help = this.add.text(W / 2, 196,
      'Press a button to join (up to 4 cats)\n\n' + (MODE === 'brawler' ? brawler : platformer).join('\n') + '\n' +
      'Keep pressing attack for a combo. Attack in the air for a tail somersault.\n' +
      'Touch: buttons at the bottom of the screen\n' +
      'Start over: R, hold Start, or tap \u21BB twice',
      { ...st, fontSize: '14px', align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0);
  }

  // list: [{ label, color, special: { icon, charge: 0..1 }, tool: { icon, left } | null }]
  setPlayers(list) {
    const g = this.gauges; g.clear();
    this.rows.forEach((row, i) => {
      const p = list[i];
      for (const k of ['label', 'special', 'tool', 'left']) row[k].setVisible(!!p && (k === 'label' || k === 'special' || !!p.tool));
      if (!p) return;
      row.label.setText(p.label);
      let x = row.label.x + row.label.width + 14;
      const ready = p.special.charge >= 1, w = 40, h = 8, by = row.y + 8;
      row.special.setText(p.special.icon).setX(x).setAlpha(ready ? 1 : 0.45);
      const bx = x + row.special.width + 5;
      g.fillStyle(0x1c1630, 1); g.fillRect(bx - 2, by - 2, w + 4, h + 4);
      g.fillStyle(0xffffff, 0.18); g.fillRect(bx, by, w, h);
      g.fillStyle(ready ? p.color : 0xffffff, ready ? 1 : 0.5); g.fillRect(bx, by, w * p.special.charge, h);
      if (!p.tool) return;
      x = bx + w + 16;
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

  update() { this.focusHint.setVisible(!document.hasFocus()); }

  showTitle(on) { this.title.setVisible(on); this.help.setVisible(on); }

  // hold = ms before fading out; 0 keeps it up.
  showBanner(text, hold) {
    this.banner.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    if (hold) this.tweens.add({ targets: this.banner, alpha: 0, delay: hold, duration: 500 });
  }
}
