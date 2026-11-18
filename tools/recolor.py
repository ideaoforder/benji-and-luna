#!/usr/bin/env python3
"""Make the player-colour versions of the cats.

Each cat wears one thing (Benji's hoodie, Luna's bandana). Player 1 always wears blue, player 2 red,
player 3 green, player 4 yellow, whichever cat they are, so this repaints that garment in the other
three colours and writes assets/<cat>-<colour>.png plus a manifest entry for each.

    python3 tools/recolor.py            # all cats
    python3 tools/recolor.py --preview out.png

A pixel belongs to the garment if its hue, saturation and brightness fall in the cat's range below and it is
part of a big enough patch (which keeps Luna's pink ears and nose out of it). Run by tools/build_sprites.sh.
"""
import argparse, json, os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS, MANIFEST = os.path.join(ROOT, 'assets'), os.path.join(ROOT, 'assets/manifest.json')
# colour: (hue in degrees, saturation, brightness) the garment's typical pixel is moved to. Keep in step with PLAYER_COLORS in src/config.js.
COLOURS = {'blue': (228, 0.62, 0.60), 'red': (348, 0.80, 0.86), 'green': (135, 0.62, 0.62), 'yellow': (46, 0.82, 0.96)}
# cat: what it wears in the source art, and how to find it.
#   hue (range, may wrap past 360), sat, val: a pixel that could be garment
#   patch: smallest patch of such pixels that counts          solid: a patch's typical saturation must reach this
#   fringe: (sat, val) for softer edge pixels, taken only where they touch a patch
# Luna's open mouth is the same red as her bandana but duller; `solid` is what tells them apart.
CATS = {'benji': {'wears': 'blue', 'hue': (205, 262), 'sat': 0.30, 'val': 0.15, 'patch': 5, 'solid': 0.0, 'fringe': (0.2, 0.1)},
        'luna':  {'wears': 'red',  'hue': (328, 372), 'sat': 0.58, 'val': 0.45, 'patch': 5, 'solid': 0.76, 'fringe': (0.45, 0.3)}}
# Stand-ins made by tools/placeholder_cats.py wear what their source cat wears. Replace these when the real art arrives.
CATS['luca'] = CATS['benji']; CATS['cricket'] = CATS['luna']


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


def repaint(px, mask, colour):
    h, s, v = hsv(px[..., :3] / 255.0); th, ts, tv = COLOURS[colour]
    core = mask & (s >= np.median(s[mask]) * 0.8)
    ms, mv = np.median(s[core]), np.median(v[core])                 # shading is kept: each pixel keeps its place relative to the typical one
    out = px.copy()
    out[mask, :3] = np.round(rgb(np.full(mask.sum(), float(th)), np.clip(s[mask] / ms * ts, 0, 1), np.clip(v[mask] / mv * tv, 0, 1)) * 255)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--preview', help='also write a strip of each cat\'s first frame in every colour')
    args = ap.parse_args()
    manifest = json.load(open(MANIFEST)); strips = []
    for key, cat in CATS.items():
        if key not in manifest: continue
        entry = manifest[key]; px = np.array(Image.open(os.path.join(ASSETS, entry['file'])).convert('RGBA')); mask = garment(px, cat)
        fw, fh = entry['frameWidth'], entry['frameHeight']; row = [px[:fh, :fw]]
        for colour in COLOURS:
            if colour == cat['wears']: continue
            name = f'{key}-{colour}'; out = repaint(px, mask, colour)
            Image.fromarray(out).save(os.path.join(ASSETS, name + '.png'))
            manifest[name] = {**entry, 'file': name + '.png'}; row.append(out[:fh, :fw])
            print(f'{name:14} {int(mask.sum())} px repainted')
        strips.append(np.concatenate(row, 1))
    json.dump(manifest, open(MANIFEST, 'w'), indent=2, sort_keys=True); open(MANIFEST, 'a').write('\n')
    if args.preview:
        w = max(s.shape[1] for s in strips); h = sum(s.shape[0] for s in strips)
        im = Image.new('RGBA', (w, h), (90, 90, 100, 255)); y = 0
        for s in strips: im.alpha_composite(Image.fromarray(s), (0, y)); y += s.shape[0]
        im.resize((w * 3, h * 3), Image.NEAREST).save(args.preview)


if __name__ == '__main__':
    main()
