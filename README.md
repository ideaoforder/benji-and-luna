# Benji & Luna

A co-op beat 'em up / metroidvania about two cats and the Animal Control officers after them.
Early prototype: four connected rooms, six Animal Control types, a boss, power-ups, three attacks. Art is placeholder.

**Play:** https://ideaoforder.github.io/benji-and-luna/

## Controls

Press any button to join (up to 4 cats).

|            | Move          | Jump | Claw       | Meow | Somersault | Swap cat    |
|------------|---------------|------|------------|------|------------|-------------|
| Controller | Stick / d-pad | A    | X          | B    | Y          | LB / RB     |
| Keyboard 1 | A / D         | W    | F          | G    | H          | Q           |
| Keyboard 2 | ← / →         | ↑    | , or Enter | .    | /          | Right Shift |
| Touch      | On-screen     | ▲    | 🐾         | ♫    | ⟳          | —           |

- **Claw:** the basic hit. Benji's is slow and heavy; Luna's is quick and light.
- **Meow:** a wave that stuns officers and breaks a wind-up, no damage. Benji's shoves them back; Luna's holds them longer. Recharges after each use.
- **Tail somersault:** a rolling dash that passes through officers, launches them, and cannot be hit. Recharges too, faster than meow.
- The two small bars beside each player's hearts are the meow (♪) and somersault (⟳) charge: lit when ready.

- **Start over:** R, Esc, Start, or the ↻ button.
- **Doors** open once a room's waves are cleared; walk into one and everyone goes through.
- **Show hitboxes:** ` (backquote) or Select. Green = cats, yellow = officers, orange = where a net is about to land, red = active strike.

## Animal Control

All six share one state machine and one sprite layout; the differences are data in `src/config.js`.

| Type         | What it does                                              | How to beat it                                   |
|--------------|-----------------------------------------------------------|--------------------------------------------------|
| Uniform      | Winds up, then lunges with the net                        | Hit it during the wind-up (Benji) or dodge       |
| Punk         | Fast, short wind-up, jumps up to ledges after you         | Fragile: a couple of hits                        |
| Suit         | Blocks everything from the front with a briefcase         | Meow first, or somersault behind him             |
| Body Builder | Ground slam that hits both sides; shrugs off light hits   | Jump the slam; only Benji or a meow staggers him |
| Preppy       | Keeps his distance and serves tennis balls                | Claw a ball to bat it back                       |
| Round        | Leaps and lands on you; hard to knock around              | Hit him while he recovers from a landing         |

## The boss

**The Chief** waits in the last room, The Pound. He cannot be knocked around or stun-locked, and cycles through four moves,
each with its own tell:

| Move    | What happens                                             | Answer                                   |
|---------|----------------------------------------------------------|------------------------------------------|
| Sweep   | A long charge with the net out                           | Jump it or somersault through            |
| Nets    | Three thrown nets: low, high, low                        | Jump, stay down, jump. Or claw them back |
| Stomp   | Leaps at you; landing sends shockwaves along the ground  | Move, then jump the wave                 |
| Whistle | Calls in backup (at most two at a time)                  | Deal with them or keep on him            |

A meow dazes him briefly, then he is immune to it for a few seconds. Below half health he speeds up.
His health scales with the number of players. All of it is the `chief` entry in `src/config.js`.

## Power-ups

| Pick-up   | Effect                                                        | Where                                  |
|-----------|---------------------------------------------------------------|----------------------------------------|
| 🐟 Fish   | +2 hearts (the big bobbing fish in a room heals everyone)     | Dropped by officers                    |
| 🌿 Catnip | 8 seconds of double claw damage, faster claws, faster running | Dropped, and placed in maps            |
| 🧶 Yarn   | Shield that absorbs the next hit; carries between rooms       | Dropped, and placed in maps            |
| 🥛 Milk   | +1 max heart for everyone, for the rest of the run            | Hidden in maps, once each              |

Drop chances and effect numbers are `DROPS` and `POWERUPS` in `src/config.js`.

## Rooms

Rooms are [Tiled](https://www.mapeditor.org/) maps in `maps/*.tmj`, made only of rectangle and point
objects, so they open, edit and save in Tiled with no tileset. To add a room, add a map, list it in
`ROOMS` in `src/maps.js`, and point a door at it.

Map properties: `title`, `theme` (`alley`, `yard`, `roof`), `waves` (for example
`suit, uniform; bodybuilder` is two waves), `final`.

Layer `solids`, by object class:

| Class       | Meaning                                                                    |
|-------------|----------------------------------------------------------------------------|
| `ground`    | The floor                                                                  |
| `block`     | Solid wall or box. Property `color` (`#rrggbb`)                            |
| `ledge`     | One-way platform you can jump up through                                   |
| `crate`, `dumpster` | Solid props with their own look                                    |
| `breakable` | Heavy crates only Benji's claw or somersault breaks. Needs a `name`        |
| `gate`      | Barrier removed by a switch. Needs a `name`                                |

Layer `things`, by object class:

| Class    | Meaning                                                                       |
|----------|-------------------------------------------------------------------------------|
| `start`  | Where cats appear when not arriving through a door                            |
| `door`   | Rectangle. `name`, plus properties `target` (room), `targetDoor`, `label`     |
| `spawn`  | Where officers drop in. Optional property `wave` (1-based) limits it to one wave |
| `switch` | Property `opens` = the gate's name. Touch or claw it                          |
| `fish`   | Heals everyone, comes back after 15 seconds                                   |
| `sign`   | Property `text`                                                               |
| `powerup`| Property `kind` (`fish`, `catnip`, `yarn`, `milk`). Give it a `name`; taken once per run |

A gap 52 px high is a Luna-only crawlspace: she fits, Benji does not.

## Art

Everything on screen is placeholder. `art/SPEC.md` says how to draw or generate a sheet that drops
straight in, and `tools/import_sheet.py` imports it:

    python3 tools/import_sheet.py art/officer-punk.png officer-punk --rows idle:1,walk:4,windup:2,swing:2,hurt:1

`tools/build_sprites.sh` regenerates the current placeholders: the cats are cut from
`art/concept-sheet.png` (`slice.py`, `atlas.py`) and the officers are drawn in code (`officers.py`).
All of them write `assets/manifest.json`, which tells the game each sheet's cell size and rows.
Needs python3 with pillow, numpy, scipy.

## Run locally

No build step. Serve the folder and open it:

    ruby -run -e httpd . -p 8000
    open http://localhost:8000

ES modules need HTTP, so opening `index.html` straight from disk will not work.

## Layout

    index.html            page shell, touch buttons
    src/config.js         every tuning number: cats, officer types, hitboxes, render scale
    src/input.js          keyboard, touch and gamepad, all reporting the same shape
    src/officer.js        the Officer state machine shared by all six types
    src/scenes/boot.js    loads manifest, sheets and maps
    src/scenes/room.js    one room: players, combat, waves, doors, scenery
    src/scenes/hud.js     hearts, score, banners, title screen
    src/maps.js           Tiled map parsing and the room list
    src/sprites.js        manifest-driven sheets and animations
    src/state.js          what survives a room change (party, cleared rooms, open gates)
    maps/                 rooms
    assets/               generated sprite sheets and manifest
    art/                  source art and the art spec
    tools/                sprite pipeline
    vendor/phaser.min.js  Phaser 4.2.1

## Deploy

GitHub Pages serves the `main` branch root. Push to `main` and the live link updates in about a minute.
