# Selected icons: A / soft emoji

User selected A on 2026-11-23. `art/icons.png` is now the production version of
`art/raw/concept-icons-a-soft-emoji.png`: glossy emoji volume, plush yarn and candy hearts.
Untouched generator original, 2172×724, one row of 12 icons on flat magenta.

Updated only the icon entry in `art/icons-effects-originals.json`: key RGB, measured
exclusive xyxy bounds, source dimensions, SHA-256 and generator filename. All effects
entries are unchanged. The prior icon sheet is preserved byte-for-byte as
`art/raw/icons-original-pixel.png`, with `art/icons-original-pixel-manifest.json`.

Order remains fish, catnip, bell, milk, fire yarn, sticky yarn, healing yarn, meow note,
pounce paw, full heart, empty heart, fish skeleton. Main at e202261 retires the fish
skeleton special; its last slot is retained for index compatibility, not reactivation.

Claude: merge this art update and run the existing `python tools/import_fx.py`.
It reads the updated key and bounds and packs the icons into 64px cells displayed at32px.
No code or map changes are needed for the artwork selection. The existing importer
scales each icon individually; both hearts resolve to approximately30×27px on screen.
Check the icons at32px in the HUD and shop interfaces after import, particularly the
pink yarn’s heart and the milk bottle. Runtime import and visual review are pending.

Validation: found exactly12 separated icon groups with complete silhouettes; measured
all bounds; exercised the existing importer’s keying in memory and verified the empty
heart centre becomes transparent. Confirmed new PNG matches generator output exactly,
and retained the old PNG with its original hash. No runtime assets, source, maps or
tools changed. No crop, resize or cleanup was applied to the delivered original.
