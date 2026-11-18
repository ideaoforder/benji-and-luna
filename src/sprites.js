import { hourly } from './config.js';
// Sprite sheets are described by assets/manifest.json (written by the tools/ scripts):
//   { key: { file, frameWidth, frameHeight, cols, rows: [names], counts: { name: n }, anims?: { row: [order] } } }
// Code asks for frames by row name, so new art with different frame counts just works.
let manifest = {};

export function setManifest(m) { manifest = m; }
export const sheet = key => manifest[key];
// Every look a character has: the sheet called `key` plus any called `key-<something>` (officer-punk, officer-punk-female).
// New variants only need importing under such a name.
export const variants = key => Object.keys(manifest).filter(k => k === key || k.startsWith(key + '-'));
export const hasRow = (key, row) => !!(manifest[key] && manifest[key].counts[row]);
export const count = (key, row) => (manifest[key] && manifest[key].counts[row]) || 0;

// Frame index of the i-th frame in a named row (clamped), or null if the sheet has no such row.
export function frame(key, row, i = 0) {
  const m = manifest[key]; if (!m || !m.counts[row]) return null;
  return m.rows.indexOf(row) * m.cols + Math.min(i, m.counts[row] - 1);
}

export function loadSheets(scene) {
  for (const key in manifest) {
    const m = manifest[key];
    scene.load.spritesheet(key, hourly('assets/' + m.file), { frameWidth: m.frameWidth, frameHeight: m.frameHeight });
  }
}

// One looping animation per row that has more than one frame, named "<key>-<row>".
export function makeAnims(scene, rate = () => 8) {
  for (const key in manifest) {
    const m = manifest[key];
    for (const row of m.rows) {
      const name = key + '-' + row;
      if (scene.anims.exists(name)) continue;
      let idx = Array.from({ length: m.counts[row] }, (_, i) => frame(key, row, i));
      // A sheet can override the frame order of a row: manifest entry "anims": { "idle": [0, 1, 2, 1] }.
      if (m.anims && m.anims[row]) idx = m.anims[row].map(i => frame(key, row, i));
      scene.anims.create({ key: name, frames: idx.map(f => ({ key, frame: f })),
        frameRate: rate(key, row), repeat: -1 });
    }
  }
}
