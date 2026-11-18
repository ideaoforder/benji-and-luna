#!/usr/bin/env python3
"""Import level art for the brawler.

Reads art/raw/bg-<theme>-<far|wall|floor>.png (repeating strips), art/raw/bg-<map>-full.png (one picture of a
whole room, any size at 16:9 or wider) and art/raw/prop-<class>.png, writes game-ready copies to
assets/scenery/ and lists them in assets/scenery.json. The game shows whatever is listed and falls back
to flat colours for the rest, so art can arrive one picture at a time.

    python3 tools/import_scenery.py            # import everything found
    python3 tools/import_scenery.py --check    # report only, write nothing

Strips are resized to the sizes in art/TODO.md. Props have their flat background removed (taken from the
corner pixels), are trimmed, and scaled to the on-screen width below.
"""
import argparse, glob, json, os, sys
import numpy as np
from scipy import ndimage
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, OUT, LIST = os.path.join(ROOT, 'art/raw'), os.path.join(ROOT, 'assets/scenery'), os.path.join(ROOT, 'assets/scenery.json')
SIDECAR, FLOOR = os.path.join(ROOT, 'art/raw/scenery.json'), 345
STRIPS = {'far': (960, 300), 'wall': (960, 110), 'floor': (960, 195)}
PROPS = {'dumpster': 150, 'crate': 64, 'breakable': 58, 'gate': 24, 'block': 110, 'hedge': 130, 'bench': 110, 'pen': 150}     # on-screen width, by map class
ALIASES = {'heavy-crate': 'breakable'}                                                # brief name -> map class


def cut_background(im, tolerance=40):
    """Make the flat background transparent.

    A strongly coloured background (the usual magenta or green key) is removed wherever it appears, including
    through gaps such as between a bench's slats, with a wider tolerance because generators never fill it evenly;
    a 1 px rim is then shaved off so no key colour is left on the outline. A dull background (white, grey) is
    only flood-filled from the edges, since the prop itself may contain that colour.
    """
    im = im.convert('RGBA'); px = np.array(im); rgb = px[..., :3].astype(int)
    bg = rgb[0, 0]; dist = np.abs(rgb - bg).sum(-1)
    if bg.max() - bg.min() > 120:                       # a key colour
        mask = dist <= max(tolerance, 150)
        mask = ndimage.binary_dilation(mask, iterations=1)
    else:
        lab, _ = ndimage.label(dist <= tolerance)
        edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1]); edge.discard(0)
        mask = np.isin(lab, list(edge))
    px[mask] = 0
    im = Image.fromarray(px); box = im.getbbox()
    return im.crop(box) if box else im


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--check', action='store_true', help='report what would be imported; write nothing')
    args = ap.parse_args()
    listing, notes = {}, []
    # art/raw/scenery.json (optional) says how to treat particular pictures:
    #   { "<key>": { "file": "<picture in art/raw, if not <key>.png>", "floorY": <y of the wall/floor edge in the picture>, "mirror": true } }
    # floorY: image generators cannot hit an exact line, so say where the edge came out and the picture is scaled to put it at y=345.
    extra = json.load(open(SIDECAR)) if os.path.exists(SIDECAR) else {}
    found = {os.path.splitext(os.path.basename(p))[0]: p for p in glob.glob(os.path.join(RAW, 'bg-*.png')) + glob.glob(os.path.join(RAW, 'prop-*.png'))}
    for key, opt in extra.items(): found[key] = os.path.join(RAW, opt.get('file', key + '.png'))
    for name, path in sorted(found.items()):
        opt = extra.get(name, {})
        im = Image.open(path)
        if opt.get('mirror'): im = im.transpose(Image.FLIP_LEFT_RIGHT)
        if name.startswith('bg-'):
            layer = name.rsplit('-', 1)[-1]
            if layer == 'full' or '-full-' in name:     # a picture of a whole room, or one panel of it (-full-1, -full-2 ... left to right): 540 high
                k = FLOOR / opt['floorY'] if opt.get('floorY') else 540 / im.height
                w, h = round(im.width * k), round(im.height * k)
                if abs(w - round(w / 480) * 480) <= 6 and w >= 954 and not opt.get('floorY'): w = round(w / 480) * 480      # generators miss 16:9 by a pixel or two; do not leave a gap
                if w < 960 and layer == 'full': notes.append(f'{name}: only {w} px wide at 540 high; a room is at least 960')
                out = im.convert('RGB').resize((w, h), Image.LANCZOS)
                if h < 540: notes.append(f'{name}: with its floor edge at y={FLOOR} the picture is only {h} px high; the bottom {540 - h} px will be empty')
                out = out.crop((0, 0, w, 540))          # keeps the top; anything past the bottom of the screen is dropped
                listing[name] = {'file': name + '.png', 'w': w, 'h': 540}
                if not args.check: os.makedirs(OUT, exist_ok=True); out.save(os.path.join(OUT, name + '.png'))
                print(f'{name:22} {w}x540  <- {os.path.relpath(path, ROOT)}'); continue
            if layer not in STRIPS: notes.append(f'skipped {name}: layer must be one of {", ".join(STRIPS)}'); continue
            w, h = STRIPS[layer]
            if abs(im.width / im.height - w / h) > 0.08 * w / h: notes.append(f'{name}: {im.width}x{im.height} is not the {w}x{h} shape; it will look stretched')
            out, key = im.convert('RGBA').resize((w, h), Image.LANCZOS), name
        else:
            kind = name[len('prop-'):]; kind = ALIASES.get(kind, kind)
            if kind not in PROPS: notes.append(f'skipped {name}: no map class called {kind} ({", ".join(PROPS)})'); continue
            cut = cut_background(im); w = PROPS[kind]
            out, key = cut.resize((w, max(1, round(cut.height * w / cut.width))), Image.LANCZOS), 'prop-' + kind
        listing[key] = {'file': key + '.png', 'w': out.width, 'h': out.height}
        if not args.check:
            os.makedirs(OUT, exist_ok=True); out.save(os.path.join(OUT, key + '.png'))
        print(f'{key:22} {out.width}x{out.height}  <- {os.path.relpath(path, ROOT)}')
    if not args.check:
        with open(LIST, 'w') as f: json.dump(listing, f, indent=2, sort_keys=True); f.write('\n')
    for n in notes: print('note:', n, file=sys.stderr)
    print(f'{len(listing)} picture(s)' + (' would be' if args.check else '') + ' listed in assets/scenery.json')


if __name__ == '__main__':
    main()
