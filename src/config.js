// Every number worth tuning lives here.

export const W = 960, H = 540, GRAVITY = 1500;

// The game is laid out on a 960x540 grid but drawn at RES times that, so art and text stay sharp
// on high-density screens (iPads). Cameras zoom by RES; nothing else needs to know.
export const RES = 2;

// Point a zoomed camera so that world x = viewX sits at the left edge of the screen.
export function aim(cam, viewX = 0) {
  cam.setZoom(RES);
  cam.setScroll(viewX - W * (RES - 1) / 2, -H * (RES - 1) / 2);
}

export const CATS = {
  benji: {
    name: 'Benji', key: 'benji', scale: 1.15, move: 'walk',
    speed: 185, jump: 540, jumps: 1, hp: 6,
    dmg: 2, cooldown: 430, knock: 360, stun: 420,
    interrupts: true,            // his claw breaks an officer's wind-up
    claw: { w: 92, h: 72 },      // strike box, measured forward from the cat's centre
    // Meow: a wide wave that stuns and shoves. No damage. Benji's is a short, hard shove.
    meow: { w: 190, h: 96, stun: 800, push: 460, cooldown: 2600 },
    // Tail somersault: a rolling dash through enemies that launches them. No damage taken while rolling.
    roll: { speed: 400, time: 380, dmg: 2, launch: 430, cooldown: 1300 },
    body: [70, 54], slash: 0x8fc4ff
  },
  luna: {
    name: 'Luna', key: 'luna', scale: 0.9, move: 'run',
    speed: 285, jump: 610, jumps: 2, hp: 4,
    dmg: 1, cooldown: 230, knock: 200, stun: 220,
    interrupts: false,           // hers chips damage but does not stop a wind-up
    claw: { w: 70, h: 60 },
    meow: { w: 160, h: 84, stun: 1500, push: 140, cooldown: 2200 },   // Luna's holds them longer
    roll: { speed: 560, time: 360, dmg: 1, launch: 330, cooldown: 900 },
    body: [60, 50], slash: 0xff8fc8
  }
};

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
  uniform:     { ...base, name: 'Officer' },
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
                 trigger: 270, windup: 420, recover: 1000, hop: { vx: 400, vy: -540 }, knockMul: 0.5, upMul: 0.3 }
};
