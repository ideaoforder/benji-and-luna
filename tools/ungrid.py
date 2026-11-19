#!/usr/bin/env python3
"""Prepare a sheet drawn as an exact grid of boxed cells (cell borders, slightly different background per cell) for
tools/cut_raw.py: each cell's inside is copied onto one flat background with clear gaps between cells, so the
cutter can find every sprite by its outline.

    python3 tools/ungrid.py art/raw/boss-warden.png 6x4 /tmp/warden-spaced.png
    python3 tools/cut_raw.py /tmp/warden-spaced.png officer-warden --pick "idle=1:1-4,..." ...

Only background reachable from a cell's edge is removed, and it is replaced with pure green (key it out with the
cutter's defaults), so dark parts inside a sprite that are close to the background colour (a face in a hood, a
visor) stay solid. --inset: pixels shaved off each cell's edge to drop its border (default 8).
"""
import argparse
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('image'); ap.add_argument('grid', help='COLSxROWS, e.g. 6x4'); ap.add_argument('out')
ap.add_argument('--inset', type=int, default=8); ap.add_argument('--gap', type=int, default=48)
ap.add_argument('--tolerance', type=int, default=20, help='how close to a cell\'s background colour counts as background')
a = ap.parse_args()

im = Image.open(a.image).convert('RGB'); cols, rows = map(int, a.grid.lower().split('x'))
cw, ch = im.width / cols, im.height / rows
px = np.asarray(im)
bg = KEY = (0, 255, 0)
iw, ih = int(cw) - 2 * a.inset, int(ch) - 2 * a.inset
out = Image.new('RGB', (cols * (iw + a.gap) + a.gap, rows * (ih + a.gap) + a.gap), bg)
for r in range(rows):
    for c in range(cols):
        x, y = int(c * cw) + a.inset, int(r * ch) + a.inset
        cell = np.asarray(im.crop((x, y, x + iw, y + ih))).astype(int)
        # Even out each cell's own background tint to the shared one, so one tolerance fits all.
        own = np.median(np.concatenate([cell[:6, :6].reshape(-1, 3), cell[:6, -6:].reshape(-1, 3)]), axis=0)
        near = np.abs(cell - own).sum(axis=2) < a.tolerance
        lab, _ = ndi.label(near)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        cell[np.isin(lab, list(edge))] = KEY
        out.paste(Image.fromarray(cell.astype(np.uint8)), (a.gap + c * (iw + a.gap), a.gap + r * (ih + a.gap)))
out.save(a.out)
print(f'{a.out}: {cols}x{rows} cells of {iw}x{ih}, background {bg}')
