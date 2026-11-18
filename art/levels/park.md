# Catnip Park: environment study

Status: visual concept for review, not an import-ready background.
Source: `art/raw/mockup-park.png`, untouched generator original, 1672x941.

## Art direction

Blue and teal night foliage, warm amber park lamps, dark iron fencing and aged stone edging.
A gazebo provides a neighborhood landmark; a distant glass conservatory with stone turrets
introduces the castle-like visual theme. The broad gravel promenade keeps combat readable.
Match the approved apartment scenery's illustrated outlines and material treatment.
No actors are baked into this study.

The conservatory is background scenery only. The existing park exit still leads to Night Market.
The gazebo and benches in this concept do not define new collision or traversal routes.

## Existing route to preserve

Based on `origin/main` at fa9a6ce, `maps/brawl/park.tmj`:

- Level width 2240 pixels; screen 960x540; combat feet y345..515.
- Enter from Rooftops at the west edge; start at (160,430).
- Three encounters at x0, x760 and x1420: uniform/punk;
  preppy/uniform/punk; round/suit.
- Existing hedge footprints: (420,345,130,40), (700,470,130,40),
  (1330,345,170,40), (1780,462,130,40).
- Existing bench-sized block: (1040,400,110,34).
- Catnip pickup (560,440). Luna-only nook (1560,345,150,84)
  contains milk at (1635,388). Fish pickup (1960,400).
- East exit at x2180 leads to Night Market.

Use these as the layout constraints for the eventual production scenery. This image depicts
one visual slice, not the whole route compressed into a screen. Its two decorative benches
are composition examples, not a replacement for the map's existing block.

## Production follow-up after review

1. Make repeating far, wall and floor strips following `art/TODO.md` dimensions.
   Keep the conservatory and gazebo in separate non-repeating landmark art so they appear once.
2. Deliver benches, hedges, lamps and gates separately where needed. Do not bake collision props
   into repeating strips. Coordinate new decor classes with Claude before importing them.
3. Give Luna's existing nook a readable low opening through a hedge; preserve the pickup and pen.
4. Check actual Benji, Luna and officer sprites against the path for contrast and scale.
5. Verify horizontal seams and layer alignment in game before calling the scenery complete.

The study's back floor edge is approximately source y570 (display y327 at 540px height),
above the production target y345. Production art must align that edge to y345 and keep
foreground grass below y515. Floor texture should be quieter at runtime scale. Do not import
this mock-up as a finished background, crop it into layers or infer collision from painted props.

No gameplay, map or imported asset files were changed for this delivery.
