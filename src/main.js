import { W, H, GRAVITY } from './config.js';
import { Alley } from './scenes/alley.js';

window.__game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: W, height: H, backgroundColor: '#1c1630',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY } } },
  scene: [Alley]
});
