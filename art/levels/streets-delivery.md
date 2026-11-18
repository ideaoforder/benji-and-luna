# Eight-street art delivery

Implements the art requests in `BRIEFS.md` from main `1114006`: 15 background panels and eight prop originals. Apartment and Park were already delivered. Generated `BRIEFS.md` is unchanged. Runtime import and map wiring remain with Claude.

## Background measurements

Source floor edges are visual measurements, approximately +/-3 pixels. `art/raw/scenery.json` contains these values. Import scaling is 345/floorY; all delivered panels cover at least 540px vertically after scaling. Excess height is cropped by the existing importer.

| Street | Panel | Source size | floorY | Imported width |
|---|---|---|---|---|
| alley | 1 | 1672x941 | 537 | 1074 |
| alley | 2 | 1671x941 | 537 | 1074 |
| corridor | 1 | 2050x767 | 482 | 1467 |
| yard | 1 | 1672x941 | 575 | 1003 |
| yard | 2 | 1672x941 | 575 | 1003 |
| roof | 1 | 1672x941 | 594 | 971 |
| roof | 2 | 1672x941 | 594 | 971 |
| market | 1 | 1774x887 | 557 | 1099 |
| market | 2 | 1859x846 | 422 | 1520 |
| depot | 1 | 1774x887 | 535 | 1144 |
| depot | 2 | 1860x846 | 432 | 1485 |
| kennels | 1 | 1672x941 | 490 | 1177 |
| kennels | 2 | 1672x941 | 490 | 1177 |
| pound | 1 | 1672x941 | 575 | 1003 |
| pound | 2 | 1671x941 | 575 | 1003 |

| Street | Total art width | Map width |
|---|---|---|
| alley | 2148 | 1920 |
| corridor | 1467 | 1440 |
| yard | 2006 | 1920 |
| roof | 1942 | 1920 |
| market | 2619 | 2240 |
| depot | 2629 | 2240 |
| kennels | 2354 | 1920 |
| pound | 2006 | 1600 |

The corridor uses one panoramic picture; Market and Depot use wider panels to cover their longer maps. Some floor edges landed above the requested 60-64% band. Their measured scaling still fills the screen and puts the combat boundary at y345. No raw image was resized or cropped. Keep existing map widths: surplus artwork extends beyond the camera limit. Panel starts use the actual imported widths above, not an assumed 1012px.

Adjacent panels share a floor line and palette but are not pixel-seamless. Market and Depot have the largest source-composition differences; check architecture scale, cobbles/asphalt and lighting at those joins in game. A wall pilaster or utility pipe can mask a residual seam.

## Doors and nook placement

Approximate painted coordinates below are at imported scale; use these when moving back-wall triggers as allowed by the brief.

| Destination | Source horizontal opening | Imported street x |
|---|---|---|
| Alley to Apartment | panel1 x1465..1598 | 941..1027 |
| Alley fire-escape ladder | panel2 x117..200 | 1149..1203 |
| Corridor stairs | panel1 arch x128..355; stair foot x130..310 | arch 92..254; foot 93..222 |
| Corridor lift | panel1 x510..652 | 365..467 |

Alley ladder remains inside the existing broad 1110..1220 trigger. The apartment door and corridor portals need the coordinate review above. Corridor apartment doors and right-end fire-escape window are decorative; retain the existing side exit. No additional interactive doors are implied by painted garage shutters or kennel fronts.

Lower backgrounds were kept quiet behind the existing nook positions. In Kennels panel2, the solid wall actually spans source x330..645, or street x1409..1631. The existing nook starts at 1380, so its left 29px overlaps a painted cage edge: move its facade/trigger and pickup together about 30px right if that overlap reads poorly. Other nooks can retain their current positions; verify with actual props.

## Props

All use flat magenta backgrounds and visible top surfaces. Sizes below distinguish the requested map geometry from measured proportional cutouts; they are not exact substitutes for collision geometry.

| Raw file | Target width x front + depth | Proportional cutout at target width |
|---|---|---|
| `prop-crate.png` | 64x54 + 46 | 64x94 |
| `prop-heavy-crate.png` | 58x150 + 60 | 58x204 |
| `prop-dumpster.png` | 150x72 + 44 | 150x118 |
| `prop-gate.png` | 24x130 + 60 | 24x180 |
| `prop-corridor-cabinet.png` | 90x44 + 34 | 90x70 |
| `prop-roof-vent.png` | 110x60 + 50 | 110x101 |
| `prop-market-stall.png` | 190x58 + 50 | 190x114 |
| `prop-depot-van.png` | 230x62 + 62 | 230x128 |

The current importer accepts crate, heavy-crate (alias breakable), dumpster and gate. It deliberately skips the four new class names until Claude adds them:

- `corridor-cabinet`: replace the corridor 90x34 footprint / 44-high block.
- `roof-vent`: replace roof blocks; primary 110x50 footprint / 60 high, second 90x50 / 50 high. Fit the second derivative to its existing geometry.
- `market-stall`: replace all four 190x50 footprint / 58-high blocks.
- `depot-van`: replace all three 230x62 footprint / 62-high blocks.

Gate is one closed, nearly edge-on state. Current gameplay removes an opened gate; no open-animation sheet is needed by this brief. Reinforced crate follows the latest 150-high barrier request. Both remain unclimbable puzzle barriers.

The renderer currently scales prop art by width only. Before shipping, check painted top/front boundaries against jump landing heights and depth footprints; overall silhouette height alone does not establish that alignment. If precise fitting is needed, adjust imported derivatives/rendering, preserving these originals and map gameplay dimensions. Especially review cabinet/vent top depth, and the van hood versus its standable roof.

## Verification

- All 23 PNGs matched an original generator file byte-for-byte; see `streets-originals.json` for hashes.
- `python tools/import_scenery.py --check`: all 15 new panels and four supported new prop classes accepted; only the four named custom classes skipped. No bottom-coverage warnings.
- `python tools/check_maps.py`: all 10 existing maps pass. No map edits were made, so this does not validate future trigger moves or imported-art collision alignment.
- Runtime/assets/tools and the generated brief were not edited. Claude still needs to import, add custom classes, align door triggers, and check seams, jumping and nook visibility in play.
