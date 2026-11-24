#!/usr/bin/env python3
"""Turn the recordings in art/audio/ into web audio in assets/audio/, and list them in assets/audio/manifest.json.

    art/audio/sfx/<event>.wav            replaces that event's synth sound (events: SFX in src/sounds.js)
    art/audio/sfx/<event>-2.wav ...      more takes of the same event; one is picked at random each time
    art/audio/sfx/<event>.<cat>.wav      one cat's own version, e.g. meow.benji.wav, meow-2.benji.wav
    art/audio/music/<track>.wav          a loop (tracks: TRACKS in src/sounds.js, e.g. streets.wav, boss.wav)
    art/audio/music/<area>-boss.wav      that area's boss tune (else boss.wav); same length as the area's loop and it
                                         takes over at the same point in the bar, so it can be a heavier mix of it

Any format ffmpeg reads works (wav, aif, flac, mp3, m4a, ogg). WAV is best: the loop length is measured from it.
Music loops must be cut to an exact number of bars with no tail hanging over the end; the game loops the whole file.
Effects are trimmed of silence at the start, made mono and evened out in loudness, so a phone recording is fine.

    python3 tools/build_audio.py            build anything new or changed
    python3 tools/build_audio.py --all      rebuild everything
    python3 tools/build_audio.py --check    list what is there and what is still synth, build nothing
Needs ffmpeg and ffprobe.
"""
import argparse, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'art/audio', ROOT / 'assets/audio'
AUDIO = {'.wav', '.aif', '.aiff', '.flac', '.mp3', '.m4a', '.ogg', '.opus', '.caf'}


def table():
    """Event and track names, read out of src/sounds.js so the two never disagree."""
    js = (ROOT / 'src/sounds.js').read_text()
    body = js[js.index('export const SFX = {'):js.index('export const TRACKS')]
    events = re.findall(r'^\s{2}(\w+):\s*\{', body, re.M)
    tracks = re.findall(r"'(\w+)'", re.search(r'TRACKS = \[(.*?)\]', js).group(1))
    return events, tracks


def seconds(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                         capture_output=True, text=True, check=True).stdout
    return round(float(out.strip()), 4)


def ffmpeg(args):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], capture_output=True, text=True)
    if r.returncode: sys.exit('ffmpeg failed: ' + r.stderr.strip())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--all', action='store_true', help='rebuild everything, not just new or changed files')
    ap.add_argument('--check', action='store_true', help='report only')
    a = ap.parse_args()
    events, tracks = table()
    manifest = {'sfx': {}, 'music': {}}
    problems = []

    for f in sorted((SRC / 'sfx').glob('*')) if (SRC / 'sfx').is_dir() else []:
        if f.suffix.lower() not in AUDIO: continue
        m = re.fullmatch(r'([A-Za-z]\w*?)(?:-(\d+))?(?:\.(\w+))?', f.stem)
        if not m or m.group(1) not in events:
            problems.append(f'{f.name}: no event called "{f.stem.split("-")[0].split(".")[0]}" (see SFX in src/sounds.js)'); continue
        event, take, cat = m.groups()
        key = event + ('.' + cat if cat else '')
        out = OUT / 'sfx' / (f.stem + '.mp3')
        if not a.check and (a.all or not out.exists() or out.stat().st_mtime < f.stat().st_mtime):
            out.parent.mkdir(parents=True, exist_ok=True)
            # trim leading silence, mono, loudness-normalised, a few ms fade so nothing clicks
            ffmpeg(['-i', str(f), '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,loudnorm=I=-16:TP=-1.5:LRA=11,'
                    'afade=t=in:d=0.004', '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', str(out)])
            print('  sfx  ', f.name, '->', out.relative_to(ROOT))
        if out.exists(): manifest['sfx'].setdefault(key, []).append('sfx/' + out.name)

    for f in sorted((SRC / 'music').glob('*')) if (SRC / 'music').is_dir() else []:
        if f.suffix.lower() not in AUDIO: continue
        boss = f.stem.endswith('-boss') and f.stem[:-5] in tracks      # an area's own boss tune, e.g. streets-boss
        if f.stem not in tracks and not boss:
            problems.append(f'{f.name}: not a track name; use one of {", ".join(tracks)}, or <area>-boss (TRACKS in src/sounds.js)'); continue
        out = OUT / 'music' / (f.stem + '.mp3')
        if not a.check and (a.all or not out.exists() or out.stat().st_mtime < f.stat().st_mtime):
            out.parent.mkdir(parents=True, exist_ok=True)
            ffmpeg(['-i', str(f), '-ac', '2', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '160k', str(out)])
            print('  music', f.name, '->', out.relative_to(ROOT))
        if out.exists(): manifest['music'][f.stem] = {'file': 'music/' + out.name, 'length': seconds(f)}

    if not a.check:
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
    got = {k.split('.')[0] for k in manifest['sfx']}
    print(f"\nEffects recorded: {len(got)} of {len(events)}." +
          (f"  Still synth: {', '.join(e for e in events if e not in got)}" if len(got) < len(events) else ''))
    print(f"Music: {', '.join(manifest['music']) or 'none yet'}." +
          (f"  Silent: {', '.join(t for t in tracks if t not in manifest['music'])}" if len(manifest['music']) < len(tracks) else ''))
    for p in problems: print('  skipped', p)


if __name__ == '__main__':
    main()
