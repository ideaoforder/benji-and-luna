"""Shared helpers: pack frames into a grid sheet and record it in assets/manifest.json.

Sheet layout: one row per animation, frames left to right, every cell the same size,
each frame centred horizontally with its feet on the bottom edge of the cell.
"""
import json, os
from PIL import Image

MANIFEST = 'assets/manifest.json'

def pack(rows, cell_w, cell_h, anchors=None):
    """rows: list of (name, [RGBA frames]). Returns (sheet image, manifest entry without 'file').

    anchors: optional {id(frame): x} giving the column of each frame that should sit on the cell's
    centre line (its feet, say). Without it, each frame is centred by its own width."""
    cols = max(len(frames) for _, frames in rows)
    sheet = Image.new('RGBA', (cell_w * cols, cell_h * len(rows)))
    for r, (_, frames) in enumerate(rows):
        for c, f in enumerate(frames):
            ax = anchors[id(f)] if anchors else f.width / 2
            sheet.alpha_composite(f, (c * cell_w + round(cell_w / 2 - ax), r * cell_h + cell_h - f.height))
    entry = {'frameWidth': cell_w, 'frameHeight': cell_h, 'cols': cols,
             'rows': [n for n, _ in rows], 'counts': {n: len(f) for n, f in rows}}
    return sheet, entry

def record(key, filename, entry):
    m = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    m[key] = {'file': filename, **entry}
    json.dump(m, open(MANIFEST, 'w'), indent=2, sort_keys=True)
    open(MANIFEST, 'a').write('\n')
