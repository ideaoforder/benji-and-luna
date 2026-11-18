// Every input source reports the same shape:
//   { x, y, jump, attack, special, tool, swap, cycleTool, cycleSpecial }
// In the platformer, up is jump. In the brawler, up and down walk in depth and jump has its own button.
import { MODE } from './config.js';
const brawl = MODE === 'brawler';
if (brawl) document.body.classList.add('brawler');
// A source returning null means "not connected".

const keys = new Set();
const fresh = new Set();          // keys pressed since last consume()
addEventListener('keydown', e => {
  if (!e.repeat) fresh.add(e.code);
  keys.add(e.code);
  if (/^(Arrow|Space|Escape|Enter)/.test(e.code)) e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// iPads and iPhones. A game controller there can also arrive as key presses (d-pad as arrow keys, a button as
// Enter or Escape), which used to add a ghost second cat and restart the game. So on these devices the keyboard
// is ignored while a controller is connected, and Escape never restarts.
const tablet = /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const touchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const touch = { left: false, right: false, up: false, down: false, jump: false, attack: false, special: false, tool: false };
const touchEl = document.getElementById('touch'), restartEl = document.getElementById('restart');
touchEl.querySelectorAll('.tb').forEach(b => {
  const set = v => e => { e.preventDefault(); touch[b.dataset.k] = v; b.classList.toggle('down', v); };
  b.addEventListener('pointerdown', set(true));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => b.addEventListener(n, set(false)));
});
// The restart button needs two taps, so a stray touch cannot wipe out a game.
document.getElementById('pause').addEventListener('pointerdown', e => { e.preventDefault(); fresh.add('Pause'); });
let armedUntil = 0;
restartEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (performance.now() < armedUntil) { fresh.add('Restart'); armedUntil = 0; restartEl.classList.remove('armed'); }
  else { armedUntil = performance.now() + 1800; restartEl.classList.add('armed'); setTimeout(() => restartEl.classList.remove('armed'), 1800); }
});
addEventListener('pointerdown', () => { try { window.focus(); } catch (e) {} });

export function pads() {
  try { return Array.from(navigator.getGamepads ? navigator.getGamepads() : []); } catch (e) { return []; }
}
export const padCount = () => pads().filter(p => p && p.connected).length;

// On-screen buttons are for playing by touch. With a controller connected they only get in the way, so hide them
// (and the restart button: hold Start instead).
let touchOn = false;
function showTouch() {
  const withPad = padCount() > 0;
  touchOn = touchScreen && !withPad;
  touchEl.classList.toggle('on', touchOn);
  restartEl.style.display = document.getElementById('pause').style.display = touchScreen && withPad ? 'none' : '';
  if (!touchOn) for (const k in touch) touch[k] = false;
}
showTouch(); setInterval(showTouch, 500);
const keyboardOff = () => tablet && padCount() > 0;

// True once when a controller button has been held for `ms`. Used for restart, so a brushed Start does nothing.
const heldSince = {};
export function held(padButton, ms) {
  const down = pads().some(p => p && p.buttons[padButton] && p.buttons[padButton].pressed), now = performance.now();
  if (!down) { heldSince[padButton] = 0; return false; }
  if (!heldSince[padButton]) heldSince[padButton] = now;
  if (heldSince[padButton] > 0 && now - heldSince[padButton] >= ms) { heldSince[padButton] = -1; return true; }   // -1: fired, wait for release
  return false;
}

// True once per press. Pad buttons are edge-detected here too.
const padHeld = {};
export function consume(code, padButton) {
  let hit = fresh.delete(code);
  if (padButton !== undefined) {
    const down = pads().some(p => p && p.buttons[padButton] && p.buttons[padButton].pressed);
    if (down && !padHeld[padButton]) hit = true;
    padHeld[padButton] = down;
  }
  return hit;
}

export const SOURCES = {
  kb1: () => keyboardOff() ? null : ({ x: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
                y: (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0),
                jump: keys.has('Space') || (!brawl && keys.has('KeyW')), attack: keys.has('KeyF'),
                special: keys.has('KeyG'), tool: keys.has('KeyH'), swap: keys.has('KeyQ'),
                cycleTool: keys.has('KeyE'), cycleSpecial: keys.has('KeyT') }),
  kb2: () => keyboardOff() ? null : ({ x: (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0),
                y: (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0),
                jump: brawl ? keys.has('Enter') : keys.has('ArrowUp'), attack: keys.has('Comma') || (!brawl && keys.has('Enter')),
                special: keys.has('Period'), tool: keys.has('Slash'), swap: keys.has('ShiftRight'),
                cycleTool: keys.has('Quote'), cycleSpecial: keys.has('Semicolon') }),
  touch: () => !touchOn ? null : ({ x: (touch.right ? 1 : 0) - (touch.left ? 1 : 0), y: (touch.down ? 1 : 0) - (touch.up ? 1 : 0),
                  jump: touch.jump, attack: touch.attack,
                  special: touch.special, tool: touch.tool })
};
// Controllers. Buttons are numbered by position (0 bottom face, 1 right, 2 left, 3 top, 8 select, 9 start).
//
// Measured on an iPad (iPadOS 26, 8BitDo Ultimate 2): the four face buttons, d-pad, sticks, select and start reach the
// page, but L1, R1, L2 and R2 are taken by the system and pull focus away from the page. So nothing a player needs
// is on a shoulder button: swap cat is a tap of Select, and Select held with a face button switches tool or special.
// On computers the shoulder buttons also work, as extras.
const sel = [{}, {}, {}, {}];              // per controller: is Select down, and was it used for a combo
for (let i = 0; i < 4; i++) SOURCES['pad' + i] = () => {
  const p = pads()[i]; if (!p || !p.connected) return null;
  const b = n => !!(p.buttons[n] && p.buttons[n].pressed);
  const ax = p.axes[0] || 0, ay = p.axes[1] || 0, s = sel[i], held = b(8);
  const cycleTool = held && b(3), cycleSpecial = held && b(1);
  if (held && (cycleTool || cycleSpecial)) s.combo = true;
  const tapped = s.down && !held && !s.combo;                    // Select let go without a combo = swap cat
  if (!held) s.combo = false;
  s.down = held;
  return { x: b(14) ? -1 : b(15) ? 1 : Math.abs(ax) > 0.35 ? Math.sign(ax) : 0,
           y: b(12) ? -1 : b(13) ? 1 : Math.abs(ay) > 0.35 ? Math.sign(ay) : 0,
           jump: !held && b(0), attack: !held && b(2), special: !held && b(1), tool: !held && b(3),
           swap: tapped || (!tablet && b(4)), cycleTool: cycleTool || (!tablet && b(5)), cycleSpecial: cycleSpecial || (!tablet && b(7)) };
};
