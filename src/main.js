import { W, H, RES, GRAVITY } from './config.js';
import { Boot } from './scenes/boot.js';
import { Room } from './scenes/room.js';
import { Hud } from './scenes/hud.js';

window.__game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: W * RES, height: H * RES, backgroundColor: '#1c1630',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY } } },
  scene: [Boot, Room, Hud]
});
