import { hourly, CATS, PALETTES } from './config.js';
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
    if (m.garment) scene.load.image(m.garment.mask, hourly('assets/' + m.garment.file));
  }
}

// One looping animation per row that has more than one frame, named "<key>-<row>".
let rateOf = () => 8;
export function makeAnims(scene, rate = () => 8) {
  rateOf = rate;
  for (const key in manifest) animsFor(scene, key, key);
}
// The animations for texture `tex`, laid out like sheet `key` (a recoloured cat shares its sheet's layout).
function animsFor(scene, key, tex) {
  const m = manifest[key];
  for (const row of m.rows) {
    const name = tex + '-' + row;
    if (scene.anims.exists(name)) continue;
    let idx = Array.from({ length: m.counts[row] }, (_, i) => frame(key, row, i));
    // A sheet can override the frame order of a row: manifest entry "anims": { "idle": [0, 1, 2, 1] }.
    if (m.anims && m.anims[row]) idx = m.anims[row].map(i => frame(key, row, i));
    scene.anims.create({ key: name, frames: idx.map(f => ({ key: tex, frame: f })), frameRate: rateOf(key, row), repeat: -1 });
  }
}

// ---------- cat colours ----------
// The texture for a cat in a colour (a PALETTES key), made the first time it is asked for: the cat's sheet with its
// garment repainted. tools/recolor.py finds the garment once and saves it as a mask (manifest entry `garment`: the
// mask's texture key and the garment's typical saturation and brightness), so here it is only arithmetic.
export function skin(scene, catKey, colour) {
  const P = PALETTES[colour], g = manifest[catKey] && manifest[catKey].garment;
  if (!P || colour === 'classic' || colour === CATS[catKey].wears || !g || !scene.textures.exists(g.mask)) return catKey;
  const key = catKey + '-' + colour;
  if (scene.textures.exists(key)) return key;
  const m = manifest[catKey], base = scene.textures.get(catKey).getSourceImage(), mask = scene.textures.get(g.mask).getSourceImage();
  const w = base.width, h = base.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(mask, 0, 0); const mk = cx.getImageData(0, 0, w, h).data;
  cx.clearRect(0, 0, w, h); cx.drawImage(base, 0, 0);
  const img = cx.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    if (mk[i + 3] < 128 || px[i + 3] === 0) continue;
    const r = px[i] / 255, gg = px[i + 1] / 255, b = px[i + 2] / 255, mx = Math.max(r, gg, b), d = mx - Math.min(r, gg, b);
    const s0 = mx ? d / mx : 0;
    let th, ts, tv;
    if (P.rainbow) { const p = i / 4, x = p % w, y = (p / w) | 0; th = ((x % m.frameWidth) * 3 + (y % m.frameHeight) * 5) % 360; ts = 0.75; tv = 0.92; }
    else [th, ts, tv] = P.hsv;
    const S = Math.min(1, s0 / g.s * ts), V = Math.min(1, mx / g.v * tv);       // shading kept: relative to the typical pixel
    const hh = th / 60, k = n => (n + hh) % 6, f = n => V - V * S * Math.max(0, Math.min(k(n), 4 - k(n), 1));
    px[i] = Math.round(f(5) * 255); px[i + 1] = Math.round(f(3) * 255); px[i + 2] = Math.round(f(1) * 255);
  }
  cx.putImageData(img, 0, 0);
  scene.textures.addSpriteSheet(key, cv, { frameWidth: m.frameWidth, frameHeight: m.frameHeight });
  animsFor(scene, catKey, key);
  return key;
}
