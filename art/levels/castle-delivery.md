# Castle backgrounds delivered

Seven untouched generator originals, following BRIEFS.md on main 0731434.
Castle Gate, Great Hall and Battlements each have two panels; Throne Room has one.

| File stem in art/raw | Original | Source floorY | Import size |
|---|---|---|---|
| bg-gatehouse-full-1 | 1672x941 | 565 | 1021x540 |
| bg-gatehouse-full-2 | 1671x941 | 565 | 1020x540 |
| bg-greathall-full-1 | 1672x941 | 565 | 1021x540 |
| bg-greathall-full-2 | 1672x941 | 565 | 1021x540 |
| bg-battlements-full-1 | 1672x941 | 562 | 1026x540 |
| bg-battlements-full-2 | 1672x941 | 562 | 1026x540 |
| bg-throne-full-1 | 1672x941 | 580 | 995x540 |

Floor edges are visually measured, approximately +/-3px, and recorded in art/raw/scenery.json.
Throne uses y580, the front of the dais, rather than the wall base around y565: this keeps
all steps behind gameplay y=345. Carpet is flat scenery. All panels cover the full 540px
screen after floor alignment, and each street's total art width covers its existing map.
Extra art can remain beyond the camera limit; no map expansion is needed.

## Composition and placement

- Castle Gate: raised portcullis and moat view in panel 1, plain continuation in panel 2.
  Portcullis is decorative; existing exits are off the side edges, not through the painted arch.
- Great Hall: vaulted interior, hearth only in panel 1, windows and shields continuing right.
- Battlements: low parapet, city/park views and torches, no walkable-floor gaps.
- Throne Room: empty ornate throne and dais behind combat, muted red carpet on the floor.
- Existing Luna nooks remain unchanged. Lower walls were kept clear around their positions;
  confirm the current nook facade reads correctly against stone after import.

Adjacent panels match floor height and palette but are not guaranteed pixel-seamless.
Check stone courses, floor texture and light pools at each join; a narrow pilaster can mask
residual discontinuity. Check cats' contrast against Great Hall reflections and the throne carpet.
No actor sprites, props or collision shapes are baked into the combat band.

## Handoff

This delivery covers the seven backgrounds, not the Warden sheet or Castle-specific obstacle art.
Existing crates, barriers and gate art can be reused. The plain block obstacles still need an
area-specific prop pass if desired; no new prop classes or gameplay files were changed here.
Jungle and Antarctic Lab backgrounds remain next in ART-ORDER.md.

Validation: original-file hashes recorded in castle-originals.json; importer dry-run and map checker
run before commit. In-game seams, scenery scale and nook readability still need Claude's review.
