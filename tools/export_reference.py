#!/usr/bin/env python3
"""Export a labelled catalogue of the Animal Control sheets as they are in the game, to art/reference/.

One image per type (every pose, row by row) and an overview at relative size. Reference only, never imported.
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

TYPES = ['uniform', 'punk', 'suit', 'preppy', 'bodybuilder', 'round', 'chief']
NOTES = {
  'uniform': 'Uniform: khaki shirt, cap, badge, catch net. Lunges with the net.',
  'punk': 'Punk: mohawk, dark jacket, jeans, net. Fast, jumps.',
  'suit': 'Suit: dark suit, tie, sunglasses, briefcase held in front as a shield.',
  'preppy': 'Preppy: polo, visor, tennis racket. Serves tennis balls.',
  'bodybuilder': 'Body Builder: huge torso, tiny head, bare fists. Ground slam.',
  'round': 'Round: very wide, uniform shirt, cap, no weapon. Leaps belly first.',
  'chief': 'The Chief (boss): long navy coat, gold buttons, peaked cap, moustache, big net.',
}
BG, INK, DIM = (58, 50, 82), (255, 255, 255), (190, 184, 214)
Z = 1
m = json.load(open('assets/manifest.json'))
os.makedirs('art/reference', exist_ok=True)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22); small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
except OSError: font = small = ImageFont.load_default()

def card(t):
    e = m['officer-' + t]; src = Image.open('assets/' + e['file']).convert('RGBA')
    fw, fh, cols = e['frameWidth'], e['frameHeight'], e['cols']
    label_w, top = 150, 56
    out = Image.new('RGBA', (label_w + cols * fw * Z + 20, top + len(e['rows']) * fh * Z + 16), (*BG, 255)); d = ImageDraw.Draw(out)
    d.text((16, 14), NOTES[t], fill=INK, font=font)
    for r, row in enumerate(e['rows']):
        y = top + r * fh * Z
        d.text((16, y + fh * Z // 2 - 10), row, fill=INK, font=font)
        d.text((16, y + fh * Z // 2 + 16), f"{e['counts'][row]} frame" + ('s' if e['counts'][row] > 1 else ''), fill=DIM, font=small)
        for c in range(e['counts'][row]):
            f = src.crop((c * fw, r * fh, (c + 1) * fw, (r + 1) * fh)).resize((fw * Z, fh * Z), Image.NEAREST)
            out.alpha_composite(f, (label_w + c * fw * Z, y))
        d.line([(label_w, y + fh * Z - 9), (out.width - 20, y + fh * Z - 9)], fill=(92, 82, 124))    # the floor line
    return out.convert('RGB')

cards = {t: card(t) for t in TYPES}
for t, im in cards.items(): im.save(f'art/reference/officer-{t}.png')

# One overview: every type's idle, wind-up and swing side by side, drawn at relative in-game size.
scale = {}
cellw, h = 400, 300
ov = Image.new('RGBA', (cellw * len(TYPES), h * 3 + 60), (*BG, 255)); d = ImageDraw.Draw(ov)
d.text((16, 14), 'Animal Control at relative in-game size. Rows: idle, wind-up, swing.', fill=INK, font=font)
for i, t in enumerate(TYPES):
    e = m['officer-' + t]; src = Image.open('assets/' + e['file']).convert('RGBA'); fw, fh = e['frameWidth'], e['frameHeight']
    for r, row in enumerate(['idle', 'windup', 'swing']):
        ri = e['rows'].index(row); k = 1.25
        f = src.crop((0, ri * fh, fw, (ri + 1) * fh)); f = f.resize((round(fw * k), round(fh * k)), Image.NEAREST)
        ov.alpha_composite(f, (i * cellw + (cellw - f.width) // 2, 60 + (r + 1) * h - f.height - 34))
    d.text((i * cellw + 16, 60 + 3 * h - 28), t, fill=INK, font=font)
ov.convert('RGB').save('art/reference/officers-overview.png')
print('wrote art/reference/:', ', '.join(sorted(os.listdir('art/reference'))))
