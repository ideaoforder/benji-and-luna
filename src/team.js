// How a player's cats share hearts. The mode is chosen on the title screen (run.mode) and kept on each player's entry
// when they join, so it never changes under someone mid-game.
//
//   A  Tag team: exactly two cats, each with its own hearts. The one on the bench slowly heals, and when the active
//      one runs out the other tags in. Player colours are fixed: P1 blue, P2 red, P3 green, P4 yellow.
//   B  Crew: one to five cats sharing one set of hearts (as many as the toughest cat picked has). Select steps
//      through them; there is no tagging in. Each player picks a colour from PALETTES (src/config.js).
//
// Hearts live in entry.hps: per cat in mode A, under `_shared` in mode B. Tools, specials, the bell and catnip
// already belong to the player rather than the cat, in both modes.
import { CATS, PLAYER_COLORS, HEART_CAP } from './config.js';
import { state } from './state.js';

export const MODES = {
  A: { name: 'Tag Team', blurb: '2 cats, each with own hearts', min: 2, max: 2 },
  B: { name: 'Crew', blurb: '1-5 cats, shared hearts, your colour', min: 1, max: 5 }
};
export const MODE_ORDER = ['A', 'B'];

export const shared = e => e.mode === 'B';
export const maxHpOf = (e, key) => Math.min(HEART_CAP, (shared(e) ? Math.max(...e.team.map(k => CATS[k].hp)) : CATS[key].hp) + state.bonusHp);
export function storedHp(e, key) {
  const max = maxHpOf(e, key), hp = shared(e) ? e.hps._shared : e.hps[key];
  return Math.min(max, hp ?? max);
}
export function storeHp(e, key, hp) { if (shared(e)) e.hps._shared = hp; else e.hps[key] = hp; }
// The next cat along (Select). With one cat, itself.
export function nextCat(e, key) { const t = e.team, i = t.indexOf(key); return t[(i + 1) % t.length]; }
// Can someone tag in for `key` when it runs out? Only in mode A, and only if the partner has hearts.
export function canTagIn(e, key) { const k = nextCat(e, key); return !shared(e) && k !== key && storedHp(e, k) > 0; }
// The cat waiting on the bench, for the HUD: hearts in mode A, just the next name in mode B.
export function benchInfo(e, key) {
  const k = nextCat(e, key);
  if (k === key) return null;
  return shared(e) ? { name: CATS[k].name, hp: null } : { name: CATS[k].name, hp: storedHp(e, k), max: maxHpOf(e, k) };
}
// The colour this player's cats wear: their slot's colour in mode A, their pick in mode B.
export const colourOf = (e, slot) => (shared(e) && e.colour) || PLAYER_COLORS[slot % 4].name;
// Has this player finished picking (and so can play)? Mode A teams are two cats, mode B crews one to five.
export const picked = e => !!(e && e.catKey && e.team && e.team.length >= (MODES[e.mode] || MODES.A).min);
