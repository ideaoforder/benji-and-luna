// Every input source reports the same shape: { x, jump, attack, meow, roll, swap }.
// A source returning null means "not connected".

const keys = new Set();
const fresh = new Set();          // keys pressed since last consume()
addEventListener('keydown', e => {
  if (!e.repeat) fresh.add(e.code);
  keys.add(e.code);
  if (/^(Arrow|Space)/.test(e.code)) e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const touch = { left: false, right: false, jump: false, attack: false, meow: false, roll: false };
const touchEl = document.getElementById('touch');
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) touchEl.classList.add('on');
touchEl.querySelectorAll('.tb').forEach(b => {
  const set = v => e => { e.preventDefault(); touch[b.dataset.k] = v; b.classList.toggle('down', v); };
  b.addEventListener('pointerdown', set(true));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => b.addEventListener(n, set(false)));
});
document.getElementById('restart').addEventListener('pointerdown', e => { e.preventDefault(); fresh.add('Restart'); });
addEventListener('pointerdown', () => { try { window.focus(); } catch (e) {} });

export function pads() {
  try { return Array.from(navigator.getGamepads ? navigator.getGamepads() : []); } catch (e) { return []; }
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
  kb1: () => ({ x: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
                jump: keys.has('KeyW') || keys.has('Space'), attack: keys.has('KeyF'),
                meow: keys.has('KeyG'), roll: keys.has('KeyH'), swap: keys.has('KeyQ') }),
  kb2: () => ({ x: (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0),
                jump: keys.has('ArrowUp'), attack: keys.has('Enter') || keys.has('Comma'),
                meow: keys.has('Period'), roll: keys.has('Slash'), swap: keys.has('ShiftRight') }),
  touch: () => ({ x: (touch.right ? 1 : 0) - (touch.left ? 1 : 0), jump: touch.jump, attack: touch.attack,
                  meow: touch.meow, roll: touch.roll, swap: false })
};
for (let i = 0; i < 4; i++) SOURCES['pad' + i] = () => {
  const p = pads()[i]; if (!p || !p.connected) return null;
  const b = n => !!(p.buttons[n] && p.buttons[n].pressed);
  const ax = p.axes[0] || 0;
  return { x: b(14) ? -1 : b(15) ? 1 : Math.abs(ax) > 0.35 ? Math.sign(ax) : 0,
           jump: b(0), attack: b(2), meow: b(1), roll: b(3), swap: b(4) || b(5) };
};
