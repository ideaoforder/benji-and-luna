#!/usr/bin/env bash
# Rebuild everything in assets/ from source art. Needs python3 with pillow, numpy, scipy.
set -euo pipefail
cd "$(dirname "$0")/.."
CAT_ROWS=idle:4,walk:6,run:6,jump:4,sit:2
# Benji and Luna, second drawing (one sheet each, magenta background; --despill takes the pink cast off the whites).
# The first drawings are still in art/raw (luna.png, benji-1.png, benji-2.png) if they are ever wanted back.
python3 tools/cut_raw.py art/raw/luna-v2.png luna --height 70 --despill 0.8 \
  --rows $CAT_ROWS,claw:4,meow:2,tool:2,roll:1,hurt:1
python3 tools/cut_raw.py art/raw/benji-v2.png benji --height 92 --despill 0.8 \
  --rows $CAT_ROWS,claw:3,meow:2,tool:2,roll:1+hurt:1
# Luca, Simon and Cricket, second drawing (old raws kept: luca.png, simon-atlas.png, cricket.png).
# Simon's run frames nearly touch, so --join 1 keeps them apart.
python3 tools/cut_raw.py art/raw/luca-v2.png luca --height 81 --despill 0.8 \
  --rows $CAT_ROWS,claw:3,meow:2,tool:2,roll:1,hurt:1
python3 tools/cut_raw.py art/raw/simon-v2.png simon --height 80 --despill 0.8 --join 1 \
  --rows $CAT_ROWS,claw:3,meow:2,tool:2,roll:1,hurt:1
python3 tools/cut_raw.py art/raw/cricket-v2.png cricket --height 76 --despill 0.8 \
  --rows $CAT_ROWS,claw:3,meow:2,tool:2,roll:1,hurt:1
OFFICER_ROWS=idle:2,walk:4,windup:2,swing:2,hurt:1
# Animal Control. --tolerance 170 also clears the background showing through a net's mesh.
# name:height. Heights are final on-screen sizes; each officer's scale in src/config.js is 1.
for spec in uniform:140 punk:140 suit:140 preppy:140 round:140 bodybuilder:165 chief:200; do
  python3 tools/cut_raw.py art/raw/officer-${spec%%:*}.png officer-${spec%%:*} --height ${spec##*:} \
    --anchor feet --tolerance 170 --rows $OFFICER_ROWS
done
# Second appearance for each type except the boss. Same rows and heights; the game picks one per officer.
for spec in uniform:140 punk:140 suit:140 preppy:140 round:140 bodybuilder:165; do
  python3 tools/cut_raw.py art/raw/officer-${spec%%:*}-female.png officer-${spec%%:*}-female --height ${spec##*:} \
    --anchor feet --tolerance 170 --rows $OFFICER_ROWS
done
# The other bosses: ChatGPT sheets drawn as a 6x4 grid of boxed cells. ungrid.py spaces the cells out on a clean
# background; frames are then picked by row and position (a "call" row is shown while calling for backup).
mkdir -p tools/work
for b in warden trapper director; do python3 tools/ungrid.py art/raw/boss-$b.png 6x4 tools/work/boss-$b-spaced.png; done
# The knight is drawn facing left (his one right-facing thrust frame is left out).
python3 tools/cut_raw.py tools/work/boss-warden-spaced.png officer-warden --height 190 --anchor feet --mirror \
  --pick "idle=1:1-4,walk=1:5-6+2:1-2,windup=2:3-4,swing=2:5,hurt=3:5,call=3:2-3"
python3 tools/cut_raw.py tools/work/boss-trapper-spaced.png officer-trapper --height 185 --anchor feet \
  --pick "idle=1:1-4,walk=1:5-6+2:1-2,windup=2:4-5,swing=2:6+2:6,hurt=3:5,call=3:2-4"
python3 tools/cut_raw.py tools/work/boss-director-spaced.png officer-director --height 195 --anchor feet \
  --pick "idle=1:1-4,walk=1:5-6+2:1-2,windup=2:3-4,swing=2:5-6,hurt=4:1,call=3:2-3"
# Critters (small enemies, one kind per area). Frames picked by row and position.
python3 tools/cut_raw.py art/raw/officer-mouse.png officer-mouse --height 46 --anchor feet \
  --pick "idle=1:1-2,walk=2:1-2+3:1-2,windup=4:1,swing=4:2,hurt=5:1"
python3 tools/cut_raw.py art/raw/officer-tinknight.png officer-tinknight --height 70 --anchor feet \
  --pick "idle=1:1-2,walk=1:1-2+2:1,windup=2:2+3:1,swing=3:2-4,hurt=4:1"
python3 tools/cut_raw.py art/raw/officer-beetle.png officer-beetle --height 52 --anchor feet \
  --pick "idle=1:1-2,walk=2:1-2,windup=3:1-2,swing=4:1-4,hurt=5:1"
python3 tools/cut_raw.py art/raw/officer-sweeper.png officer-sweeper --height 60 --anchor feet \
  --pick "idle=1:1-2,walk=1:1-2+2:1,windup=2:2+3:1-2,swing=3:3-4,hurt=5:1"
python3 tools/cut_raw.py art/raw/officer-clampbot.png officer-clampbot --height 60 --anchor feet \
  --pick "idle=1:1-2,walk=1:1-2+2:1,windup=2:2+3:1-2,swing=3:3-4,hurt=5:1"
# Area enemies (two per area, ChatGPT): art/raw/enemy-<area>-<who>.png -> officer-<who>
for spec in streets-sanitation:155 streets-parking:140 castle-kennelguard:155 castle-falconer:140 \
            jungle-botanist:140 jungle-wrangler:145 lab-cryotech:140 lab-containment:160; do
  src=${spec%%:*}; who=${src#*-}
  python3 tools/cut_raw.py art/raw/enemy-$src.png officer-$who --height ${spec##*:} --anchor feet --rows $OFFICER_ROWS
done
# Sakura Dojo and Crystal Caverns (ChatGPT, art/levels/sakura-caverns-delivery.md)
for spec in sakura-dojoguard:150 sakura-ninja:135 caverns-miner:145; do
  src=${spec%%:*}; who=${src#*-}
  python3 tools/cut_raw.py art/raw/enemy-$src.png officer-$who --height ${spec##*:} --anchor feet --rows $OFFICER_ROWS
done
for spec in sakura-daruma caverns-drillbot; do
  python3 tools/cut_raw.py art/raw/critter-$spec.png officer-${spec#*-} --height 60 --anchor feet --rows idle:2,walk:2,windup:2,swing:2,hurt:1
done
for who in shadowmaster drillcaptain; do
  python3 tools/cut_raw.py art/raw/boss-$who.png officer-$who --height 200 --anchor feet --rows idle:4,walk:4,windup:2,swing:2,hurt:1,call:2
done

python3 tools/officer_variants.py   # palette-swapped officers for the later areas (art/variants.json)
python3 tools/placeholder_cats.py   # stand-ins for cats whose art has not arrived (Luca, Cricket)
python3 tools/recolor.py     # each cat's garment mask: the game repaints it in the player's colour
python3 tools/fishbone.py     # the smelly fish (placeholder drawn in code)
python3 tools/slash.py        # placeholder claw slash
echo "wrote assets/ (see assets/manifest.json)"
