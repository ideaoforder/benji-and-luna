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
  - The walk, run, jump and sit rows came out 14-27% smaller than idle. Corrected at import with `--row-scale`
    (see `tools/build_sprites.sh`), so no redraw is needed, but keep characters the same size in every row.
  - The tool row included a yarn ball as a separate object. Leave props out; the game draws them.
  - The image was 971x1619 with soft edges. Larger and hard-edged is better if the generator allows it.

Cut and import:

    python3 tools/cut_raw.py art/raw/luna.png luna --height 70 --min-size 0.5 \
      --rows idle:4,walk:6,run:6,jump:4,sit:2,claw:4,meow:2,tool:2,roll:1,hurt:1
    python3 tools/cut_raw.py art/raw/benji-1.png art/raw/benji-2.png benji --height 92 \
      --rows idle:4,walk:6,run:6,jump:4,sit:2,claw:3,meow:2,tool:2,roll:1,hurt:1

### Two new cats: Luca and Cricket

Both are in the game with stand-in sprites (a ginger Benji and a cream Luna). Same rows and frame counts as the
table above, same rules as the notes on Luna's sheet (same size in every row, no props, untouched original).

| Cat     | Who                                              | Standing height | claw frames | File(s)                                  |
|---------|--------------------------------------------------|-----------------|-------------|------------------------------------------|
| Luca    | The steady one. Between Benji and Luna in size.  | about 81 px     | 3           | `art/raw/luca.png` (or `luca-1`, `luca-2`) |
| Cricket | The diva. Light on her feet, enormous meow.      | about 76 px     | 4           | `art/raw/cricket.png`                    |

- [ ] Luca
- [ ] Cricket

**Each cat must wear exactly one garment in one flat, strong colour** (as Benji's blue hoodie and Luna's red
bandana are), and that colour must not appear anywhere else on the cat: not the fur, eyes, mouth, ears or nose.
The game repaints it blue, red, green or yellow depending on which player is using the cat, so a garment in a
colour the cat also has elsewhere (a pink scarf on a cat with pink ears) cannot be told apart. Blue or red is
safest; say which garment and colour in the delivery note. The meow row matters most for Cricket: make it big.

## 2. Animal Control

**Reference images are in `art/reference/`.** `officers-overview.png` shows all seven current placeholders
side by side at their relative sizes; `officer-<type>.png` shows every pose of one type, row by row.
Use them for **what each character is, its proportions relative to the others, its poses and its weapon**.
Do **not** copy the placeholders' style: they are crude stand-ins. The style to match is the finished
uniform officer (`art/raw/officer-uniform.png`, also shown in `art/reference/officer-uniform.png`) and the cats.
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

- [x] All seven officer sheets are imported and in the game (uniform, punk, suit, preppy, bodybuilder, round, chief).
  Every one cut cleanly at 11 frames. `tools/build_sprites.sh` holds the import line for each.

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

### Female enemy variants

All seven separate raw sheets are delivered; male originals are preserved. Each is an untouched
1024x1536 generator output with rows idle:2,walk:4,windup:2,swing:2,hurt:1.
Default cutter detection passes for all 77 frames. Import and runtime variant selection are pending.
See `art/FEMALE-VARIANTS.md` for file names, heights and integration notes.

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

## 5. Scenery

The game is a **brawler** (River City style). Rooms are flat coloured boxes today; this section replaces them.

### How a room is seen

The screen is 960x540. The camera looks at a street from slightly above, side on:

    y   0 - 235   sky and distant skyline
    y 235 - 345   the back wall (fence, brick, kennels): characters never go here
    y 345 - 515   THE FLOOR: the band characters walk around on. Nearer the bottom = nearer the camera
    y 515 - 540   kerb / front edge

Characters are drawn standing on the floor with their feet anywhere in that band, so the floor must be plain
enough to read a cat and its shadow against, and must not have anything tall painted onto it.
Rooms are about two screens wide (1900 px) and scroll sideways.

### Step 1: one mock-up, then stop

- [ ] `art/raw/mockup-yard.png` One complete 960x540 picture of the Pound Yard as it should look in play:
  sky, back wall, floor, a dumpster, a couple of crates, with Benji, Luna and two officers standing on the floor
  (copy them from the finished sheets). This fixes the palette, the camera angle and how big props are next to
  characters. Nothing else in this section gets drawn until it is approved.

### Step 2: layers, per room

Each room is three strips, each **960 wide and seamless left to right** (the game repeats them), with no
characters and no props in them:

| Layer | Size    | What it is                                                                 |
|-------|---------|----------------------------------------------------------------------------|
| far   | 960x300 | Sky and skyline. Scrolls slowly behind everything.                         |
| wall  | 960x110 | The back wall the street runs along. Flat on, not in perspective.          |
| floor | 960x195 | The ground, seen from above at the mock-up's angle. Subtle texture only.   |

| Room     | far                              | wall                                   | floor                    |
|----------|----------------------------------|----------------------------------------|--------------------------|
| alley    | Dusk city skyline                | Brick, with a fire escape and posters  | Cracked asphalt          |
| yard     | Evening sky, kennel roofs        | Chain-link fence with warning signs    | Packed dirt and concrete |
| roof     | Night sky, stars, skyline below  | Low parapet, vents, a water tank       | Tar-paper roof           |
| park     | Deep blue night, treetops        | Tall hedge with a park gate and lamps  | Mown grass, a dirt path  |
| market   | Warm dusk, strings of lanterns   | Shuttered shopfronts and awnings       | Cobbles                  |
| depot    | Dark sky, floodlight glare       | Corrugated garage doors, AC logo signs | Asphalt, yellow bay lines|
| kennels  | Night, barred skylights          | Rows of kennel cages (empty)           | Scrubbed concrete, drain |
| pound    | Floodlit night                   | Cinder block with barred kennel doors  | Painted concrete         |

- [ ] `art/raw/bg-alley-far.png`, `bg-alley-wall.png`, `bg-alley-floor.png`
- [ ] `art/raw/bg-yard-far.png`, `bg-yard-wall.png`, `bg-yard-floor.png`
- [ ] `art/raw/bg-roof-far.png`, `bg-roof-wall.png`, `bg-roof-floor.png`
- [ ] `art/raw/bg-park-far.png`, `bg-park-wall.png`, `bg-park-floor.png`
- [ ] `art/raw/bg-market-far.png`, `bg-market-wall.png`, `bg-market-floor.png`
- [ ] `art/raw/bg-depot-far.png`, `bg-depot-wall.png`, `bg-depot-floor.png`
- [ ] `art/raw/bg-kennels-far.png`, `bg-kennels-wall.png`, `bg-kennels-floor.png`
- [ ] `art/raw/bg-pound-far.png`, `bg-pound-wall.png`, `bg-pound-floor.png`

### Rooms that do not repeat (interiors): one picture

For a room like the apartment lobby, skip the three strips. Draw **one picture of the whole empty room**:

- [ ] `art/raw/bg-<room>-full.png`, 16:9 for a one-screen room (the game shows it at 960x540), or wider in the
  same height for a room that scrolls (1920x540, 2880x540 ...).
- **No characters and no shadows of characters.** Furniture against the back wall is fine; nothing on the floor.
- The wall meets the floor at **64% of the height** (y=345 of 540). The floor band the characters use is
  y 345-515, so keep the bottom 36% plain floor. (The lobby mock-up has this line at 59%: the same picture with
  the line moved down, and without the cats and officers, would drop straight in.)
- Doorways in the back wall (stairs, lift) are just painted on; say where they are (left and right edge in px)
  and the game makes them doors. Officers are 140 px tall on screen, Benji 92, Luna 70: a door should be about
  170-190 px tall at 540.

`python3 tools/import_scenery.py` picks it up; a map called `<room>` then uses it.

- [x] `art/raw/bg-apartment-full.png` — empty non-repeating lobby, 1672x941 original;
  scenery importer dry-run accepts it at 959x540. See `art/levels/apartment-background.md`
  for doorway coordinates and measured deviations (floor seam about y342 instead of345;
  elevator clear opening about204px tall, slightly over the170-190px target).
  No characters or character shadows; the full y345-515 play band is clear.

### Step 3: props

Things that stand on the floor. Each is one image on a flat background, drawn at the mock-up's angle so its
**top face is visible** (you can see onto the top of a crate). Sizes are on-screen: width, height of the front
face, and how deep the top face looks.

| Sheet                         | Front (w x h) | Top depth | Notes                                              |
|-------------------------------|---------------|-----------|----------------------------------------------------|
| `art/raw/prop-dumpster.png`   | 150 x 72      | 44        | Green, lid closed                                  |
| `art/raw/prop-crate.png`      | 64 x 54       | 46        | Ordinary wooden crate                              |
| `art/raw/prop-heavy-crate.png`| 58 x 56       | 58        | Reinforced, metal bands. Stacked into a wall; only Benji breaks it |
| `art/raw/prop-fence.png`      | 14 x 124      | 60        | One chain-link fence post and panel seen edge-on; the game repeats it in depth |
| `art/raw/prop-gate.png`       | 2 frames, 24 x 130 | 60   | Barred gate: shut, open                            |
| `art/raw/prop-switch.png`     | 2 frames, 32 x 48  | -    | Lever on a post: off, on                           |
| `art/raw/prop-door.png`       | 2 frames, 90 x 110 | -    | Doorway set into the back wall: locked, open       |

- [ ] props above

---

## Wiring status

Sections 1 and 2 are done: every character in the game has real art. Sections 3, 4 and 5 are open.
Section 5 is written for the brawler, which is now the game. Its step 1 (one mock-up) comes before anything else in it. Sections 3, 4 and 5 need code to use them;
that gets written when the first sheet of each section arrives.
