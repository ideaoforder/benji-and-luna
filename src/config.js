// Every number worth tuning lives here.

export const W = 960, H = 540, WORLD_W = 1600, GROUND = 470, GRAVITY = 1500;

// Sprite sheet cell size produced by tools/atlas.py (5 columns: idle, walk, run, jump, sit rows).
export const CELL_W = 144, CELL_H = 100;

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

export const OFFICER = {
  hp: 6, speed: 95,
  trigger: 115,                  // starts winding up when a cat is this close
  windup: 480, swing: 220, recover: 650,
  lunge: 260,                    // forward speed during the swing
  net: { near: 26, w: 62, h: 64 } // net box: starts `near` px ahead of his centre, at ground level
};
