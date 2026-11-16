# Benji & Luna

A co-op beat 'em up / metroidvania about two cats and the Animal Control officers after them.
Early prototype: one alley, one officer type, claw attack only.

**Play:** https://ideaoforder.github.io/benji-and-luna/

## Controls

Press any button to join (up to 4 cats).

|            | Move          | Jump | Claw  | Swap cat    |
|------------|---------------|------|-------|-------------|
| Controller | Stick / d-pad | A    | X     | Y           |
| Keyboard 1 | A / D         | W    | F     | G           |
| Keyboard 2 | ← / →         | ↑    | Enter | Right Shift |
| Touch      | On-screen     | ▲    | 🐾    | —           |

- **Start over:** R, Esc, Start, or the ↻ button.
- **Show hitboxes:** H or Select. Green = cats, yellow = officers, orange = where a net is about to land, red = active strike.

## Run locally

No build step. Serve the folder and open it:

    ruby -run -e httpd . -p 8000
    open http://localhost:8000

ES modules need HTTP, so opening `index.html` straight from disk will not work.

## Layout

    index.html            page shell, touch buttons
    src/config.js         every tuning number: cat stats, officer timing, hitbox sizes
    src/input.js          keyboard, touch and gamepad, all reporting { x, jump, attack, swap }
    src/sound.js          placeholder synthesized blips
    src/scenes/alley.js   the room: players, officers, combat, HUD
    assets/               sprite sheets (generated, see below)
    art/concept-sheet.png source art
    tools/                sprite pipeline
    vendor/phaser.min.js  Phaser 4.2.1

## Sprite pipeline

`tools/build_sprites.sh` regenerates everything in `assets/` from `art/concept-sheet.png`
(needs python3 with pillow, numpy, scipy). `slice.py` finds each frame on the sheet;
`atlas.py` cuts the frames out, removes the background and packs them into 144x100 cells
(rows: idle, walk, run, jump, sit). The officer and slash art are drawn in code by `atlas.py`
as placeholders.

## Deploy

GitHub Pages serves the `main` branch root. Push to `main` and the live link updates in about a minute.
