# Sounds and music to record

Drop files here and run `python3 tools/build_audio.py`. Names are the event names in `src/sounds.js`; anything not
recorded keeps its synth beep. Run `python3 tools/build_audio.py --check` for the up-to-date list.

## Effects (`sfx/`)

Most wanted, roughly in order:

| File(s)                                   | When it plays                                              |
|-------------------------------------------|------------------------------------------------------------|
| `meow.benji`, `meow.luna`, `meow.luca`, `meow.cricket` | each cat's meow special. Record the real cats!   |
| `claw` (a few takes: `claw-1`, `claw-2`)  | each claw swipe; `clawFinish` is the last hit of a combo    |
| `foeHit`, `foeHitHeavy`                   | an officer takes a hit (light / heavy)                     |
| `catHurt`, `catNetted`                    | a cat takes a hit / is netted (a short sad sting)          |
| `jump`, `dash`, `spin`, `pounce`          | moving: jump, double-tap dash, tail somersault, pounce     |
| `crateHit`, `crateBreak`                  | Benji's crates                                              |
| `pickup`, `streetClear`, `bossBeaten`     | a pick-up, all waves beaten, a boss down (a short fanfare) |
| `whistle`, `bossLand`, `netThrow`         | the bosses                                                 |

Short and dry is best: no long reverb tails. Up to a second for most; `bossBeaten` and `catNetted` can be longer.
Phone recordings are fine; the script trims the silence at the start and evens out the loudness.

## Music (`music/`)

`title`, `streets`, `castle`, `jungle`, `sakura`, `caverns`, `lab`, `boss`, and optionally `shop` (until there is one,
the area's tune keeps playing in the shops). One per area; the name is the area's key in `maps/areas.json`.

- WAV, 44.1 kHz, 16-bit, stereo.
- Cut to an exact number of bars with no reverb tail over the end: the whole file loops. 60 to 90 seconds is plenty.
- Leave headroom; don't master it loud, the effects sit on top.
