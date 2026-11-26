#!/usr/bin/env python3
"""Find each cat's garment so the game can repaint it in any colour.

Each cat wears one thing (Benji's hoodie, Luna's bandana). The game repaints it in the player's colour (PALETTES in
src/config.js: P1 blue, P2 red... in mode A, any colour picked in mode B) when the cat first appears in it
(src/sprites.js, skin()). This finds the garment once and writes assets/<cat>-garment.png (opaque where the garment is)
and a `garment` entry on the cat's manifest entry: the mask's key and the garment's typical saturation and brightness,
which the repaint keeps each pixel's shading relative to.

    python3 tools/recolor.py            # all cats
    python3 tools/recolor.py --preview out.png     # the masks over each cat's first frame

A pixel belongs to the garment if its hue, saturation and brightness fall in the cat's range below and it is
part of a big enough patch (which keeps Luna's pink ears and nose out of it). Run by tools/build_sprites.sh.
"""
import argparse, json, os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS, MANIFEST = os.path.join(ROOT, 'assets'), os.path.join(ROOT, 'assets/manifest.json')
# cat: what it wears in the source art, and how to find it.
#   hue (range, may wrap past 360), sat, val: a pixel that could be garment
#   patch: smallest patch of such pixels that counts          solid: a patch's typical saturation must reach this
#   fringe: (sat, val) for softer edge pixels, taken only where they touch a patch
# Luna's open mouth is the same red as her bandana but duller; `solid` is what tells them apart.
CATS = {'benji': {'wears': 'blue', 'hue': (205, 262), 'sat': 0.30, 'val': 0.15, 'patch': 5, 'solid': 0.0, 'fringe': (0.2, 0.1)},
        'luna':  {'wears': 'red',  'hue': (328, 372), 'sat': 0.58, 'val': 0.45, 'patch': 5, 'solid': 0.76, 'fringe': (0.45, 0.3)}}
# Cricket's scarf is purple and Luca's hat olive: neither is one of the four player colours, so every player gets a repainted one.
CATS['cricket'] = {'wears': 'purple', 'hue': (262, 306), 'sat': 0.35, 'val': 0.20, 'patch': 12, 'solid': 0.0, 'fringe': (0.25, 0.12)}
# `patch` is large enough to leave his green eyes alone.
# Simon's explorer vest is blue like Benji's hoodie; his eyes are green, so the same rule finds it.
CATS['simon'] = dict(CATS['benji'], hue=(185, 262), patch=2, fringe=(0.15, 0.1))
CATS['luca'] = {'wears': 'olive', 'hue': (50, 82), 'sat': 0.40, 'val': 0.30, 'patch': 40, 'solid': 0.5, 'fringe': (0.3, 0.15)}


def hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1); d = mx - mn
    h = np.zeros_like(mx); nz = d > 1e-6
    i = nz & (mx == r); h[i] = ((g - b)[i] / d[i]) % 6
    i = nz & (mx == g) & (mx != r); h[i] = (b - r)[i] / d[i] + 2
    i = nz & (mx == b) & (mx != r) & (mx != g); h[i] = (r - g)[i] / d[i] + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx


def rgb(h, s, v):
    h = (h % 360) / 60; i = np.floor(h).astype(int) % 6; f = h - np.floor(h)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    out = np.zeros(h.shape + (3,))
    for k, (r, g, b) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k; out[m] = np.stack([r[m], g[m], b[m]], -1)
    return out


def garment(px, cat):
    """Boolean mask of the garment's pixels."""
    h, s, v = hsv(px[..., :3] / 255.0); lo, hi = cat['hue']
    hue = (px[..., 3] > 0) & (((h >= lo) & (h <= hi)) | ((h + 360 >= lo) & (h + 360 <= hi)))
    m = hue & (s >= cat['sat']) & (v >= cat['val'])
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n:
        ids = range(1, n + 1); size = ndimage.sum(m, lab, ids); typical = ndimage.median(s, lab, ids)
        m = np.isin(lab, [i for i, z, k in zip(ids, size, typical) if z >= cat['patch'] and k >= cat['solid']])
    soft = hue & (s >= cat['fringe'][0]) & (v >= cat['fringe'][1])
    return m | (soft & ndimage.binary_dilation(m, structure=np.ones((3, 3)), iterations=2))


def typical(px, mask):
    """The garment's typical saturation and brightness (its strongly coloured pixels' medians)."""
    h, s, v = hsv(px[..., :3] / 255.0)
    core = mask & (s >= np.median(s[mask]) * 0.8)
    return float(np.median(s[core])), float(np.median(v[core]))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--preview', help='also write a strip of each cat\'s first frame with its garment shown in magenta')
    args = ap.parse_args()
    manifest = json.load(open(MANIFEST)); strips = []
    for key in list(manifest):                                    # the old pre-made colour sheets, if any
        if any(key == f'{c}-{col}' for c in CATS for col in ('blue', 'red', 'green', 'yellow')):
            old = os.path.join(ASSETS, manifest.pop(key)['file'])
            if os.path.exists(old): os.remove(old)
    for key, cat in CATS.items():
        if key not in manifest: continue
        entry = manifest[key]; px = np.array(Image.open(os.path.join(ASSETS, entry['file'])).convert('RGBA')); mask = garment(px, cat)
        out = np.zeros(px.shape, np.uint8); out[mask] = (255, 255, 255, 255)
        name = f'{key}-garment'; Image.fromarray(out).save(os.path.join(ASSETS, name + '.png'), optimize=True)
        ts, tv = typical(px, mask)
        entry['garment'] = {'mask': name, 'file': name + '.png', 's': round(ts, 4), 'v': round(tv, 4)}
        print(f'{key:8} garment {int(mask.sum())} px, typical s {ts:.2f} v {tv:.2f}')
        fw, fh = entry['frameWidth'], entry['frameHeight']; show = px[:fh, :fw].copy(); show[mask[:fh, :fw]] = (255, 0, 255, 255)
        strips.append(np.concatenate([px[:fh, :fw], show], 1))
    json.dump(manifest, open(MANIFEST, 'w'), indent=2, sort_keys=True); open(MANIFEST, 'a').write('\n')
    if args.preview:
        w = max(s.shape[1] for s in strips); h = sum(s.shape[0] for s in strips)
        im = Image.new('RGBA', (w, h), (90, 90, 100, 255)); y = 0
        for s in strips: im.alpha_composite(Image.fromarray(s), (0, y)); y += s.shape[0]
        im.resize((w * 3, h * 3), Image.NEAREST).save(args.preview)


if __name__ == '__main__':
    main()
