# Mine Cart Ride artwork — section 8

Four untouched generator originals in `art/raw/`, matching the Cart Tracks timber,
purple iron and cyan/purple crystal palette. Flat green key backgrounds, complete
silhouettes, no ground shadows or scenery. No cats, cargo or wheels baked into the body.
The originals exceed the requested 4x resolution; downsample during import.

| File | Source canvas | Suggested display after key/crop |
|---|---|---|
| `cart-mine.png` | 2172×724 | 200×52 (brief approximately200×50) |
| `cart-wheel.png` | 1536×1024 | 30×30, reused twice |
| `prop-cart-beam.png` | 1254×1254 | 120×94 including chains; beam itself approximately120×38 |
| `prop-cart-crystal.png` | 1340×1174 | 64×59 (brief approximately64×56) |

`cart-ride-originals.json` contains measured exclusive xyxy bounds, key colours,
source sizes and SHA-256 hashes tied to the generator originals. Sizes there use
uniform width scaling; the wheel is approximately30×31 under uniform scaling, so
normalize its crop to30×30 for rotation. Its measured silhouette is865×882 source pixels.

## Cart and wheels

The cart is a side-view front body with three horizontal timber courses, iron lip
and end straps. Its central region is plain enough for horizontal stretching.
For multiplayer, prefer fixed ends and a stretched centre: optional source split
positions x400 and1770, within the body bounds x75..2097. These are integration
suggestions, not pre-cut assets. Keep original files intact.

The wheel is one six-spoke side-view sprite; instantiate twice and rotate around
its axle at approximately source(768,512). The cropped pivot is approximately
(0.501,0.500). Preserve green spoke holes as transparency. The existing stand-in
wheel is about30px including its stroke, so30px is the suggested diameter.

The body supplies the visible front lip; keep the scene's existing back-layer
arrangement behind riders. Check seated/ducking cats and wheel overlap with the
new52px body, rather than moving gameplay collision to fit paint. No rider or
interior background is baked into the sprite.

## Beam and crystal

The beam’s full source bounds are(199,277)..(1055,948). Its timber section starts
approximatelyy678; at120px width that is about38px of timber plus56px of chains.
Anchor the LOWER hazard-striped edge to the existing `BEAM_LOW` threshold. Do not
scale the whole chain-inclusive sprite to40px tall. Chains and all their link holes
are included; their tops have clean margins. Extend chains separately if needed to
reach the roof. No collision or course difficulty changes are part of this delivery.

The crystal cluster is one connected rock and crystal object. Bright facets suggest
glow; retain the scene’s separate animated glow behind it. No halo or detached sparkles
are baked into the source. Anchor at the bottom centre of the rock.

## Integration and validation

Claude owns import and runtime replacement. These names are for the cart scene;
the generic scenery importer does not know cart beam/crystal classes. Key/crop and
load them through the cart scene's asset pipeline, preserving crystal cyan by keying
by proximity to green rather than removing all pixels with a green channel.

Checked complete silhouettes, dimensions, green gutters, wheel/chain holes and
byte-for-byte matches with generator originals. `git diff --check` passes.
No post-generation image editing, rescaling or cropping was applied to delivered PNGs.
No runtime files were changed by the art commit; the preceding merge brings main's
course groundwork into this branch. In-game checks of wheel rotation, cat visibility,
beam clearance and crystal readability are still pending.
