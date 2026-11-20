# Environment production order

## NEXT BATCH (current work, in this order)

Three small items. The game already looks for all of them: drop the files in and they replace what is drawn in
code today. Same rules as before: one object per file on one flat background colour, untouched originals, a
delivery note with sizes. Nothing that faces a way should face left.

### D. Streets nook — `art/raw/prop-streets-pen.png`

Luna's nooks in six Streets (Back Alley, Pound Yard, Rooftops, Fruit Market, Bus Depot, Kennels) are still wire
fences drawn in code. One picture covers all six (the Park keeps its own). Something only a small cat fits into,
set against a back wall, seen from the same angle as `prop-crate.png`: for example a gap under a wooden fence, a
cardboard box on its side, or a storm-drain opening in a low kerb. The opening must read as cat-sized.
Draw at **150 wide, about 62 tall** on screen. Its left and right edges are continued back to the wall in their
own colour, so plain sides work best.

### E. Gate switch — `art/raw/prop-switch-off.png` and `art/raw/prop-switch-on.png`

Every gate puzzle uses a red/green dot on a pole. Two pictures of the same lever on a post: **off** (lever up,
red light or handle) and **on** (lever pulled down, green). Identical framing in both, so swapping them does not
jump. **32 wide, about 50 tall** on screen. Used in every area, so keep it neutral: metal post, no area styling.

### F. Title logo — `art/raw/logo.png`

The title screen says BENJI & LUNA in plain system type. A logo: the words **BENJI & LUNA**, big, chunky and
readable on an iPad from the sofa, pixel-art style to match the game. A cat element is welcome (ears on a letter,
a paw for the ampersand, tails), but the words come first. Wide, about **640 x 100** on screen (so roughly
6:1 to 4:1); it sits over the Back Alley background, so give the letters a dark outline. Flat background colour.

---

## Done

**A. Area props, B. Icons, C. Effects** are delivered and in the game (see `area-props-delivery.md` and
`icons-effects-delivery.md`). Their briefs are below for reference.

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

Imported (`tools/import_fx.py`) and in the game: pick-ups, the HUD's hearts, specials and tools.

One sheet replacing the emoji for pick-ups, tools and specials, which look different on every device. Add one
icon to the list there: **12 smelly fish** (the fish-skeleton special, already drawn as `fishbone.png`).

### C. Effects — delivered (`art/TODO.md` section 4)

All nine imported and in the game: claw slash, meow rings, fire and sticky yarn (with its icy burst), heal ring, tennis ball, net, shockwave waves, crate splinters.

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
