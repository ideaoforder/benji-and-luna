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
    // "uniform; uniform, punk" -> [['uniform'], ['uniform', 'punk']]
    waves: (p.waves || '').split(';').map(w => w.split(',').map(s => s.trim()).filter(Boolean)).filter(w => w.length),
    // brawler only: "0; 790" = the second wave waits until the cats have walked past x = 790
    waveAt: String(p.waveAt === undefined ? '' : p.waveAt).split(';').map(s => Number(s) || 0),
    solids: objs('solids'), things: objs('things')
  };
}

export const ROOMS = ['alley', 'yard', 'roof', 'pound'];

// The brawler's streets live in maps/brawl/. Same file format; see README for the object classes.
export const STREETS = ['alley', 'yard', 'roof', 'park', 'market', 'depot', 'kennels', 'pound',
  'apartment', 'corridor'];      // side route off the alley; the game starts at the first street in this list
