// Rooms are Tiled maps (maps/*.tmj) made only of rectangle objects, so they open and save in Tiled.
// Layer "solids": things you stand on or bump into. Layer "things": doors, spawns, pickups.
// An object's class (the "type"/"class" field) says what it is; custom properties tune it.

const props = list => Object.fromEntries((list || []).map(p => [p.name, p.value]));

export function parseMap(json) {
  const objs = name => {
    const layer = json.layers.find(l => l.name === name);
    return (layer ? layer.objects : []).map(o => ({
      cls: o.type || o.class || '', name: o.name || '', x: o.x, y: o.y, w: o.width || 0, h: o.height || 0,
      props: props(o.properties)
    }));
  };
  const p = props(json.properties);
  return {
    w: json.width * json.tilewidth, h: json.height * json.tileheight,
    title: p.title || '', theme: p.theme || 'alley', final: !!p.final,
    shop: p.shop || '',
    challenge: p.challenge || '',         // a challenge room: src/brawl/challenge.js
    props: p,                             // everything else the map says (climbs: stones)                   // a shop room: no waves; SHOPS[shop] in config.js says what is sold
    tough: Number(p.tough) || 1,          // officers' health is multiplied by this (later areas are tougher)
    slippery: !!p.slippery,               // ice: cats slide

    // "uniform; uniform, punk" -> [['uniform'], ['uniform', 'punk']]
    waves: (p.waves || '').split(';').map(w => w.split(',').map(s => s.trim()).filter(Boolean)).filter(w => w.length),
    // brawler only: "0; 790" = the second wave waits until the cats have walked past x = 790
    waveAt: String(p.waveAt === undefined ? '' : p.waveAt).split(';').map(s => Number(s) || 0),
    solids: objs('solids'), things: objs('things')
  };
}

export const ROOMS = ['alley', 'yard', 'roof', 'pound'];

// The brawler's streets live in maps/brawl/, grouped into areas by maps/areas.json (same file format as above; see
// README for the object classes). An area starts at the first street in its list.
export let AREAS = [], STREETS = [], SIDE_ROOMS = [], CLIMBS = [], RIDES = [];
// Side rooms (shops, challenges) are entered from a street and their way out goes back to it.
export function setAreas(json) { AREAS = json.areas; SIDE_ROOMS = [...(json.shops || []), ...(json.challenges || [])]; CLIMBS = json.climbs || []; RIDES = json.rides || []; STREETS = [...AREAS.flatMap(a => a.streets), ...SIDE_ROOMS]; }
export const areaOf = room => Math.max(0, AREAS.findIndex(a => a.streets.includes(room)));
