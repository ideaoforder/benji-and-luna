# Female enemy variants

Seven additional appearances, not replacements for the male source sheets.
All are raw 1024x1536 PNG originals with no post-generation cropping, scaling or cleanup.
Each passed default `cut_raw.py` detection for 11 frames across five rows:
`idle:2,walk:4,windup:2,swing:2,hurt:1`.

| Raw sheet | Suggested import key | Standing height | Background |
|---|---|---:|---|
| `art/raw/officer-uniform-female.png` | `officer-uniform-female` | 140 | Magenta |
| `art/raw/officer-punk-female.png` | `officer-punk-female` | 140 | Magenta |
| `art/raw/officer-suit-female.png` | `officer-suit-female` | 140 | Magenta |
| `art/raw/officer-preppy-female.png` | `officer-preppy-female` | 140 | Green |
| `art/raw/officer-bodybuilder-female.png` | `officer-bodybuilder-female` | 165 | Magenta |
| `art/raw/officer-round-female.png` | `officer-round-female` | 140 | Magenta |
| `art/raw/officer-chief-female.png` | `officer-chief-female` | 200 | Magenta |

Example import for Claude (not run as part of the art delivery):

```sh
python3 tools/cut_raw.py art/raw/officer-uniform-female.png officer-uniform-female \
  --height 140 --rows idle:2,walk:4,windup:2,swing:2,hurt:1
```

Use distinct texture/animation keys, while retaining the base enemy type for combat behavior,
health, hitboxes, weapon timing and rewards. Choose an appearance once per spawned actor,
not every frame or animation transition. No variant selection code or runtime assets were changed.

Suit retains its briefcase shield in idle/walk; Preppy serves with no separate ball;
Body Builder retains its broad strongwoman build and ground slam; Round retains its wide belly
and airborne attack; Chief retains its older commanding appearance and coat/net silhouette.
The seven women retain varied complexions, hair and facial features.

Review with actual game rendering: standing scale relative to male counterparts, hair clearance,
consistent grounded feet, weapon origins, alpha edges, animation loops and attack readability.
Cutter validation confirms frame separation/counts, not final in-game animation quality.
Chief extra whistle/throw/leap rows remain outside this delivery.
