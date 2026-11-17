// The brawler test room. Positions are floor coordinates: x along the street, y = depth (on-screen y of the feet).
// An obstacle occupies the floor rectangle x..x+w, y..y+d and stands h tall.
//   breakable: only Benji's hits break it.   fence: only Luna slips through (from the left).
import { BRAWL } from '../config.js';

const top = BRAWL.floorTop, depth = BRAWL.floorBottom - BRAWL.floorTop;

export const ROOM = {
  title: 'Pound Yard', w: 1900,
  obstacles: [
    { kind: 'dumpster', x: 360, y: top, w: 150, d: 44, h: 72, color: 0x3f7a5c },
    { kind: 'crate', x: 720, y: top + 96, w: 64, d: 46, h: 54, color: 0x9a6b3f },
    { kind: 'breakable', x: 1090, y: top, w: 58, d: depth, h: 150, color: 0xa8743f },
    { kind: 'fence', x: 1520, y: top, w: 12, d: depth, h: 124, color: 0x8b93a7 }
  ],
  signs: [
    { x: 1119, y: top - 160, text: 'Heavy crates: Benji can break them' },
    { x: 1526, y: top - 134, text: 'Only Luna fits through the fence' }
  ],
  pickups: [
    { kind: 'sticky', x: 600, y: top + 120 },
    { kind: 'catnip', x: 1300, y: top + 60 },
    { kind: 'milk', x: 1700, y: top + 90 }
  ],
  // A wave starts once the previous one is beaten and the cats have walked past `at`.
  waves: [
    { at: 0, foes: ['uniform', 'uniform'] },
    { at: 0, foes: ['punk', 'suit'] },
    { at: 1200, foes: ['bodybuilder', 'preppy', 'round'] }
  ]
};
