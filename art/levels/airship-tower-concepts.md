# Airship and Tower — concepts for review

User request: two additional areas. Airship mostly above deck with some below-deck
play, an extra side-scrolling flying shooter/slasher section, and an Animal Control
helicopter boss. The Tower follows Airship and is a descent. These requirements are
confirmed; the route names, hoverboard implementation and Tower boss below are proposals.

Concept originals: `art/raw/concept-airship.png` and `art/raw/concept-tower.png`.
These are visual direction boards, not production panels or sprite sheets. Do not cut
runtime assets from them. Hashes and dimensions: `airship-tower-originals.json`.
No maps, level order, gameplay code or runtime assets changed.

## Airship

Warm sunset, cream zeppelin envelope, teal iron, brass machinery, golden timber.
Suggested sequence: Mooring Deck → Engine Hold → Upper Rigging → Cloud Chase.
Keep most grounded play above deck; Engine Hold is a shorter below-deck contrast.
The concept's perspective engine-room vignette is mood reference: production gameplay
backgrounds still need a clear side-view combat floor aligned to the map brief.

Cloud Chase uses one low hoverboard per cat. Compose the existing cat sprite above a
separate empty board, with enclosed lift fans below and a small yarn launcher at its
nose. Reuse idle/airborne poses for flight, claw poses for close attacks, hurt poses
for hits. A board needs idle/boost/tilt or damage art, plus separately animated exhaust.
This avoids mandatory jetpack redraws of every cat, but still requires flight controls,
anchoring, hitboxes and pose tests: reusing sprites does not mean zero implementation.

Ranged yarn shots clear distant enemies; claw attacks reward getting close. Proposed
flying roster: rotor net drones (light), balloon drones (armoured), officers on boards
(existing officer sprites plus a vehicle). Give all enemies readable attack tells and
visible hit feedback. Keep board/enemy silhouettes distinct from clouds and background.

Animal Control helicopter boss: searchlight sweep telegraphs a lane, net launcher slows
or snares, rotor gust pushes, then orange engine opens during cooldown for retaliation.
These are proposed moves. Board shows boss facing left toward players; future reusable
production sheets can face right and be mirrored at runtime. Rotor, searchlight, nets,
engine glow and gust effects should be separate from helicopter hull animation.

End the chase at the Tower rooftop dock to connect the areas clearly.

## Tower

Working direction: Animal Control headquarters, a vertical descent from rooftop dock
to street-level escape. Cooler teal windows and violet masonry contrast with Airship;
shared brass machinery and amber lamps connect the settings. This theme is a proposal,
not a new requirement imposed on the user's unspecified Tower setting.

Suggested route: Rooftop Dock → Clockwork Shaft → Records & Holding → Ground Exit.
Alternate horizontal brawler floors with short descending elevator encounters. The
left-hand cutaway in the board illustrates route order, not a single runtime image.
Use safe side landings, readable down arrows and controlled drops; keep camera motion
predictable. The gears/cables in lift backgrounds must stay behind playable space.

New enemy ideas: lift mechanic with wrench; small rolling security orb. Shutters,
warning lights and brake switches provide environmental variety. Proposed finale:
Lift Warden controlling a grabber-arm rig at ground exit. This boss is optional and
unapproved; the user specified only the Airship's helicopter boss.

## Production handoff

1. Agree on maps and placement in overall campaign; only Airship → Tower order is
   specified. Preserve the Director's final-boss role unless the user changes it.
2. Claude can lay out placeholder maps and define the flying/lift modes, then generate
   measured background briefs. Do not assume panel counts or shop/nook positions yet.
3. Separate art needed: deck/hold/cloud backgrounds; hoverboard and its effects;
   aerial enemies; helicopter hull/rotor/tells; Tower floor/shaft backgrounds; lift,
   shutter and switch props; Tower enemies and optional boss.
4. Test one existing cat riding a placeholder board and slashing before committing to
   new cat sprite work. Test multiplayer separation and the largest/smallest cat poses.

Both concept originals are preserved byte-for-byte. Reviewed board contents and route
continuity. No in-game implementation or testing is claimed for this concept delivery.
