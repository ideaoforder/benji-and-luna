#!/usr/bin/env python3
"""Write maps/cart/mine.tmj: the Mine Cart Ride course, as a Tiled map so it can be opened and edited in Tiled.

Everything is a point (or a rectangle, for ramps) in the "things" layer, placed along the track by x:
  sign    text shown above the track (property text): the hints for a first ride
  paw     a golden paw to grab; y is how high it floats (the cart floor is y = 440)
  crystal a crystal cluster to break with a claw (two paws); y as for paws
  beam    a low beam across the tunnel: duck (down) or get bonked
  bot     a Drill Bot on the rails, rolling at the cart: claw it, or jump over it
  ramp    the cart jumps; width = how far it flies (the rails stop under it)
  goal    the end of the line
Map property `speed`: how fast the cart rolls (px/s). Edit the list below and run this again, or edit the .tmj in Tiled.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLOOR = 440                                   # where the cats stand in the cart

course = []
def put(kind, x, y=FLOOR, **props): course.append((kind, x, y, props))
def paws(x0, n, gap=60, h=0, arc=0):          # a line (or an arc) of paws, h above the floor
    for i in range(n):
        lift = arc * 4 * (i / max(1, n - 1)) * (1 - i / max(1, n - 1))
        put('paw', x0 + i * gap, FLOOR - 40 - h - lift)

# 1. Getting going: paws to grab, and one hint per thing to do.
put('sign', 500, text='Hold on! Left and right move you in the cart')
paws(900, 5)
put('sign', 1500, text='Jump to grab the high paws')
paws(1800, 4, h=90)
# 2. The first Drill Bot and the first beam, with time to read the hint.
put('sign', 2500, text='Drill Bot! Claw it, or jump over it')
put('bot', 3100)
put('sign', 3700, text='Low beam! Hold down to duck')
put('beam', 4300)
paws(4500, 4)
# 3. Crystals: claw them for paws.
put('sign', 5000, text='Claw the crystals for paws')
put('crystal', 5500); put('crystal', 5800, FLOOR - 100); put('crystal', 6100)
# 4. The first jump.
put('sign', 6500, text='Ramp!')
put('ramp', 6900, w=520)
paws(7000, 6, gap=70, h=20, arc=140)
# 5. Everything together, faster in a row.
put('bot', 8000); put('beam', 8600); paws(8750, 3); put('crystal', 9100, FLOOR - 100)
put('bot', 9600); put('bot', 9900)
put('beam', 10500); put('beam', 10800)
paws(11000, 4, h=90)
put('ramp', 11600, w=600)
paws(11700, 7, gap=70, h=20, arc=160)
put('crystal', 12700); put('bot', 13100); put('crystal', 13400, FLOOR - 110); put('beam', 13900)
paws(14100, 5)
put('sign', 14700, text='End of the line!')
put('goal', 15100)

W = 15600
objs = []
for i, (kind, x, y, props) in enumerate(course, 1):
    o = {'id': i, 'name': '', 'type': kind, 'x': x, 'y': y, 'width': props.pop('w', 0), 'height': 0, 'rotation': 0, 'visible': True}
    if not o['width']: o['point'] = True
    if props: o['properties'] = [{'name': k, 'type': 'string', 'value': v} for k, v in props.items()]
    objs.append(o)
tmj = {'type': 'map', 'version': '1.10', 'tiledversion': '1.10.2', 'orientation': 'orthogonal', 'renderorder': 'right-down',
       'infinite': False, 'width': W // 32, 'height': 17, 'tilewidth': 32, 'tileheight': 32, 'compressionlevel': -1,
       'properties': [{'name': 'title', 'type': 'string', 'value': 'Mine Cart Ride'}, {'name': 'speed', 'type': 'int', 'value': 270},
                      {'name': 'backdrop', 'type': 'string', 'value': 'cartline'}],
       'layers': [{'id': 1, 'name': 'things', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1, 'visible': True, 'x': 0, 'y': 0, 'objects': objs}],
       'nextlayerid': 2, 'nextobjectid': len(objs) + 1, 'tilesets': []}
out = os.path.join(ROOT, 'maps/cart/mine.tmj')
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(tmj, open(out, 'w'), indent=1)
print('wrote', os.path.relpath(out, ROOT), len(objs), 'things')
