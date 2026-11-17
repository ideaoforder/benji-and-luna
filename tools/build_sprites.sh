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
python3 tools/officers.py     # placeholder officers, drawn in code
python3 tools/slash.py        # placeholder claw slash
echo "wrote assets/ (see assets/manifest.json)"
