# Simon — Benji & Luna raw and extracted sprites

- `simon.png`: **untouched generated raw sheet**, as required by `art/TODO.md`.
- `simon_atlas.png`: transparent 6-column, 10-row sprite atlas (144 × 112 px per cell).
- `simon.json`: atlas animation rows and counts.
- `<animation>_<frame>.png`: individual transparent PNG frames.

Simon wears a blue explorer vest. The vest should be recolored by the game for player selection.

To place the original generated sheet in the game repository, copy `simon.png` to `art/raw/simon.png`.
Then cut with the project's existing tooling (the game must also be configured to recognize the new cat):

```bash
python3 tools/cut_raw.py art/raw/simon.png simon --height 80 \
  --rows idle:4,walk:6,run:6,jump:4,sit:2,claw:3,meow:2,tool:2,roll:1,hurt:1
```

Note: this archive is a graphics handoff, not a GitHub commit or a fully integrated, playtested character.
