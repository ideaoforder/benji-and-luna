import { setManifest, loadSheets, makeAnims } from '../sprites.js';
import { makeFxAnims } from '../fx.js';
import { ROOMS, STREETS, AREAS, CLIMBS, RIDES, setAreas } from '../maps.js';
import { run } from '../state.js';
import { MODE, fresh, hourly } from '../config.js';

// Loads the manifest and the list of areas first, then the streets, then every sheet the manifest lists, then starts the first room.
export class Boot extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    this.load.json('manifest', fresh('assets/manifest.json'));
    for (const r of ROOMS) this.load.json('map-' + r, fresh('maps/' + r + '.tmj'));
    this.load.json('areas', fresh('maps/areas.json'));
    this.load.json('scenery', fresh('assets/scenery.json'));
    this.load.json('fx', fresh('assets/fx.json'));                 // icons and effects; see tools/import_fx.py        // which level art exists; see tools/import_scenery.py
    this.load.image('slash', hourly('assets/slash.png'));
    for (const k of ['stinky', 'feather', 'catbed']) this.load.image(k, hourly('assets/' + k + '.png'));     // tools/pickups.py
  }

  create() {
    setManifest(this.cache.json.get('manifest'));
    setAreas(this.cache.json.get('areas'));
    for (const r of STREETS) this.load.json('street-' + r, fresh('maps/brawl/' + r + '.tmj'));
    for (const r of CLIMBS) this.load.json('climb-' + r, fresh('maps/climb/' + r + '.tmj'));
    for (const r of RIDES) this.load.json('cart-' + r, fresh('maps/cart/' + r + '.tmj'));
    loadSheets(this);
    const fx = this.cache.json.get('fx') || {};
    for (const key in fx) this.load.spritesheet(key, hourly('assets/' + fx[key].file), { frameWidth: fx[key].frameWidth, frameHeight: fx[key].frameHeight });
    const scenery = this.cache.json.get('scenery') || {};
    // Props are small and shared, so they load now. Each street's own backdrop loads when the street is entered (src/brawl/scene.js).
    for (const key in scenery) if (key.startsWith('prop-') || key === 'logo' || key === 'title') this.load.image(key, hourly('assets/scenery/' + scenery[key].file));
    this.load.once('complete', () => {
      const cat = { idle: 4, walk: 10, run: 14 };
      makeAnims(this, (key, row) => key.startsWith('officer') ? 7 : cat[row] || 8);
      makeFxAnims(this);
      // Pixel art: sample sheets without smoothing so edges stay hard when scaled.
      for (const key of [...Object.keys(this.cache.json.get('manifest')), 'slash'])
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.scene.launch('hud');
      if (MODE === 'brawler') this.scene.start('brawl', { room: AREAS[run.area].streets[0] }); else this.scene.start('room', { room: ROOMS[0] });
    });
    this.load.start();
  }
}
