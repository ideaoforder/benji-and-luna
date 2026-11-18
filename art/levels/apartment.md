# Apartment lobby: first visual slice

Status: visual mock-up and implementation proposal, not an implemented or playable room.
Source: `art/raw/mockup-apartment.png`, untouched image-generator output.
User selected apartments first after reviewing apartment / park / conservatory concepts.
This adapts the apartment idea to the current brawler on main (08b93ad), rather than the earlier platformer.

## Visual target

Warm brick, sage wall panels, brass elevator, amber lamps, cool dusk beyond the street entrance.
A broad quiet tiled floor holds the combat. Furniture stays against the back wall.
Stairs and elevator are legible destinations. Upstairs is a separate room, not a second lane
in the same screen. Keep all combatants at a constant scale as they move in floor depth.

The mock-up contains generated approximations of the approved characters for scale and composition;
it is not a literal composite of the runtime sprites and must not be imported as a gameplay background.
Actual actors use existing sprite assets. The image is 1672x941; preserve this original.
Its wall/floor boundary is around 59% of height; production must align it to y=345 at 960x540
(64%), and use the current walkable floor y=345..515. Recheck officer height 140, Benji92,
Luna70 with actual sprites; the mock-up is visual guidance, not a measured collision plan.

## Suggested first playable encounter

- One 960x540 lobby screen initially; enlarge only after the camera and floor read correctly.
- Enter from the street at the left edge. One short encounter: two uniform officers.
- Keep the central floor clear, with room to move around both officers in depth.
- After clearing the encounter, stairs and elevator both lead to the same upper corridor.
- Initial implementation can use room transitions for both routes. Elevator opening/closing
  animation can disguise the transition; moving platforms and vertical physics are unnecessary.
- Upper corridor is the next room to design. It leads to a fire-escape exit that reconnects
  to the exterior route. Do not imply that the current game supports these connections already.
- Maintenance grille is a future Luna shortcut; first pass can leave it decorative.

## Art to produce after visual review

1. A quiet upper architectural layer replacing the outdoor skyline role.
2. Wall/panel texture and floor strip at the existing importer sizes: 960x110 and 960x195;
   upper layer 960x300. Check seam continuity before claiming repeatability.
3. Separate non-repeating entry, stair portal, mailbox, lamp, plant, maintenance grille and elevator.
4. Elevator closed/open states and optional indicator states. Do not bake animated doors into walls.

Existing `tools/import_scenery.py` understands far/wall/floor strips, but its prop class allowlist
and the room theme/route definitions need extending for this interior. Apartment doors and tall
stair/elevator structures span the existing wall layer: render them as anchored decor or dedicated
room backdrop pieces, rather than stretching them into a 110px strip. Do not feed this full mock-up
into that importer or crop it into production layers.

## Review before production

Check character contrast on the tile; equal scale at front/back; unobstructed combat space;
readable stair/elevator entrances; architectural scale against actual officer sprites.
Then author the separated scenery and have Claude wire the lobby and corridor, floor bounds,
transition triggers and elevator states. No runtime files were changed for this art delivery.
