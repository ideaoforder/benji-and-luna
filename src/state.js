// What survives a room change: who is playing, what the party has found, which rooms are cleared.
import { START_TOOLS, START_SPECIALS, START_MOVES } from './config.js';
import { save } from './save.js';
// Tools and specials owned: the ones everyone starts with, plus everything bought or found (kept in the save).
const owned = (start, saved) => [...start, ...saved.filter(k => !start.includes(k))];

export const state = { party: [], cleared: {}, flags: {}, beaten: 0, bonusHp: 0, tools: owned(START_TOOLS, save.tools), specials: owned(START_SPECIALS, save.specials), moves: [...START_MOVES] };

// What survives starting over: which area was chosen on the title screen (or reached by playing).
export const run = { area: 0, stick: {}, stickY: {}, difficulty: 'normal', shopFrom: null };   // shopFrom: the street and door a shop was entered from
try { const d = localStorage.getItem('bl-difficulty'); if (d) run.difficulty = d; } catch (e) {}
export function setDifficulty(d) { run.difficulty = d; try { localStorage.setItem('bl-difficulty', d); } catch (e) {} }

export function resetState() {
  state.party = []; state.cleared = {}; state.flags = {}; state.beaten = 0; state.bonusHp = 0;
  state.tools = owned(START_TOOLS, save.tools); state.specials = owned(START_SPECIALS, save.specials); state.moves = [...START_MOVES];
}
