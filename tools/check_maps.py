#!/usr/bin/env python3
"""Static checks on every street map: python3 tools/check_maps.py (run from the repo root)."""
# Static checks on every street: every top- pick-up really is over an obstacle, nothing overlaps a pen or door, every lane band has a way through.
import json, glob
TOP, BOT = 345, 515
for f in sorted(glob.glob('maps/brawl/*.tmj')):
    m = json.load(open(f)); S, T = m['layers'][0]['objects'], m['layers'][1]['objects']; W = m['width'] * 32; bad = []
    box = lambda o: (o['x'], o['y'], o['x'] + o['width'], o['y'] + o['height'])
    hit = lambda a, b: a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]
    for t in T:
        if t['name'].startswith('top-'):
            on = [s for s in S if s['x'] - 16 < t['x'] < s['x'] + s['width'] + 16 and s['y'] - 3 < t['y'] < s['y'] + s['height'] + 3]
            if not on: bad.append(f"{t['name']} is not on anything")
    pens = [box(t) for t in T if t['type'] == 'pen']; doors = [box(t) for t in T if t['type'] == 'door']
    for s in S:
        if any(hit(box(s), p) for p in pens): bad.append(f"{s['type']} at {s['x']} overlaps a pen")
        if s['type'] not in ('gate', 'breakable') and any(hit(box(s), d) for d in doors): bad.append(f"{s['type']} at {s['x']} overlaps a door")
        for s2 in S:
            if s is not s2 and s['id'] < s2['id'] and hit(box(s), box(s2)) : bad.append(f"{s['type']} at {s['x']} overlaps {s2['type']} at {s2['x']}")
    # a walker 32 wide needs a gap of 40 px of depth at every x (ignoring full-depth walls, which are puzzles)
    for x in range(0, W, 8):
        blocked = sorted((max(TOP, s['y'] - 3), min(BOT, s['y'] + s['height'] + 3)) for s in S if s['type'] not in ('gate', 'breakable') and s['x'] - 16 < x < s['x'] + s['width'] + 16)
        blocked += [(max(TOP, p[1]), min(BOT, p[3] + 6)) for p in pens if p[0] - 14 < x < p[2] + 14]; blocked.sort()
        y, gap = TOP, 0
        for a, b in blocked: gap = max(gap, a - y); y = max(y, b)
        gap = max(gap, BOT - y)
        if gap < 40: bad.append(f"no way through at x={x}"); break
    print(f.split('/')[-1], 'ok' if not bad else bad)
