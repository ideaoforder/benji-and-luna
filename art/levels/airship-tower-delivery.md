# Airship and Tower art delivery

Section 9 now has **40 untouched generator originals** in `art/raw/`: 12 room panels (including the transparent lift foreground specified by BRIEFS), one shaft strip, three chase layers, four props, three board sheets, three flying enemy sheets, seven helicopter parts, four ground enemies, two critters and the Commissioner.

This is the source-art handoff, not a runtime import. No packed sprites, runtime assets, maps or gameplay were changed. The Commissioner is the final boss, after the helicopter and Tower descent. All directional artwork faces right. The optional Commissioner grab/throw rows are not included.

## Measurements and provenance

- [Original manifest](airship-tower-production-originals.json): dimensions, SHA-256 hashes and matching generator filenames for all 40 images; floor coordinates for panels. Every saved PNG matches its generator original byte for byte.
- [Sprite validation](airship-tower-sprite-validation.json): requested rows, target heights, anchors and detected source bounds. All ten character sheets passed the cutter's detection/count stage without writing runtime assets.
- [Parts measurements](airship-tower-parts.json): tight source foreground boxes for boards, helicopter pieces and props. Coordinates are `x0,y0,x1,y1`, with exclusive right/bottom edges. These are measured bounds, not an equal grid.

Use one uniform scale across a character sheet. Raised weapons and crouches change bounds; do not independently fit each frame to its target height. Preserve feet anchors for humanoids and the walker, centre anchors for flying robots. Visually check registration after packing; passing counts does not test animation in game.

## Panels

`art/raw/scenery.json` records approximate painted wall/floor boundaries, mapped to screen y=345. The dry-run importer reports:

| Street | Source floorY | Imported width per panel | Panels |
|---|---:|---:|---:|
| Mooring | 574 | 1005 | 2 |
| Engine Hold | 530 | 1088 | 2 |
| Upper Rigging | 572 | 1008 | 2 |
| Rooftop | 558 | 1034 | 2 |
| Records | 512 | 1127 | 2 |
| Ground Exit | 580 | 995 | 1 |
| Clockwork lift foreground | 598 | 965 | 1 |

Opaque panels import at height 540, cropping surplus floor below the screen. Mooring's pair totals 2010 against the 2016 map: extend the final edge six pixels or fit each panel horizontally to 1008 during import. Do not move the floor boundary just to hide this discrepancy. Check panel joins in-game; paintings are continuations, not pixel-identical seam tiles.

Mooring door openings are approximately source x=980–1180 (tools) and 1340–1595 (dojo), y=385–574. At the recorded scale these are screen x=589–709 and 805–959. The dojo trigger centre sits at the left edge of its painted opening: widen/align its interaction region during integration, or request a targeted door repaint if the existing map must remain exact. Rooftop openings are approximately source x=820–1090 and 1225–1495, placing both trigger centres inside their painted openings. Records has two empty cells; the requested H1/H2 lettering was not rendered and can be added as game labels.

**Clockwork is RGBA foreground:** retain alpha and place the shaft behind it. It is deliberately `skip:true` in the generic scenery importer, which would flatten it into JPEG. Scale by 345/598, crop to 960x540 with the floor at y=345. The brake is painted on the right. The twelfth panel comes from BRIEFS' Clockwork entry; the section 9a table itself lists only eleven opaque panels.

## Scrolling layers

All four custom scrolling images are `skip:true` in the generic importer pending the chase/shaft import path.

- `bg-chase-sky`: static sunset, fit to 960x540.
- `bg-chase-far`: RGBA 2172x724; fit whole canvas to 1920x540. Both horizontal edge columns have zero alpha. Keep horizontal transparent gutters so repeating does not cut towers.
- `bg-chase-clouds`: RGBA 2172x724. Main cloud opacity (alpha >32) lies at x=116–2056, y=289–427; very faint alpha extends much farther. For a useful 1920x~200 band, crop vertically around y=250–475 before scaling, while preserving the full source width and horizontal transparent gutters. Both horizontal edge columns have zero alpha. Check the soft fringe over the sunset.
- `bg-clockwork-shaft`: RGB 2089x753, fit to 960x345. Dark top/bottom bands hide the repeat boundary; measured first/last row mean RGB difference is 1.26/255. **This is not an exactly seamless pixel tile.** Inspect the upward loop and blend/match the dark boundary bands in the runtime derivative if visible. The untouched original remains available for a repaint.

## Props and boards

Generic scenery dry-run sizes: cargo block 110x92, deck-stair nook 150x57, filing-cabinet block 110x119, vent nook 150x48. These preserve source aspect ratio; the last two differ from the approximate brief heights. Set collision and nook interaction bounds from the map, not decorative transparent bounds.

The board originals share a 2172x724 canvas. Keep shared registration between cat and officer board rather than fitting separate tight crops to equal width. Cat board bounds are [191,198,1993,558], officer [192,200,1911,556]. Using 92/1802 as scale gives roughly 92x18 for the cat board; target 92x24 is approximate. Match cat feet to the deck surface, not the launcher top. The two fan centres are approximately source x=690 and 1490.

`fly-board-glow` contains **six separate blobs grouped as three pairs**, not six animation frames. Pair bounds are [96,299,586,375], [845,295,1347,510], [1607,298,2100,463]. Preserve the distance between the two glows, align their top edges to the fan outlets, and use a shared scale/pivot across all three pairs. Leave the variable glow length intact. Check magenta spill when keying the soft edges.

## Character rows

| Sheet | Rows in order | Target idle height |
|---|---|---:|
| enemy-airship-aviator | idle2 walk4 windup2 swing2 hurt1 | 140 |
| enemy-airship-rigger | idle2 walk4 windup2 swing2 hurt1 | 145 |
| enemy-tower-mechanic | idle2 walk4 windup2 swing2 hurt1 | 160 |
| enemy-tower-clerk | idle2 walk4 windup2 swing2 hurt1 | 135 |
| critter-airship-propbot | idle2 walk2 windup2 charge2 hurt1 | 60 |
| critter-tower-orb | idle2 walk2 windup2 charge2 hurt1 | 60 |
| fly-drone | fly2 tell2 hurt1 | 50 |
| fly-balloon | float2 tell2 hurt1 | 80 |
| fly-officer | ride2 point1 charge2 hurt1 | 95 |
| boss-commissioner | idle4 walk4 windup2 swing2 hurt1 call2 | 220 |

The officer rider has no board; compose it with the red board. Rigger windup includes an airborne tuck: preserve its intentional vertical motion when anchoring. Clerk's throwing followthrough has an empty hand; game supplies the projectile. Mechanic slams the wrench right; two-sided damage remains a gameplay decision. Commissioner includes the red-button summon, with the cap visibly displaced in hurt.

## Helicopter assembly

All pieces are separate magenta originals. Body2, rotor3, tail3, lamp2, launcher2, engine2, hurt1; each is one horizontal row. See parts JSON for measured bounds. Target hull width 260, roughly107 high from its measured822x338 bounds. Bob the assembled rig in code; the two healthy hull poses are very similar.

Suggested first-body source attachment points (approximate; check assembled preview): main rotor (577,246), tail rotor (137,375), engine (380,454), launcher (603,522), lamp (747,524). Convert to hull-local coordinates by subtracting first bounds origin (65,240), then multiply by260/822. Translate second hull's anchors with its origin (1022,241).

Main rotor: pivot at bottom centre of mast, target width240. Tail and engine: centre pivots, target widths36 and34. Lamp: top mount pivot, about28 wide (its measured aspect yields35 high). Launcher: top stem pivot, about45 wide; firing frame extends the barrel. Lamp on/off has no searchlight beam; renderer supplies it. Damage body includes attached smoke as requested: scale its hull width to260, leaving extra canvas above for smoke, rather than fitting the smoke-inclusive bounds into110 high. Align damaged hull to healthy tail/cockpit landmarks. Review all sockets in an assembled preview before shipping.

## Verification and remaining integration

All 41 maps pass `tools/check_maps.py`. `tools/import_scenery.py --check` reports the eleven opaque panels and four props without new warnings; existing cart beam/crystal custom-import notices remain. Character count validation passes all ten sheets. Original hashes are verified. These checks do not prove collision alignment, panel joins, helicopter pivots, animation timing or loop appearance; those require Claude's runtime import and playtest. The specific source/brief differences above are intentionally recorded rather than silently changing the maps.
