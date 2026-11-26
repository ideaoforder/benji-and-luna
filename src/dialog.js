// Dialog: everything the characters say lives in story/dialog.txt, so it can be written and rewritten without
// touching code (the file explains its own format). Two kinds of section:
//   story sections pause the game and show a box, one line at a time (src/scenes/hud.js, story()); each is shown
//   once per campaign (save.seen).
//   bark sections ("bark ...") are a bubble over someone's head; one of their lines is picked at random.
import { CATS } from './config.js';
import { state } from './state.js';
import { save, persist } from './save.js';

let book = {};
export function setDialog(text) {
  book = {}; let cur = null;
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const head = /^\[(.+)\]$/.exec(line);
    if (head) { cur = book[head[1].trim().toLowerCase()] = []; continue; }
    const m = /^([^:]{1,24}):\s*(.+)$/.exec(line);
    if (cur && m) cur.push({ who: m[1].trim(), text: m[2].trim() });
  }
}
export const lines = key => book[key] || [];

const catKeyOf = name => Object.keys(CATS).find(k => CATS[k].name.toLowerCase() === name.toLowerCase());
// Who actually says a line. A named cat nobody is playing hands it to a cat that is out; Cat is player 1's cat and
// Friend another one. Returns { name, cat (key, when a cat) }.
export function speaker(who, active) {
  const out = active();                                 // [{ cat, n }] in player order, the cats on screen
  const pick = k => ({ name: CATS[k].name, cat: k });
  const w = who.toLowerCase();
  if (w === 'cat') return out[0] ? pick(out[0].cat) : { name: 'Cat' };
  if (w === 'friend') {
    const e = state.party[0], mate = out[1] ? out[1].cat : e && e.team && e.team.find(k => k !== (out[0] && out[0].cat));
    return mate ? pick(mate) : out[0] ? pick(out[0].cat) : { name: 'Friend' };
  }
  const k = catKeyOf(who);
  if (k) {
    if (out.some(o => o.cat === k) || state.party.some(e => e.team && e.team.includes(k))) return pick(k);
    return out[0] ? pick(out[0].cat) : pick(k);         // nobody brought that cat: whoever is out says it
  }
  return { name: who };
}

// A story section not seen yet in this campaign: its lines, marked as seen. Empty when there is nothing to show.
export function storyOnce(key) {
  const ls = lines(key);
  if (!ls.length) return [];
  save.seen = save.seen || {};
  if (save.seen[key]) return [];
  save.seen[key] = true; persist();
  return ls;
}
export function bark(key) { const ls = lines('bark ' + key); return ls.length ? ls[Math.floor(Math.random() * ls.length)] : null; }
