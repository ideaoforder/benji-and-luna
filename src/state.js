// What survives a room change: who is playing, what the party has found, which rooms are cleared.
import { START_TOOLS, START_SPECIALS, START_MOVES } from './config.js';

export const state = { party: [], cleared: {}, flags: {}, beaten: 0, bonusHp: 0, tools: [...START_TOOLS], specials: [...START_SPECIALS], moves: [...START_MOVES] };

export function resetState() {
  state.party = []; state.cleared = {}; state.flags = {}; state.beaten = 0; state.bonusHp = 0;
  state.tools = [...START_TOOLS]; state.specials = [...START_SPECIALS]; state.moves = [...START_MOVES];
}
