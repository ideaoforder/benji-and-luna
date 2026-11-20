# Icons and effects delivered

Batch B and C from ART-ORDER.md: the 12-icon strip and all nine effect sheets.
Files are in art/ exactly as requested by TODO sections 3 and 4. Every PNG is an untouched
image-generator original; no cropping, resizing, recoloring or cleanup was applied after generation.

| File | Frames | Original size | Intended game cell |
|---|---|---|---|
| icons.png | 12 | 2172x724 | 32x32 |
| fx-slash.png | 3 | 2172x724 | 96x96 |
| fx-fireball.png | 4 | 2172x724 | 32x32 |
| fx-net.png | 2 | 1774x887 | 32x32 |
| fx-sticky.png | 5 | 2216x709 | 48x48 |
| fx-heal.png | 4 | 2172x724 | 96x96 |
| fx-meow.png | 3 | 2172x724 | 64x96 |
| fx-ball.png | 2 | 1774x887 | 16x16 |
| fx-wave.png | 3 | 2172x724 | 40x32 |
| fx-crate.png | 4 | 2172x724 | 32x32 |

## Import notes

- Icons, left to right: fish, catnip, bell, milk, fire yarn, sticky yarn, healing yarn,
  meow note, pounce paw, full heart, empty heart, fish skeleton.
- Icons and heal use green key backgrounds; other effects use magenta. Key by background
  color proximity, not by all green pixels: preserve the darker catnip leaves. Hollow heart,
  net holes and ring centers should become transparent.
- Actual sheets are larger than requested and have generous margins. They are not an exact
  4x pixel grid or equally spaced cells. Use the measured exclusive xyxy frame bounds in
  icons-effects-originals.json, which group scattered particles with their correct frame.
- Frame counts match the brief. Slash and meow are white/light grey for tinting. Sticky has
  two flight frames then three burst frames. Crate has four distinct debris choices, not a loop.
- Preserve relative size across expanding effects: use ONE uniform scale for the whole
  sequence, based on its largest frame fitting the target cell; do not individually enlarge
  every ring or fragment group to fill a cell. Center rings and bursts consistently.
- Fireball: keep yarn centers aligned (approximately source y420); flame heights vary.
  Wave: align all three bottoms (source y559), keeping their changing crest height.
  Net and tennis ball rotate around a shared frame center. Icons fit individually into32x32,
  with full and empty hearts using the same scale and center.
- The source has stepped pixel contours, but some shading is textured; assess at target game
  size and use nearest-neighbor scaling if appropriate. No claim of exact pixel-grid conformance.

## Validation and scope

Visually checked all ten sheets for requested item/frame count, order, clear separation and
complete silhouettes. Measured frame bounds programmatically and confirmed clear separating
gutters. SHA-256 checks match each saved PNG to its generator original. git diff --check passes.

This is source-art delivery only: no assets, code, maps or tools were edited. Claude still needs
to key, pack and wire the sheets, then check readability and animation timing in game. Runtime
import was not tested because there is no dedicated icon/effect import command in the brief.
Small enemies remain the other agent's assignment.
