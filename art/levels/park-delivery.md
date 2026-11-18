# Catnip Park: continuation and props delivered

Follows `park-reply.md` from main cc6f984. This supersedes the strips-and-landmarks proposal
in `park.md`. All four PNGs are untouched image-generator originals.

## 1. Right-hand panel

`art/raw/bg-park-full-2.png`: 1672x941. Continues the iron fence, trees and gravel;
an open gate at the right suggests the Night Market. No gazebo, conservatory, actors or gravel props.
Visually measured floor edge: approximately source **y570**, matching panel 1.
`art/raw/scenery.json` now points panel 2 at this file, with floorY 570 and no mirroring.

The importer dry-run produces **1012x540 per panel**, total 2024px versus the current 2016px map.
The extra eight pixels can remain beyond the camera's map limit; no map edit is included here.
Floor and curb are close at the join, but foliage, fence ornament and lighting are not pixel-seamless.
Use Claude's suggested tree trunk or lamp over the join if it remains visible in play.
The gate is painted scenery; retain the existing east-edge transition trigger.

## 2. Gravel props

Both have visible top surfaces, dark outlines and a magenta key background.

| File | Original size | Intended display | Measured proportional cutout |
| --- | --- | --- | --- |
| `prop-hedge.png` | 1254x1254 | 130 wide; front46 + top40 | about130x92 total |
| `prop-bench.png` | 1530x1028 | 110 wide; front40 + depth34 | about110x76 total |

The hedge is about six pixels taller than the requested total86 at proportional scale;
its illustrated top/front division is approximate. Keep map collision footprints authoritative.
The bench silhouette is close to the requested total74. Do not resize or repaint the raw files;
any exact fitting belongs in the imported derivative.

**Cutout detail:** the generated magenta is slightly uneven. The existing corner-based cutter at
its default tolerance40 retains outlying background pixels on the bench, reporting110x69 instead
of the true silhouette. A read-only check with tolerance80 gives a1283x881 bench cutout, or110x76.
Hedge and nook remain approximately130x92 and150x62 with that tolerance. Also remove magenta
inside enclosed bench openings (between slats/arms), which an edge-only flood fill can leave behind.
A magenta color key restricted to this asset's background hue is appropriate; no wood/iron uses it.
No cutter or imported asset changes were made in this art delivery.

## 3. Luna's nook

`art/raw/prop-pen.png`:1717x916. Low clipped hedge entrance with a rounded crawl-through gap.
At150px silhouette width, it is approximately **62px tall**; the central opening is roughly
50px wide and39px high. Background through the opening is magenta and connected to the outside.
This is an entrance facade, not an84px-deep enclosed floor or a human-size garden doorway.

Keep the existing nook at(1400,345,150,84), milk at(1475,388), and Luna-only interaction rule.
The image does not define collision. Anchor the hedge feet to the nook's front boundary and preserve
access through the middle. Claude should retain or adapt side boundaries as needed and verify
milk visibility and actor occlusion. Importer support for prop-pen is still required, as anticipated
in the reply; the current dry-run skips it.

## Validation and handoff

- Confirmed all four delivered files are byte-identical to generator originals.
- Ran `python tools/import_scenery.py --check`: both panels and hedge/bench accepted;
  pen skipped because that class is not supported yet.
- Examined cutout dimensions at default and tolerance80 without saving derived images.
- No runtime files were edited. In-game seam, prop cutouts, placement and nook behavior still
  need Claude's integration check.
