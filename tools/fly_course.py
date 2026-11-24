#!/usr/bin/env python3
"""Write maps/fly/chase.tmj: the Cloud Chase (the Airship's flying part), as a Tiled map that Tiled can edit too.

Things in the "things" layer, by x = how far the chase has scrolled when they come on at the right edge of the screen:
  sign     a hint across the top (property text)
  wave     enemies: property kind = drone | balloon | board, count, and y (screen height of the first one)
  paw      a golden paw floating at y
  boss     the helicopter comes in; the chase ends when it goes down
Map properties: title, speed (px/s the clouds go by), next / nextDoor (the street the cats land in afterwards).
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
course = []
def put(cls, x, y=270, **props): course.append((cls, x, y, props))
def paws(x0, n, y, gap=70, wave=0):
    import math
    for i in range(n): put('paw', x0 + i * gap, round(y + wave * math.sin(i / 1.5)))

put('sign', 300, 120, text='Fly with the stick!  Jump or tool: shoot yarn.  Attack: claw up close')
paws(700, 6, 300, wave=60)
put('wave', 1300, 200, kind='drone', count=3)
put('sign', 1500, 120, text='Rotor drones throw nets: a net slows you down')
put('wave', 2300, 380, kind='drone', count=4)
paws(2600, 5, 160)
put('sign', 3300, 120, text='Balloon drones are tough: keep shooting!')
put('wave', 3600, 260, kind='balloon', count=1)
put('wave', 4300, 150, kind='drone', count=3)
put('sign', 5000, 120, text='Officers on boards charge at you: watch for the !')
put('wave', 5300, 300, kind='board', count=2)
paws(5800, 6, 420, wave=40)
put('sign', 6400, 120, text='Special: a meow pops nearby nets')
put('wave', 6700, 180, kind='balloon', count=2)
put('wave', 7400, 360, kind='drone', count=5)
put('wave', 8100, 250, kind='board', count=3)
paws(8600, 7, 260, wave=120)
put('wave', 9300, 160, kind='drone', count=4)
put('wave', 9500, 400, kind='balloon', count=1)
put('wave', 10300, 280, kind='board', count=2)
put('wave', 10600, 200, kind='drone', count=5)
paws(11200, 6, 330)
put('sign', 11800, 120, text='Here comes the helicopter!')
put('boss', 12300)

objs = []
for i, (kind, x, y, props) in enumerate(course, 1):
    o = {'id': i, 'name': '', 'type': kind, 'x': x, 'y': y, 'width': 0, 'height': 0, 'rotation': 0, 'visible': True, 'point': True}
    if props: o['properties'] = [{'name': k, 'type': 'int' if isinstance(v, int) else 'string', 'value': v} for k, v in props.items()]
    objs.append(o)
W = 13000
tmj = {'type': 'map', 'version': '1.10', 'tiledversion': '1.10.2', 'orientation': 'orthogonal', 'renderorder': 'right-down',
       'infinite': False, 'width': W // 32, 'height': 17, 'tilewidth': 32, 'tileheight': 32, 'compressionlevel': -1,
       'properties': [{'name': 'title', 'type': 'string', 'value': 'Cloud Chase'}, {'name': 'speed', 'type': 'int', 'value': 170},
                      {'name': 'next', 'type': 'string', 'value': 'rooftop'}, {'name': 'nextDoor', 'type': 'string', 'value': 'west'}],
       'layers': [{'id': 1, 'name': 'things', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1, 'visible': True, 'x': 0, 'y': 0, 'objects': objs}],
       'nextlayerid': 2, 'nextobjectid': len(objs) + 1, 'tilesets': []}
out = os.path.join(ROOT, 'maps/fly/chase.tmj')
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(tmj, open(out, 'w'), indent=1)
print('wrote', os.path.relpath(out, ROOT), len(objs), 'things')
