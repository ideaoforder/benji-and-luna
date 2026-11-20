// Every number worth tuning lives here.

export const W = 960, H = 540, GRAVITY = 1500;

// The game is laid out on a 960x540 grid but drawn at RES times that, so art and text stay sharp
// on high-density screens (iPads). Cameras zoom by RES; nothing else needs to know.
// Add ?res=1 to the address to draw at base resolution (slow devices, automated tests).
const params = new URLSearchParams(location.search);
export const RES = Number(params.get('res')) || 2;

// The game is a brawler: a street you walk around on in depth (River City style).
// The earlier platformer version is still here; add ?mode=platformer to play it.
export const MODE = params.get('mode') === 'platformer' ? 'platformer' : 'brawler';

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
// Player colours: P1 always wears blue, P2 red, P3 green, P4 yellow, whichever cat they are playing.
// The recoloured sheets are made by tools/recolor.py; `wears` on each cat is the colour of its original art.
export const PLAYER_COLORS = [
  { name: 'blue', hex: 0x6ea0ff, css: '#8fc4ff' }, { name: 'red', hex: 0xff5f73, css: '#ff8f9c' },
  { name: 'green', hex: 0x62d06c, css: '#b6f09c' }, { name: 'yellow', hex: 0xffd23f, css: '#ffe27a' }];
// Swap cat steps through SWAP_ORDER; the n-th player to join starts as JOIN_ORDER[n].
export const SWAP_ORDER = ['benji', 'luca', 'luna', 'cricket', 'simon'], JOIN_ORDER = ['benji', 'luna', 'luca', 'cricket'];
export const skin = (catKey, n) => { const c = PLAYER_COLORS[n % 4].name; return c === CATS[catKey].wears ? catKey : catKey + '-' + c; };

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
    body: [80, 62], slash: 0x8fc4ff, wears: 'blue', pitch: 1, blurb: 'big and strong; breaks heavy crates'
  },
  // The steady one: between Benji and Luna in everything, and hard to knock back. An orange tabby in a hat.
  luca: {
    name: 'Luca', key: 'luca', scale: 1, move: 'run', air: [1, 2],
    speed: 235, jump: 580, jumps: 1, hp: 5,
    interrupts: false, steady: true,          // steady: barely moves when hit, and is back on his feet sooner
    claw: { w: 82, h: 66 },
    combo: [
      { dmg: 1, knock: 190, up: 110, stun: 260 },
      { dmg: 2, knock: 220, up: 110, stun: 280 },
      { dmg: 3, knock: 420, up: 240, stun: 480, reach: 1.25, interrupts: true }
    ],
    comboGap: 240, comboEnd: 480, comboWindow: 500,
    spin: { dmg: 2, time: 320, bounce: 400 },
    meow: { w: 175, h: 90, stun: 1100, push: 300, cooldown: 2300 },
    pounce: { speed: 480, time: 370, dmg: 2, launch: 380, cooldown: 2700 },
    body: [66, 52], slash: 0xffb86b, wears: 'olive', pitch: 1.4, blurb: 'the steady one; hard to knock back'
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
    body: [54, 45], slash: 0xff8fc8, wears: 'red', pitch: 2, small: true, blurb: 'small and quick; fits into pens'
  },
  // The diva: light claws, but her meow is the biggest in the game and is ready again quickly. A brown tabby in a scarf and bell.
  cricket: {
    name: 'Cricket', key: 'cricket', scale: 1, move: 'run', air: [1, 2],
    speed: 250, jump: 600, jumps: 2, hp: 4,
    interrupts: false,
    claw: { w: 72, h: 60 },
    combo: [
      { dmg: 1, knock: 170, up: 100, stun: 220 },
      { dmg: 1, knock: 170, up: 100, stun: 220 },
      { dmg: 1, knock: 190, up: 100, stun: 220 },
      { dmg: 2, knock: 260, up: 300, stun: 420, reach: 1.2, interrupts: true }
    ],
    comboGap: 200, comboEnd: 440, comboWindow: 460,
    spin: { dmg: 1, time: 300, bounce: 420 },
    meow: { w: 270, h: 120, stun: 1500, push: 340, cooldown: 1600 },  // her big number
    pounce: { speed: 500, time: 360, dmg: 1, launch: 340, cooldown: 2600 },
    body: [60, 48], slash: 0xfff0b8, wears: 'purple', pitch: 2.6, blurb: 'the diva; the biggest meow'
  },
  // The explorer: in the middle on size and speed, and carries one more of whatever yarn he has in each street.
  simon: {
    name: 'Simon', key: 'simon', scale: 1, move: 'run', air: [1, 2],
    speed: 245, jump: 590, jumps: 1, hp: 5,
    interrupts: false, extraUses: 1,          // extraUses: added to every tool's uses per street
    claw: { w: 78, h: 62 },
    combo: [
      { dmg: 1, knock: 180, up: 100, stun: 240 },
      { dmg: 2, knock: 200, up: 110, stun: 260 },
      { dmg: 2, knock: 380, up: 260, stun: 440, reach: 1.2, interrupts: true }
    ],
    comboGap: 220, comboEnd: 460, comboWindow: 480,
    spin: { dmg: 2, time: 310, bounce: 410 },
    meow: { w: 190, h: 95, stun: 1150, push: 300, cooldown: 2200 },
    pounce: { speed: 490, time: 360, dmg: 2, launch: 360, cooldown: 2600 },
    body: [62, 50], slash: 0x8fd3ff, wears: 'blue', pitch: 1.7, blurb: 'the explorer; one more yarn per street'
  }
};

// Specials recharge. Each player has one equipped; found ones are shared by the whole party.
export const SPECIALS = {
  meow:   { icon: '♫', name: 'Meow', tip: 'Stuns officers mid-swing' },                 // wave: stuns, breaks wind-ups, no damage
  pounce: { icon: '💨', name: 'Pounce', tip: 'Roll through officers unhurt' },
  // Lobbed; goes off where it lands or on the first officer it hits, hurting and flooring everyone in the cloud.
  // The numbers are here, not per cat: every cat throws the same fish.
  fish:   { icon: '🦴', image: 'fishbone', name: 'Smelly fish',      // image: drawn by tools/fishbone.py; icon is the text stand-in
            tip: 'Lob it: blasts everyone near where it lands',
            vx: 310, vy: -470, radius: 115, dmg: 3, knock: 320, up: 300, stun: 650, cooldown: 3400 }          // rolling dash through enemies, cannot be hit, launches
};

// Tools have a fixed number of uses per room. Each player has one equipped; found ones are shared.
export const TOOLS = {
  fire:   { icon: '🔥', name: 'Fire yarn', tip: 'Flies down your lane', uses: 4, cooldown: 350, speed: 460, dmg: 2 },
  sticky: { icon: '🧊', name: 'Sticky yarn', tip: 'Freezes officers near it', uses: 2, cooldown: 500, vx: 330, vy: -420, radius: 120, freeze: 3000 },
  heal:   { icon: '💗', name: 'Healing yarn', tip: 'Hearts for nearby cats', uses: 1, cooldown: 500, radius: 170, heal: 2 }
};
export const START_TOOLS = ['fire'];
// The smelly fish is handed out from the start for now, so it can be tried; later it is something to find or buy.
export const START_SPECIALS = MODE === 'brawler' ? ['meow', 'fish'] : ['meow'];

// Moves done with the stick and the attack button (River City style). The party knows the ones in state.moves;
// for now that is all of them (START_MOVES), so they can be tried out. Later they can be bought or earned:
// take one out of START_MOVES and add it to state.moves when it is unlocked.
// Damage is the cat's own finisher damage plus `bonus`, so Benji's versions hit harder than Luna's.
export const MOVES = {
  dash:       { name: 'Dash', how: 'tap left or right twice', tapMs: 260, time: 230, speedMul: 2.3, runMul: 1.45 },        // keep holding to run
  dashAttack: { name: 'Dash attack', how: 'attack while dashing', bonus: 0, reach: 1.5, slide: 520, time: 260, recover: 430,
                knock: 380, up: 320, stun: 500 },
  stomp:      { name: 'Ground pounce', how: 'down + attack by a floored officer', bonus: 0, range: 96, hop: 300, delay: 170, recover: 400 },
  lunge:      { name: 'Power lunge', how: 'away, toward, attack', bonus: 2, reach: 2, slide: 760, time: 300, recover: 520, cooldown: 1400,
                knock: 640, up: 380, stun: 650, heavy: true, tapMs: 380 }
};
export const START_MOVES = Object.keys(MOVES);
// A hit that lifts an officer at least this fast puts them on the floor when they land, for `ms`.
export const KNOCKDOWN = { up: 230, ms: 950 };

// How hard the officers play. Chosen on the title screen (up and down), remembered in the browser.
//   attackers: officers allowed to wind up at the same time (one more per two extra cats); the rest wait their turn
//   windup / recover / speed / hp: multipliers on every officer's numbers (bosses take hp too)
//   rest: ms an officer waits after attacking before it may take another turn
//   think: ms between an officer's rethinks of which cat and which side
//   spread: how much officers avoid piling onto one cat; react: how often they go for a cat's back
//   dodge: chance a light officer sidesteps a claw combo or a yarn ball aimed at it; jitter: wind-up time varies by this much
export const DIFFICULTY = {
  easy:   { name: 'Easy',   attackers: 1, windup: 1.35, recover: 1.3, speed: 0.9,  hp: 0.8,  rest: 1100, think: 700, spread: 0.5, react: 0,   dodge: 0,    jitter: 0 },
  normal: { name: 'Normal', attackers: 2, windup: 1,    recover: 1,   speed: 1,    hp: 1,    rest: 600,  think: 400, spread: 1,   react: 0.3, dodge: 0.2,  jitter: 0.25 },
  hard:   { name: 'Hard',   attackers: 3, windup: 0.8,  recover: 0.8, speed: 1.1,  hp: 1.25, rest: 250,  think: 250, spread: 1,   react: 0.7, dodge: 0.45, jitter: 0.4 }
};
export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];

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
  // Sizes below are on-screen pixels for the real art (every sheet is imported at its final size, so scale is 1).
  uniform:     { ...base, name: 'Officer', body: [50, 128], trigger: 120, box: { near: 40, w: 66, h: 60 } },
  punk:        { ...base, name: 'Punk', hp: 4, speed: 165, jumps: true, body: [48, 126],
                 trigger: 108, windup: 300, swing: 180, recover: 450, lunge: 320, box: { near: 40, w: 64, h: 60 },
                 knockMul: 1.3, upMul: 1.2 },
  suit:        { ...base, name: 'Suit', speed: 85, guard: true, body: [50, 128],
                 trigger: 125, windup: 420, swing: 200, recover: 750, lunge: 200, box: { near: 60, w: 84, h: 92 } },   // briefcase thrust at waist height
  bodybuilder: { ...base, name: 'Body Builder', hp: 14, speed: 55, body: [84, 150], attack: 'slam', poise: 'heavy',
                 trigger: 115, windup: 800, swing: 200, recover: 950, lunge: 0,
                 box: { near: -112, w: 224, h: 50 }, knockMul: 0, upMul: 0 },
  preppy:      { ...base, name: 'Preppy', hp: 4, speed: 110, attack: 'throw', body: [44, 128],
                 keep: [230, 360], windup: 520, recover: 1400, ball: { speed: 340, height: 34 } },
  round:       { ...base, name: 'Round', hp: 8, speed: 70, body: [88, 118], attack: 'bounce',
                 trigger: 270, windup: 420, recover: 1000, hop: { vx: 400, vy: -540 }, knockMul: 0.5, upMul: 0.3 },

  // Boss. Cycles through `pattern`; each move has its own wind-up. Cannot be knocked around or stun-locked:
  // a meow dazes him briefly, then he is immune to it for `dazeImmune` ms. Below half health he speeds up.
  chief:       { ...base, name: 'The Chief', hp: 40, speed: 80, body: [90, 190], attack: 'boss', poise: 'boss',
                 recover: 700, knockMul: 0, upMul: 0,
                 boss: {
                   gap: 1200, rage: 0.7, dazeImmune: 5000, perPlayer: 0.35,
                   pattern: ['sweep', 'nets', 'stomp', 'sweep', 'whistle'],
                   sweep:   { windup: 650, swing: 420, lunge: 520, box: { near: 70, w: 104, h: 84 } },  // long charging net sweep
                   nets:    { windup: 550, count: 3, gap: 340, speed: 360, low: 34, high: 120 },       // low, high, low: jump, stay down, jump
                   stomp:   { windup: 500, vy: -780, vx: 330, wave: 300 },                             // leaps at you; landing sends shockwaves both ways
                   whistle: { windup: 750, calls: ['uniform', 'punk'], max: 2 }                        // calls backup, up to `max` at once
                 } }
};
// Area officers: palette swaps of the six types (sheets made by tools/officer_variants.py from art/variants.json),
// each with its own numbers. Everything not listed is the type it is based on.
Object.assign(OFFICERS, {
  // The Castle
  knight:    { ...OFFICERS.suit, name: 'Knight', hp: 9, speed: 75, windup: 480 },                         // a suit of armour: blocks from the front, slow, sturdy
  jester:    { ...OFFICERS.punk, name: 'Jester', hp: 5, speed: 190, lunge: 380, recover: 380 },           // quicker and keeps coming
  // The Jungle
  ranger:    { ...OFFICERS.preppy, name: 'Ranger', hp: 6, body: OFFICERS.uniform.body, recover: 1700,     // hangs back and throws nets down your lane
               ball: { speed: 300, height: 34, kind: 'net' } },
  brute:     { ...OFFICERS.bodybuilder, name: 'Brute', hp: 18, speed: 65, windup: 700 },                  // a faster, tougher slam
  // Antarctic Lab
  yeti:      { ...OFFICERS.round, name: 'Yeti', hp: 12, trigger: 320, hop: { vx: 460, vy: -600 } },       // leaps further and higher
  scientist: { ...OFFICERS.preppy, name: 'Scientist', hp: 5, windup: 420, recover: 900, ball: { speed: 400, height: 34 } }   // serves fast and often
});
// The other areas' bosses, each with its own sheet (officer-<key>): a knight, a hooded mystic and an ice robot.
// Same four moves as the Chief, different habits and more health; everything not listed is the Chief's.
// An optional `call` row is shown while a boss calls for backup.
const boss = (name, tint, hp, over) => ({ ...OFFICERS.chief, name, tint, hp, boss: { ...OFFICERS.chief.boss, ...over } });
Object.assign(OFFICERS, {
  warden:   boss('The Warden', 0, 48, {                       // castle: charges a lot, calls heavy backup
    pattern: ['sweep', 'stomp', 'sweep', 'sweep', 'whistle'], whistle: { ...OFFICERS.chief.boss.whistle, calls: ['knight', 'jester'] } }),
  trapper:  boss('The Trapper', 0, 54, {                      // jungle: nets, nets and more nets
    pattern: ['nets', 'sweep', 'nets', 'stomp', 'whistle'], nets: { ...OFFICERS.chief.boss.nets, count: 5, gap: 260 },
    whistle: { ...OFFICERS.chief.boss.whistle, calls: ['ranger', 'punk'] } }),
  director: boss('The Director', 0, 62, {                     // lab: everything, faster, on a slippery floor
    gap: 950, pattern: ['stomp', 'nets', 'sweep', 'stomp', 'sweep', 'whistle'], nets: { ...OFFICERS.chief.boss.nets, count: 4 },
    whistle: { ...OFFICERS.chief.boss.whistle, calls: ['yeti', 'scientist'], max: 3 } })
});

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

// Browsers (iPads especially) hold on to old copies of files. Maps and lists are tiny, so they are fetched fresh on
// every load; pictures are refetched at most once an hour.
export const fresh = url => url + '?t=' + Date.now();
export const hourly = url => url + '?t=' + Math.floor(Date.now() / 3600000);
