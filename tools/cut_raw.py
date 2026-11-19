#!/usr/bin/env python3
"""Cut sprites out of a raw generated image that is NOT on an exact grid, and pack them into a proper sheet.

    python3 tools/cut_raw.py art/raw/luna.png luna --height 70 \\
        --rows idle:4,walk:6,run:6,jump:4,sit:2,claw:4,meow:2,tool:2,roll:1,hurt:1

Use this for image-generator output: sprites roughly in rows on a flat background, but not at exact,
equal cell positions. Each sprite is found by its outline (connected pixels that are not background),
so nothing is ever cut by a grid line. Sprites are grouped into rows top to bottom, ordered left to
right, checked against --rows, then packed into equal cells with feet on the floor.

Several images can be given (one per animation, say); their rows are read in order.
If the counts do not match --rows, nothing is written and the counts found are printed.
"""
import argparse, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheetlib import pack, record

ap = argparse.ArgumentParser()
ap.add_argument('images', nargs='+'); ap.add_argument('key')
ap.add_argument('--rows', default='', help='name:count,... top to bottom, across all images in order; a+b for two named rows drawn on one line')
ap.add_argument('--height', type=int, help='scale so the first idle frame is this many pixels tall')
ap.add_argument('--tolerance', type=int, default=60, help='how close to the background colour counts as background')
ap.add_argument('--join', type=int, default=0, help='pixels of gap to bridge when a sprite has detached bits (default: 0.4%% of image width)')
ap.add_argument('--anchor', choices=['box', 'feet'], default='box', help="what sits on the cell's centre line: the middle of the whole sprite, or the middle of its feet. Use feet for characters whose weapon swings far out to one side")
ap.add_argument('--row-scale', default='', help='enlarge or shrink whole rows that were drawn at a different size, e.g. run:1.27,walk:1.16')
ap.add_argument('--trim', type=int, default=1, help='pixels to shave off every outline, to remove background-coloured fringe (0 for clean hard-edged art)')
ap.add_argument('--min-size', type=float, default=0.3, help='ignore anything shorter than this fraction of a typical sprite (raise it to drop props such as a thrown ball)')
ap.add_argument('--pick', default='', help='choose frames by drawn row and position instead of --rows, for sheets with spare frames: '
                'name=row:positions,... e.g. "idle=1:1-8,jump=4:2,3,5,6,walk=1:5-6+2:1-2" (counted from 1; + continues on another row; --preview shows what was found)')
ap.add_argument('--fill-holes', action='store_true', help='keep dark areas enclosed by the sprite (a face inside a hood, a visor) that are close to the background colour')
ap.add_argument('--mirror', action='store_true', help='flip every frame left to right, for art drawn facing left (the game expects right)')
ap.add_argument('--largest', action='store_true', help='keep only the biggest connected piece of each sprite: drops speed lines and other effects drawn beside it')
ap.add_argument('--preview', help='also write an image with the detected boxes drawn on it')
a = ap.parse_args()
# "meow:2+tool:2" is one drawn row holding two named rows, left to right.
if not a.rows and not a.pick: ap.error('give --rows or --pick')
groups = [[(n, int(c)) for n, c in (r.split(':') for r in g.split('+'))] for g in a.rows.split(',')] if a.rows else []
def positions(s):                              # "2,3,5-7" -> [2, 3, 5, 6, 7]
    out = []
    for part in s.split(','):
        lo, _, hi = part.partition('-'); out += range(int(lo), int(hi or lo) + 1)
    return out
import re
# "walk=1:5-6+2:1-2" takes positions 5-6 of row 1, then 1-2 of row 2. Each pick is a list of (row, position).
picks = [(n, [(int(r), i) for r, ps in re.findall(r'(\d+):([\d,-]+)', spec) for i in positions(ps.strip(','))])
         for n, spec in re.findall(r'(\w+)=([\d:,+-]+?)(?=,\w+=|$)', a.pick)]
want = [(n, c) for g in groups for n, c in g]

found = []                                   # list of rows; each row a list of RGBA sprites
for path in a.images:
    im = Image.open(path).convert('RGBA'); px = np.asarray(im).astype(int)
    fg = (np.abs(px[..., :3] - px[0, 0, :3]).sum(-1) > a.tolerance) & (px[..., 3] > 0)
    join = a.join or max(2, round(im.width * 0.004))
    lab, n = ndi.label(ndi.binary_dilation(fg, iterations=join))
    boxes = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        part = fg[sl] & (lab[sl] == i + 1)
        if part.sum(): boxes.append((sl, part))
    if not boxes: sys.exit(f'{path}: nothing but background found')
    tall = np.median([p.shape[0] for _, p in boxes])
    boxes = [b for b in boxes if b[1].shape[0] > tall * a.min_size and b[1].sum() > tall * tall * 0.05]   # drop specks and stray lines
    boxes.sort(key=lambda b: b[0][0].start)
    rows = []
    for sl, part in boxes:                   # same row if its vertical centre falls inside the row's span
        cy = (sl[0].start + sl[0].stop) / 2
        if rows and rows[-1]['top'] <= cy <= rows[-1]['bottom']:
            rows[-1]['items'].append((sl, part)); rows[-1]['bottom'] = max(rows[-1]['bottom'], sl[0].stop)
        else: rows.append({'top': sl[0].start, 'bottom': sl[0].stop, 'items': [(sl, part)]})
    for r in rows:
        r['items'].sort(key=lambda b: b[0][1].start)
        sprites = []
        for sl, part in r['items']:
            if a.trim: part = ndi.binary_erosion(part, iterations=a.trim, border_value=0)
            if a.fill_holes: part = ndi.binary_fill_holes(part)
            if a.largest:
                pieces, k = ndi.label(part)
                if k > 1: part = pieces == 1 + int(np.argmax(ndi.sum(part, pieces, range(1, k + 1))))
            rgba = np.asarray(im)[sl].copy(); rgba[..., 3] = np.where(part, 255, 0)
            if a.largest:                      # the sprite may now be smaller than its box
                box = Image.fromarray(rgba, 'RGBA').getbbox(); rgba = rgba[box[1]:box[3], box[0]:box[2]]
            sprites.append(Image.fromarray(rgba[:, ::-1] if a.mirror else rgba, 'RGBA'))
        found.append(sprites)
    if a.preview:
        from PIL import ImageDraw
        pv = im.convert('RGB'); d = ImageDraw.Draw(pv)
        for ri, r in enumerate(rows):
            for ci, (sl, _) in enumerate(r['items']):
                d.rectangle([sl[1].start, sl[0].start, sl[1].stop, sl[0].stop], outline=(255, 255, 0), width=max(2, im.width // 600))
        pv.save(a.preview)

got = [len(r) for r in found]
if picks:
    want = [(n, len(p)) for n, p in picks]
elif got != [sum(c for _, c in g) for g in groups]:
    print('Row counts do not match --rows. Nothing written.')
    print('  expected:', ', '.join('+'.join(f'{n}:{c}' for n, c in g) for g in groups))
    print('  found   :', ', '.join(str(g) for g in got), f'({len(got)} rows)')
    sys.exit(1)
frames = []
for n, p in picks:
    bad = [(r, i) for r, i in p if r > len(found) or i > len(found[r - 1])]
    if bad: sys.exit(f'--pick {n}: row {bad[0][0]} has no position {bad[0][1]}; found rows of ' + ', '.join(str(g) for g in got))
    frames.append((n, [found[r - 1][i - 1] for r, i in p]))
for g, row in zip(groups, found) if not picks else []:
    at = 0
    for n, c in g: frames.append((n, row[at:at + c])); at += c
fix = {n: float(v) for n, v in (r.split(':') for r in a.row_scale.split(',') if r)}
unknown = set(fix) - {n for n, _ in want}
if unknown: sys.exit('--row-scale names rows that are not in --rows: ' + ', '.join(sorted(unknown)))
if a.height or fix:
    ref = dict(frames).get('idle', frames[0][1])[0]
    k = a.height / ref.height if a.height else 1
    # resize with premultiplied alpha so the background colour cannot bleed into the edges
    shrink = lambda f, k: f.convert('RGBa').resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS).convert('RGBA')
    frames = [(n, [shrink(f, k * fix.get(n, 1)) for f in fs]) for n, fs in frames]
    # resampling leaves soft edges; snap alpha back to hard so sprites stay crisp
    frames = [(n, [Image.merge('RGBA', (*f.split()[:3], f.split()[3].point(lambda v: 255 if v > 110 else 0))) for f in fs]) for n, fs in frames]
import numpy as _np
def feet_x(f):                                 # centre of what touches the floor: the bottom tenth of the sprite
    al = _np.asarray(f)[..., 3] > 0; band = al[int(f.height * 0.9):]
    xs = _np.nonzero(band.any(0))[0]
    return (xs[0] + xs[-1] + 1) / 2
anchors = {id(f): (feet_x(f) if a.anchor == 'feet' else f.width / 2) for _, fs in frames for f in fs}
half = max(max(anchors[id(f)], f.width - anchors[id(f)]) for _, fs in frames for f in fs)
W = 2 * (int(half) + 3); H = max(f.height for _, fs in frames for f in fs) + 2
sheet, entry = pack(frames, W, H, anchors)
name = a.key + '.png'; sheet.save('assets/' + name); record(a.key, name, entry)
print(f'wrote assets/{name}: {entry["cols"]} columns x {len(frames)} rows, cells {W}x{H}; manifest updated')
