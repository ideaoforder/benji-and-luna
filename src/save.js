// What the cats keep between visits: golden paws, and everything bought or found. Saved in this browser.
// Starting over (R / hold Start) begins a new run but keeps all of this. Add ?newsave to the address to wipe it.
const KEY = 'bl-save';
export const save = { paws: 0, tools: [], specials: [], upgrades: {} };
try {
  if (new URLSearchParams(location.search).has('newsave')) localStorage.removeItem(KEY);
  Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}'));
} catch (e) {}
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
export const level = k => save.upgrades[k] || 0;
export function addPaws(n) { save.paws = Math.max(0, save.paws + n); persist(); }
export function own(kind, key) {          // kind: 'tools' | 'specials'
  if (!save[kind].includes(key)) { save[kind].push(key); persist(); }
}
