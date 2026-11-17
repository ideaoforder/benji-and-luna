#!/usr/bin/env python3
"""Import a character sheet drawn to art/SPEC.md into assets/.

    python3 tools/import_sheet.py art/officer-punk.png officer-punk \\
        --rows idle:1,walk:2,windup:1,swing:1,hurt:1

The sheet is a grid: one row per animation, equal-size cells, on a flat background colour.
--rows names each row top to bottom with its frame count. The grid is cols x rows where
cols is the widest row unless --cols says otherwise. The background colour is read from
the top-left pixel. By default every cell is kept exactly as drawn, so the artist controls
how frames line up. Pass --recenter for sheets with sloppy placement: each frame is then
trimmed and re-centred with its feet on the cell floor (this can shift the body between
frames when something sticks out to one side, like a raised net).
"""
import argparse, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheetlib import pack, record

ap = argparse.ArgumentParser()
ap.add_argument('sheet'); ap.add_argument('key')
ap.add_argument('--rows', required=True, help='name:count,name:count,... top to bottom')
ap.add_argument('--cols', type=int, help='grid columns in the source sheet (default: widest row)')
ap.add_argument('--tolerance', type=int, default=48, help='how close to the background colour counts as background')
ap.add_argument('--height', type=int, help='scale so the tallest frame is this many pixels high')
ap.add_argument('--recenter', action='store_true', help='trim each frame and re-centre it, feet on the floor')
a = ap.parse_args()

rows = [(n, int(c)) for n, c in (r.split(':') for r in a.rows.split(','))]
im = Image.open(a.sheet).convert('RGBA'); px = np.asarray(im).astype(int)
bg = px[0, 0, :3]
far = np.abs(px[..., :3] - bg).sum(-1) > a.tolerance
alpha = np.where(far & (px[..., 3] > 0), 255, 0).astype(np.uint8)
im.putalpha(Image.fromarray(alpha))
cols = a.cols or max(c for _, c in rows)
cw, ch = im.width / cols, im.height / len(rows)

frames = []
for r, (name, count) in enumerate(rows):
    out = []
    for c in range(count):
        cell = im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
        box = cell.getbbox()
        if not box: sys.exit(f'{name} frame {c + 1} is empty: check --rows and --cols')
        out.append(cell.crop(box) if a.recenter else cell)
    frames.append((name, out))

if a.height:
    k = a.height / max(f.height for _, fs in frames for f in fs)
    nearest = float(k).is_integer()
    frames = [(n, [f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))),
                            Image.NEAREST if nearest else Image.LANCZOS) for f in fs]) for n, fs in frames]
if not a.recenter: W, H = frames[0][1][0].size
else:
    W = max(f.width for _, fs in frames for f in fs) + 4; H = max(f.height for _, fs in frames for f in fs) + 2
    W += W % 2
sheet, entry = pack(frames, W, H)
name = a.key + '.png'; sheet.save('assets/' + name); record(a.key, name, entry)
print(f'wrote assets/{name}: {entry["cols"]} x {len(rows)} cells of {W}x{H}; manifest updated')
