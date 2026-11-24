// Every sound the game makes, by event. Each has a synthesised recipe (see `tone` in src/sound.js for the fields), so
// nothing is silent before recordings exist. To replace one with a recording, put art/audio/sfx/<event>.wav (or
// <event>-1.wav, <event>-2.wav... for random variety, or <event>.<cat>.wav for one cat) in place and run
// tools/build_audio.py. The recipe stays as the fallback.
//
// Entry fields:
//   synth: list of tones, played together (use `at` to play them in sequence)
//   cats: { benji: [...] } a cat's own recipe       step: Hz added per combo step (claw)
//   pitchFiles: recordings follow the cat's pitch too (otherwise only the synth does)
//   fileVol: loudness of recordings (default 0.8)    vary: random pitch wobble on recordings (default 0.04)
//   gap: seconds before the same sound can play again (default 0.03)
//
// Style: chip-ish and short, so they sit with the pixel art. Real meows are the one exception worth recording.

export const SFX = {
  // ----- menus and the party -----
  join:        { synth: [{ f: 660, d: 0.15, wave: 'triangle' }, { f: 990, d: 0.12, wave: 'triangle', at: 0.07, vol: 0.04 }] },
  areaPick:    { synth: [{ f: 660, d: 0.06, wave: 'triangle', vol: 0.04 }] },
  swap:        { synth: [{ f: 880, d: 0.1, wave: 'triangle' }] },
  cycle:       { synth: [{ f: 760, d: 0.07, wave: 'triangle' }] },
  nope:        { synth: [{ f: 160, d: 0.08, wave: 'square', vol: 0.04 }], gap: 0.2 },      // no room, too heavy, tool empty
  pause:       { synth: [{ f: 520, to: 780, d: 0.08, wave: 'triangle', vol: 0.04 }] },

  // ----- a cat moving -----
  jump:        { synth: [{ f: 360, to: 720, d: 0.1, wave: 'square', vol: 0.025, lp: 2600 }] },
  dash:        { synth: [{ f: 1800, to: 700, d: 0.12, wave: 'noise', vol: 0.05, q: 0.7 }] },

  // ----- a cat attacking -----
  claw:        { step: 90, pitchFiles: true,
                 synth: [{ f: 300, d: 0.09, wave: 'sawtooth', vol: 0.035, lp: 2200 }, { f: 4200, to: 1600, d: 0.07, wave: 'noise', vol: 0.05, q: 1.2 }] },
  clawFinish:  { pitchFiles: true,
                 synth: [{ f: 300, d: 0.16, wave: 'sawtooth', vol: 0.05, lp: 2000 }, { f: 3600, to: 900, d: 0.14, wave: 'noise', vol: 0.07, q: 1 }] },
  dashAttack:  { pitchFiles: true,
                 synth: [{ f: 240, d: 0.16, wave: 'sawtooth', vol: 0.05, lp: 1800 }, { f: 3000, to: 900, d: 0.14, wave: 'noise', vol: 0.06 }] },
  lunge:       { pitchFiles: true,
                 synth: [{ f: 180, d: 0.28, wave: 'sawtooth', vol: 0.06, lp: 1600 }, { f: 2600, to: 500, d: 0.26, wave: 'noise', vol: 0.07 }] },
  spin:        { synth: [{ f: 260, to: 520, d: 0.18, wave: 'triangle', vol: 0.05 }, { f: 2400, to: 1200, d: 0.16, wave: 'noise', vol: 0.03 }] },
  stompHop:    { synth: [{ f: 330, to: 600, d: 0.12, wave: 'triangle', vol: 0.05 }] },
  stompLand:   { synth: [{ f: 120, to: 50, d: 0.18, wave: 'sawtooth', vol: 0.07, lp: 700 }, { f: 500, to: 120, d: 0.2, wave: 'noise', vol: 0.12 }] },
  batBack:     { synth: [{ f: 1200, d: 0.07, wave: 'square', vol: 0.04 }, { f: 2600, to: 1800, d: 0.05, wave: 'noise', vol: 0.05 }] },

  // ----- specials -----
  // The meow rises and falls ("mee-ow"); each cat's pitch comes from `pitch` in CATS (src/config.js).
  meow:        { synth: [{ f: [420, 640, 560, 330], d: 0.42, wave: 'sawtooth', vol: 0.05, lp: 1700, q: 4 },
                         { f: [420, 640, 560, 330], d: 0.42, wave: 'sine', vol: 0.04 }] },
  pounce:      { synth: [{ f: 260, to: 520, d: 0.3, wave: 'triangle', vol: 0.05 }, { f: 1600, to: 600, d: 0.3, wave: 'noise', vol: 0.05 }] },
  fishLob:     { synth: [{ f: 300, to: 600, d: 0.18, wave: 'triangle', vol: 0.05 }] },
  fishBurst:   { synth: [{ f: 140, to: 60, d: 0.3, wave: 'sawtooth', vol: 0.06, lp: 900 }, { f: 700, to: 150, d: 0.4, wave: 'noise', vol: 0.12 }] },

  // ----- tools -----
  fireYarn:    { synth: [{ f: 520, d: 0.2, wave: 'sawtooth', vol: 0.04, lp: 2400 }, { f: 1200, to: 400, d: 0.25, wave: 'noise', vol: 0.06 }] },
  stickyYarn:  { synth: [{ f: 340, to: 680, d: 0.15, wave: 'triangle', vol: 0.05 }] },
  stickyBurst: { synth: [{ f: 1400, d: 0.25, wave: 'sine', vol: 0.06 }, { f: 2100, to: 1400, d: 0.2, wave: 'triangle', vol: 0.03, at: 0.04 }] },
  healYarn:    { synth: [{ f: 660, d: 0.15, wave: 'sine', vol: 0.06 }, { f: 990, d: 0.3, wave: 'sine', vol: 0.06, at: 0.12 }] },

  // ----- a cat getting hurt -----
  catHurt:     { synth: [{ f: 180, d: 0.2, wave: 'square', vol: 0.05, lp: 1800 }, { f: 900, to: 300, d: 0.12, wave: 'noise', vol: 0.06 }] },
  catNetted:   { synth: [{ f: 523, d: 0.16, wave: 'square', vol: 0.04, lp: 2000, to: 523 }, { f: 415, d: 0.16, wave: 'square', vol: 0.04, lp: 2000, at: 0.16, to: 415 },
                         { f: 330, d: 0.4, wave: 'square', vol: 0.04, lp: 2000, at: 0.32 }] },
  cartGo:      { synth: [{ f: 180, to: 120, d: 0.25, wave: 'sawtooth', vol: 0.05, lp: 700 }, { f: 900, to: 600, d: 0.3, wave: 'noise', vol: 0.05, at: 0.1 }] },
  feather:     { synth: [{ f: 660, to: 990, d: 0.14, wave: 'triangle', vol: 0.05 }, { f: 880, to: 1320, d: 0.14, wave: 'triangle', vol: 0.05, at: 0.12 }, { f: 1175, to: 1760, d: 0.22, wave: 'triangle', vol: 0.05, at: 0.24 }] },
  nap:         { synth: [{ f: 523, d: 0.2, wave: 'sine', vol: 0.07, to: 523 }, { f: 659, d: 0.2, wave: 'sine', vol: 0.07, to: 659, at: 0.18 }, { f: 784, d: 0.4, wave: 'sine', vol: 0.07, to: 784, at: 0.36 }] },
  caught:      { synth: [{ f: 392, to: 330, d: 0.25, wave: 'square', vol: 0.05 }, { f: 330, to: 262, d: 0.25, wave: 'square', vol: 0.05, at: 0.25 }, { f: 262, to: 196, d: 0.5, wave: 'square', vol: 0.05, at: 0.5 }] },
  catBack:     { synth: [{ f: 440, to: 880, d: 0.18, wave: 'triangle', vol: 0.05 }] },
  shieldBlock: { synth: [{ f: 900, d: 0.1, wave: 'triangle', vol: 0.06 }, { f: 1800, d: 0.2, wave: 'sine', vol: 0.03, to: 1700 }] },

  // ----- officers -----
  foeHit:      { synth: [{ f: 240, d: 0.12, wave: 'square', vol: 0.045, lp: 2000 }, { f: 1400, to: 400, d: 0.08, wave: 'noise', vol: 0.09 }], gap: 0.04 },
  foeHitHeavy: { synth: [{ f: 140, d: 0.16, wave: 'square', vol: 0.06, lp: 1400 }, { f: 800, to: 200, d: 0.14, wave: 'noise', vol: 0.13 }], gap: 0.04 },
  foeBlock:    { synth: [{ f: 900, d: 0.06, wave: 'square', vol: 0.04 }, { f: 3000, to: 2400, d: 0.05, wave: 'noise', vol: 0.05, q: 3 }] },
  foeSwing:    { synth: [{ f: 220, d: 0.12, wave: 'triangle', vol: 0.06 }, { f: 1400, to: 500, d: 0.12, wave: 'noise', vol: 0.03 }] },
  foeSlam:     { synth: [{ f: 90, d: 0.3, wave: 'triangle', vol: 0.07 }] },
  foeLunge:    { synth: [{ f: 160, d: 0.3, wave: 'sawtooth', vol: 0.05, lp: 1200 }] },      // the uniform's net lunge, the Chief's sweep
  foeThrow:    { synth: [{ f: 600, d: 0.08, wave: 'triangle', vol: 0.05 }] },               // tennis ball
  netThrow:    { synth: [{ f: 520, d: 0.1, wave: 'triangle', vol: 0.05 }, { f: 1600, to: 800, d: 0.1, wave: 'noise', vol: 0.03 }] },
  critterCharge: { synth: [{ f: 300, to: 900, d: 0.18, wave: 'square', vol: 0.03, lp: 2400 }, { f: 900, to: 400, d: 0.25, wave: 'square', vol: 0.025, lp: 2400, at: 0.18 }] },   // wind-up whirr, then off it goes
  foeHop:      { synth: [{ f: 200, to: 400, d: 0.25, wave: 'sine', vol: 0.06 }] },
  bossLeap:    { synth: [{ f: 120, to: 300, d: 0.35, wave: 'sine', vol: 0.07 }] },
  bossLand:    { synth: [{ f: 70, to: 35, d: 0.45, wave: 'sawtooth', vol: 0.08, lp: 500 }, { f: 400, to: 80, d: 0.5, wave: 'noise', vol: 0.16 }] },
  whistle:     { synth: [{ f: 1500, d: 0.12, wave: 'sine', vol: 0.06, to: 1500 }, { f: 1900, d: 0.25, wave: 'sine', vol: 0.06, at: 0.14, to: 1850 }] },

  // ----- the street -----
  crateHit:    { synth: [{ f: 150, d: 0.12, wave: 'sawtooth', vol: 0.05, lp: 900 }, { f: 600, to: 250, d: 0.1, wave: 'noise', vol: 0.1 }] },
  crateBreak:  { synth: [{ f: 110, d: 0.3, wave: 'sawtooth', vol: 0.06, lp: 800 }, { f: 900, to: 150, d: 0.35, wave: 'noise', vol: 0.14 }] },
  gateOpen:    { synth: [{ f: 700, d: 0.12, wave: 'triangle', vol: 0.06, to: 700 }, { f: 1050, d: 0.2, wave: 'triangle', vol: 0.06, at: 0.11 }] },
  paw:         { synth: [{ f: 1320, to: 1320, d: 0.06, wave: 'square', vol: 0.03, lp: 4000 }, { f: 1760, to: 1760, d: 0.12, wave: 'square', vol: 0.03, lp: 4000, at: 0.05 }], gap: 0.05 },
  buy:         { synth: [880, 1100, 1320, 1760].map((f, i) => ({ f, to: f, d: 0.1, wave: 'square', vol: 0.035, lp: 3500, at: i * 0.07 })) },
  pickup:      { synth: [{ f: 880, d: 0.1, wave: 'triangle', vol: 0.06, to: 880 }, { f: 1320, d: 0.18, wave: 'triangle', vol: 0.06, at: 0.09 }] },
  streetClear: { synth: [{ f: 660, d: 0.12, wave: 'triangle', vol: 0.06, to: 660 }, { f: 990, d: 0.3, wave: 'triangle', vol: 0.06, at: 0.12 }] },
  bossBeaten:  { synth: [523, 659, 784, 1047].map((f, i) => ({ f, to: f, d: i === 3 ? 0.6 : 0.14, wave: 'square', vol: 0.04, lp: 3000, at: i * 0.13 })) },
};

// Music: one looping track per area (the area's key in maps/areas.json), plus these.
// Files go in art/audio/music/<track>.wav. A track with no file is silence (the boss keeps the area's tune).
export const TRACKS = ['title', 'streets', 'castle', 'jungle', 'sakura', 'caverns', 'lab', 'airship', 'tower', 'boss', 'shop'];
