// What survives a room change: who is playing, which rooms are cleared, which gates are open.
export const state = { party: [], cleared: {}, flags: {}, beaten: 0 };

export function resetState() {
  state.party = []; state.cleared = {}; state.flags = {}; state.beaten = 0;
}
