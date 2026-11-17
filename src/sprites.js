// Sprite sheets are described by assets/manifest.json (written by the tools/ scripts):
//   { key: { file, frameWidth, frameHeight, cols, rows: [names], counts: { name: n } } }
// Code asks for frames by row name, so new art with different frame counts just works.
let manifest = {};

export function setManifest(m) { manifest = m; }
export const sheet = key => manifest[key];
export const hasRow = (key, row) => !!(manifest[key] && manifest[key].counts[row]);

// Frame index of the i-th frame in a named row (clamped), or null if the sheet has no such row.
export function frame(key, row, i = 0) {
  const m = manifest[key]; if (!m || !m.counts[row]) return null;
  return m.rows.indexOf(row) * m.cols + Math.min(i, m.counts[row] - 1);
}

export function loadSheets(scene) {
  for (const key in manifest) {
    const m = manifest[key];
    scene.load.spritesheet(key, 'assets/' + m.file, { frameWidth: m.frameWidth, frameHeight: m.frameHeight });
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
      // The cats' 4th idle frame on the concept sheet is a different pose; ping-pong the first three.
      if (row === 'idle' && idx.length >= 3 && !key.startsWith('officer')) idx = [idx[0], idx[1], idx[2], idx[1]];
      scene.anims.create({ key: name, frames: idx.map(f => ({ key, frame: f })),
        frameRate: rate(key, row), repeat: -1 });
    }
  }
}
