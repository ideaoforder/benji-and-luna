#!/usr/bin/env python3
"""Palette-swapped officers for the later areas: python3 tools/officer_variants.py [--preview out.png]

art/variants.json lists each one: which finished sheet it is made from and how its colours change. Skin is never
touched (it lives at hues 0-38, which no rule below should cover), so only clothes, hair and kit change.

  "officer-<name>": {
    "from":  "officer-<type>",                 the sheet to start from; its -female sheet gets the same treatment
    "bands": [[lo, hi, to, sat, val], ...],    colourful pixels with hue lo..hi (hi may pass 360 to wrap) move to hue `to`
                                               ("+N" rotates instead); sat and val are optional multipliers
    "greys": { "hue": h, "sat": s, "gain": g } grey mid-tones (a suit, steel) are given a colour and brightened
  }

Writes assets/<name>.png and a manifest entry copied from the source. Run by tools/build_sprites.sh.
"""
import argparse, json, os
import numpy as np
from PIL import Image
from recolor import hsv, rgb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS, MANIFEST, SPEC = os.path.join(ROOT, 'assets'), os.path.join(ROOT, 'assets/manifest.json'), os.path.join(ROOT, 'art/variants.json')


def repaint(px, spec):
    h, s, v = hsv(px[..., :3] / 255.0); solid = px[..., 3] > 0
    nh, ns, nv = h.copy(), s.copy(), v.copy()
    for lo, hi, to, *mul in spec.get('bands', []):
        m = solid & (s > 0.25) & (v > 0.15) & (((h >= lo) & (h <= hi)) | ((h + 360 >= lo) & (h + 360 <= hi)))
        nh[m] = (h[m] + float(to)) % 360 if isinstance(to, str) else to
        if len(mul) > 0: ns[m] = np.clip(s[m] * mul[0], 0, 1)
        if len(mul) > 1: nv[m] = np.clip(v[m] * mul[1], 0, 1)
    g = spec.get('greys')
    if g:
        m = solid & (s <= 0.25) & (v > 0.12) & (v < 0.62)
        nh[m] = g['hue']; ns[m] = g['sat']; nv[m] = np.clip(v[m] * g.get('gain', 1), 0, 1)
    out = px.copy(); out[solid, :3] = np.round(rgb(nh[solid], ns[solid], nv[solid]) * 255)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--preview', help='also write the first frame of every variant next to its source')
    args = ap.parse_args()
    manifest = json.load(open(MANIFEST)); spec = json.load(open(SPEC)); cells = []
    for name, sp in spec.items():
        for suffix in ('', '-female'):
            src = sp['from'] + suffix
            if src not in manifest: continue
            entry = manifest[src]; px = np.array(Image.open(os.path.join(ASSETS, entry['file'])).convert('RGBA')); out = repaint(px, sp)
            Image.fromarray(out).save(os.path.join(ASSETS, name + suffix + '.png'))
            manifest[name + suffix] = {**entry, 'file': name + suffix + '.png'}
            fw, fh = entry['frameWidth'], entry['frameHeight']; cells += [px[:fh, :fw], out[:fh, :fw]]
            print(f'{name + suffix:28} from {src}')
    json.dump(manifest, open(MANIFEST, 'w'), indent=2, sort_keys=True); open(MANIFEST, 'a').write('\n')
    if args.preview:
        w = max(c.shape[1] for c in cells); h = max(c.shape[0] for c in cells); cols = 8; rows = -(-len(cells) // cols)
        im = Image.new('RGBA', (w * cols, h * rows), (90, 90, 100, 255))
        for i, c in enumerate(cells): im.alpha_composite(Image.fromarray(c), ((i % cols) * w + (w - c.shape[1]) // 2, (i // cols) * h + h - c.shape[0]))
        im.convert('RGB').save(args.preview)


if __name__ == '__main__':
    main()
