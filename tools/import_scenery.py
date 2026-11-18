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
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, OUT, LIST = os.path.join(ROOT, 'art/raw'), os.path.join(ROOT, 'assets/scenery'), os.path.join(ROOT, 'assets/scenery.json')
STRIPS = {'far': (960, 300), 'wall': (960, 110), 'floor': (960, 195)}
PROPS = {'dumpster': 150, 'crate': 64, 'breakable': 58, 'gate': 24, 'block': 110}     # on-screen width, by map class
ALIASES = {'heavy-crate': 'breakable'}                                                # brief name -> map class


def cut_background(im, tolerance=40):
    """Make the flat background transparent by flood-filling from the edges."""
    im = im.convert('RGBA'); w, h = im.size; px = im.load()
    bg = px[0, 0][:3]
    near = lambda c: c[3] == 0 or sum(abs(a - b) for a, b in zip(c[:3], bg)) <= tolerance
    seen, todo = set(), deque((x, y) for x in range(w) for y in (0, h - 1)) + deque((x, y) for y in range(h) for x in (0, w - 1))
    while todo:
        x, y = todo.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h) or not near(px[x, y]): continue
        seen.add((x, y)); px[x, y] = (0, 0, 0, 0)
        todo.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    box = im.getbbox()
    return im.crop(box) if box else im


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--check', action='store_true', help='report what would be imported; write nothing')
    args = ap.parse_args()
    listing, notes = {}, []
    for path in sorted(glob.glob(os.path.join(RAW, 'bg-*.png')) + glob.glob(os.path.join(RAW, 'prop-*.png'))):
        name = os.path.splitext(os.path.basename(path))[0]
        im = Image.open(path)
        if name.startswith('bg-'):
            layer = name.rsplit('-', 1)[-1]
            if layer == 'full':                         # one picture of a whole room: 540 high, as wide as the room
                w = round(im.width * 540 / im.height)
                if abs(w - round(w / 480) * 480) <= 6 and w >= 954: w = round(w / 480) * 480      # generators miss 16:9 by a pixel or two; do not leave a gap
                if w < 960: notes.append(f'{name}: only {w} px wide at 540 high; a room is at least 960')
                out = im.convert('RGB').resize((w, 540), Image.LANCZOS)
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
