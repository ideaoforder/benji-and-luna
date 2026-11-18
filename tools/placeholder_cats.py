#!/usr/bin/env python3
"""Stand-in sheets for cats whose art has not arrived: a finished cat's sheet with the fur repainted.

    python3 tools/placeholder_cats.py

Writes assets/<cat>.png and a manifest entry copied from the source cat, so the game and tools/recolor.py treat
the stand-in like any other cat. A cat whose real sheet exists in art/raw/ is skipped: delete its line from
STAND_INS (and add its cut_raw.py line to tools/build_sprites.sh) once the art is in. Size on screen comes from
`scale` in src/config.js, not from here.
"""
import json, os, glob
import numpy as np
from PIL import Image
from recolor import hsv, rgb, garment, CATS as WEARS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS, MANIFEST = os.path.join(ROOT, 'assets'), os.path.join(ROOT, 'assets/manifest.json')
# cat: (source cat, fur test (h, s, v) -> bool mask, new fur (hue, saturation, brightness gain, brightness lift))
STAND_INS = {
    'cricket': ('luna',  lambda h, s, v: (s < 0.58) & (v > 0.14) & (v < 0.70) & (h > 250), (40, 0.10, 0.9, 0.52)),   # cream
}


def main():
    manifest = json.load(open(MANIFEST))
    for key, (src, test, (hue, sat, gain, lift)) in STAND_INS.items():
        if glob.glob(os.path.join(ROOT, 'art/raw', key + '*.png')): print(f'{key}: real art found in art/raw, skipped'); continue
        entry = manifest[src]; px = np.array(Image.open(os.path.join(ASSETS, entry['file'])).convert('RGBA'))
        h, s, v = hsv(px[..., :3] / 255.0)
        fur = (px[..., 3] > 0) & test(h, s, v) & ~garment(px, WEARS[src])
        px[fur, :3] = np.round(rgb(np.full(fur.sum(), float(hue)), np.full(fur.sum(), sat), np.clip(v[fur] * gain + lift, 0, 1)) * 255)
        Image.fromarray(px).save(os.path.join(ASSETS, key + '.png'))
        manifest[key] = {**entry, 'file': key + '.png'}
        print(f'{key}: stand-in from {src}, {int(fur.sum())} px of fur repainted')
    json.dump(manifest, open(MANIFEST, 'w'), indent=2, sort_keys=True); open(MANIFEST, 'a').write('\n')


if __name__ == '__main__':
    main()
