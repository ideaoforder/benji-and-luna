#!/usr/bin/env python3
"""Import the Mine Cart Ride art (art/raw/cart-mine.png, cart-wheel.png, prop-cart-beam.png, prop-cart-crystal.png)
into assets/cart/ at 2x the on-screen size. Bounds and key colours come from art/cart-ride-originals.json.

The cart body is cut in three (left end, middle, right end; ChatGPT's split points x=400 and x=1770) so the game can
stretch only the plain middle when more cats ride. The wheel is cropped square about its axle so it spins true.
Keying is by distance to the flat green, so the crystals' cyan is kept.
"""
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets/cart')
K = 2                                                 # stored at 2x the on-screen size (the game draws at RES 2)
info = {os.path.basename(e['file']): e for e in json.load(open(os.path.join(ROOT, 'art/cart-ride-originals.json')))}


def keyed(name):
    e = info[name]; im = Image.open(os.path.join(ROOT, e['file'])).convert('RGBA')
    a = np.asarray(im).astype(float); key = np.array(e['key_rgb'], float)
    d = np.sqrt(((a[..., :3] - key) ** 2).sum(-1))
    alpha = np.clip((d - 70) / 60, 0, 1)              # well away from the green: solid; near it: see-through
    rgb = a[..., :3].copy()
    edge = alpha < 1                                  # take the green cast off the soft edge
    g_over = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
    rgb[..., 1] = np.where(edge & (g_over > 0), rgb[..., 1] - g_over, rgb[..., 1])
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    x0, y0, x1, y1 = e['bounds_xyxy']
    return Image.fromarray(out, 'RGBA').crop((x0, y0, x1, y1)), (x0, y0)


def fit(im, w=None, h=None):
    k = (w / im.width) if w else (h / im.height)
    return im.convert('RGBa').resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS).convert('RGBA')


def save(im, name):
    os.makedirs(OUT, exist_ok=True); im.save(os.path.join(OUT, name)); print(f'{name:18} {im.width}x{im.height}')


# The cart: 52 tall on screen, in three pieces.
body, (bx, by) = keyed('cart-mine.png')
H = 52 * K; k = H / body.height
for part, (a, b) in {'cart-left.png': (75, 400), 'cart-mid.png': (400, 1770), 'cart-right.png': (1770, 2097)}.items():
    save(fit(body.crop((a - bx, 0, b - bx, body.height)), h=H), part)
# The wheel: square about its axle (source 768, 512), 30 across.
wheel, (wx, wy) = keyed('cart-wheel.png')
r = max(768 - 335, 1200 - 768, 512 - 71, 953 - 512)
sq = Image.new('RGBA', (2 * r, 2 * r), (0, 0, 0, 0)); sq.alpha_composite(wheel, (r - (768 - wx), r - (512 - wy)))
save(fit(sq, w=30 * K), 'cart-wheel.png')
save(fit(keyed('prop-cart-beam.png')[0], w=120 * K), 'cart-beam.png')
save(fit(keyed('prop-cart-crystal.png')[0], w=64 * K), 'cart-crystal.png')
