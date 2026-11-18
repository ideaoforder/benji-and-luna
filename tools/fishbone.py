#!/usr/bin/env python3
"""Draw the smelly fish: a fish skeleton, head to the right. Writes assets/fishbone.png (68x36).

Placeholder pixel art drawn in code, like tools/slash.py; replace the file with real art of the same size any time.
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets/fishbone.png')
BONE, DARK = (244, 240, 224, 255), (28, 22, 48, 255)


def bones(d, c, grow=0):
    g = grow
    d.line([(7, 9), (23, 9)], fill=c, width=1 + 2 * g)                                   # spine
    for x, h in [(9, 3), (12, 4), (15, 5), (18, 5), (21, 4)]:                            # ribs, longest in the middle
        d.line([(x, 9 - h), (x, 9 + h)], fill=c, width=1 + 2 * g)
    d.polygon([(7, 9), (1 - g, 3 - g), (3, 9), (1 - g, 15 + g)], fill=c)                 # tail fin
    d.polygon([(23, 4 - g), (29, 5 - g), (32 + g, 9), (29, 13 + g), (23, 14 + g)], fill=c)   # skull


def main():
    im = Image.new('RGBA', (34, 18), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    bones(d, DARK, 1); bones(d, BONE)
    d.rectangle([26, 7, 27, 8], fill=DARK)                                               # eye socket
    d.line([(30, 10), (31, 10)], fill=DARK)                                              # mouth
    im.resize((68, 36), Image.NEAREST).save(OUT)
    print('wrote', os.path.relpath(OUT))


if __name__ == '__main__':
    main()
