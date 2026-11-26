#!/usr/bin/env python3
"""Import the Airship and Tower art that is not a street panel, prop or character sheet (those go through
import_scenery.py and cut_raw.py): the Cloud Chase's sky layers, the hoverboards and their fan glow, the helicopter in
pieces, and the Clockwork Shaft's scrolling wall and lift foreground. Measurements come from ChatGPT's delivery
(art/levels/airship-tower-delivery.md, airship-tower-parts.json).

Writes assets/fly/*.png (2x the on-screen size, the game draws at RES 2) with assets/fly/fly.json (frame sizes and the
helicopter's attachment points), and assets/lift/shaft.png + front.png (1x, like the other street pictures).

    python3 tools/import_airship.py
"""
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'art/raw')
FLY, LIFT = os.path.join(ROOT, 'assets/fly'), os.path.join(ROOT, 'assets/lift')
K = 2
parts = {os.path.basename(e['file']): e['foreground_bounds_xyxy'] for e in json.load(open(os.path.join(ROOT, 'art/levels/airship-tower-parts.json')))}
listing = {}


def keyed(name):
    """The picture with its flat magenta background made see-through (soft edge, magenta cast taken off)."""
    im = Image.open(os.path.join(RAW, name)).convert('RGBA')
    a = np.asarray(im).astype(float)
    if a[..., 3].min() < 255: return im                       # already transparent
    key = a[2, 2, :3]
    d = np.sqrt(((a[..., :3] - key) ** 2).sum(-1))
    alpha = np.clip((d - 60) / 70, 0, 1)
    rgb = a[..., :3].copy()
    spill = np.clip(np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1], 0, None) * (1 - alpha) * 0.9
    rgb[..., 0] -= spill; rgb[..., 2] -= spill
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8), 'RGBA')


def scale(im, k):
    return im.convert('RGBa').resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS).convert('RGBA')


def sheet(name, frames, origin=None):
    """Frames of different sizes laid side by side in equal cells, each centred (or placed by `origin`)."""
    fw, fh = max(f.width for f in frames), max(f.height for f in frames)
    out = Image.new('RGBA', (fw * len(frames), fh), (0, 0, 0, 0))
    for i, f in enumerate(frames): out.alpha_composite(f, (i * fw + (fw - f.width) // 2, fh - f.height if origin == 'bottom' else 0 if origin == 'top' else (fh - f.height) // 2))
    out.save(os.path.join(FLY, name + '.png'))
    listing[name] = {'file': name + '.png', 'frameWidth': fw, 'frameHeight': fh, 'frames': len(frames)}
    print(f'{name:16} {len(frames)} x {fw}x{fh}')


def crops(name, k):
    im = keyed(name)
    return [scale(im.crop(tuple(b)), k) for b in parts[name]]


os.makedirs(FLY, exist_ok=True); os.makedirs(LIFT, exist_ok=True)

# ---- the Cloud Chase's sky: a still sunset, then far towers and clouds that tile left to right
Image.open(os.path.join(RAW, 'bg-chase-sky.png')).convert('RGB').resize((960 * K, 540 * K), Image.LANCZOS).save(os.path.join(FLY, 'sky.jpg'), quality=85)
listing['sky'] = {'file': 'sky.jpg'}
far = Image.open(os.path.join(RAW, 'bg-chase-far.png')).convert('RGBA')
scale(far, 1920 * K / far.width).resize((1920 * K, 540 * K)).save(os.path.join(FLY, 'far.png')); listing['far'] = {'file': 'far.png'}
cl = Image.open(os.path.join(RAW, 'bg-chase-clouds.png')).convert('RGBA').crop((0, 250, 2172, 475))
cl = scale(cl, 1920 * K / cl.width); cl.save(os.path.join(FLY, 'clouds.png')); listing['clouds'] = {'file': 'clouds.png'}
print('sky, far, clouds')

# ---- boards: the cats' and the officers' share one scale, so they register; 92 across on screen
kb = 92 * K / (1993 - 191)
board = crops('fly-board.png', kb)[0]; board.save(os.path.join(FLY, 'board.png'))
listing['board'] = {'file': 'board.png', 'fans': [round((690 - 191) * kb), round((1490 - 191) * kb)]}
crops('fly-board-officer.png', kb)[0].save(os.path.join(FLY, 'board-officer.png')); listing['board-officer'] = {'file': 'board-officer.png'}
print('board', board.size)
# the fan glow: three pairs of blobs, each pair scaled so its two blobs sit under the two fans
glow = keyed('fly-board-glow.png'); b = parts['fly-board-glow.png']; fan_gap = (1490 - 690) * kb; frames = []
for i in range(3):
    l, r = b[2 * i], b[2 * i + 1]
    gap = ((r[0] + r[2]) - (l[0] + l[2])) / 2
    box = (l[0], min(l[1], r[1]), r[2], max(l[3], r[3]))
    frames.append(scale(glow.crop(box), fan_gap / gap))
sheet('glow', frames, origin='top')

# ---- the helicopter, facing right as drawn (the game mirrors it): body 260 across, pieces at their own sizes
hb = parts['heli-body.png']; s = 260 * K / (hb[0][2] - hb[0][0])
sheet('heli-body', crops('heli-body.png', s))
sheet('heli-rotor', crops('heli-rotor.png', 240 * K / 670), origin='bottom')
sheet('heli-tail', crops('heli-tail.png', 36 * K / 486))
sheet('heli-engine', crops('heli-engine.png', 34 * K / 428))
sheet('heli-lamp', crops('heli-lamp.png', 28 * K / 331), origin='top')
sheet('heli-launcher', crops('heli-launcher.png', 45 * K / 664), origin='top')
hurt = crops('heli-hurt.png', s * 0.82)                       # the damaged hull is drawn a little larger, smoke and all
sheet('heli-hurt', hurt, origin='bottom')
o = hb[0][:2]; at = lambda x, y: [round((x - o[0]) * s), round((y - o[1]) * s)]
bw, bh = hb[0][2] - hb[0][0], hb[0][3] - hb[0][1]
listing['heli'] = {'size': [round(bw * s), round(bh * s)],          # attachment points from the body's top-left, 2x pixels
                   'rotor': at(577, 246), 'tail': at(137, 375), 'engine': at(380, 454), 'launcher': at(603, 522), 'lamp': at(747, 524)}
json.dump(listing, open(os.path.join(FLY, 'fly.json'), 'w'), indent=1)

# ---- the Clockwork Shaft: the wall that scrolls up past the lift (made to repeat), and the lift in front
sh = Image.open(os.path.join(RAW, 'bg-clockwork-shaft.png')).convert('RGB').resize((960, 345), Image.LANCZOS)
a = np.asarray(sh).astype(float); n = 14                       # blend the top and bottom bands so the loop does not show
for i in range(n):                                             # the last rows ease into the first row, which follows them
    t = (i + 1) / (n + 1); a[-n + i] = a[-n + i] * (1 - t) + a[0] * t
Image.fromarray(a.astype(np.uint8)).save(os.path.join(LIFT, 'shaft.jpg'), quality=88)
fr = Image.open(os.path.join(RAW, 'bg-clockwork-full-1.png')).convert('RGBA')
k = 345 / 598; fr = scale(fr, k)
x0 = max(0, (fr.width - 960) // 2); fr = fr.crop((x0, 0, x0 + 960, 540))
fr.save(os.path.join(LIFT, 'front.png'))
print('lift shaft 960x345, front', fr.size)
