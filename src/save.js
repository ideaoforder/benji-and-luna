// What the cats keep between visits: golden paws, and everything bought or found. Saved in this browser.
// Starting over (R / hold Start) begins a new run but keeps all of this. Add ?newsave to the address to wipe it.
const KEY = 'bl-save';
// players: what each player (P1..P4, by the order they joined) has bought. Tools and specials belong to the player
// who bought them; upgrades (pouch, focus) and paws are shared.
export const save = { paws: 0, players: [], upgrades: {} };
try {
  if (new URLSearchParams(location.search).has('newsave')) localStorage.removeItem(KEY);
  Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}'));
} catch (e) {}
// The smelly-fish special was taken out (it is a pick-up to avoid now): whoever bought it gets the 40 paws back.
const slots = () => { for (let i = 0; i < 4; i++) save.players[i] = { tools: [], specials: [], ...(save.players[i] || {}) }; };
let changed = false;
if ((save.specials || []).includes('fish')) { save.specials = save.specials.filter(k => k !== 'fish'); save.paws += 40; changed = true; }
if (save.tools || save.specials) {                 // older saves: one shared list, so every player keeps what was bought
  const t = save.tools || [], sp = save.specials || [];
  slots(); save.players.forEach(pl => { pl.tools = [...new Set([...pl.tools, ...t])]; pl.specials = [...new Set([...pl.specials, ...sp])]; });
  delete save.tools; delete save.specials; changed = true;
}
slots();
if (changed) try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {}
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
export const level = k => save.upgrades[k] || 0;
export function addPaws(n) { save.paws = Math.max(0, save.paws + n); persist(); }
export function own(slot, kind, key) {    // kind: 'tools' | 'specials'; slot: the player's number from 0
  const list = save.players[slot % 4][kind];
  if (!list.includes(key)) { list.push(key); persist(); }
}
