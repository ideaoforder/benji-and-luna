# Apartment lobby background delivery

`art/raw/bg-apartment-full.png` is the final empty, non-repeating lobby background.
It preserves the approved brick, sage panels, stairs, mailboxes, brass elevator and dusk entrance.
There are no characters, character shadows or floor props. All artwork is painted background;
it does not create collisions, interactable doors, or elevator animation.

## Source and import

Untouched generator original: **1672x941**. No post-generation crop, resize, cleanup or re-grid.
`python3 tools/import_scenery.py --check` accepts it and reports **959x540**, with a note that
this is one pixel below the minimum room width. It rounds this near-16:9 original down by1px.
Claude should display the background across a960px room (tiny horizontal stretch) or address
that rounding at import. Do not introduce a one-pixel gap along the right edge.
The background key is `bg-apartment-full`, so name the map `apartment` or explicitly map the key.
No apartment map currently exists in main at93976ec. Runtime and import remain Claude's work.

## Measured placement

Coordinates below are approximate visual measurements of final art, expressed in a **960x540**
room, with x=0 at left and y=0 at top. Use the clear passage ranges for door triggers rather than
including the decorative frames. The source-to-room factors are960/1672 and540/941.

| Feature | Source x range | Room x range | Suggested use |
|---|---:|---:|---|
| Left street double doors, clear glass leaves | 90–276 | 52–158 | Street return |
| Stair base / traversable stair mouth | 414–655 | 238–376 | Upstairs corridor transition |
| Elevator clear door leaves | 1354–1534 | 777–881 | Lift transition |
| Maintenance grille | 680–713 | 390–409 | Decorative for now |

The full stair arch is wider (source x410–724, room x235–416); the landing trigger should
use the narrower stair-base range. Place foot-level trigger depth inside the walkable band,
for example y345–375, rather than in the painted wall. These are suggestions, not authored map data.

## Geometry differences to review

The final wall/floor seam is around source y596, or **room y342**: approximately3px above the
requested y345. This leaves the entire existing y345–515 floor band on clear floor.
The street door leaves are roughly155px tall, with additional arched glazing above.
The elevator leaves are roughly204px tall (source y240–595), a little taller than the requested
170–190px; confirm against a140px officer in game. Door frames are larger decorative elements.
Exact pixel geometry did not survive image generation, so these are reported measurements rather
than claims of exact target compliance. Preserve original; adjust integration or request another art pass
if these differences are problematic.

## Validation and remaining review

- Inspected final art for characters, character shadows, floor obstruction and doorway readability.
- Confirmed delivered PNG is byte-identical to the final generated source.
- Ran scenery importer in `--check` mode only; no runtime assets were generated.
- Real-sprite scale, floor contrast, foot alignment and room transitions still need an in-game check.
- This is one closed-elevator background. Opening doors and moving lift logic are not supplied.
