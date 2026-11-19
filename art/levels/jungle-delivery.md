# Jungle backgrounds delivered

Seven untouched generator originals, following the briefs on main fccd2fa.
Riverbank, Rope Bridges and Lost Ruins each have two panels; Sunken Temple has one.

| File stem in art/raw | Original | Source floorY | Import size |
|---|---|---|---|
| bg-riverbank-full-1 | 1672x941 | 567 | 1017x540 |
| bg-riverbank-full-2 | 1671x941 | 567 | 1017x540 |
| bg-bridges-full-1 | 1672x941 | 570 | 1012x540 |
| bg-bridges-full-2 | 1672x941 | 570 | 1012x540 |
| bg-ruins-full-1 | 1672x941 | 562 | 1026x540 |
| bg-ruins-full-2 | 1670x942 | 562 | 1025x540 |
| bg-temple-full-1 | 1671x941 | 515 | 1119x540 |

Floor edges are visual measurements, approximately +/-3px, recorded in art/raw/scenery.json.
All panels cover the full 540px screen after floor alignment, and each street's combined art covers
its current map width. Retain map lengths; surplus art lies beyond the camera limit.
Temple's boundary landed higher than requested; measured scaling fills its 992px room without a gap.
No originals were cropped, resized or repainted after generation.

## Composition and integration

- Riverbank: daylight foliage, turquoise water and one patrol boat, behind a clear packed-earth path.
  Water is background only: no swimming or falling mechanic is implied.
- Bridges: broad continuous wooden deck with rear rope railing; distant bridges convey canopy height.
  There are no holes in the playable surface or foreground rails obscuring actors.
- Ruins: carved cat faces, fallen columns and roots stay behind the paved combat band.
  Panel 2 has a low stone backing at source x330..660 for the existing Luna nook.
- Temple: enclosed torch-lit chamber with empty nets hung high, and clear floor for the Trapper fight.
- All current exits remain off the side edges. Painted arches are decorative, not new door triggers.
- Existing nook positions and collision remain unchanged. Verify hedge facades against river water
  and bridge railing in game; no art defines new traversal or placement.

Adjacent panels match floor height and palette but are not guaranteed pixel-seamless. Check joins,
board/stone courses and actor contrast after import. The bright deck and riverbank are intentional
daylight changes from Castle; use actual sprites to judge contrast.

## Scope and validation

This delivery covers backgrounds, not the Trapper sheet or area-specific block props.
Existing crates, hedge and barrier art remain available; plain block obstacles still need a separate
prop pass if desired. No assets, maps, source or tools were edited for this delivery.

All seven originals verified byte-for-byte; hashes in jungle-originals.json.
Importer dry-run and map checker run before commit. Runtime visual checks remain with Claude.
Antarctic Lab is the final seven-background batch in ART-ORDER.md.
