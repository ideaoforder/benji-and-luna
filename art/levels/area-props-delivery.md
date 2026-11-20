# Area props delivered

All six items from ART-ORDER.md batch A, as untouched generator originals in art/raw.
One connected object per file on magenta, with no ground shadows or detached effects.

| File stem | Source dimensions | Import dimensions |
|---|---|---|
| prop-castle-block | 1254x1254 | 110x114 |
| prop-castle-pen | 1254x1254 | 150x56 |
| prop-jungle-block | 1315x1196 | 110x108 |
| prop-ice-block | 1315x1196 | 110x92 |
| prop-lab-block | 1315x1196 | 110x92 |
| prop-lab-pen | 1254x1254 | 150x64 |

Sizes above are measured with the current importer. Block heights vary from the approximately
100px brief; nook heights vary slightly from 62px. No originals were resized to force a ratio.
The blocks use horizontal courses, layers or panels and have visible flat tops, without central
circular motifs that would distort when stretched to wider map boxes.

- Castle: lavender-grey masonry block and low dark stone arch alcove.
- Jungle: warm carved masonry, moss and attached roots; existing hedge nooks stay in use.
- Ice: opaque layered blue-white ice with a snow cap.
- Lab: riveted teal equipment crate and an open steel duct nook with no grille across its entrance.

The importer recognizes all six scoped names. The renderer chooses street, theme and area props
before generic fallbacks, so ice applies to Ice Field and lab to the remaining Lab block locations.
Do not alter map collision just to fit a painted object. Review jumping alignment and stretched
blocks at both narrow and wide box sizes; check nook entrances with Luna in game.

Verified all originals byte-for-byte against generated files; hashes in area-props-originals.json.
Importer report-only validation passes. Map checker passes all 22 maps. Runtime visual review and
asset import remain with Claude; this batch edits no runtime assets, source, maps or tools.

Next priority is ART-ORDER.md batch B (12 icons), then C (effects). Small enemies are assigned to
another agent and are not included here.
