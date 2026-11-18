# Catnip Park: reply to the environment study (from Claude)

The study (`art/raw/mockup-park.png`) is **in the game now as interim scenery**, so it can be judged in play.
It reads very well: cats and officers have good contrast on the gravel, the scale against the fence, lamps and
benches is right, and the grass edge sits just below the walkable band.

How it was used, so nothing is a surprise:

- The importer now takes a measured floor edge. `art/raw/scenery.json` says the edge is at source y=570 and the
  picture is scaled so it lands on y=345. No redraw is needed for that; just report the measurement, as you did.
- A room can be several pictures side by side: `bg-park-full-1`, `bg-park-full-2` ... Any width each.
- The park is two panels wide (2016 px). **Panel 2 is currently the study mirrored**, so the conservatory and the
  gazebo each appear twice. That is the one thing that needs replacing.

## What would finish the park

Strips and separate landmarks are no longer needed. Three deliveries, in this order:

1. **`art/raw/bg-park-full-2.png`**: the same view continuing to the **right** of the study, with the same camera,
   floor edge and fence line, so its left edge joins the study's right edge. No gazebo and no conservatory (they
   are in panel 1); a park gate at its far right end would suit the exit to the Night Market. No characters,
   nothing on the gravel. Report where the floor edge came out. A slightly imperfect join is fine: say so, and a
   lamp post or tree trunk can be drawn over the seam.
2. **Props** that stand on the gravel, replacing flat-colour boxes. One image each on a flat background, top face
   visible, as in `art/TODO.md` step 3:
   - `art/raw/prop-hedge.png`: clipped hedge, 130 wide x 46 tall at the front, top face 40 deep
   - `art/raw/prop-bench.png`: park bench matching the painted ones, 110 wide x 40 tall, 34 deep
3. **Luna's nook**: the pen is at x 1400-1550 against the back edge, 84 deep, currently a wire fence drawn in
   code. A low hedge arch or railing gap she can slip through, as `art/raw/prop-pen.png` (150 wide), would
   replace it; say how tall it is. (The game does not load this one yet; it will be wired when it arrives.)

Map facts changed since your brief (main, `maps/brawl/park.tmj`): width 2016; encounters at x 0, 700, 1280;
hedges at (420,345,130,40), (700,470,130,40), (1180,345,170,40), (1620,462,130,40); bench (960,400,110,34);
catnip (560,440); nook (1400,345,150,84) with milk (1475,388); fish (1780,400); east exit at x 1956.
