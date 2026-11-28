# Benji & Luna

A co-op beat 'em up / metroidvania about two cats and the Animal Control officers after them.
Early prototype: four connected rooms, six Animal Control types, a boss, power-ups, combos, specials and tools. Characters have real art; scenery, icons and effects are placeholder.

**Play:** https://ideaoforder.github.io/benji-and-luna/

## Two versions

- **The game** is a brawler, River City style: you walk around a street in depth. https://ideaoforder.github.io/benji-and-luna/
- **The earlier platformer** is kept for reference: https://ideaoforder.github.io/benji-and-luna/?mode=platformer

The brawler won a side-by-side playtest. It has eight areas, each a chain of streets ending in a boss: the Streets (the Chief), the Castle (the Warden),
the Jungle (the Trapper), the Sakura Dojo (the Shadow Master), the Crystal Caverns (the Drill Captain), the
Antarctic Lab (the Director), the Airship (the Animal Control helicopter, at the end of the Cloud Chase) and the
Tower (the Commissioner, the final boss). `maps/areas.json` lists the areas and their streets.

- **The Airship**: Mooring Deck, Engine Hold (below deck), Upper Rigging, then the **Cloud Chase**: a side-scrolling
  flying part on hoverboards (`src/fly/scene.js`; course `maps/fly/chase.tmj` from `tools/fly_course.py`). Fly
  anywhere on the left of the screen, turning with the stick; jump or tool shoots yarn, attack claws up close (and claws nets out of the
  air), special is a meow that pops nearby nets. Rotor drones and balloon drones throw nets (a net also slows a cat),
  officers on boards line up and charge after a "!". A cat out of hearts tags its partner in, or drops away and flies
  back in three seconds later. The helicopter: searchlight (a lane lights up, then nets fly down it), a fan of nets,
  a rotor gust that pushes everyone back, and every third move its engine overheats and takes double damage.
  Beating it lands the cats on the Tower's roof. Numbers in `FLY` at the top of that file.
- **The Tower** (Animal Control headquarters, going down): Rooftop Dock, the Clockwork Shaft (a lift going down, the
  Mine Lift ridden the other way: map property `lift` = `down`), Records & Holding, and the Ground Exit, where the
  Commissioner waits at the controls of a grabber-arm rig.
On the title screen, left and right choose which area to start in (all four are open for now); starting over returns
to the start of the current area. Both share the cats, officers, combos, specials, tools and pick-ups (all the
data in `src/config.js`); only movement, hit detection and officer behaviour differ, and the brawler's live in
`src/brawl/`. In the brawler, up and down walk in depth and jump is its own button: A on a controller, Space for
keyboard 1, Enter for keyboard 2.

## Controls

The title screen is a little menu: up/down picks a line (**campaign**, **area**, **difficulty**, **mode**, **erase**),
left/right changes it. There are three **campaigns** (`src/save.js`), each with its own paws, purchases, upgrades,
challenges beaten and the area it reached (it carries on from there); an empty one is a fresh start, and "Erase"
(push twice) wipes the current one. Then
press any button to join (up to 4 players). Two modes (`src/team.js`; the mode is remembered in the browser):

- **Mode A, Tag Team:** each player picks two cats, a tag team as in Double Dragon Gaiden: left/right to browse, attack
  (or jump) to pick, special to undo. **Swap cat** flips between your two. Each cat has its own hearts; the one on the
  bench gets a heart back every 4 seconds; when your active cat is netted, the other tags in. Only when both are down
  do you sit out for a moment. Colours are fixed: P1 blue, P2 red, P3 green, P4 yellow.
- **Mode B, Crew:** pick one to five cats (attack adds, jump when done), then a **colour** (left/right; `PALETTES` in
  `src/config.js`: Classic, the four player colours, Tangerine, Bubblegum, Royal Purple, Sky Blue, Mint, Teal, Navy,
  Midnight, Snow, Gold and Rainbow). Your cats share one set of hearts (as many as the toughest of them has); swap cat
  steps through them; no tagging in.

The colours are painted in the browser: `tools/recolor.py` finds each cat's garment once and saves it as a mask
(`assets/<cat>-garment.png`), and `skin()` in `src/sprites.js` repaints it in any palette the first time it is needed.
Four actions: **jump, attack, special, tool**.

|            | Move          | Jump   | Attack     | Special | Tool | Swap cat    | Next tool    | Next special   |
|------------|---------------|--------|------------|---------|------|-------------|--------------|----------------|
| Controller | Stick / d-pad | bottom | left       | right   | top  | Select      | Select + top | Select + right |
| Keyboard 1 | W A S D       | Space  | F          | G       | H    | Q           | E            | T              |
| Keyboard 2 | Arrows        | Enter  | ,          | .       | /    | Right Shift | '            | ;              |
| Touch      | On-screen     | ⤴      | 🐾         | ★       | 🧶   | —           | —            | —              |

Controller buttons are given by position on the face, so they are right whatever letters are printed on the pad
(bottom is A on Xbox, B on Nintendo-style pads, ✕ on PlayStation).

- **Attack** chains into a combo if you keep pressing. Benji: three slow hits ending in a big shove.
  Luna: four quick hits ending in a launcher.
- **Attack in the air** is the tail somersault: no charge, once per jump, bounces off what it hits.
  You can be hit while spinning.
- **Special** recharges after each use. One equipped per player.
  - ♫ Meow (everyone starts with it): a wave that stuns and breaks wind-ups, no damage.
  - 💨 Pounce (dojo): a rolling dash through officers that launches them and cannot be hit.
- **Tool** has a fixed number of uses per room, refilled at each door. One equipped per player.
  - 🔥 Fire yarn (start, 4 per room): a fireball.
  - 🧊 Sticky yarn (Scrappy's, 2 per room): lobbed; freezes officers where it lands for 3 seconds.
  - 💗 Healing yarn (Scrappy's, 1 per room): +2 hearts to every cat nearby, and frees netted ones.
- Tools and specials belong to the player who bought them; each player picks among their own.
- Each player's row at the top shows hearts, the special and its charge, and the tool and uses left.
  A hit counter appears when the party lands three or more hits in a row.
- **Start over:** R, hold Start for a second, or tap ↻ twice.
- **On an iPad:** with a controller connected, the on-screen buttons hide and the keyboard is ignored.
  **Nothing is on the shoulder buttons or triggers**, because iPadOS takes L1, R1, L2 and R2 for itself and pulls
  the controller away from the page (measured with `input-test.html`). If one gets pressed anyway, the game shows
  "Tap the screen": the game freezes until then, and one tap gives the controller back and carries on.
  To stop it happening, remap the shoulder buttons for Safari: Settings > General > Game Controller > Customizations. On computers the shoulders also work as extras
  (L1 swap, R1 next tool, R2 next special).
- **Moves** (brawler; data in `MOVES` in `src/config.js`, unlocked ones in `state.moves`, all of them for now):
  dash (tap left or right twice; keep holding to run), dash attack (attack while dashing), ground pounce (down + attack next to
  an officer on the floor), power lunge (away, toward, attack). A hard enough launch leaves an officer on the floor for a moment.
- **Specials:** meow, and pounce from the dojo. `SPECIALS` in `src/config.js`.
- **Tools, specials and milk come only from the shops**; nobody starts with any (fire yarn and the meow are the cheap
  first buys). Hearts top out at 9 (`HEART_CAP`), and milk adds at most 3 in a run. Tools and specials belong to the player who bought them (P1, P2... by the order
  players joined; kept in the save per player). So are paws. Upgrades help everyone, whoever paid.
- **Pick-ups** (`POWERUPS` in `src/config.js`): fish (+2 hearts), catnip (frenzy), bell (shield), milk (+1 heart for everyone),
  golden paws, and two new ones. The **stinky fish** (brown, with smell lines) is one to avoid: eating it costs 2 hearts,
  except for Luca, who eats anything (`stinky: 0` on his entry in `CATS`). The **feather toy** floats every enemy on screen
  up into the air for a moment, helpless (bosses are only dazed); keep hitting them while they bob.
- **Cat beds and being caught:** when every cat is netted at once, the party is caught and goes back to the last **cat bed**
  it napped on (one in the street before each boss, and one halfway through the Streets), or to the start of the area if
  there was none. Rooms cleared and pick-ups taken since then are undone. A nap also fills everyone's hearts. Beds are
  `bed` objects in a street's `things` layer.
- **Pause:** Start (+) on a controller, P on a keyboard, or the pause button on a touch screen. While paused, hold Start or press R to start over.
- **Cats:** Benji (big, breaks heavy crates), Luca (steady, hard to knock back), Luna (small, fits into pens), Cricket (the biggest meow),
  Simon (the explorer: one more of every yarn per street).
- **No team gets stuck:** Benji smashes heavy-crate walls in one hit, but two power lunges or three fire yarns from anyone do it
  too; Luna can slip into a nook to pull its switch, but any cat can claw it through the bars from the nook's front, and
  a yarn ball thrown through the bars flips it as well.
  Select steps through them; all their numbers are `CATS` in `src/config.js`.
- **Player colours:** P1 wears blue, P2 red, P3 green, P4 yellow, whichever cat they are playing (`tools/recolor.py` makes the sheets).
- **Doors** open once a room's waves are cleared; walk into one and everyone goes through.
- **Show hitboxes:** ` (backquote). Everything is drawn on the floor, because that is where hits are decided: green = where a cat
  stands, yellow = an officer, orange = where a wound-up attack will land, red = an officer's attack, blue = a cat's.

## Animal Control

All six share one state machine and one sprite layout; the differences are data in `src/config.js`.

**How they play together** (brawler, `think`, `mayAttack` and `dodgeCheck` in `src/brawl/foe.js`): only a few officers wind up
at once and the rest hover just out of reach waiting their turn; each picks a cat (spreading out across the party, avoiding cats
that just got up, liking ones with their back turned) and takes the less crowded side of it; lighter officers sometimes sidestep
a claw combo or a yarn ball. **Difficulty** (title screen, up for harder, down for easier; remembered) sets how many attack at
once, wind-up and recovery times, speed, health, and how often they flank and dodge: `DIFFICULTY` in `src/config.js`.

| Type         | What it does                                              | How to beat it                                   |
|--------------|-----------------------------------------------------------|--------------------------------------------------|
| Uniform      | Winds up, then lunges with the net                        | Hit it during the wind-up (Benji) or dodge       |
| Punk         | Fast, short wind-up, jumps up to ledges after you         | Fragile: a couple of hits                        |
| Suit         | Blocks everything from the front with a briefcase         | Meow first, or get behind him                    |
| Body Builder | Ground slam that hits both sides; shrugs off light hits   | Jump the slam; only Benji or a meow staggers him |
| Preppy       | Keeps his distance and serves tennis balls                | Claw a ball to bat it back                       |
| Round        | Leaps and lands on you; hard to knock around              | Hit him while he recovers from a landing         |

The later areas add palette-swapped officers with their own numbers (`src/config.js`; sheets made from `art/variants.json`
by `tools/officer_variants.py`): the Castle has the Knight (a suit of armour: blocks from the front, sturdier) and the Jester
(a quicker punk); the Jungle has the Ranger (throws nets down your lane) and the Brute (a tougher Body Builder); the Lab has
the Yeti (a Round officer in white who leaps further) and the Scientist (serves fast and often).

**Area officers**, two per area, mixed into that area's waves (`maps/brawl/*.tmj`) alongside the familiar ones:

| Area | Officer | Trick |
|---|---|---|
| Streets | Sanitation Worker | bin-lid shield: blocks from the front, then a shield bash |
| Streets | Parking Warden | wheel clamp at ankle height (jump it), then a long, open recovery |
| Castle | Kennel Guard | slow and sturdy, a long low catch-pole thrust |
| Castle | Falconer | quick little lunge and grab |
| Jungle | Botanist | pumps her sprayer, then a short cloud down your lane |
| Jungle | Wrangler | long low rope throw (jump it), slow to reel back in |
| Lab | Cryo Tech | turns the valve, then a freeze shot that cannot be batted back |
| Lab | Containment Officer | riot shield: blocks from the front, very sturdy, shoves |

**Critters** are Animal Control's small gadgets and pets, one kind per area: the Wind-up Mouse (Streets), the Tin Knight
(Castle), the Horn Beetle (Jungle), the Snow Sweeper (Ice Field) and the Clamp Bot (the rest of the Lab). Each wave outside a
boss fight brings one (`CRITTERS` in `src/config.js`). They wind up, then charge along their lane at ankle height: **jump over
them**. Quick and fragile. Sheets in `art/raw/officer-<kind>.png`, frames picked in `tools/build_sprites.sh`.

Each type has two looks (a man and a woman, `officer-<type>` and `officer-<type>-female`); one is picked at random
when an officer walks in. Any sheet imported as `officer-<type>-<name>` joins the pool. The boss has one look.

## The boss

**The Chief** waits in the last room, The Pound. He cannot be knocked around or stun-locked, and cycles through four moves,
each with its own tell:

| Move    | What happens                                             | Answer                                    |
|---------|----------------------------------------------------------|-------------------------------------------|
| Sweep   | Lines up with a cat, then charges down that lane         | Step out of his lane, or jump it          |
| Nets    | Throws three nets, each down a cat's lane                | Step aside or jump. Claws bat them back   |
| Stomp   | Leaps at a cat; landing sends a ring across the floor    | Move, then jump the ring                  |
| Whistle | Backup walks in (at most two at a time)                  | Deal with them or keep on him             |

The other three bosses (`warden`, `trapper`, `director` in `src/config.js`) are the Chief's four moves with different habits and more
health, each with its own look: the Warden is a knight, the Trapper a hooded mystic whose nets are magic, and the Director an
ice robot. Their sheets come from ChatGPT as a 6x4 grid (`art/raw/boss-*.png`); `tools/ungrid.py` spaces the cells out
and `tools/build_sprites.sh` picks the frames. A `call` row, if a sheet has one, plays while the boss calls for backup.

A meow dazes him briefly, then he is immune to it for a few seconds. Below half health he speeds up.
His health scales with the number of players. All of it is the `chief` entry in `src/config.js`.

## Dialog

Everything the characters say is in **`story/dialog.txt`**, a plain text file meant to be filled in and rewritten (it
explains its own format at the top). Story sections (each area's opening, each boss walking in and being beaten, the
rides, the ending) pause the game and show a box with the speaker's picture, one line per button press, once per
campaign. Bark sections are a quick bubble over someone's head (shopkeepers, a cat tagging in, a nap, being caught,
officers arriving); one line is picked at random each time. Code: `src/dialog.js`, the box and bubbles in
`src/scenes/hud.js`.

## Golden paws and shops

Every officer drops a golden paw (bosses a pile, crates sometimes a few). **Each player has their own paws**, shown at
the right of their row: whoever picks a paw up keeps it, and a treasure chest pays every player. The buyer pays at a shop. Each area's first street has two doors in its back wall, open once the street is clear:

- **Scrappy's Tools** (Scrappy the Capy): fire yarn, sticky yarn, healing yarn, milk bottles (+1 heart for every cat this run, three at most), a bigger pouch (+1 of every yarn per street, twice),
  and a fish dinner (everyone back to full hearts).
- **Lucky Paw Dojo** (Master Maneki): the meow, pounce and focus training (specials recharge 20% faster, twice).

Walk up to the counter and push up: up/down choose, attack buys, jump leaves. Leaving a shop goes back to where you came in.
Stock and prices: `SHOPS` and `PAWS` in `src/config.js`; the counter is `src/brawl/shop.js`; the rooms are
`maps/brawl/scrappy.tmj` and `dojo.tmj`. Paws and purchases are **saved in the browser**, per campaign,
(`src/save.js`) and survive starting over; add `?newsave` to the address to wipe them. Nobody starts with a tool or a special. (The smelly-fish special was taken out; anyone who bought it got the 40 paws back.)

## Challenge rooms

Side rooms like the shops, behind a ★ door in a street's back wall (open once the street is clear). The way out is never
locked. Beating one drops a treasure chest: a pile of paws the first time (`CHEST` in `src/config.js`), a few after that.

- **Paw Plates** (Catnip Park): light every plate at once. A plate stays lit a few seconds after a cat steps off it
  (longer for fewer players), so one cat can dash round them all and a party can just stand on them.
- **Mine Lift** (Mine Entrance, Crystal Caverns): the lift climbs the shaft while officers drop in from above; clear the
  waves to reach the top.

- **Tower Climb** (Battlements, the Castle): a side-view climb up one-way ledges, with paws on the ledges and stones
  tumbling down (they knock cats about, never hurt). The camera follows the highest cat; anyone who drops off the bottom
  of the screen floats back up to the leader in a bubble (press jump to pop out early). Reaching the top pays the chest.
  Its own scene, `src/climb/scene.js`; levels are `maps/climb/<key>.tmj` (layer `solids`: ledges; layer `things`:
  `start`, `goal`, `pickup`), listed under `climbs` in `maps/areas.json`; a street door to one has target `climb:<key>`.
- **Mine Cart Ride** (Cart Tracks, Crystal Caverns): the whole party rides one cart that rolls on by itself. Left and
  right shuffle a cat along the cart, jump grabs high paws (the cart rolls on underneath), hold down to duck under low
  beams, and claw Drill Bots on the rails (or be in the air when one hits) and crystals (two paws each). A claw reaches
  past the front of the cart by the cat's own range (`claw.w`), so Benji reaches furthest. Bonks only make a cat dizzy;
  a ride with none pays a bonus on top of the chest. Its own scene, `src/cart/scene.js`; the course is
  `maps/cart/<key>.tmj`, written by `tools/cart_course.py` (sign, paw, crystal, beam, bot, ramp, goal along the track;
  edit the list there, or the map in Tiled), listed under `rides` in `maps/areas.json`; a door to one has target `cart:<key>`.

`src/brawl/challenge.js` has both; rooms are `maps/brawl/plates.tmj` and `lift.tmj` (property `challenge`, plates are map
objects of class `plate`), listed under `challenges` in `maps/areas.json`.

## Pick-ups

| Pick-up   | Effect                                                        | Where                                  |
|-----------|---------------------------------------------------------------|----------------------------------------|
| 🐟 Fish   | +2 hearts (the big bobbing fish in a room heals everyone)     | Dropped by officers                    |
| 🌿 Catnip | 8 seconds of double damage, faster attacks, faster running    | Dropped, and placed in maps            |
| 🔔 Bell   | Shield that absorbs the next hit; carries between rooms       | Dropped, and placed in maps            |
| 🥛 Milk   | +1 max heart for everyone, for the rest of the run            | Hidden in maps, once each              |
| 💨 🧊 💗  | Unlock the pounce special, sticky yarn, healing yarn          | Alley high ledge, yard arena, rooftops |

Everything here is data in `src/config.js`: `CATS` (combos, somersault, each cat's version of the specials),
`SPECIALS`, `TOOLS`, `POWERUPS`, `DROPS`.

## Streets

Streets are [Tiled](https://www.mapeditor.org/) maps in `maps/brawl/*.tmj`, made only of rectangle and point
objects, so they open, edit and save in Tiled with no tileset. To add one, add a map, list it under its area in
`maps/areas.json`, and point a door at it. In a map, x runs along the street and y is depth: the walkable floor is
y 345 (back wall) to 515 (front edge). A rectangle is a footprint on the floor.

Map properties: `title`, `theme` (the colours used until a street has art; the list is `THEMES` in `src/brawl/street.js`), `waves` (`suit, uniform; bodybuilder` is
two waves), `waveAt` (optional; how far along the street the cats must be before each wave arrives, for example
`0; 790`), `tough` (officers' health multiplier; 1.2 in the Castle, 1.4 in the Jungle, 1.6 in the Lab),
`slippery` (ice: cats slide), `final` (the last room of the game).

Layer `solids`, by object class:

| Class       | Meaning                                                                         |
|-------------|---------------------------------------------------------------------------------|
| `block`     | Solid box. Properties `tall` (height in px), `color` (`#rrggbb`)                |
| `crate`, `dumpster`, `hedge`, `bench`, `cabinet`, `vent`, `stall`, `van` | Solid props with their own look. Property `tall` |
| `breakable` | Heavy crates only Benji's claw or somersault breaks. Needs a `name`             |
| `gate`      | Barrier removed by a switch. Needs a `name`                                     |

Cats can jump onto anything in this layer except `breakable` and `gate` (the puzzle barriers), if they jump high enough:
`tall` is the height in px, and Benji clears about 62, Luca 72, Luna and Cricket 79 (more with their double jump).
A pick-up placed over a prop sits on top of it. Ordinary `crate`s break after two heavy hits (anything of Benji's,
anyone's power lunge) and sometimes drop a fish; a broken crate stays broken for the run.

`python3 tools/check_maps.py` checks every street for props that overlap, pick-ups that float, and places with no way
through. `python3 tools/level_brief.py` writes `art/levels/BRIEFS.md`, the art brief for every street, from the maps.

A `breakable` or `gate` that spans the full depth of the floor walls the street off; officers always arrive on
the cats' side of it.

Layer `things`, by object class:

| Class    | Meaning                                                                            |
|----------|------------------------------------------------------------------------------------|
| `start`  | Where cats appear when not arriving through a door                                 |
| `door`   | Rectangle at a street end. `name`, plus properties `target`, `targetDoor`, `label` |
|          | With property `side` = `back` it is a doorway in the back wall: stand in front, walk up |
| `pen`    | Rectangle against the back wall, fenced in. Only Luna fits; no swapping cats inside |
|          | Drawn as a wire fence, or with `prop-pen.png` (a front with a gap in it) if that exists |
| `switch` | Property `opens` = the gate's name. Walk onto it or claw it                        |
| `pickup` | Property `kind` (`fish`, `catnip`, `bell`, `milk`, `sticky`, `heal`, `pounce`). Give it a `name`; taken once per run |
| `sign`   | Property `text`                                                                    |

The alley has a side route: a door in its back wall leads into an apartment lobby, up to a corridor and back out
by the fire escape (maps `apartment` and `corridor`). Doors open once a street's waves are cleared. Health, the equipped tool and special, broken crates, opened gates
and taken pick-ups carry across; tool uses refill in each street. Restart goes back to the alley with everything reset.

The platformer's rooms are `maps/*.tmj` (list: `ROOMS` in `src/maps.js`); its classes are documented in the map
files' own structure and `src/scenes/room.js`.

### Level art

Streets are drawn with flat colours until pictures exist. `tools/import_scenery.py` imports whatever it finds in
`art/raw/` named `bg-<theme>-far|wall|floor.png` or `prop-<class>.png` (sizes in `art/TODO.md`), writes
`assets/scenery/` and lists them in `assets/scenery.json`; the game uses each picture that is listed and keeps
the flat colours for the rest, so art can land one picture at a time. A room that does not repeat (an interior)
can instead be one whole picture, `bg-<map name>-full.png`, or panels side by side (`-full-1`, `-full-2` ...).
Backdrops are saved as JPEG and each street's is fetched when the street is entered (and the last one released), so the
game starts quickly and stays small in memory. Props load once at the start; a prop named `prop-<street or theme>-<class>`
is used only there.
`art/raw/scenery.json` holds per-picture import options: `file` (use a differently named source), `floorY` (where the
wall/floor edge came out in the picture; it is scaled to land on y=345) and `mirror`. `--check` reports without writing.

## Sound

Every sound is an event in `src/sounds.js` (`claw`, `meow`, `foeHit`, `crateBreak`, `bossBeaten`... 46 of them) with a
short synthesised recipe, so the game is never silent. A recording replaces the recipe as soon as it exists:

    art/audio/sfx/claw.wav               replaces the claw for everyone
    art/audio/sfx/claw-2.wav             a second take; one is picked at random each time
    art/audio/sfx/meow.benji.wav         Benji's own meow (the other cats keep theirs)
    art/audio/music/streets.wav          the Streets' loop (tracks: title, streets, castle, jungle, lab, boss)

    python3 tools/build_audio.py         converts them into assets/audio/ and writes assets/audio/manifest.json
    python3 tools/build_audio.py --check lists what is recorded and what is still synth

Commit both `art/audio/` and `assets/audio/`. Music: WAV, cut to an exact number of bars with no tail over the end
(the whole file loops), mixed with headroom. Effects: any recording; leading silence is trimmed and loudness evened
out. `art/audio/README.md` is the shopping list. Each area plays its own track; the boss tune takes over when a
boss walks in (or the area's carries on if there is no boss tune); a beaten boss fades the music out under a fanfare.

**Volume:** pause, then up/down picks Music or Effects and left/right changes it (or tap the arrows). M mutes
anywhere. Settings are remembered in the browser. Sound starts on the first tap or key press: browsers do not allow
it before, and iPadOS does not count controller buttons, so on an iPad with a controller tap the screen once.

## Art

The cats and Animal Control are real art; scenery, icons and effects are placeholder. `art/TODO.md` lists what still needs drawing. `art/SPEC.md` says how to draw or generate a sheet that drops
straight in, and `tools/import_sheet.py` imports it:

    python3 tools/import_sheet.py art/officer-punk.png officer-punk --rows idle:1,walk:4,windup:2,swing:2,hurt:1

For image-generator output that is not on an exact grid, `tools/cut_raw.py` finds each sprite by its outline
instead; `art/TODO.md` lists what still needs drawing.

`tools/build_sprites.sh` rebuilds everything in `assets/`: the cats are cut from `art/raw/` (`cut_raw.py`),
as are the officers; the claw slash is a placeholder drawn in code (`slash.py`).
All of them write `assets/manifest.json`, which tells the game each sheet's cell size and rows.
Needs python3 with pillow, numpy, scipy.

Icons and effects (`art/icons.png`, `art/fx-*.png`) are cut by `tools/import_fx.py` into `assets/fx/` using the frame boxes in
`art/icons-effects-originals.json`; `src/fx.js` names the icons. Anything missing falls back to the shapes drawn in code.

`tools/export_reference.py` writes a labelled catalogue of the officer sheets to `art/reference/`.

Add `?res=1` to the address to draw at base resolution, for slow devices or automated tests.

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
    src/sound.js          plays effects (recording or synth) and music; volume settings
    src/sounds.js         the list of sound events and their synth recipes, and the music tracks
    src/brawl/            the brawler: scene (cats, combat, flow), foe (officers and the Chief), street (scenery, collisions, doors)
    src/maps.js           Tiled map parsing and the room list
    src/sprites.js        manifest-driven sheets and animations
    src/state.js          what survives a room change (party, cleared rooms, open gates)
    maps/brawl/           the streets
    maps/                 the platformer's rooms
    assets/               generated sprite sheets and manifest
    art/                  source art and the art spec
    tools/                sprite and audio pipeline
    vendor/phaser.min.js  Phaser 4.2.1

## Deploy

GitHub Pages serves the `main` branch root. Push to `main` and the live link updates in about a minute.
