// What the cats keep between visits, per campaign: golden paws, what each player has bought, upgrades, challenges
// beaten, and the area last reached. Saved in this browser. There are CAMPAIGNS slots, picked on the title screen;
// an empty slot is a fresh start, and a campaign can be erased there too. Starting over (R / hold Start) begins a new
// run of the same campaign and keeps all of this. Add ?newsave to the address to wipe every campaign.
//
// `save` is always the current campaign's data, and is the same object throughout: switching campaigns refills it
// in place, so every module that imported it sees the change.
const KEY = 'bl-campaigns', OLD = 'bl-save';
export const CAMPAIGNS = 3;
// players: what each player (P1..P4, by the order they joined) has bought. Tools and specials belong to the player
// who bought them; upgrades (pouch, focus) and paws are shared.
const blank = () => ({ paws: 0, players: [], upgrades: {}, challenges: {}, area: 0 });
export const save = blank();
let book = { current: 0, slots: Array(CAMPAIGNS).fill(null) };

function tidy(s) {                       // older saves, brought up to date
  if ((s.specials || []).includes('fish')) { s.specials = s.specials.filter(k => k !== 'fish'); s.paws += 40; }   // the smelly-fish special was taken out: refunded
  const one = i => (s.players[i] = { tools: [], specials: [], ...(s.players[i] || {}) });
  if (s.tools || s.specials) {           // one shared list once: every player keeps what was bought
    const t = s.tools || [], sp = s.specials || [];
    for (let i = 0; i < 4; i++) { const p = one(i); p.tools = [...new Set([...p.tools, ...t])]; p.specials = [...new Set([...p.specials, ...sp])]; }
    delete s.tools; delete s.specials;
  }
  for (let i = 0; i < 4; i++) one(i);
  s.upgrades = s.upgrades || {}; s.challenges = s.challenges || {}; s.area = s.area || 0;
  return s;
}
function fill(data) { for (const k of Object.keys(save)) delete save[k]; Object.assign(save, tidy({ ...blank(), ...JSON.parse(JSON.stringify(data || {})) })); }
function write() { book.slots[book.current] = save; try { localStorage.setItem(KEY, JSON.stringify(book)); } catch (e) {} }

try {
  if (new URLSearchParams(location.search).has('newsave')) { localStorage.removeItem(KEY); localStorage.removeItem(OLD); }
  const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (stored) book = { current: stored.current || 0, slots: [...stored.slots, ...Array(CAMPAIGNS).fill(null)].slice(0, CAMPAIGNS) };
  else { const old = localStorage.getItem(OLD); if (old) book.slots[0] = JSON.parse(old); }      // the single save from before campaigns
} catch (e) {}
fill(book.slots[book.current]); write();

export function persist() { write(); }
export const level = k => save.upgrades[k] || 0;
export function addPaws(n) { save.paws = Math.max(0, save.paws + n); persist(); }
export function own(slot, kind, key) {    // kind: 'tools' | 'specials'; slot: the player's number from 0
  const list = save.players[slot % 4][kind];
  if (!list.includes(key)) { list.push(key); persist(); }
}

// ---------- campaigns ----------
export const currentCampaign = () => book.current;
// What the title screen shows for slot i: null when it is a fresh start (never played, or erased).
const fresh = s => !s || (!s.paws && !s.area && !Object.keys(s.challenges || {}).length && !Object.keys(s.upgrades || {}).length
  && !(s.players || []).some(p => p && (p.tools.length || p.specials.length)));
export function campaignInfo(i) { const s = i === book.current ? save : book.slots[i]; return fresh(s) ? null : { paws: s.paws || 0, area: s.area || 0 }; }
export function switchCampaign(i) {
  if (i === book.current) return;
  book.slots[book.current] = JSON.parse(JSON.stringify(save));
  book.current = i; fill(book.slots[i]); write();
}
export function eraseCampaign(i) {
  if (i === book.current) fill(null); else book.slots[i] = null;
  write();
}
