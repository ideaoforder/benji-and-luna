import { setManifest, loadSheets, makeAnims } from '../sprites.js';
import { ROOMS } from '../maps.js';

// Loads the manifest and maps first, then every sheet the manifest lists, then starts the first room.
export class Boot extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    this.load.json('manifest', 'assets/manifest.json');
    for (const r of ROOMS) this.load.json('map-' + r, 'maps/' + r + '.tmj');
    this.load.image('slash', 'assets/slash.png');
  }

  create() {
    setManifest(this.cache.json.get('manifest'));
    loadSheets(this);
    this.load.once('complete', () => {
      const cat = { idle: 4, walk: 10, run: 14 };
      makeAnims(this, (key, row) => key.startsWith('officer') ? 5 : cat[row] || 8);
      // Pixel art: sample sheets without smoothing so edges stay hard when scaled.
      for (const key of [...Object.keys(this.cache.json.get('manifest')), 'slash'])
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.scene.launch('hud');
      this.scene.start('room', { room: ROOMS[0] });
    });
    this.load.start();
  }
}
