#!/usr/bin/env python3
"""Write the art brief for every street from the maps themselves: python3 tools/level_brief.py

Reads maps/brawl/*.tmj and assets/scenery.json and writes art/levels/BRIEFS.md: for each street, what pictures
exist, what is still needed, how many panels, and where the doors, pens and props are, so the painter never has
to read a map file. The one-line mood for each street is in MOOD below; everything else is measured.
"""
import json, os, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOOD = {
  'alley':     'Back alley at dusk behind the apartment building. Brick, a fire escape, bins, posters. The apartment street door and the fire-escape ladder are in the back wall.',
  'apartment': 'Apartment lobby (done).',
  'corridor':  'Third-floor corridor of the same building: same brick, sage panels and brass as the lobby. Apartment doors along the wall, a window onto the fire escape at the right-hand end.',
  'yard':      "Animal Control's fenced yard in the evening: chain-link, warning signs, kennel roofs beyond, packed dirt and concrete.",
  'roof':      'Rooftops at night: low parapet, vents, a water tank, skyline and stars. Tar-paper floor.',
  'park':      'Catnip Park (done).',
  'market':    'Night market: strings of lanterns, shuttered shopfronts and awnings behind, cobbles underfoot. This is where the park gate leads.',
  'depot':     'Animal Control van depot: corrugated garage doors, AC signs, floodlights, asphalt with yellow bay lines.',
  'kennels':   'Kennel block inside the pound: rows of empty cages along the wall, scrubbed concrete, a drain, barred skylights.',
  'pound':     "The pound's main hall, floodlit: cinder block, barred kennel doors, painted concrete. The boss room; keep the floor especially clear.",
  # The Castle: the glass-and-stone conservatory seen from Catnip Park, up close. Torchlight, banners, grey stone.
  'gatehouse':   'Outside the castle at night: curtain wall, a raised portcullis, torches, a moat glimpsed beyond. Flagstones.',
  'greathall':   'Great hall: long banners, tall windows, a hearth, trophy shields. Polished stone floor.',
  'battlements': 'Wall-walk on top of the castle at night: crenellations along the back, towers, the park and city lights far below.',
  'throne':      "Throne room, one screen: a dais and an absurd throne (the Warden's), red carpet. Boss room; keep the floor clear.",
  # The Jungle: lush and humid, warm greens and gold, Animal Control out of their depth.
  'riverbank':   'Jungle riverbank by day: broad leaves, hanging vines, a river behind, a beached Animal Control boat. Packed earth.',
  'bridges':     'High in the canopy: rope bridges and plank walkways strung between huge trunks. Plank floor.',
  'ruins':       'Overgrown stone ruins: toppled columns, carved cat faces, roots splitting the paving.',
  'temple':      "Inside the sunken temple, one screen: torch-lit carvings, nets strung everywhere (the Trapper's lair). Boss room.",
  # Sakura Dojo: a mountaintop dojo at dusk, cherry blossom pink against purple sky, lanterns, red lacquer, grey stone.
  'torii':       'Stone steps up the mountain at dusk: red torii gates, stone lanterns, cherry trees shedding petals, bamboo. Flagstones.',
  'pagoda':      'Pagoda courtyard: tiered pagodas behind a low wall, a temple bell, raked gravel and stepping stones, blossoms.',
  'blossom':     'An arched red bridge over a waterfall gorge, blossoms everywhere, the moon and far pagodas behind. Plank and stone floor.',
  'shadowdojo':  "Inside the dojo, one screen: paper screens, a purple swirl banner (the Shadow Master's), weapon racks, wooden floor. Boss room.",
  # Crystal Caverns: an underground mine, purple rock lit by blue crystals and warm lanterns.
  'mineshaft':   'Mine entrance inside the mountain: timber props, hanging lanterns, a winch and ore buckets, the daylight mouth behind.',
  'cartline':    'Mine-cart tracks along a cavern wall: rails, full carts, scaffolds, glowing crystal clusters. Rock floor beside the rails.',
  'crystals':    'Crystal falls: a huge cavern with waterfalls and giant blue crystals, wooden walkways and a miners\' hut on stilts behind.',
  'drillpit':    "The drill pit, one screen: a bored-out chamber, drill marks on every wall, rubble, the Drill Captain's rig parked behind. Boss room.",
  # Antarctic Lab: cold blues and white outside, steel and cyan light inside.
  'icefield':    'Antarctic ice field under an aurora: snow drifts, a radio mast, the lab dome in the distance. The floor is ice (cats slide).',
  'loadingbay':  'Lab loading bay: snowcats and cargo containers, roller doors, frost on everything.',
  'research':    'Research floor: glass tanks, consoles, cables, warning lights; cat-themed experiments implied, nothing grim.',
  'core':        "The core, one screen: a ring of machinery around a clear circular floor, cyan glow (the Director's control room). Boss room; the floor is slippery. Its east door leads out to the Airship.",
  # The Airship: an Animal Control zeppelin at sunset; cream envelope, teal iron, brass machinery, golden timber deck.
  'mooring':     'Mooring Deck: the main deck at sunset, the cream envelope overhead with its Animal Control crest, rope ladders, a teal railing, sunset clouds and floating towers beyond. Golden plank floor.',
  'enginehold':  'Engine Hold, below deck: teal boilers with glowing fireboxes, brass pipes and gauges, crates and barrels, a round hatch door. Plank and iron floor.',
  'rigging':     'Upper Rigging: high on the airship, the envelope close above, ropes, spars and a lookout, open sky and clouds all round. Plank floor; its east door is where the cats jump onto their hoverboards.',
  # The Tower: Animal Control headquarters, going down; violet masonry, teal windows, brass and amber lamps.
  'rooftop':     "Rooftop Dock at dusk: the airship's mooring mast and gantry, a big Animal Control Headquarters sign, chimneys and the city far below. Stone and iron floor.",
  'clockwork':   "Clockwork Shaft, one screen: the lift platform going down; the game scrolls the shaft wall itself, so this picture is only the lift's back rail, cables and a brake lever.",
  'records':     'Records & Holding: filing cabinets, pneumatic tubes with folders, a desk lamp, and holding cells H1 and H2 with green-lit doors. Polished floor.',
  'groundexit':  "Ground Exit, one screen: the grand entrance hall at street level, the big arched doors to the city (the way out), banners, and the Commissioner's grabber-arm rig. Final boss room; keep the floor clear.",
}
PANEL = 1012          # a 16:9 picture scaled so its floor edge sits at y=345 comes out about this wide


def main():
    have = json.load(open(os.path.join(ROOT, 'assets/scenery.json')))
    out = ['# Level art briefs', '',
           'Generated by `tools/level_brief.py` from the maps. Do not edit by hand; change the map or the tool.', '',
           '## How to deliver a street (same for all)', '',
           '- One picture per panel, left to right: `art/raw/bg-<street>-full-1.png`, `-2.png` ... Each is an ordinary 16:9',
           '  image of the **empty** street: no characters, no character shadows, nothing standing on the floor.',
           '- The wall meets the floor at about 60-64% of the height. Report where it came out (source y) in',
           '  `art/raw/scenery.json` as `floorY`; the importer scales the picture so that edge lands on y=345.',
           '- Below that edge is plain floor for at least 170 px at 540 scale. Panel N+1 continues panel N to the right.',
           '- Doors in the back wall are painted in the panel at the x given below (x is in street pixels; a panel is',
           f'  about {PANEL} px of street). If a door comes out somewhere else, say where and the map moves to match.',
           '- Props stand on the floor and are separate images on a flat magenta background, top face visible:',
           '  `art/raw/prop-<class>.png`. Sizes are width x front height, plus how deep the top face is.',
           '- Cats can now **jump onto** props, so tops should look flat and standable.', '']
    props = {}
    areas = json.load(open(os.path.join(ROOT, 'maps/areas.json')))['areas']
    for area in areas:
      out += [f"# {area['name']}", '']
      for name in area['streets']:
            m = json.load(open(os.path.join(ROOT, 'maps/brawl', name + '.tmj')))
            P = {p['name']: p['value'] for p in m.get('properties', [])}; w = m['width'] * 32
            S, T = m['layers'][0]['objects'], m['layers'][1]['objects']
            pr = lambda o: {p['name']: p['value'] for p in o.get('properties', [])}
            panels = max(1, round(w / PANEL)); got = [k for k in have if k.startswith(f'bg-{name}-full')]
            out += [f"## {P.get('title', name)} (`{name}`)", '', MOOD.get(name, ''), '',
                    f"- Street length {w} px: **{panels} panel{'s' if panels > 1 else ''}**. " +
                    (f"Delivered: {', '.join(sorted(got))}." if got else 'Nothing delivered yet.')]
            for t in T:
                if t['type'] != 'door': continue
                q = pr(t)
                where = (f"in the back wall at x {int(t['x'])}-{int(t['x'] + t['width'])} (panel {int(t['x'] // PANEL) + 1})" if q.get('side') == 'back'
                         else ('at the left end' if t['x'] < w / 2 else 'at the right end') + ' (walk off the edge; nothing to paint, but the street should look like it continues)')
                out.append(f"- Door to {q.get('label', q.get('target'))}: {where}.")
            for t in T:
                if t['type'] == 'pen': out.append(f"- Luna-only nook against the back wall at x {int(t['x'])}-{int(t['x'] + t['width'])}: keep the wall behind it plain.")
            kinds = {}
            for s in S:
                k = s['type']; kinds.setdefault(k, []).append(s)
                props.setdefault(k, set()).add((int(s['width']), int(pr(s).get('tall', 54)), int(s['height'])))
            if kinds: out.append('- Props on the floor: ' + ', '.join(f"{len(v)} {k}" for k, v in sorted(kinds.items())) + '.')
            out.append('')
    out += ['## Props', '', '| File | Front (w x h) | Top depth | Status |', '|---|---|---|---|']
    names = {'breakable': 'heavy-crate'}
    for k, sizes in sorted(props.items()):
        if k == 'block': continue
        wd, tall, depth = sorted(sizes)[0]
        if k in ('gate', 'breakable'): depth = 60       # full-depth barriers: the picture repeats in depth
        out.append(f"| `art/raw/prop-{names.get(k, k)}.png` | {wd} x {tall} | {depth} | {'done' if 'prop-' + k in have else 'needed'} |")
    out += ['', 'Plain `block` props (market stalls, vans, roof vents, corridor furniture) are flat-colour boxes today. If a street',
            'should have its own, name it `prop-<something>.png`, give its size, and the map class is added to match.', '']
    os.makedirs(os.path.join(ROOT, 'art/levels'), exist_ok=True)
    open(os.path.join(ROOT, 'art/levels/BRIEFS.md'), 'w').write('\n'.join(out))
    print('wrote art/levels/BRIEFS.md')


if __name__ == '__main__':
    main()
