# Eight area-specific enemies

Two new normal enemy characters for each area, requested by the user. These are separate from
both the existing bosses and the small rushing enemies assigned to another agent.
All eight originals are in art/raw, facing right on magenta, with the standard five rows:
idle:2,walk:4,windup:2,swing:2,hurt:1. Total: 88 full-body frames.

| Area | File stem | Character | Proposed height | Proposed combat role |
|---|---|---|---|---|
| Streets | enemy-streets-sanitation | Heavyset Black woman, orange vest, bin-lid shield | 155 | Frontal blocker; clear draw-back then short shield bash |
| Streets | enemy-streets-parking | South Asian man, teal uniform, yellow wheel clamp | 140 | Low-reaching clamp attack; vulnerable after a miss |
| Castle | enemy-castle-kennelguard | Broad dark-skinned guard, burgundy gambeson, steel armor, catch-pole | 155 | Slow approach and long low thrust |
| Castle | enemy-castle-falconer | East Asian woman, green court tunic, oversized leather glove | 140 | Short quick lunge/grab; no bird companion required |
| Jungle | enemy-jungle-botanist | Latina field worker, mustard cargo trousers, backpack sprayer | 140 | Mid-range spray with visible pump-and-aim tell |
| Jungle | enemy-jungle-wrangler | Older white expedition worker, orange hat, capture rope | 145 | Long low rope reach, substantial recovery |
| Lab | enemy-lab-cryotech | Black woman, pale-blue insulated gear, coolant tank/nozzle | 140 | Telegraph freeze shot by turning valve; keep shot separate |
| Lab | enemy-lab-containment | Heavyset East Asian man, white/teal suit, rectangular shield | 160 | Durable frontal blocker with advancing shield shove |

Heights and combat roles are recommendations, not implemented behavior. Keep these below boss
scale; do not add every type to every street. A sparse pairing with an existing officer will make
new roles easier to learn. Enemy IDs above deliberately do not replace existing officer assets.

## Import and visual review

The detection/count-validation portion of current tools/cut_raw.py was run on each source,
without invoking its pack/write stage. Every sheet detects exactly [2,4,2,2,1] at default
settings, no hand-picked frames or detached props. Use --anchor feet because attack equipment
extends to the right. Proposed import pattern (run by integrator):

    python tools/cut_raw.py art/raw/enemy-streets-sanitation.png enemy-streets-sanitation --height 155 --anchor feet --rows idle:2,walk:4,windup:2,swing:2,hurt:1

Substitute the corresponding file, key and proposed height. Stand height includes helmet/hat;
weapons may affect bounding-box heights, especially the kennel guard. Verify actual body size
against existing officers after cutting rather than assuming bounding-box height equals body height.
The rope loop is visibly tethered and part of the sprite; it is not a separate projectile.
Sprayer and freeze effects are intentionally absent. The containment shield uses pale cyan fill,
not real transparency, so keying removes only the surrounding magenta.

Falconer second windup had an extra gauntlet in its first draft; corrected with image generation
before delivery. Idle pose differences are subtle. Some frames have smooth shaded detail inside
crisp outlines, matching the reference officers rather than a strict uniform pixel grid.
Review animation bounce, weapon reach, and hurt-frame orientation at final size in game.

## Integrity and scope

area-enemies-originals.json records original dimensions, SHA-256 hashes, generator filenames,
proposed heights and detected sprite boxes. All eight repository PNGs match final generator
outputs byte-for-byte. No cropping, regridding, resizing or pixel cleanup was applied afterward.
Visual review checked all five rows for count, equipment, complete feet, gaps and right-facing poses.
Detector checks and git diff --check pass. No runtime assets, code, maps or tools were edited for
this batch. Import, enemy behaviors, spawn placement, hitboxes and in-game testing remain with Claude.
