# Sakura Dojo and Crystal Caverns delivery

Section 6 of `art/TODO.md`: 25 untouched generator originals in `art/raw/`.
Based on main at `d940d96`, the concept sheet and the generated per-street briefs.
This is an art handoff; runtime import, animation tuning and playtesting remain with Claude.

## Backgrounds (14)

`art/raw/scenery.json` records the measured rear wall/floor boundary for every panel.
The importer scales that boundary to y=345 and crops the bottom to a 540px viewport.
All panels supply enough floor height, and the combined widths cover each 2016px street
(or 992px boss room). Panel 2 follows panel 1; do not force each to 1008px wide.

| File stem | Original | floorY | Import |
|---|---|---|---|
| `bg-blossom-full-1` | 1672×941 | 558 | 1034×540 |
| `bg-blossom-full-2` | 1671×941 | 558 | 1033×540 |
| `bg-cartline-full-1` | 1672×941 | 525 | 1099×540 |
| `bg-cartline-full-2` | 1672×941 | 525 | 1099×540 |
| `bg-crystals-full-1` | 1672×940 | 529 | 1090×540 |
| `bg-crystals-full-2` | 1672×941 | 529 | 1090×540 |
| `bg-drillpit-full-1` | 1672×941 | 532 | 1084×540 |
| `bg-mineshaft-full-1` | 1672×941 | 530 | 1088×540 |
| `bg-mineshaft-full-2` | 1672×941 | 529 | 1090×540 |
| `bg-pagoda-full-1` | 1671×941 | 562 | 1026×540 |
| `bg-pagoda-full-2` | 1670×941 | 562 | 1025×540 |
| `bg-shadowdojo-full-1` | 1672×941 | 560 | 1030×540 |
| `bg-torii-full-1` | 1672×941 | 565 | 1021×540 |
| `bg-torii-full-2` | 1672×941 | 562 | 1026×540 |

Sakura uses dusk lavender skies, cherry trees, vermilion timber and warm lanterns.
Torii's steps are behind the combat band; Pagoda has a raked gravel court; Blossom
has a flat wooden fighting deck with the arched bridge and waterfall in the distance.
Shadow Dojo has shoji, weapon racks and a purple swirl banner behind a clear wooden floor.
Caverns uses purple rock, cyan crystals and warm timber. Tracks, carts and machinery
stay behind the floor band. The Drill Pit is a clear arena; its giant bore is in the
rear wall, with the Captain's parked rig in the rear-left bay.

### Doors, nooks and integration review

The first Torii and Mineshaft panels contain the two shop entrances, crossed tools
first and paw emblem second. All other exits are screen-edge exits, not extra shop doors.
Approximate painted dark-opening bounds, measured in the originals and scaled with floorY:

| Panel | Tool opening source x | Tool game x | Dojo opening source x | Dojo game x |
|---|---|---|---|---|
| Torii 1 | 769–1053 | 470–643 | 1122–1385 | 685–846 |
| Mineshaft 1 | 825–1104 | 537–719 | 1136–1480 | 739–963 |

Both trigger centres (605 and 805) fall within their corresponding painted openings.
These are deliberately broad portals, not exact matches to the map's 560–650 and
760–850 trigger rectangles. Torii's painted openings end about 7px and 4px short of
those rectangles respectively; review entering at their right edges in game. Torii's
openings are about 114px tall after import; Mineshaft's are about 170px. Do not claim
pixel-perfect door registration or silently move collision to match artwork.

Plain rear-wall stretches support the nook props. Blossom panel 1 was revised to
replace the railing behind its first nook with masonry. Review both Blossom nooks,
all other nooks and joins while scrolling. Matching palettes and floor edges do not
make these hand-generated panels mathematically seamless. No live-game visual test
was performed as part of this art-only delivery.

## Props (4)

One connected object each, magenta background, no ground shadows or detached extras.
Camera is front-on, slightly elevated with visible top faces.

| File | Original | Current importer size |
|---|---|---|
| `prop-sakura-block.png` | 1254×1254 | 110×95 |
| `prop-sakura-pen.png` | 1254×1254 | 150×73 |
| `prop-caverns-block.png` | 1315×1196 | 110×113 |
| `prop-caverns-pen.png` | 1254×1254 | 150×64 |

Sakura: tiled stone block and crawlspace beneath a raised vermilion shrine floor.
Caverns: ore cart and low timber-shored tunnel opening. These measured heights differ
from the approximate 100/62px brief, especially the shrine nook (73px); review cat
clearance and block jumping at runtime without changing collision just to fit art.
Original files have not been resized. The cart's wheels/crystals will stretch with
wider map boxes; assess that at the widest obstacle as well as the base width.

## Regular enemies (3)

All 1024×1536 originals, right-facing, one character per sheet. Rows top to bottom:
`idle:2,walk:4,windup:2,swing:2,hurt:1` (11 frames).

| File | Suggested idle height | Design / attack |
|---|---|---|
| `enemy-sakura-dojoguard.png` | 150 | East Asian guard, straw hat, light armour, paw armband; spear thrust |
| `enemy-sakura-ninja.png` | 135 | Brown-skinned masked woman, indigo gi and red scarf; quick crouched dash/slash |
| `enemy-caverns-miner.png` | 145 | Black miner, hardhat lamp, overalls and paw patch; overhead pickaxe, attack poses on either side |

Use feet anchoring. Weapons remain in hand and effects are left to the engine. The
miner first swing pose has the pick behind him, the second in front; retain both to
communicate the two-sided attack. No extra jump row was requested for the ninja.
Scale from the first idle pose, not separately from each row's total bounding box:
raised weapons, bent knees and extending limbs change that box without changing body scale.

## Critters (2)

Both 1024×1536. Rows `idle:2,walk:2,windup:2,charge:2,hurt:1` (9 frames).
Suggested idle height 60px, feet anchor.

- `critter-sakura-daruma.png`: red wind-up toy with attached brass key. Wobbles and
  leans before rolling; charge frames rotate the whole body and key, so its painted
  face is intentionally rotated rather than upright in those two poses.
- `critter-caverns-drillbot.png`: orange wheeled cart, silver drill nose pointing right,
  attached lamp. Anticipation tips it back then braces; charge extends the drill.

## Bosses (2)

Both 1024×1536, right-facing, suggested idle height 200px, feet anchor.
Rows `idle:4,walk:4,windup:2,swing:2,hurt:1,call:2` (15 frames).

- `boss-shadowmaster.png`: tall purple masked ninja, tied-up black hair, silver
  shoulders, crimson scarf and sword. Crouched dash tell, forward sword attack,
  hands-together summoning with sword sheathed. No smoke or clones baked into sheet.
- `boss-drillcaptain.png`: moustached foreman in an orange mech suit with two drill
  forearms. Heavy steps, leaning rev-up, forward charge, raised-arm command poses.

Optional `vanish`, `throw`, `spin` and `burrow` rows are **not included**. All six rows
used by the current game are present. Call poses need timing/playtest review; the
Captain beckons with a drill arm rather than growing an extra hand.

## Verification

- All 25 files match generator originals byte-for-byte; SHA-256, original filenames,
  source dimensions and background import sizes: `sakura-caverns-originals.json`.
- Ran the detection/count portion of `tools/cut_raw.py` without packing or writing
  runtime assets. All seven sheets match their required row counts. Detected boxes:
  `sakura-caverns-sprite-validation.json` (source coordinates, exclusive right/bottom).
- `python tools/import_scenery.py --check`: all 14 backgrounds and four scoped props
  recognized, no new warnings, no missing floor height.
- `python tools/check_maps.py`: all 32 maps pass.
- `git diff --check`: passes.

No runtime assets, source, maps or tools were edited for this delivery. The preceding
merge from main brings Claude's groundwork into this branch. Icons remain awaiting feedback.
