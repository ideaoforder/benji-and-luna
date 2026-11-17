"""Placeholder Animal Control art, drawn in code. One sheet per type, in the art/SPEC.md layout
(rows: idle, walk, windup, swing, hurt). Replace any of these with real art via tools/import_sheet.py."""
import sys, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(__file__))
from sheetlib import pack, record

OUT = (38, 28, 48); SKIN = (240, 196, 160); BOOT = (40, 36, 44); GOLD = (250, 210, 70)
TYPES = {
  'uniform':     dict(shirt=(201,176,116), dark=(160,136,84), pants=(70,78,96),   hat='cap',    hatc=(52,74,62),   tool='net',    half=7),
  'preppy':      dict(shirt=(244,160,182), dark=(214,120,148), pants=(236,230,214), hat='visor', hatc=(250,250,250), tool='racket', half=6, hair=(232,200,110)),
  'punk':        dict(shirt=(54,48,66),    dark=(34,30,44),   pants=(74,96,150),  hat='mohawk', hatc=(120,220,90), tool='net',    half=6),
  'suit':        dict(shirt=(62,66,84),    dark=(44,46,60),   pants=(52,56,72),   hat='hair',   hatc=(50,40,40),   tool='case',   half=7, tie=(200,50,60), shades=True),
  'bodybuilder': dict(shirt=(245,245,245), dark=(210,210,220), pants=(190,60,60), hat='bald',   hatc=SKIN,         tool='fists',  half=11, arms=SKIN),
  'chief':       dict(shirt=(44,56,104),   dark=(30,38,74),   pants=(30,38,74),   hat='cap',    hatc=(30,38,74),   tool='net',    half=8, coat=True, stache=True),
  'round':       dict(shirt=(110,150,110), dark=(84,120,88),  pants=(70,78,96),   hat='cap',    hatc=(52,74,62),   tool='belly',  half=12, round=True),
}

def draw(t, pose):
    g = Image.new('RGBA', (60, 48)); d = ImageDraw.Draw(g)
    h = t['half']; cx = 30
    la, ra = {'a': (2, -2), 'b': (-2, 2)}.get(pose, (1, -1))
    lean = {'hurt': -2, 'swing': 1}.get(pose, 0)
    squat = 2 if (pose == 'windup' and t['tool'] in ('belly', 'fists')) else 0
    top = 17 + squat
    for off, x in ((la, cx - 5), (ra, cx + 1)):                                   # legs
        d.rectangle([x + off, 33, x + off + 4, 43], fill=t['pants']); d.rectangle([x + off, 44, x + off + 5, 46], fill=BOOT)
    if t.get('round'):                                                            # torso
        d.ellipse([cx - h + lean, top - 1, cx + h + lean, 35], fill=t['shirt'])
        d.rectangle([cx - h + 2 + lean, 30, cx + h - 2 + lean, 31], fill=BOOT)
    else:
        d.rectangle([cx - h + lean, top, cx + h - 1 + lean, 32], fill=t['shirt'])
        d.rectangle([cx - h + lean, top, cx - h + 2 + lean, 29], fill=t['dark'])
        d.rectangle([cx - h + lean, 30, cx + h - 1 + lean, 31], fill=BOOT)
    if t.get('coat'):                                                             # long coat, gold buttons and epaulettes
        d.rectangle([cx - h + lean, 32, cx + h - 1 + lean, 39], fill=t['shirt']); d.rectangle([cx - h + lean, 32, cx - h + 2 + lean, 39], fill=t['dark'])
        for by in (top + 3, top + 8, top + 13): d.point((cx + 1 + lean, by), fill=GOLD)
        d.rectangle([cx - h + lean, top, cx - h + 3 + lean, top], fill=GOLD); d.rectangle([cx + h - 4 + lean, top, cx + h - 1 + lean, top], fill=GOLD)
    if t.get('tie'): d.rectangle([cx + 3 + lean, top, cx + 4 + lean, top + 8], fill=t['tie'])
    if t['hat'] == 'cap': d.rectangle([cx + 2 + lean, top + 3, cx + 3 + lean, top + 4], fill=GOLD)   # badge
    hx = cx - 5 + lean * 2; hy = 7 + squat                                        # head
    d.rectangle([hx, hy, hx + 10, hy + 9], fill=SKIN)
    if t['hat'] == 'cap':
        d.rectangle([hx - 1, hy - 4, hx + 11, hy], fill=t['hatc']); d.rectangle([hx + 8, hy, hx + 14, hy + 1], fill=t['hatc'])
        d.rectangle([hx + 4, hy - 3, hx + 6, hy - 2], fill=GOLD)
    elif t['hat'] == 'visor':
        d.rectangle([hx - 1, hy - 3, hx + 9, hy], fill=t['hair']); d.rectangle([hx + 2, hy - 1, hx + 14, hy], fill=t['hatc'])
    elif t['hat'] == 'mohawk':
        for k in range(5): d.rectangle([hx + 1 + k * 2, hy - 6 + (k % 2), hx + 2 + k * 2, hy - 1], fill=t['hatc'])
    elif t['hat'] == 'hair':
        d.rectangle([hx - 1, hy - 2, hx + 10, hy + 1], fill=t['hatc']); d.rectangle([hx - 1, hy, hx, hy + 5], fill=t['hatc'])
    if pose == 'hurt':
        d.line([hx + 6, hy + 3, hx + 8, hy + 5], fill=OUT); d.line([hx + 8, hy + 3, hx + 6, hy + 5], fill=OUT)
        d.rectangle([hx + 6, hy + 7, hx + 8, hy + 8], fill=OUT)
    else:
        if t.get('shades'): d.rectangle([hx + 4, hy + 3, hx + 10, hy + 4], fill=OUT)
        else: d.rectangle([hx + 7, hy + 3, hx + 8, hy + 4], fill=OUT)
        d.line([hx + 6, hy + 7, hx + 9, hy + 7], fill=OUT)
    if t.get('stache'): d.rectangle([hx + 5, hy + 6, hx + 10, hy + 6], fill=(90, 70, 50))
    sh = (cx + h - 4 + lean, top + 2); armc = t.get('arms', t['dark']); tool = t['tool']
    if tool in ('net', 'racket'):
        r = 5 if tool == 'net' else 4
        hand, tip, hoop = {'windup': ((30, 12), (18, 6), (13, 6)), 'swing': ((41, 25), (50, 32), (53, 37)),
                           'hurt': ((38, 12), (44, 4), (48, 3))}.get(pose, ((39, 25), (46, 10), (48, 6)))
        d.line([sh, hand], fill=armc, width=3); d.rectangle([hand[0] - 1, hand[1] - 1, hand[0] + 1, hand[1] + 1], fill=SKIN)
        d.line([hand, tip], fill=(140, 96, 60))
        d.ellipse([hoop[0] - r, hoop[1] - r, hoop[0] + r, hoop[1] + r], outline=(245, 245, 250))
        for k in (-2, 1):
            d.line([hoop[0] + k, hoop[1] - r + 1, hoop[0] + k, hoop[1] + r - 1], fill=(215, 215, 230))
            d.line([hoop[0] - r + 1, hoop[1] + k, hoop[0] + r - 1, hoop[1] + k], fill=(215, 215, 230))
    elif tool == 'case':
        hand = {'windup': (27, 10), 'swing': (45, 30), 'hurt': (40, 14)}.get(pose, (40, 27))
        d.line([sh, hand], fill=armc, width=3)
        d.rectangle([hand[0] - 3, hand[1], hand[0] + 5, hand[1] + 6], fill=(140, 96, 60)); d.rectangle([hand[0], hand[1] - 1, hand[0] + 2, hand[1]], fill=OUT)
    elif tool == 'fists':
        for sx in (cx - h + 1 + lean, cx + h - 2 + lean):
            hand = {'windup': (sx, top - 12), 'swing': (sx + (4 if sx > cx else -4), 40), 'hurt': (sx, top - 6)}.get(pose, (sx + (3 if sx > cx else -3), 29))
            d.line([(sx, top + 2), hand], fill=armc, width=4); d.rectangle([hand[0] - 2, hand[1] - 2, hand[0] + 2, hand[1] + 2], fill=SKIN)
    else:                                                                         # belly: stubby arms
        hand = {'swing': (cx + h + 4, top + 4), 'hurt': (cx + h + 2, top - 3)}.get(pose, (cx + h + 2, top + 9))
        d.line([(cx + h - 2 + lean, top + 4), hand], fill=armc, width=3); d.rectangle([hand[0] - 1, hand[1] - 1, hand[0] + 1, hand[1] + 1], fill=SKIN)
    al = np.asarray(g)[..., 3] > 0; ring = ndi.binary_dilation(al) & ~al          # dark outline
    arr = np.asarray(g).copy(); arr[ring] = (*OUT, 255)
    return Image.fromarray(arr, 'RGBA').resize((180, 144), Image.NEAREST)

for key, t in TYPES.items():
    rows = [('idle', [draw(t, 'idle')]), ('walk', [draw(t, 'a'), draw(t, 'b')]),
            ('windup', [draw(t, 'windup')]), ('swing', [draw(t, 'swing')]), ('hurt', [draw(t, 'hurt')])]
    sheet, entry = pack(rows, 180, 144)
    name = f'officer-{key}.png'; sheet.save('assets/' + name); record('officer-' + key, name, entry)
print('wrote', ', '.join('officer-' + k for k in TYPES))
