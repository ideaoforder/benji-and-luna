# Environment production order

Reviewed against main `2cd5d46` and its generated `BRIEFS.md`.

1. **Streets: art delivered and integrated on main.** All ten maps have scenery, including
   Apartment Lobby and Third Floor. Any further work here should respond to observed in-game
   seam, landing-surface or placement issues, not regenerate delivered backgrounds.
2. **Castle: seven panels.** Castle Gate (2), Great Hall (2), Battlements (2), Throne Room (1).
   Establish the stone, torchlight and banner palette at Castle Gate, then carry it through the interiors.
3. **Jungle: seven panels.** Riverbank (2), Rope Bridges (2), Lost Ruins (2), Sunken Temple (1).
   Establish daylight foliage first, then canopy height, overgrown stone and torch-lit interior.
4. **Antarctic Lab: seven panels.** Ice Field (2), Loading Bay (2), Research Floor (2), Core (1).
   Establish aurora and ice first, then frosted utility architecture and cyan laboratory machinery.

This leaves **21 background panels**, plus any area-specific props needed to replace plain blocks.
Use the current generated brief and maps at the start of each batch; counts and coordinates may change.
Preserve original PNGs, report measured floor edges, and keep combat floors clear.

## Streets status clarification

The generated brief's generic prop table still labels cabinet, stall, van and vent as needed.
Their delivered sources are scoped names: `prop-corridor-cabinet.png`, `prop-market-stall.png`,
`prop-depot-van.png`, `prop-roof-vent.png`. Main's importer supports these names and the maps
already use cabinet, stall, van and vent classes. Do not generate duplicate generic versions.

## Boss sheets

The Warden, Trapper and Director briefs are in `art/TODO.md`. They remain a separate character-art
batch; this thread's immediate order is environments. Existing tinted-Chief stand-ins let the new
areas be reviewed before boss art is ready. No boss sheet is marked delivered by this plan.

## Verification at planning time

`python tools/check_maps.py` passes all 22 current maps. This checks map geometry, not visual seams
or the alignment of painted prop tops with jumping. Streets delivery measurements and integration
caveats remain documented in `streets-delivery.md`.
