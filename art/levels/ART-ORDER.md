# Environment production order

## NEXT BATCH (current work, in this order)

All backgrounds and bosses are in. What still looks unfinished in play is listed below, most visible first.
Every item is a new file in `art/raw/` (or `art/` for icons and effects); nothing delivered needs redoing.

**Rules for this batch.** One sprite per file on one flat background colour (not a boxed grid). Anything that
faces a way faces right. No detached effects (sparks, speed lines, glows floating apart from the object). Props
are seen from the same angle as the backgrounds and `prop-crate.png`: front face plus a visible top face, with
nothing painted around them. Keep generator originals untouched and note sizes in a delivery file as before.

### A. Area props — delivered (replace the flat grey and brown boxes)

All six imported and checked in the game (see `area-props-delivery.md`). Blocks stretch well; nook sides now take each picture's edge colour.

A prop named `prop-<area>-<class>` is used everywhere in that area. The game fits a prop to each box's width;
`block` boxes run 70 to 190 px wide, and long ones are stretched sideways, so draw blocks that still look right
stretched (stone courses, planks or panels running across, nothing round in the middle).

| File | Area | What | Draw at (on-screen) |
|---|---|---|---|
| `prop-castle-block.png` | Castle (all four streets) | Cut-stone block or low wall section, same stone and palette as the Castle backgrounds | 110 wide, ~100 tall incl. top face |
| `prop-castle-pen.png` | Castle | Luna's nook: a low stone archway or kennel alcove against the wall; the opening is cat-sized | 150 wide, ~62 tall |
| `prop-jungle-block.png` | Jungle (Riverbank, Rope Bridges, Lost Ruins, Temple) | Mossy carved stone block with roots, matching Lost Ruins | 110 wide, ~100 tall |
| `prop-ice-block.png` | Ice Field only | Block of packed ice / snow, blue-white, matching the Ice Field | 110 wide, ~100 tall |
| `prop-lab-block.png` | Loading Bay, Research Floor | Steel equipment crate or console base, grey with hazard striping like the Loading Bay | 110 wide, ~100 tall |
| `prop-lab-pen.png` | Lab (Ice Field, Loading Bay, Research Floor) | Luna's nook: a low open vent or duct mouth set in a steel frame | 150 wide, ~62 tall |

The Jungle's nooks already use the hedge arch, which suits it; no Jungle pen is needed.

### B. Icons — delivered (`art/TODO.md` section 3)

Original and frame measurements in `art/icons-effects-delivery.md`; integration pending.

One sheet replacing the emoji for pick-ups, tools and specials, which look different on every device. Add one
icon to the list there: **12 smelly fish** (the fish-skeleton special, already drawn as `fishbone.png`).

### C. Effects — delivered (`art/TODO.md` section 4)

All nine originals delivered with requested frame counts; integration pending.

The claw slash, meow rings, yarn balls, nets and shockwave are plain shapes drawn in code. Most visible first:
`fx-slash`, `fx-fireball`, `fx-net`, `fx-sticky`, `fx-heal`, then the rest. Draw them white where the table says
the game tints them.

---


Latest Lab batch reviewed against main `a8e5c51` and its generated `BRIEFS.md`.

1. **Streets: art delivered and integrated on main.** All ten maps have scenery, including
   Apartment Lobby and Third Floor. Any further work here should respond to observed in-game
   seam, landing-surface or placement issues, not regenerate delivered backgrounds.
2. **Castle: seven backgrounds delivered** (see `castle-delivery.md`; imported and checked in the game). Castle Gate (2), Great Hall (2), Battlements (2), Throne Room (1).
   Establish the stone, torchlight and banner palette at Castle Gate, then carry it through the interiors.
3. **Jungle: seven backgrounds delivered** (see `jungle-delivery.md`; imported and checked in the game). Riverbank (2), Rope Bridges (2), Lost Ruins (2), Sunken Temple (1).
   Establish daylight foliage first, then canopy height, overgrown stone and torch-lit interior.
4. **Antarctic Lab: seven backgrounds delivered** (see `lab-delivery.md`; imported and checked in the game). Ice Field (2), Loading Bay (2), Research Floor (2), Core (1).
   Establish aurora and ice first, then frosted utility architecture and cyan laboratory machinery.

All planned backgrounds are delivered and integrated. Area props are integrated. Icons and effects are delivered for import and runtime review.
Use the current generated brief and maps at the start of each batch; counts and coordinates may change.
Preserve original PNGs, report measured floor edges, and keep combat floors clear.

## Streets status clarification

The generated brief's generic prop table still labels cabinet, stall, van and vent as needed.
Their delivered sources are scoped names: `prop-corridor-cabinet.png`, `prop-market-stall.png`,
`prop-depot-van.png`, `prop-roof-vent.png`. Main's importer supports these names and the maps
already use cabinet, stall, van and vent classes. Do not generate duplicate generic versions.

## Boss sheets

Delivered and in the game: the Warden (knight), the Trapper (hooded mystic), the Director (ice robot). See
`art/TODO.md` for the notes from cutting them.

## Verification at planning time

`python tools/check_maps.py` passes all 22 current maps. This checks map geometry, not visual seams
or the alignment of painted prop tops with jumping. Streets delivery measurements and integration
caveats remain documented in `streets-delivery.md`.
