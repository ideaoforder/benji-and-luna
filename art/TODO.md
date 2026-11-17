# Art TODO

What the game needs drawn, in priority order. Read `art/SPEC.md` first: it defines the sheet format
(one character per sheet, flat background, equal cells, one row per animation, facing right, no effects
baked in). Everything below assumes it.

## How to deliver

- **Commit the image exactly as generated** to `art/raw/` on the `chatgpt/sprites` branch, named as listed
  below (`art/raw/luna.png`). Do not crop it, re-grid it, clean gutters or move sprites around afterwards.
  The first Luna sheet was sliced on a fixed 512x352 grid after generation and the cut went through the
  cats' legs, so every row but idle lost its feet.
- Sprites do **not** need to sit on an exact grid. `tools/cut_raw.py` finds each sprite by its outline and
  packs the sheet itself. What it needs is: clear rows, a clear gap of background between sprites
  (at least 5% of a sprite's width), the frame counts below, and nothing else in the image.
- A sheet can be split across several images if that keeps the character more consistent or the frames
  larger, for example `art/raw/luna-1.png` (idle, walk, run, jump, sit) and `art/raw/luna-2.png`
  (claw, meow, tool, roll, hurt). Rows are read top to bottom, images in name order.
- Do not edit `assets/`, `src/`, `maps/` or `tools/`.
- Tick the box here when a sheet is committed. Add a line under it if anything deviates
  (different frame counts, a row left out).
- **Do Luna first and stop.** It gets cut and checked in the game before the rest are drawn.

## Rules that matter most

1. **Same character in every frame.** Same size, proportions, markings and outfit. Draw the whole sheet in
   one pass, not frame by frame.
2. **Clear rows with space between sprites.** One animation per row, frames left to right, no sprite touching
   or overlapping another. An exact grid is not required.
3. **Flat background**, one colour that is not in the character. `#FF00FF` unless the character is pink,
   then `#00FF00`. No shadows, gradients, labels, borders or swatches.
4. **Nothing but the character.** No slashes, sound waves, sparkles or dust. Those are section 4.
5. **Real pixel art:** hard edges, every "pixel" the same size, no blur or soft shading.
6. **Facing right.**

Draw large: about 4x the on-screen size given below.

---

## 1. The cats (highest priority)

Done: both cats are in the game.

On-screen height when standing: **Benji about 92 px, Luna about 70 px.** Benji is the bigger, fluffier grey
cat in a blue hoodie; Luna is the smaller, sleeker black cat with a red bandana. Keep them clearly
different in size and silhouette. 
Same rows for both. Row order does not matter; rows are matched by name at import.

| Row   | Frames | What it shows                                                                    |
|-------|--------|----------------------------------------------------------------------------------|
| idle  | 4      | Standing, breathing or tail flick. Loops.                                        |
| walk  | 6      | Walk cycle. Loops.                                                               |
| run   | 6      | Run cycle. Loops.                                                                |
| jump  | 4      | 1 crouch, 2 rising, 3 falling, 4 landing. Frames 2 and 3 are held in the air.    |
| sit   | 2      | Sitting, sad or dazed. Shown when caught in a net.                               |
| claw  | Benji 3, Luna 4 | One frame per combo hit: alternate paws, last frame is the big finisher. |
| meow  | 2      | Mouth wide open, leaning into it.                                                |
| tool  | 2      | Throwing something forward with a paw (yarn ball).                               |
| roll  | 1      | Curled into a ball, seen from the side. The game spins this frame.               |
| hurt  | 1      | Knocked back, eyes shut.                                                         |

- [x] `art/raw/benji-1.png` and `art/raw/benji-2.png` Imported and in the game. Clean on the first try:
  consistent size across rows, no props, 1536x1024 each. Splitting a character over two images worked well; do the same for the officers if it helps.
- [x] `art/raw/luna.png` Imported and in the game. Notes for the next sheets:
  - The run row came out about 15% smaller than idle and walk. Keep the cat the same size in every row.
  - The tool row included a yarn ball as a separate object. Leave props out; the game draws them.
  - The image was 971x1619 with soft edges. Larger and hard-edged is better if the generator allows it.

Cut and import:

    python3 tools/cut_raw.py art/raw/luna.png luna --height 70 --min-size 0.5 \
      --rows idle:4,walk:6,run:6,jump:4,sit:2,claw:4,meow:2,tool:2,roll:1,hurt:1
    python3 tools/cut_raw.py art/raw/benji-1.png art/raw/benji-2.png benji --height 92 \
      --rows idle:4,walk:6,run:6,jump:4,sit:2,claw:3,meow:2,tool:2,roll:1,hurt:1

## 2. Animal Control

**Reference images are in `art/reference/`.** `officers-overview.png` shows all seven current placeholders
side by side at their relative sizes; `officer-<type>.png` shows every pose of one type, row by row.
Use them for **what each character is, its proportions relative to the others, its poses and its weapon**.
Do **not** copy their style: they are crude stand-ins. The style to match is the cats in `art/raw/`
(same pixel size, outline weight, shading and palette family), so officers look like part of the same game.
Frame counts below are higher than the placeholders have; follow the table, not the reference.

Seven sheets with identical layout. Humans, on-screen height about **140 px** standing (the Chief about 200,
the Body Builder about 165). They should look like they belong in the same game as the cats: same pixel
size, same outline weight, same palette family.

| Row    | Frames | What it shows                                                        |
|--------|--------|----------------------------------------------------------------------|
| idle   | 2      | Standing, weapon at rest                                             |
| walk   | 4      | Walk cycle. Loops.                                                   |
| windup | 2      | The tell before the attack. Must be unmistakable at a glance.        |
| swing  | 2      | The attack itself, at full extension                                 |
| hurt   | 1      | Knocked back or dazed                                                |

The game currently shows the first frame of `windup`, `swing` and `hurt`; extra frames are imported and
will be played once they exist.

| Sheet                        | Look                                                    | Wind-up → swing                                        |
|------------------------------|---------------------------------------------------------|--------------------------------------------------------|
| `art/officer-uniform.png`    | Khaki shirt, cap, badge, catch net on a pole            | Net raised behind → net swung forward and down, low    |
| `art/officer-punk.png`       | Mohawk, studded jacket, ripped jeans, net               | Same motion, quicker and scrappier                     |
| `art/officer-suit.png`       | Dark suit, tie, sunglasses, briefcase held in front     | Briefcase drawn back → briefcase swung forward         |
| `art/officer-preppy.png`     | Polo with popped collar, visor, tennis racket           | Ball toss, racket back → racket follow-through (serve) |
| `art/officer-bodybuilder.png`| Huge torso, tiny head, tank top, bare fists             | Both fists raised overhead → both fists into the ground|
| `art/officer-round.png`      | Very round, uniform shirt, small cap, no weapon         | Deep squat → leaping, belly first                      |
| `art/officer-chief.png`      | Boss. Long navy coat, gold buttons, peaked cap, moustache, oversized net | Net raised → long sweeping swing     |

For the **suit**, the idle and walk frames must show the briefcase held in front as a shield: that is how
players read that he blocks.

- [x] `art/raw/officer-uniform.png` — untouched 1024x1536 generated original, approved moustached design.
  - Rows: idle:2, walk:4, windup:2, swing:2, hurt:1. Cutter detection passes with default settings.
  - Held net included; no separate effects. Not imported yet: check scale, edges and hitboxes in game before drawing other officers.
- [ ] `art/raw/officer-punk.png`
- [ ] `art/raw/officer-suit.png`
- [ ] `art/raw/officer-preppy.png`
- [ ] `art/raw/officer-bodybuilder.png`
- [ ] `art/raw/officer-round.png`
- [ ] `art/raw/officer-chief.png`

Cut and import (same for each; change the name and height):

    python3 tools/cut_raw.py art/raw/officer-uniform.png officer-uniform --height 140 \
      --rows idle:2,walk:4,windup:2,swing:2,hurt:1

### Later, for the Chief only

Optional extra rows so each boss move has its own tell. Not wired up yet; draw them after the base sheet works.

| Row     | Frames | What it shows                                  |
|---------|--------|------------------------------------------------|
| whistle | 2      | Whistle to the mouth, blowing                  |
| throw   | 2      | Throwing a net                                 |
| leap    | 2      | Crouch, then airborne with boots down          |

- [ ] Chief extra rows added to `art/officer-chief.png`

## 3. Icons

One sheet, `art/icons.png`: a single row of 32x32 on-screen icons (128x128 at 4x), flat background, in this
order. These replace emoji, which look different on every device.

| # | Icon           | Is                                   |
|---|----------------|--------------------------------------|
| 1 | fish           | Heal pick-up                         |
| 2 | catnip         | Sprig of leaves. Frenzy pick-up      |
| 3 | bell           | Collar bell. Shield pick-up          |
| 4 | milk           | Bottle or saucer. Extra heart        |
| 5 | fire yarn      | Yarn ball on fire. Tool              |
| 6 | sticky yarn    | Yarn ball, icy blue and gooey. Tool  |
| 7 | healing yarn   | Yarn ball, pink with a heart. Tool   |
| 8 | meow           | Sound-wave or music note. Special    |
| 9 | pounce         | Dash lines or a paw. Special         |
| 10| heart full     | HUD                                  |
| 11| heart empty    | HUD                                  |

- [ ] `art/icons.png`

## 4. Effects

Currently drawn as plain shapes in code. Each is its own small sheet, one row, flat background. Sizes are
on-screen; draw at 4x.

| Sheet                 | Frames | Cell    | What it is                                                         |
|-----------------------|--------|---------|--------------------------------------------------------------------|
| `art/fx-slash.png`    | 3      | 96x96   | Claw arc: appears, full, fading. White; the game tints it per cat. |
| `art/fx-meow.png`     | 3      | 64x96   | One sound-wave ring growing. White; tinted per cat.                |
| `art/fx-fireball.png` | 4      | 32x32   | Burning yarn ball, flickering. Loops.                              |
| `art/fx-sticky.png`   | 5      | 48x48   | Frames 1-2 sticky yarn ball in flight; 3-5 icy burst.              |
| `art/fx-heal.png`     | 4      | 96x96   | Pink ring of hearts expanding.                                     |
| `art/fx-ball.png`     | 2      | 16x16   | Tennis ball, spinning.                                             |
| `art/fx-net.png`      | 2      | 32x32   | Thrown net (the Chief), spinning.                                  |
| `art/fx-wave.png`     | 3      | 40x32   | Ground shockwave travelling right. Loops.                          |
| `art/fx-crate.png`    | 4      | 32x32   | Wooden crate splinters, four different pieces.                     |

- [ ] `art/fx-slash.png`
- [ ] `art/fx-meow.png`
- [ ] `art/fx-fireball.png`
- [ ] `art/fx-sticky.png`
- [ ] `art/fx-heal.png`
- [ ] `art/fx-ball.png`
- [ ] `art/fx-net.png`
- [ ] `art/fx-wave.png`
- [ ] `art/fx-crate.png`

## 5. Scenery (lowest priority)

Rooms are flat coloured rectangles today. This is the largest job and the least urgent: the game plays
the same without it. Do not start until sections 1 and 2 are in.

Props, one image each, flat background, on-screen sizes:

- [ ] `art/prop-dumpster.png` 150x72
- [ ] `art/prop-crate.png` 70x70 (ordinary crate)
- [ ] `art/prop-heavy-crate.png` 70x57 (reinforced; stacked three high, only Benji breaks them)
- [ ] `art/prop-container.png` 220x88 (shipping container, raised on short legs)
- [ ] `art/prop-gate.png` 24x470 (tall barred gate)
- [ ] `art/prop-switch.png` 2 frames, 32x48 (lever off, lever on)
- [ ] `art/prop-door.png` 2 frames, 68x126 (locked, open)
- [ ] `art/prop-ledge.png` 96x14, tiles horizontally (fire-escape grating)

Backdrops, one per room theme, 1920x540 on-screen, no characters or props, lower third kept plain because
the floor and props sit on top of it:

- [ ] `art/bg-alley.png` Dusk back alley, brick wall, city skyline behind
- [ ] `art/bg-yard.png` Animal pound yard, chain-link fence, kennels in the distance
- [ ] `art/bg-roof.png` Rooftops at night, stars, skyline below eye level
- [ ] `art/bg-pound.png` Inside the pound compound, floodlights, cages

---

## Wiring status

Section 1 is done. Section 2 imports and works today; each officer's hitbox in `src/config.js` gets re-checked
with the hitbox view after its sheet lands. Sections 3, 4 and 5 need code to use them;
that gets written when the first sheet of each section arrives.
