// What survives a room change: who is playing, what the party has found, which rooms are cleared.
import { START_TOOLS, START_SPECIALS, START_MOVES } from './config.js';

export const state = { party: [], cleared: {}, flags: {}, beaten: 0, bonusHp: 0, tools: [...START_TOOLS], specials: [...START_SPECIALS], moves: [...START_MOVES] };

// What survives starting over: which area was chosen on the title screen (or reached by playing).
export const run = { area: 0, stick: {}, stickY: {}, difficulty: 'normal' };
try { const d = localStorage.getItem('bl-difficulty'); if (d) run.difficulty = d; } catch (e) {}
export function setDifficulty(d) { run.difficulty = d; try { localStorage.setItem('bl-difficulty', d); } catch (e) {} }

export function resetState() {
  state.party = []; state.cleared = {}; state.flags = {}; state.beaten = 0; state.bonusHp = 0;
  state.tools = [...START_TOOLS]; state.specials = [...START_SPECIALS]; state.moves = [...START_MOVES];
}
