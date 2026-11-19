// Sound effects and music.
//
//   sfx('claw', { cat: 'benji', rate: 1.2, step: 2 })   plays an event from SFX in src/sounds.js
//   music('castle')                                     loops a track (crossfades from whatever is playing)
//
// Every event has a synthesised recipe, so the game always makes a sound. A recorded file replaces the recipe as soon
// as it is listed in assets/audio/manifest.json, which tools/build_audio.py writes from the files in art/audio/.
// Per-cat files ("meow.benji") win over the shared one ("meow"). Several files for one event are picked at random.
import { SFX } from './sounds.js';

let ctx = null, master, sfxBus, musicBus, noise = null;
let manifest = { sfx: {}, music: {} };
const buffers = {};                 // url -> AudioBuffer, or a Promise while loading
const lastPlayed = {};
const BASE = 'assets/audio/';

// ---------- settings (remembered per browser) ----------
export const settings = { music: 0.7, effects: 1, muted: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem('bl-audio') || '{}')); } catch (e) {}
function save() { try { localStorage.setItem('bl-audio', JSON.stringify(settings)); } catch (e) {} }
function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(settings.muted ? 0 : 1, t, 0.02);
  sfxBus.gain.setTargetAtTime(settings.effects, t, 0.02);
  musicBus.gain.setTargetAtTime(settings.music * settings.music, t, 0.02);     // squared: the slider feels even
}
export function setVolume(which, v) { settings[which] = Math.round(Math.min(1, Math.max(0, v)) * 10) / 10; save(); applyVolumes(); }
export function toggleMute() { settings.muted = !settings.muted; save(); applyVolumes(); return settings.muted; }

// ---------- the audio context ----------
// Browsers only start audio from a tap or key press, and iPadOS does not count controller buttons. So the context is
// made, and woken, on the first touch or key; until then sounds are skipped.
// Only a gesture may create the context (create = true): Safari can report a context made outside one as running and
// still play nothing.
function audio(create = false) {
  if (!ctx && !create) return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(master);
    applyVolumes(); loadAll();
  }
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {});
  return ctx;
}
// Browsers disagree on which events count as a gesture (Safari is strict about pointer events), so listen to all of
// them. A silent one-sample sound started inside the gesture is what finally unlocks older Safari.
const wake = () => {
  const a = audio(true); if (!a) return;
  if (a.state !== 'running') {
    a.resume().catch(() => {});
    try { const s = a.createBufferSource(); s.buffer = a.createBuffer(1, 1, 22050); s.connect(a.destination); s.start(0); } catch (e) {}
  }
  startPending();
};
for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'keydown', 'keyup'])
  addEventListener(ev, wake, { capture: true });
// True when sound should be playing but the browser has not let it start yet (no tap or key press since the page
// loaded: a controller button does not count). The HUD says so instead of staying silent.
export const needsUnlock = () => !settings.muted && (!ctx || ctx.state !== 'running') && !document.hidden;
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume().catch(() => {}); });

// ---------- files ----------
fetch(BASE + 'manifest.json?t=' + Math.floor(Date.now() / 3600000)).then(r => r.ok ? r.json() : null).then(m => {
  if (!m) return;
  manifest = { sfx: m.sfx || {}, music: m.music || {} };
  for (const name in manifest.sfx) if (!SFX[name.split('.')[0]]) console.warn('audio: no event called', name.split('.')[0], 'in src/sounds.js');
  if (ctx) { loadAll(); startPending(); }
}).catch(() => {});

function load(url) {
  if (buffers[url]) return buffers[url];
  return buffers[url] = fetch(BASE + url).then(r => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.arrayBuffer(); })
    .then(b => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no)))
    .then(buf => (buffers[url] = buf))
    .catch(e => { console.warn('audio: could not load', url, e.message || e); buffers[url] = 'failed'; });
}
function loadAll() { for (const k in manifest.sfx) manifest.sfx[k].forEach(load); }
const ready = url => buffers[url] instanceof AudioBuffer ? buffers[url] : null;

// ---------- effects ----------
export function sfx(name, o = {}) {
  const e = SFX[name];
  if (!e) { console.warn('audio: unknown sound', name); return; }
  const a = audio(); if (!a || a.state !== 'running' || settings.muted) return;
  const key = name + (o.cat ? '.' + o.cat : ''), now = a.currentTime;
  if (now - (lastPlayed[key] || -1) < (e.gap ?? 0.03)) return;     // the same sound many times at once is just loud
  lastPlayed[key] = now;
  const files = (o.cat && manifest.sfx[name + '.' + o.cat]) || manifest.sfx[name];
  const loaded = files && files.map(ready).filter(Boolean);
  if (window.__audioLog) window.__audioLog.push(key + (loaded && loaded.length ? ':file' : ''));      // for tests
  if (loaded && loaded.length) {
    const src = a.createBufferSource(), g = a.createGain();
    src.buffer = loaded[Math.floor(Math.random() * loaded.length)];
    const vary = e.vary ?? 0.04;
    src.playbackRate.value = (e.pitchFiles ? (o.rate || 1) : 1) * (1 + (Math.random() * 2 - 1) * vary);
    g.gain.value = e.fileVol ?? 0.8;
    src.connect(g).connect(sfxBus); src.start();
    return;
  }
  const recipe = (o.cat && e.cats && e.cats[o.cat]) || e.synth;
  const k = (o.rate || 1), add = (o.step || 0) * (e.step || 0);
  for (const t of recipe) tone(a, t, k, add);
}

// A tone: { f, to, d, wave, vol, at, lp, q }
//   f: start frequency (Hz), or a list of frequencies passed through evenly over the length
//   to: end frequency (default: half of f, a falling blip); d: length in seconds; at: delay in seconds
//   wave: square | sawtooth | triangle | sine | noise. For noise, f is the centre of a band-pass that sweeps to `to`.
//   lp: low-pass cutoff in Hz (softens buzzy waves); q: filter sharpness
function tone(a, t, k, add) {
  const start = a.currentTime + (t.at || 0), d = t.d || 0.1, vol = t.vol ?? 0.05;
  const pts = (Array.isArray(t.f) ? t.f : [t.f, t.to ?? t.f / 2]).map(f => Math.max(30, f * k + add));
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + Math.min(0.005, d / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, start + d);
  let src, sweep;
  if (t.wave === 'noise') {
    src = a.createBufferSource(); src.buffer = noiseBuffer(a);
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = t.q ?? 0.9;
    sweep = bp.frequency; src.connect(bp); bp.connect(g);
  } else {
    src = a.createOscillator(); src.type = t.wave || 'square'; sweep = src.frequency;
    if (t.lp) { const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = t.lp; lp.Q.value = t.q ?? 1; src.connect(lp); lp.connect(g); }
    else src.connect(g);
  }
  sweep.setValueAtTime(pts[0], start);
  pts.slice(1).forEach((f, i) => sweep.exponentialRampToValueAtTime(f, start + d * (i + 1) / (pts.length - 1)));
  g.connect(sfxBus);
  src.start(start); src.stop(start + d + 0.02);
}
function noiseBuffer(a) {
  if (noise) return noise;
  noise = a.createBuffer(1, a.sampleRate, a.sampleRate);
  const ch = noise.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  return noise;
}

// Old-style call, kept for the platformer (src/scenes/room.js, src/officer.js).
export function blip(freq, dur, type = 'square', vol = 0.05) {
  const a = audio(); if (!a || a.state !== 'running' || settings.muted) return;
  tone(a, { f: freq, d: dur, wave: type, vol }, 1, 0);
}

// ---------- music ----------
// manifest.music.<track> = { file, length }: length is the loop's true length in seconds, measured from the WAV.
// An MP3 can come back from the decoder a little longer than that (encoder padding); the loop skips the padding so it
// does not click.
let wanted = null, playing = null;          // track names; `playing` also holds the nodes
export function music(track, o = {}) {
  if (o.ifExists && !manifest.music[track]) return;   // e.g. no boss tune yet: keep the area's going
  wanted = track;
  if (!ctx) return;                                    // starts on the first tap or key, see startPending
  startPending();
}
export function stopMusic(fade = 1) { wanted = null; if (ctx) fadeOut(fade); }
function fadeOut(fade) {
  if (!playing) return;
  const p = playing; playing = null;
  p.gain.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
  setTimeout(() => { try { p.src.stop(); } catch (e) {} }, fade * 1000 + 200);
}
function startPending() {
  if (!ctx || (playing && playing.track === wanted)) return;
  const m = wanted && manifest.music[wanted];
  if (!m) { fadeOut(0.6); return; }
  const track = wanted;
  Promise.resolve(load(m.file)).then(() => {
    const buf = ready(m.file);
    if (!buf || wanted !== track || (playing && playing.track === track)) return;
    fadeOut(0.6);
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buf; src.loop = true;
    const len = m.length || buf.duration, extra = buf.duration - len;
    if (extra > 0.001) {                               // padded by the encoder: LAME puts 1105 samples in front
      src.loopStart = Math.min(extra, 1105 / buf.sampleRate); src.loopEnd = src.loopStart + len;
    }
    gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.setTargetAtTime(m.vol ?? 1, ctx.currentTime, 0.2);
    src.connect(gain).connect(musicBus); src.start(0, src.loopStart || 0);
    playing = { track, src, gain };
  });
}

// For tests and the console: what would play, and from where.
window.__audio = { settings, get manifest() { return manifest; }, get playing() { return playing && playing.track; }, get wanted() { return wanted; },
  get state() { return ctx ? ctx.state : 'none'; }, get ctx() { return ctx; },
  get gains() { return ctx ? { master: master.gain.value, effects: sfxBus.gain.value, music: musicBus.gain.value } : null; } };
