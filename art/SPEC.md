# Art spec

How to draw (or generate) a character sheet that drops straight into the game.
Everything in `assets/` is produced from sheets by scripts, so replacing art is:
put the sheet in `art/`, run one command, reload.

## The sheet

- **One character per sheet.** No labels, borders, palette swatches or decorations.
- **Flat background** in one solid colour that appears nowhere in the character.
  Bright magenta `#FF00FF` or green `#00FF00` are the usual choices. No gradients, no shadows on the ground.
- **A grid of equal cells.** One row per animation, frames left to right. Rows may have different
  frame counts; leave unused cells empty (background colour).
- **Facing right.** The game mirrors for left.
- **Same character in every cell:** same size, same proportions, same markings, same outfit.
  This is the thing image generators get wrong most often, and it is what makes animation wobble.
- **Feet on the same line in every cell**, body centred on the same vertical line.
  Things that stick out (a net, a tail) can go wherever they need to.
- **No effects in the frames.** Slashes, sound waves, sparkles and dust are separate art.
- **Hard edges.** Pixel art should be real pixels on a grid (every "pixel" the same size),
  not a soft painting of pixel art.

## Rows

Animal Control officers:

| Row    | Frames | Notes                                              |
|--------|--------|----------------------------------------------------|
| idle   | 1-4    | Standing, weapon at rest                           |
| walk   | 2-8    | Walk cycle                                         |
| windup | 1-3    | The tell before an attack: must read clearly       |
| swing  | 1-3    | The attack itself                                  |
| hurt   | 1-2    | Knocked back / dazed                               |

Cats:

| Row   | Frames | Notes                                                |
|-------|--------|------------------------------------------------------|
| idle  | 3-4    |                                                      |
| walk  | 4-8    |                                                      |
| run   | 4-8    |                                                      |
| jump  | 3-5    | Launch, rising, falling (middle frames used in air)  |
| sit   | 1-4    | Used when netted                                     |
| claw  | 2-4    | Optional. Without it the game reuses a jump frame    |
| meow  | 2-3    | Optional                                             |
| roll  | 4-8    | Optional. Curled up; the game spins it               |
| hurt  | 1-2    | Optional                                             |

Rows are matched by name, so order does not matter and optional rows can be left out.

## Sizes

On screen the game is 960x540. Cats stand roughly 75-90 px tall and officers roughly 130-150 px,
so draw at those sizes or at an exact multiple (2x, 3x) and pass `--height` to scale down.

## Import

    python3 tools/import_sheet.py art/officer-punk.png officer-punk \
        --rows idle:1,walk:4,windup:2,swing:2,hurt:1

The key decides what the art replaces: `benji`, `luna`, or `officer-<type>` where type is
`uniform`, `preppy`, `punk`, `suit`, `bodybuilder`, `round`, or `chief` (the boss).

Options: `--height 140` scales so the tallest frame is 140 px. `--recenter` trims each frame and
re-centres it, for sheets where frames are not placed consistently in their cells.
`--tolerance` widens or narrows what counts as background.

The importer writes `assets/<key>.png` and updates `assets/manifest.json`, which tells the game
the cell size and which rows exist. Hitbox sizes are separate, in `src/config.js`; turn on the
hitbox view (backquote) after importing and adjust them to the new art.

## The six officer types

The placeholders in `assets/` are drawn by `tools/officers.py`. What each one needs to read as:

- **uniform**: khaki shirt, cap, catch net. The baseline.
- **preppy**: polo, visor, tennis racket. Keeps away and serves tennis balls.
- **punk**: mohawk, jacket, net. Fast, jumps.
- **suit**: suit and tie, sunglasses, briefcase held in front as a shield.
- **bodybuilder**: huge torso, tiny head, bare fists. Slams the ground.
- **round**: very wide, uniform. Bounces and belly-flops.
- **chief** (boss): long navy coat with gold buttons, peaked cap, moustache, oversized net. Drawn 1.5x the size of the others in game.

Power-ups are currently emoji (fish, herb, yarn, milk). Icons for them can be any small square image; ask for them to be wired in.
