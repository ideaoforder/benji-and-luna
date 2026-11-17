import { W, RES, aim } from '../config.js';

const st = { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff', stroke: '#1c1630',
             strokeThickness: 4, resolution: RES };

// Everything pinned to the screen. Runs on top of the current room and survives room changes.
export class Hud extends Phaser.Scene {
  constructor() { super('hud'); }

  create() {
    aim(this.cameras.main);
    // One row per player: label and hearts, then a charge gauge each for meow and somersault.
    this.gauges = this.add.graphics();
    this.rows = [0, 1, 2, 3].map(i => {
      const y = 10 + i * 24, icon = { ...st, fontSize: '14px' };
      return { y, label: this.add.text(12, y, '', st),
               meow: this.add.text(0, y + 1, '\u266A', icon), roll: this.add.text(0, y + 1, '\u27F3', icon) };
    });
    this.setPlayers([]);
    this.score = this.add.text(W - 12, 10, '', { ...st, align: 'right' }).setOrigin(1, 0);
    this.banner = this.add.text(W / 2, 120, '', { ...st, fontSize: '40px', fontStyle: 'bold', strokeThickness: 7, align: 'center' })
      .setOrigin(0.5).setAlpha(0);
    this.title = this.add.text(W / 2, 130, 'BENJI & LUNA', { ...st, fontSize: '54px', fontStyle: 'bold', strokeThickness: 8 }).setOrigin(0.5);
    this.help = this.add.text(W / 2, 206,
      'Press a button to join (up to 4 cats)\n\n' +
      'Controller: A jump   X claw   B meow   Y somersault   LB/RB swap cat\n' +
      'Keyboard 1: A D move   W jump   F claw   G meow   H somersault   Q swap\n' +
      'Keyboard 2: \u2190 \u2192 move   \u2191 jump   , claw   . meow   / somersault   Right Shift swap\n' +
      'Touch: buttons at the bottom of the screen\n' +
      'Start over: R, Start, or the \u21BB button      Show hitboxes: ` or Select',
      { ...st, align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0);
  }

  // list: [{ label, color, meow: 0..1, roll: 0..1 }]. A full gauge is lit; a charging one is dim and partly filled.
  setPlayers(list) {
    const g = this.gauges; g.clear();
    this.rows.forEach((row, i) => {
      const p = list[i];
      for (const k of ['label', 'meow', 'roll']) row[k].setVisible(!!p);
      if (!p) return;
      row.label.setText(p.label);
      let x = row.label.x + row.label.width + 14;
      for (const k of ['meow', 'roll']) {
        const ready = p[k] >= 1, w = 40, h = 8, by = row.y + 8;
        row[k].setX(x).setAlpha(ready ? 1 : 0.45);
        const bx = x + 18;
        g.fillStyle(0x1c1630, 1); g.fillRect(bx - 2, by - 2, w + 4, h + 4);
        g.fillStyle(0xffffff, 0.18); g.fillRect(bx, by, w, h);
        g.fillStyle(ready ? p.color : 0xffffff, ready ? 1 : 0.5); g.fillRect(bx, by, w * p[k], h);
        x = bx + w + 14;
      }
    });
  }

  showTitle(on) { this.title.setVisible(on); this.help.setVisible(on); }

  // hold = ms before fading out; 0 keeps it up.
  showBanner(text, hold) {
    this.banner.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    if (hold) this.tweens.add({ targets: this.banner, alpha: 0, delay: hold, duration: 500 });
  }
}
