#!/usr/bin/env bash
# Rebuild assets/*.png from the concept sheet. Needs python3 with pillow, numpy, scipy.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p tools/work
python3 tools/slice.py art/concept-sheet.png   # find frame boxes -> tools/work/boxes.json (+ debug images)
python3 tools/atlas.py art/concept-sheet.png   # cut, matte and pack the cats -> assets/
python3 tools/officers.py                      # placeholder officers -> assets/
echo "wrote assets/ (see assets/manifest.json and tools/work/preview.png)"
