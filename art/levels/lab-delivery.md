# Antarctic Lab backgrounds delivered

Seven generator originals, following the briefs on main a8e5c51.
Ice Field, Loading Bay and Research Floor each have two panels; Core has one.

| File stem in art/raw | Original | Source floorY | Import size |
|---|---|---|---|
| bg-icefield-full-1 | 1672x941 | 534 | 1080x540 |
| bg-icefield-full-2 | 1671x941 | 534 | 1080x540 |
| bg-loadingbay-full-1 | 1672x941 | 555 | 1039x540 |
| bg-loadingbay-full-2 | 1672x941 | 555 | 1039x540 |
| bg-research-full-1 | 1672x941 | 555 | 1039x540 |
| bg-research-full-2 | 1672x941 | 555 | 1039x540 |
| bg-core-full-1 | 1672x941 | 555 | 1039x540 |

Floor edges are visual measurements, approximately +/-3px, recorded in art/raw/scenery.json.
All panels cover the full 540px screen after alignment to y345. Each set covers its map width;
retain existing map lengths and crop surplus at the camera limit. Originals are byte-identical
to generator output, with hashes and source names in lab-originals.json.

## Composition and integration

- Ice Field: aurora, distant dome and radio mast, with a clear icy combat surface.
- Loading Bay: frosted utility architecture and amber lighting. The snowcat in panel 1 and
  cargo in panel 2 are recessed background decoration, entirely behind the combat floor.
  Panel 2's left bay is closed to leave a calm backing for Luna's nook.
- Research Floor: empty cyan experiment tanks, cat research diagrams, wall consoles and
  server racks. Lower right wall areas remain plain behind both existing Luna nooks.
- Core: large wall-mounted energy ring and an unobstructed floor. The cyan ellipse is a
  flush floor marking, not a raised platform or collision boundary.
- All exits remain at side edges. Shutters and recesses are decorative, not new door triggers.

Adjacent panels match floor height and palette but are not guaranteed pixel-seamless.
Claude should check joins, existing nook facades, and sprite contrast in game, especially cyan
reflections in Core. No actors or interactive props are painted onto the combat floor.

## Scope and validation

This delivery covers backgrounds, not the Director sheet or separate obstacle props.
Existing blocks, gates, crates and nook collision remain unchanged. No runtime assets, maps,
source or tools were edited. Importer dry-run and map checks run before commit; runtime visual
review remains pending. This completes the planned background batches in ART-ORDER.md.
