import { W, RES, aim } from '../config.js';

const st = { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff', stroke: '#1c1630',
             strokeThickness: 4, resolution: RES };

// Everything pinned to the screen. Runs on top of the current room and survives room changes.
export class Hud extends Phaser.Scene {
  constructor() { super('hud'); }

  create() {
    aim(this.cameras.main);
    this.players = this.add.text(12, 10, '', st);
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

  showTitle(on) { this.title.setVisible(on); this.help.setVisible(on); }

  // hold = ms before fading out; 0 keeps it up.
  showBanner(text, hold) {
    this.banner.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    if (hold) this.tweens.add({ targets: this.banner, alpha: 0, delay: hold, duration: 500 });
  }
}
