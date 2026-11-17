// Every number worth tuning lives here.

export const W = 960, H = 540, GRAVITY = 1500;

// The game is laid out on a 960x540 grid but drawn at RES times that, so art and text stay sharp
// on high-density screens (iPads). Cameras zoom by RES; nothing else needs to know.
// Add ?res=1 to the address to draw at base resolution (slow devices, automated tests).
const params = new URLSearchParams(location.search);
export const RES = Number(params.get('res')) || 2;

// Two ways to play the same game. Add ?mode=brawler for the River City style variant:
// a floor you walk around on in depth, instead of platforms.
export const MODE = params.get('mode') === 'brawler' ? 'brawler' : 'platformer';

// Brawler floor and feel. Depth is the on-screen y of a character's feet.
export const BRAWL = {
  floorTop: 345, floorBottom: 515,     // the walkable band
  depthSpeed: 0.62,                    // moving in depth is slower than moving sideways
  hitDepth: 18,                        // attacks land only on targets this close in depth
  gravity: 1500, jumpMul: 0.8
};

// Point a zoomed camera so that world x = viewX sits at the left edge of the screen.
export function aim(cam, viewX = 0) {
  cam.setZoom(RES);
  cam.setScroll(viewX - W * (RES - 1) / 2, -H * (RES - 1) / 2);
}

// Each cat has four actions: jump, attack, special, tool.
//   combo:  the attack chain. Keep pressing attack to step through it; the last entry is the finisher.
//           Each step: dmg, knock (push), up (lift), stun (ms), reach (strike box multiplier).
//   spin:   attack in the air = tail somersault. No charge, once per jump, bounces off what it hits.
//   air:    which frames of the sheet's jump row to hold while rising and falling.
//   meow / pounce: this cat's version of each special (see SPECIALS). cooldown = recharge time in ms.
export const CATS = {
  benji: {
    name: 'Benji', key: 'benji', scale: 1, move: 'walk', air: [1, 2],
    speed: 185, jump: 540, jumps: 1, hp: 6,
    interrupts: true,            // his hits break an officer's wind-up and stagger heavy enemies
    claw: { w: 92, h: 72 },      // strike box, measured forward from the cat's centre
    combo: [
      { dmg: 2, knock: 220, up: 120, stun: 320 },
      { dmg: 2, knock: 260, up: 120, stun: 320 },
      { dmg: 4, knock: 560, up: 280, stun: 520, reach: 1.3 }        // big shove
    ],
    comboGap: 300, comboEnd: 560, comboWindow: 560,                 // ms: between hits, after the finisher, time allowed to continue
    spin: { dmg: 2, time: 340, bounce: 380 },
    meow: { w: 190, h: 96, stun: 800, push: 460, cooldown: 2600 },  // short, hard shove
    pounce: { speed: 400, time: 380, dmg: 2, launch: 430, cooldown: 3000 },
    body: [80, 62], slash: 0x8fc4ff
  },
  luna: {
    name: 'Luna', key: 'luna', scale: 1, move: 'run', air: [1, 2],
    speed: 285, jump: 610, jumps: 2, hp: 4,
    interrupts: false,           // her light hits chip damage but do not stop a wind-up (her finisher does)
    claw: { w: 70, h: 60 },
    combo: [
      { dmg: 1, knock: 160, up: 100, stun: 200 },
      { dmg: 1, knock: 160, up: 100, stun: 200 },
      { dmg: 1, knock: 180, up: 100, stun: 200 },
      { dmg: 2, knock: 200, up: 470, stun: 450, reach: 1.2, interrupts: true }   // launcher: follow up in the air
    ],
    comboGap: 180, comboEnd: 420, comboWindow: 440,
    spin: { dmg: 1, time: 300, bounce: 430 },
    meow: { w: 160, h: 84, stun: 1500, push: 140, cooldown: 2200 },  // holds them longer
    pounce: { speed: 560, time: 360, dmg: 1, launch: 330, cooldown: 2400 },
    body: [54, 45], slash: 0xff8fc8
  }
};

// Specials recharge. Each player has one equipped; found ones are shared by the whole party.
export const SPECIALS = {
  meow:   { icon: '♫', name: 'Meow' },                 // wave: stuns, breaks wind-ups, no damage
  pounce: { icon: '💨', name: 'Pounce' }          // rolling dash through enemies, cannot be hit, launches
};

// Tools have a fixed number of uses per room. Each player has one equipped; found ones are shared.
export const TOOLS = {
  fire:   { icon: '🔥', name: 'Fire yarn', uses: 4, cooldown: 350, speed: 460, dmg: 2 },
  sticky: { icon: '🧊', name: 'Sticky yarn', uses: 2, cooldown: 500, vx: 330, vy: -420, radius: 120, freeze: 3000 },
  heal:   { icon: '💗', name: 'Healing yarn', uses: 1, cooldown: 500, radius: 170, heal: 2 }
};
export const START_TOOLS = ['fire'], START_SPECIALS = ['meow'];

// Animal Control. Every type shares one state machine (walk -> windup -> swing -> recover, plus hurt)
// and one sprite layout; the differences are all here.
//   attack: 'swing'  lunging net swing in front           'slam'   ground pound, hits both sides
//           'throw'  keeps its distance, serves balls     'bounce' leaps and lands on you
//   box:    attack hitbox: starts `near` px ahead of centre, w wide, h tall, sitting on the ground
//   poise:  'heavy' ignores light hits entirely: only Benji's claw/somersault or a meow staggers it
//   guard:  blocks anything from the front unless mid-attack, recovering or dazed
const base = {
  hp: 6, speed: 95, scale: 1, body: [54, 126], attack: 'swing',
  trigger: 115, windup: 480, swing: 220, recover: 650, lunge: 260,
  box: { near: 26, w: 62, h: 64 }, knockMul: 1, upMul: 1
};
export const OFFICERS = {
  uniform:     { ...base, name: 'Officer', body: [50, 128], trigger: 120, box: { near: 40, w: 66, h: 60 } },   // real art: sized to the drawn net
  punk:        { ...base, name: 'Punk', hp: 4, speed: 165, jumps: true,
                 trigger: 100, windup: 300, swing: 180, recover: 450, lunge: 320, knockMul: 1.3, upMul: 1.2 },
  suit:        { ...base, name: 'Suit', speed: 85, guard: true,
                 trigger: 105, windup: 420, swing: 200, recover: 750, lunge: 200, box: { near: 24, w: 58, h: 70 } },
  bodybuilder: { ...base, name: 'Body Builder', hp: 14, speed: 55, scale: 1.2, body: [70, 126], attack: 'slam', poise: 'heavy',
                 trigger: 110, windup: 800, swing: 200, recover: 950, lunge: 0,
                 box: { near: -105, w: 210, h: 46 }, knockMul: 0, upMul: 0 },
  preppy:      { ...base, name: 'Preppy', hp: 4, speed: 110, attack: 'throw',
                 keep: [230, 360], windup: 520, recover: 1400, ball: { speed: 340, height: 34 } },
  round:       { ...base, name: 'Round', hp: 8, speed: 70, body: [84, 112], attack: 'bounce',
                 trigger: 270, windup: 420, recover: 1000, hop: { vx: 400, vy: -540 }, knockMul: 0.5, upMul: 0.3 },

  // Boss. Cycles through `pattern`; each move has its own wind-up. Cannot be knocked around or stun-locked:
  // a meow dazes him briefly, then he is immune to it for `dazeImmune` ms. Below half health he speeds up.
  chief:       { ...base, name: 'The Chief', hp: 40, speed: 80, scale: 1.5, body: [60, 128], attack: 'boss', poise: 'boss',
                 recover: 700, knockMul: 0, upMul: 0,
                 boss: {
                   gap: 1200, rage: 0.7, dazeImmune: 5000, perPlayer: 0.35,
                   pattern: ['sweep', 'nets', 'stomp', 'sweep', 'whistle'],
                   sweep:   { windup: 650, swing: 420, lunge: 520, box: { near: 20, w: 80, h: 70 } },   // long charging net sweep
                   nets:    { windup: 550, count: 3, gap: 340, speed: 360, low: 34, high: 120 },       // low, high, low: jump, stay down, jump
                   stomp:   { windup: 500, vy: -780, vx: 330, wave: 300 },                             // leaps at you; landing sends shockwaves both ways
                   whistle: { windup: 750, calls: ['uniform', 'punk'], max: 2 }                        // calls backup, up to `max` at once
                 } }
};

// Pick-ups. Officers sometimes drop the first three; the rest are placed in maps and taken once per run.
export const POWERUPS = {
  fish:   { icon: '🐟', name: '+2 hearts', heal: 2 },
  catnip: { icon: '🌿', name: 'Catnip frenzy!', time: 8000, dmgMul: 2, cooldownMul: 0.6, speedMul: 1.2 },
  bell:   { icon: '🔔', name: 'Bell shield' },
  milk:   { icon: '🥛', name: '+1 heart for everyone' },
  sticky: { icon: TOOLS.sticky.icon, name: 'New tool: Sticky yarn', tool: 'sticky' },
  heal:   { icon: TOOLS.heal.icon, name: 'New tool: Healing yarn', tool: 'heal' },
  pounce: { icon: SPECIALS.pounce.icon, name: 'New special: Pounce', special: 'pounce' }
};
// Chance that a defeated officer drops each one (the rest of the time: nothing).
export const DROPS = [['fish', 0.18], ['catnip', 0.10], ['bell', 0.10]];
export const PICKUP_LIFE = 10000;
export const HIT_CHAIN_MS = 2200;      // the hit counter resets after this long without landing a hit
