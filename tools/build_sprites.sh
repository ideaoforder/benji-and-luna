#!/usr/bin/env bash
# Rebuild everything in assets/ from source art. Needs python3 with pillow, numpy, scipy.
set -euo pipefail
cd "$(dirname "$0")/.."
CAT_ROWS=idle:4,walk:6,run:6,jump:4,sit:2
# Luna's walk, run, jump and sit rows were generated smaller than her idle; --row-scale evens them out.
python3 tools/cut_raw.py art/raw/luna.png luna --height 70 --min-size 0.5 \
  --row-scale walk:1.16,run:1.27,jump:1.15,sit:1.14 \
  --rows $CAT_ROWS,claw:4,meow:2,tool:2,roll:1,hurt:1
python3 tools/cut_raw.py art/raw/benji-1.png art/raw/benji-2.png benji --height 92 \
  --row-scale walk:1.06,run:1.12 \
  --rows $CAT_ROWS,claw:3,meow:2,tool:2,roll:1,hurt:1
# Luca: one sheet; the meow and tool frames share a drawn row. --join 2 keeps closely packed rows apart.
python3 tools/cut_raw.py art/raw/luca.png luca --join 2 --height 81 \
  --rows $CAT_ROWS,claw:4,meow:2+tool:2,roll:1,hurt:1
# Cricket: the sheet has spare frames and speed lines, so frames are chosen by row and position and the lines dropped.
python3 tools/cut_raw.py art/raw/cricket.png cricket --largest --height 76 \
  --pick "idle=1:1-8,walk=2:1-8,run=3:1-8,jump=4:2,3,5,6,sit=7:2,3,claw=5:3-6,meow=6:3,4,tool=8:3,4,roll=7:6,hurt=8:5"
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
python3 tools/officer_variants.py   # palette-swapped officers for the later areas (art/variants.json)
python3 tools/placeholder_cats.py   # stand-ins for cats whose art has not arrived (Luca, Cricket)
python3 tools/recolor.py     # player-colour versions of the cats (P1 blue, P2 red, P3 green, P4 yellow)
python3 tools/fishbone.py     # the smelly fish (placeholder drawn in code)
python3 tools/slash.py        # placeholder claw slash
echo "wrote assets/ (see assets/manifest.json)"
