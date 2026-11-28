// Icons and effect sheets (assets/fx.json, made by tools/import_fx.py). Each sheet is stored at 2x its on-screen
// size, so sprites are shown at SCALE. Everything here falls back gracefully: callers check has() first.

export const SCALE = 0.5;

// Frame of each icon in the icons strip, by the name used in config (pick-ups, tools, specials).
export const ICON = { fish: 0, catnip: 1, bell: 2, milk: 3, fire: 4, sticky: 5, heal: 6, meow: 7, pounce: 8,
                      heart: 9, heartEmpty: 10, fishbone: 11, paw: 8, stash: 8 };      // paw: golden paws (shares the pounce icon for now)
export const iconFrame = name => ICON[name];

export const has = (scene, key) => scene.textures.exists(key);

// Looping animations, made once the sheets are loaded.
export function makeFxAnims(scene) {
  const loop = (key, sheet, frames, rate) => {
    if (has(scene, sheet) && !scene.anims.exists(key))
      scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(sheet, { frames }), frameRate: rate, repeat: -1 });
  };
  loop('fx-fireball', 'fx-fireball', [0, 1, 2, 3], 14);
  loop('fx-net', 'fx-net', [0, 1], 8);
  loop('fx-ball', 'fx-ball', [0, 1], 10);
  loop('fx-sticky-fly', 'fx-sticky', [0, 1], 8);
  loop('fx-wave', 'fx-wave', [0, 1, 2], 12);
}

// Step a sprite through frames [from..to] over `ms`, then call done (if given).
export function playFrames(scene, sprite, from, to, ms, done) {
  sprite.setFrame(from);
  scene.tweens.addCounter({ from, to: to + 0.999, duration: ms,
    onUpdate: tw => { if (sprite.active) sprite.setFrame(Math.min(to, Math.floor(tw.getValue()))); },
    onComplete: () => done && done() });
}

// A one-off effect at a spot, sized to `size` on-screen pixels across, removed when it finishes.
export function burstFx(scene, sheet, x, y, size, depth, from, to, ms) {
  const s = scene.add.sprite(x, y, sheet, from).setDepth(depth);
  s.setScale(size / s.width);
  playFrames(scene, s, from, to, ms, () => s.destroy());
  return s;
}
