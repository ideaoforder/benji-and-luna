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

### Simon

- [x] Simon, the explorer: a grey tabby in a blue explorer vest (`art/raw/simon.png`, untouched raw sheet). Two frames on
  the raw sheet touch, so he is cut from the atlas delivered with it (`art/raw/simon-atlas.png`); the vest takes the
  player colour like Benji's hoodie. Delivery notes: `art/raw/simon-README.md`.

### Two new cats: Luca and Cricket

Both real sheets are in. Same rows and frame counts as the
table above, same rules as the notes on Luna's sheet (same size in every row, no props, untouched original).

| Cat     | Who                                              | Standing height | claw frames | File(s)                                  |
|---------|--------------------------------------------------|-----------------|-------------|------------------------------------------|
| Luca    | The steady one. Between Benji and Luna in size.  | about 81 px     | 3           | `art/raw/luca.png` (or `luca-1`, `luca-2`) |
| Cricket | The diva. Light on her feet, enormous meow.      | about 76 px     | 4           | `art/raw/cricket.png`                    |

- [x] Luca. Imported and in the game: an orange tabby in an olive hat, and the hat is what changes colour per player.
  Two things the cutter had to work around, for next time: the sit row and the row below it nearly touched (leave a
  clear gap between rows), and the meow and tool frames shared one row (fine, but say so). The claw row had 4 frames
  where 3 were asked; the fourth is unused.
- [x] Cricket. Imported and in the game: a brown tabby with a purple scarf and a bell; the scarf changes colour per
  player. The sheet had spare frames and speed lines drawn next to the cat; frames were picked by position and the
  lines removed (the game draws its own effects), so next time leave effects out and it can be cut with no hand-picking.

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

### Three more bosses

Each new area ends with a boss. Same rows and
frame counts as the Chief (`idle:2,walk:4,windup:2,swing:2,hurt:1`), standing height 200, one look each.

| File | Who | Notes |
|---|---|---|
| `art/raw/officer-warden.png`   | The Warden, boss of the Castle        | Animal Control dressed up as a castle guard captain: breastplate over the uniform, plumed helmet, a net on a halberd pole. Charges a lot. |
| `art/raw/officer-trapper.png`  | The Trapper, boss of the Jungle       | Safari gear, pith helmet, bandolier of nets, a net launcher. Throws many nets. |
| `art/raw/officer-director.png` | The Director, boss of the Antarctic Lab | Parka over a lab coat, goggles pushed up, a high-tech net gauntlet. The final boss. |

- [x] warden: delivered as a knight with a cat shield (`art/raw/boss-warden.png`), not the guard captain above.
- [x] trapper: delivered as a hooded mystic with a bell (`art/raw/boss-trapper.png`).
- [x] director: delivered as an ice robot with a freeze cannon (`art/raw/boss-director.png`).

  All three came as a 6x4 grid of boxed cells with spare frames; `tools/ungrid.py` and `--pick` in
  `tools/build_sprites.sh` handle that. The knight is drawn facing left and is mirrored. Next time: draw every frame
  facing right, and leave detached effects (speed lines, sparks) out, as the game draws its own.

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
| 12| smelly fish    | Fish skeleton. Special               |

- [x] `art/icons.png` — original delivered; import pending (see `art/icons-effects-delivery.md`).

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

- [x] `art/fx-slash.png` — original delivered; import pending (see `art/icons-effects-delivery.md`).
- [x] `art/fx-meow.png` — original delivered; import pending (see `art/icons-effects-delivery.md`).
- [x] `art/fx-fireball.png` — original delivered; import pending (see `art/icons-effects-delivery.md`).
- [x] `art/fx-sticky.png` — original delivered; import pending (see `art/icons-effects-delivery.md`).
- [x] `art/fx-heal.png` — original delivered; import pending (see `art/icons-effects-delivery.md`).
- [x] `art/fx-ball.png` — original delivered; import pending (see `art/icons-effects-delivery.md`).
- [x] `art/fx-net.png` — original delivered; import pending (see `art/icons-effects-delivery.md`).
- [x] `art/fx-wave.png` — original delivered; import pending (see `art/icons-effects-delivery.md`).
- [x] `art/fx-crate.png` — original delivered; import pending (see `art/icons-effects-delivery.md`).

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


## Area-specific enemy expansion (user request)

- [x] Eight original sheets delivered: two each for Streets, Castle, Jungle and Lab.
  See `art/area-enemies-delivery.md` for filenames, proposed heights and combat roles, and
  `art/area-enemies-originals.json` for hashes and detected frame bounds.
  All use idle:2,walk:4,windup:2,swing:2,hurt:1. Import and gameplay integration pending.
  These are separate from the small rushing enemies being made by another agent.

## Area officers (two per area)

- [x] All eight delivered (`art/area-enemies-delivery.md`) and in the game, cut at the proposed heights with the standard
  rows. Roles follow the delivery note; numbers in `src/config.js`, placement in each area's maps.

---

## 6. Two new areas: Sakura Dojo and Crystal Caverns

Concept sheet: `art/raw/concept-sakura-caverns.png` (mood, palettes, characters and boss moves; use it as reference, do
not cut from it). Both areas are already in the game, between the Jungle and the Lab, with stand-in art: their maps
exist and `art/levels/BRIEFS.md` has the measured brief for every new street (panel count, where the doors, nooks and
props are). Order of play: Jungle -> **Sakura Dojo** -> **Crystal Caverns** -> Antarctic Lab.

Same rules as every earlier batch: untouched generator originals in `art/raw/`, one character per sheet on flat
magenta (no boxed grids), everything facing right, no detached effects (sparks, smoke, speed lines, slash arcs: the
game draws its own), and a delivery note with measured sizes, as before.

### 6a. Backgrounds: 14 panels, the same way as the Castle, Jungle and Lab

Floor edge at y=345 after scaling, reported per panel in `art/raw/scenery.json` (`floorY`). Briefs in `BRIEFS.md`.

| Area | Street | File stems | Mood |
|---|---|---|---|
| Sakura Dojo | Torii Steps | `bg-torii-full-1`, `-2` | stone steps at dusk, red torii, stone lanterns, falling blossoms, bamboo |
| Sakura Dojo | Pagoda Court | `bg-pagoda-full-1`, `-2` | tiered pagodas behind a low wall, temple bell, raked gravel |
| Sakura Dojo | Blossom Bridge | `bg-blossom-full-1`, `-2` | arched red bridge over a waterfall gorge, the moon behind (the concept's main picture) |
| Sakura Dojo | Shadow Dojo (boss) | `bg-shadowdojo-full-1` | inside the dojo: paper screens, the purple swirl banner, weapon racks, clear wooden floor |
| Crystal Caverns | Mine Entrance | `bg-mineshaft-full-1`, `-2` | timber props, lanterns, a winch, the daylight mouth behind |
| Crystal Caverns | Cart Tracks | `bg-cartline-full-1`, `-2` | rails and full carts along the cavern wall, scaffolds, crystal clusters |
| Crystal Caverns | Crystal Falls | `bg-crystals-full-1`, `-2` | waterfalls and giant blue crystals, walkways, a hut on stilts (the concept's main picture) |
| Crystal Caverns | The Drill Pit (boss) | `bg-drillpit-full-1` | a bored-out chamber, drill marks, rubble, the Captain's rig parked behind, clear floor |

Keep the combat floor clear (no rails, carts or bridges railings across the floor band): props that stand on the floor
are the game's, below.

### 6b. Props: `art/raw/prop-<area>-<class>.png`, as in the last props batch

| File | What | On screen |
|---|---|---|
| `prop-sakura-block.png` | stone lantern base or a low stone block with a roof-tile cap | 110 wide, ~100 tall incl. top face; stretches sideways |
| `prop-sakura-pen.png` | Luna's nook: a small gap under a shrine's raised floor, or a bamboo cat gate | 150 x ~62 |
| `prop-caverns-block.png` | a mine cart full of ore (the concept's "mine cart"), or stacked ore crates | 110 wide, ~100 tall; stretches sideways |
| `prop-caverns-pen.png` | Luna's nook: a small tunnel mouth shored with timber | 150 x ~62 |

### 6c. Regular enemies: the standard five rows (`idle:2, walk:4, windup:2, swing:2, hurt:1`)

Humans, same size family as the other officers. They work for Animal Control (an Animal Control patch or armband
somewhere keeps them on the same side as everyone else).

| File | Who | Height | How it fights (draw the wind-up and the attack for this) |
|---|---|---|---|
| `enemy-sakura-dojoguard.png` | Dojo guard: straw hat, light armour, spear | 150 | long spear thrust |
| `enemy-sakura-ninja.png` | Ninja foot soldier: dark gi, red scarf, short sword | 135 | quick dash and slash; jumps up onto things |
| `enemy-caverns-miner.png` | Miner henchman: hard hat with lamp, pickaxe | 145 | pickaxe swung overhead and down, hitting both sides |

### 6d. Critters: the five critter rows (as the Clamp Bot: `idle:2, walk:2+, windup:2, charge:2-4, hurt:1`)

Small, low to the ground, cats jump over their charge. About 50-65 tall.

| File | What |
|---|---|
| `critter-sakura-daruma.png` | a wind-up daruma doll that wobbles, then rolls at you |
| `critter-caverns-drillbot.png` | the concept's drilling bot: a little orange cart with a drill nose |

### 6e. Bosses: one sheet each, rows below, about 200 tall (like the Chief)

| Row | Frames | Shadow Master | Drill Captain |
|---|---|---|---|
| idle | 4 | ninja stance, scarf moving | in the drill suit, drills turning slowly |
| walk | 4 | | heavy suit steps |
| windup | 2 | crouched to dash | drills revving, leaning in |
| swing | 2 | the dash slash, sword out (no slash arc) | drill charge, drills forward |
| hurt | 1 | | |
| call | 2 | hands together summoning shadow clones (no smoke) | waving the miners in |
| extra rows, optional | 2 each | **vanish** (crouch, half gone), **throw** (shuriken) | **spin** (spin drill), **burrow** (half sunk into the floor) |

The game uses idle, walk, windup, swing, hurt and call now; the optional rows let each move get its own tell later.

### Delivered and in the game

All of section 6 is imported (`art/levels/sakura-caverns-delivery.md`); no stand-ins are left. Still open: the
optional boss rows above.

- [x] 6a backgrounds (14 panels)
- [x] 6b props (4)
- [x] 6c enemies (3)
- [x] 6d critters (2)
- [x] 6e bosses (2)


Section 6 originals delivered: [sizes, row counts and integration notes](levels/sakura-caverns-delivery.md).
Runtime import and in-game review remain with Claude; optional boss rows are not included.
