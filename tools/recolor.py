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
# cat: what it wears in the source art, and how to find it: hue range (may wrap past 360), min saturation, min brightness, min patch size in px
CATS = {'benji': {'wears': 'blue', 'hue': (205, 262), 'sat': 0.30, 'val': 0.15, 'patch': 40},
        'luna':  {'wears': 'red',  'hue': (328, 372), 'sat': 0.58, 'val': 0.45, 'patch': 30}}


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
    m = (px[..., 3] > 0) & (((h >= lo) & (h <= hi)) | ((h + 360 >= lo) & (h + 360 <= hi))) & (s >= cat['sat']) & (v >= cat['val'])
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n:
        size = ndimage.sum(m, lab, range(1, n + 1))
        m = np.isin(lab, [i + 1 for i, z in enumerate(size) if z >= cat['patch']])
    return m


def repaint(px, mask, colour):
    h, s, v = hsv(px[..., :3] / 255.0); th, ts, tv = COLOURS[colour]
    ms, mv = np.median(s[mask]), np.median(v[mask])                 # shading is kept: each pixel keeps its place relative to the typical one
    out = px.copy()
    out[mask, :3] = np.round(rgb(np.full(mask.sum(), float(th)), np.clip(s[mask] / ms * ts, 0, 1), np.clip(v[mask] / mv * tv, 0, 1)) * 255)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--preview', help='also write a strip of each cat\'s first frame in every colour')
    args = ap.parse_args()
    manifest = json.load(open(MANIFEST)); strips = []
    for key, cat in CATS.items():
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
