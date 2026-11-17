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
ap.add_argument('--rows', required=True, help='name:count,... top to bottom, across all images in order')
ap.add_argument('--height', type=int, help='scale so the first idle frame is this many pixels tall')
ap.add_argument('--tolerance', type=int, default=60, help='how close to the background colour counts as background')
ap.add_argument('--join', type=int, default=0, help='pixels of gap to bridge when a sprite has detached bits (default: 0.4%% of image width)')
ap.add_argument('--row-scale', default='', help='enlarge or shrink whole rows that were drawn at a different size, e.g. run:1.27,walk:1.16')
ap.add_argument('--trim', type=int, default=1, help='pixels to shave off every outline, to remove background-coloured fringe (0 for clean hard-edged art)')
ap.add_argument('--min-size', type=float, default=0.3, help='ignore anything shorter than this fraction of a typical sprite (raise it to drop props such as a thrown ball)')
ap.add_argument('--preview', help='also write an image with the detected boxes drawn on it')
a = ap.parse_args()
want = [(n, int(c)) for n, c in (r.split(':') for r in a.rows.split(','))]

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
            rgba = np.asarray(im)[sl].copy(); rgba[..., 3] = np.where(part, 255, 0)
            sprites.append(Image.fromarray(rgba, 'RGBA'))
        found.append(sprites)
    if a.preview:
        from PIL import ImageDraw
        pv = im.convert('RGB'); d = ImageDraw.Draw(pv)
        for ri, r in enumerate(rows):
            for ci, (sl, _) in enumerate(r['items']):
                d.rectangle([sl[1].start, sl[0].start, sl[1].stop, sl[0].stop], outline=(255, 255, 0), width=max(2, im.width // 600))
        pv.save(a.preview)

got = [len(r) for r in found]
if got != [c for _, c in want]:
    print('Row counts do not match --rows. Nothing written.')
    print('  expected:', ', '.join(f'{n}:{c}' for n, c in want))
    print('  found   :', ', '.join(str(g) for g in got), f'({len(got)} rows)')
    sys.exit(1)
frames = [(n, found[i]) for i, (n, _) in enumerate(want)]
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
W = max(f.width for _, fs in frames for f in fs) + 4; H = max(f.height for _, fs in frames for f in fs) + 2
W += W % 2
sheet, entry = pack(frames, W, H)
name = a.key + '.png'; sheet.save('assets/' + name); record(a.key, name, entry)
print(f'wrote assets/{name}: {entry["cols"]} columns x {len(frames)} rows, cells {W}x{H}; manifest updated')
