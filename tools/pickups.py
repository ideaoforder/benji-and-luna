#!/usr/bin/env python3
"""Draw the placeholder pictures for three pick-ups, like tools/fishbone.py did for the old smelly fish:

  assets/stinky.png   the stinky fish: a brown fish, head to the right, with green smell lines (68x52)
  assets/feather.png  the feather toy: a wand with a feather on a string (52x64)
  assets/catbed.png   the cat bed (checkpoint): a round cushion bed, seen from the front (112x60)

Replace any of them with real art of about the same shape any time (art/TODO.md section 7).
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DARK = (28, 22, 48, 255)


def save(im, name, k=2):
    out = os.path.join(ROOT, 'assets', name)
    im.resize((im.width * k, im.height * k), Image.NEAREST).save(out)
    print('wrote', os.path.relpath(out, ROOT))


def stinky():
    im = Image.new('RGBA', (34, 26), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    body, belly, fin = (139, 94, 52, 255), (178, 132, 82, 255), (101, 66, 38, 255)
    y = 18                                                                                  # the fish's middle line
    d.polygon([(1, y - 6), (8, y), (1, y + 6)], fill=DARK); d.polygon([(2, y - 4), (7, y), (2, y + 4)], fill=fin)        # tail
    d.ellipse([6, y - 7, 32, y + 7], fill=DARK); d.ellipse([7, y - 6, 31, y + 6], fill=body)
    d.ellipse([10, y, 29, y + 5], fill=belly)
    d.polygon([(14, y - 6), (19, y - 9), (22, y - 6)], fill=fin)                            # back fin
    for x in (12, 16, 20): d.point([(x, y - 2), (x + 1, y - 1)], fill=fin)                   # tired old scales
    d.line([(26, y - 3), (28, y - 1)], fill=DARK); d.line([(26, y - 1), (28, y - 3)], fill=DARK)   # x eye: not fresh
    d.line([(30, y + 2), (31, y + 2)], fill=DARK)
    green = (124, 214, 90, 255)
    for x0 in (10, 17, 24):                                                                 # three wavy smell lines
        pts = [(x0 + (1 if i % 4 in (1, 2) else 0) - (1 if i % 4 == 3 else 0), 9 - i) for i in range(9)]
        d.line(pts, fill=DARK, width=3); d.line(pts, fill=green, width=1)
    save(im, 'stinky.png')


def feather():
    im = Image.new('RGBA', (26, 32), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.line([(3, 30), (13, 6)], fill=DARK, width=3); d.line([(3, 30), (13, 6)], fill=(214, 170, 110, 255), width=1)    # wand
    d.line([(13, 6), (19, 9), (20, 14)], fill=(240, 240, 240, 255))                         # string
    pink, purple, hi = (255, 120, 190, 255), (160, 100, 240, 255), (255, 210, 235, 255)
    d.polygon([(20, 13), (25, 18), (24, 26), (19, 30), (16, 24), (17, 17)], fill=DARK)       # feather
    d.polygon([(20, 15), (24, 19), (23, 25), (19, 28), (17, 23), (18, 18)], fill=pink)
    d.polygon([(19, 22), (23, 21), (22, 25), (19, 28), (17, 25)], fill=purple)
    d.line([(20, 15), (19, 28)], fill=hi)
    for x, y in [(8, 4), (22, 4), (4, 12)]: d.point([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=(255, 224, 102, 255))   # sparkles
    save(im, 'feather.png')


def catbed():
    im = Image.new('RGBA', (56, 30), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    rim, rim_hi, cushion, cushion_hi = (120, 76, 170, 255), (160, 116, 214, 255), (255, 196, 120, 255), (255, 226, 170, 255)
    d.ellipse([1, 10, 54, 29], fill=DARK); d.ellipse([2, 11, 53, 28], fill=rim)            # the round bed
    d.ellipse([7, 9, 48, 21], fill=DARK); d.ellipse([8, 10, 47, 20], fill=cushion)          # the cushion inside
    d.ellipse([12, 11, 36, 16], fill=cushion_hi)
    d.arc([4, 13, 51, 27], 20, 160, fill=rim_hi)
    d.ellipse([24, 13, 31, 18], fill=(255, 150, 120, 255))                                   # a paw print on the cushion
    for dx in (-3, 0, 3): d.point([(27 + dx + 1, 11)], fill=(255, 150, 120, 255))
    white = (255, 255, 255, 255)                                                             # zzz
    for x, y, s in [(38, 4, 5), (46, 0, 4)]:
        d.line([(x, y), (x + s, y), (x, y + s), (x + s, y + s)], fill=white)
    save(im, 'catbed.png')


if __name__ == '__main__':
    stinky(); feather(); catbed()
