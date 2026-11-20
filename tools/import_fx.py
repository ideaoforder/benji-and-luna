#!/usr/bin/env python3
"""Import the icon strip and effect sheets (art/icons.png, art/fx-*.png) into assets/fx/ for the game.

Frame boxes, background colours and target sizes come from art/icons-effects-originals.json (measured on the
originals by whoever drew them). Each sheet becomes one horizontal strip of equal cells at 2x the on-screen size,
listed in assets/fx.json, which the game loads as spritesheets.

  - The background is keyed out by closeness to the sheet's key colour, plus a pass that clears key-coloured
    fringe next to the transparent area (dark greens such as the catnip leaves stay).
  - Animations use ONE scale for all their frames, so growing rings and bursts keep their relative size, and keep
    their vertical positions from the original (wave bottoms, yarn centres line up). Icons are fitted one by one.

    python3 tools/import_fx.py
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(ROOT, 'art/icons-effects-originals.json'), os.path.join(ROOT, 'assets/fx')
K = 2                                               # stored at 2x the on-screen size; the game shows them at half scale


def keyed(im, key):
    a = np.asarray(im.convert('RGB')).astype(int)
    d = np.abs(a - np.array(key)).sum(-1)
    bg = d < 120
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if key[1] > key[0]: spill = (g > r + 70) & (g > b + 70) & (g > 150)      # bright green, not leaf green
    else: spill = (r > g + 70) & (b > g + 70) & (r > 150) & (b > 150)       # magenta
    near = ndi.binary_dilation(bg, iterations=2)
    bg |= spill & near
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), 'RGBA')


def main():
    sheets, listing = json.load(open(SRC)), {}
    os.makedirs(OUT, exist_ok=True)
    for s in sheets:
        name = os.path.splitext(os.path.basename(s['file']))[0]          # icons, fx-slash, ...
        im = keyed(Image.open(os.path.join(ROOT, s['file'])), s['key_rgb'])
        cw, ch = s['target_cell'][0] * K, s['target_cell'][1] * K
        boxes = s['frame_bounds_xyxy']
        crops = []
        for x0, y0, x1, y1 in boxes:
            c = im.crop((x0, y0, x1, y1)); bb = c.getbbox() or (0, 0, 1, 1)
            crops.append((c.crop(bb), x0 + bb[0], y0 + bb[1]))
        strip = Image.new('RGBA', (cw * len(crops), ch), (0, 0, 0, 0))
        if name == 'icons':                                              # each icon fitted to its own cell
            for i, (c, _, _) in enumerate(crops):
                k = min(cw * 0.94 / c.width, ch * 0.94 / c.height)
                r = c.convert('RGBa').resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS).convert('RGBA')
                strip.alpha_composite(r, (i * cw + (cw - r.width) // 2, (ch - r.height) // 2))
        else:                                                            # one scale for the whole animation
            top = min(y for _, _, y in crops); bottom = max(y + c.height for c, _, y in crops)
            k = min(cw * 0.96 / max(c.width for c, _, _ in crops), ch * 0.96 / (bottom - top))
            for i, (c, x, y) in enumerate(crops):
                r = c.convert('RGBa').resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS).convert('RGBA')
                oy = round((y - top) * k + (ch - (bottom - top) * k) / 2)
                strip.alpha_composite(r, (i * cw + (cw - r.width) // 2, max(0, min(ch - r.height, oy))))
        strip.save(os.path.join(OUT, name + '.png'))
        listing[name] = {'file': 'fx/' + name + '.png', 'frameWidth': cw, 'frameHeight': ch, 'frames': len(crops)}
        print(f'{name:14} {len(crops):2} frames of {cw}x{ch}')
    with open(os.path.join(ROOT, 'assets/fx.json'), 'w') as f: json.dump(listing, f, indent=1, sort_keys=True); f.write('\n')


if __name__ == '__main__':
    main()
