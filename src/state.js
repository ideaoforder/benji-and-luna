// What survives a room change: who is playing, what the party has found, which rooms are cleared.
import { START_TOOLS, START_SPECIALS, START_MOVES } from './config.js';
import { save } from './save.js';
// The tools or specials a player has: the ones everyone starts with, plus what that player bought (kept in the save).
export function kit(entry, kind) {
  const start = kind === 'tools' ? START_TOOLS : START_SPECIALS, slot = Math.max(0, state.party.indexOf(entry));
  return [...start, ...save.players[slot % 4][kind].filter(k => !start.includes(k))];
}

export const state = { party: [], cleared: {}, flags: {}, beaten: 0, bonusHp: 0, moves: [...START_MOVES] };

// What survives starting over: which area was chosen on the title screen (or reached by playing).
// checkpoint: where the party goes back to when every cat is netted at once (the last cat bed, else the start of
// the area), with the progress to go back to (src/brawl/scene.js, nap() and caught()).
export const run = { area: 0, stick: {}, stickY: {}, difficulty: 'normal', mode: 'A', menuRow: 0, shopFrom: null, checkpoint: null };   // mode: src/team.js; menuRow: the title menu's cursor   // shopFrom: the street and door a shop was entered from
try { const d = localStorage.getItem('bl-difficulty'); if (d) run.difficulty = d; const m = localStorage.getItem('bl-mode'); if (m) run.mode = m; } catch (e) {}
export function setMode(m) { run.mode = m; try { localStorage.setItem('bl-mode', m); } catch (e) {} }
export function setDifficulty(d) { run.difficulty = d; try { localStorage.setItem('bl-difficulty', d); } catch (e) {} }

export function resetState() {
  run.checkpoint = null;
  state.party = []; state.cleared = {}; state.flags = {}; state.beaten = 0; state.bonusHp = 0;
  state.moves = [...START_MOVES];
}
