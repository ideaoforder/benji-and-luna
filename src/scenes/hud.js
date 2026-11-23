import { W, H, RES, MODE, PLAYER_COLORS, CATS, MOVES, SPECIALS, TOOLS, POWERUPS, aim, DIFFICULTY, skin } from '../config.js';
import { consume, held, SOURCES } from '../input.js';
import { sfx, settings, setVolume, toggleMute, needsUnlock } from '../sound.js';
import { ICON } from '../fx.js';
import { state, resetState, run } from '../state.js';
import { ROOMS, AREAS } from '../maps.js';

const st = { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff', stroke: '#1c1630',
             strokeThickness: 4, resolution: RES };

// Everything pinned to the screen. Runs on top of the current room and survives room changes.
export class Hud extends Phaser.Scene {
  constructor() { super('hud'); }

  create() {
    aim(this.cameras.main);
    // One panel per player, four across the top (two each side of the centre buttons): P-number and hearts above,
    // the equipped special with its charge bar and the equipped tool with uses left below.
    this.gauges = this.add.graphics();
    this.rows = [10, 222, 530, 742].map((x, i) => {
      const y = 8, icon = { ...st, fontSize: '14px' };
      return { x, y, tag: this.add.text(x, y, 'P' + (i + 1), { ...st, fontStyle: 'bold', color: PLAYER_COLORS[i].css }),
               label: this.add.text(x + 28, y, '', st), special: this.add.text(x, y + 23, '', icon),
               picture: this.add.image(x, y + 34, 'slash').setOrigin(0, 0.5).setVisible(false),      // for specials whose icon is a drawing
               tool: this.add.text(0, y + 23, '', icon), left: this.add.text(0, y + 23, '', icon),
               toolPic: this.add.image(0, y + 34, 'slash').setOrigin(0, 0.5).setVisible(false), hearts: [],
               mate: this.add.text(0, y + 27, '', { ...st, fontSize: '11px', strokeThickness: 3, color: '#d9d2f2' }).setVisible(false) };
    });
    this.setPlayers([]);
    this.combo = this.add.text(14, 84, '', { ...st, fontSize: '26px', fontStyle: 'bold', color: '#ffe066', strokeThickness: 6 }).setVisible(false);
    this.comboShown = 0;
    // A page that loses focus stops receiving the controller. Say so, instead of leaving the cats frozen.
    this.focusHint = this.add.text(W / 2, 300, 'Tap the screen to give the controller back to the game',
      { ...st, fontSize: '22px', fontStyle: 'bold', color: '#ffe066', strokeThickness: 6 }).setOrigin(0.5).setVisible(false);
    this.bossBar = this.add.graphics();
    this.bossName = this.add.text(W / 2, 50, '', { ...st, fontSize: '15px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.score = this.add.text(W - 12, 56, '', { ...st, fontSize: '14px', align: 'right' }).setOrigin(1, 0);
    this.banner = this.add.text(W / 2, 120, '', { ...st, fontSize: '40px', fontStyle: 'bold', strokeThickness: 7, align: 'center' })
      .setOrigin(0.5).setAlpha(0);
    this.shade = this.add.rectangle(W / 2, H / 2, W, H, 0x100c20, 0.6).setVisible(false);
    this.shade.setFillStyle(0x100c20, 0.82);
    this.pausedText = this.add.text(W / 2, 84, 'PAUSED', { ...st, fontSize: '34px', fontStyle: 'bold', strokeThickness: 7 }).setOrigin(0.5).setVisible(false);
    this.pausedHint = this.add.text(W / 2, 524, 'Start or P: carry on      Hold Start or R: start over      D-pad: sound      M: mute', { ...st, fontSize: '16px', color: '#ffe066' }).setOrigin(0.5).setVisible(false);
    // The pause screen doubles as the manual. Tools, specials and pick-ups are read from config, so new ones show up here.
    const up = MODE === 'brawler';
    const pages = [
      ['CONTROLLER', [
        'Move: stick or d-pad' + (up ? ' (up and down too)' : ''),
        'Jump: bottom button', 'Attack: left button', 'Special: right button', 'Tool: top button',
        'Swap cat: Select', 'Next tool: Select + top', 'Next special: Select + right',
        'Pause: Start', '',
        'KEYBOARD', up ? 'WASD move   Space jump' : 'A D move   W jump', 'F attack   G special   H tool', 'Q swap   E next tool   T next special']],
      ['MOVES', [
        'Combo: keep pressing attack', 'Tail somersault: attack in the air',
        ...(up ? Object.values(MOVES).map(m => m.name + ': ' + m.how) : []), '',
        'THE CATS  (pick two; Select swaps)', ...Object.values(CATS).map(c => c.name + ': ' + c.blurb), '',
        'THE STREET', 'Clear every wave to open the doors.',
        ...(up ? ['Wall doors: walk up. Benji smashes crates.'] : [])]],
      ['TOOLS  (uses refill in each street)', [
        ...Object.values(TOOLS).map(t => t.icon + '  ' + t.name + ' \u00D7' + t.uses + ': ' + t.tip), '',
        'SPECIALS  (the bar must be full)',
        ...Object.values(SPECIALS).map(s => s.icon + '  ' + s.name + ': ' + s.tip), '',
        'PICK-UPS',
        ...Object.values(POWERUPS).filter(u => !u.tool && !u.special).map(u => u.icon + '  ' + u.name.replace(/!$/, '') +
          (u.time ? ': double damage for ' + u.time / 1000 + ' s' : u === POWERUPS.bell ? ': blocks one hit' : ''))]]];
    this.manual = pages.flatMap(([head, lines], i) => {
      const x = 34 + i * 306;
      return [this.add.text(x, 112, head, { ...st, fontSize: '15px', fontStyle: 'bold', color: '#ffe066' }),
              this.add.text(x, 136, lines.join('\n'), { ...st, fontSize: '12px', strokeThickness: 3, lineSpacing: 3, wordWrap: { width: 292 } })];
    });
    this.manual.forEach(o => o.setVisible(false));
    // Sound settings on the pause screen: up/down picks Music or Effects, left/right changes it. Tapping the arrows works too.
    this.audioRow = 0; this.audioStick = {};
    this.audioLines = ['music', 'effects'].map((key, i) => {
      const x = 104, y = 76 + i * 22, label = this.add.text(x, y, '', { ...st, fontSize: '15px' }).setOrigin(1, 0.5);
      const arrow = (text, dir) => this.add.text(0, y, text, { ...st, fontSize: '16px', color: '#ffe066' }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.audioRow = i; this.nudgeVolume(dir); });
      const bar = this.add.text(x + 30, y, '', { ...st, fontSize: '13px' }).setOrigin(0, 0.5);
      const less = arrow('\u25C0', -1).setX(x + 16), more = arrow('\u25B6', 1);
      return { key, label, bar, more, objs: [label, bar, less, more] };
    });
    this.audioObjs = this.audioLines.flatMap(l => l.objs);
    this.audioObjs.forEach(o => o.setVisible(false));
    this.drawAudio();
    this.paused = false;
    this.title = this.add.text(W / 2, 104, 'BENJI & LUNA', { ...st, fontSize: '54px', fontStyle: 'bold', strokeThickness: 8 }).setOrigin(0.5);
    const platformer = [
      'Controller buttons by position: bottom jump   left attack   right special   top tool',
      'Select swaps cat   Select + top: next tool   Select + right: next special',
      'Keyboard 1: A D move   W jump   F attack   G special   H tool   Q swap   E next tool   T next special',
      'Keyboard 2: \u2190 \u2192 move   \u2191 jump   , attack   . special   / tool   Right Shift swap   \' next tool   ; next special'];
    const brawler = [
      'Controller buttons by position: bottom jump   left attack   right special   top tool',
      'Select swaps cat   Select + top: next tool   Select + right: next special',
      'Keyboard 1: W A S D move   Space jump   F attack   G special   H tool   Q swap   E next tool   T next special',
      'Keyboard 2: arrows move   Enter jump   , attack   . special   / tool   Right Shift swap   \' next tool   ; next special'];
    this.help = this.add.text(W / 2, 150,
      'Press a button to join (up to 4 cats)\n' + (MODE === 'brawler' ? brawler : platformer).join('\n') + '\n' +
      'Keep pressing attack for a combo. Attack in the air for a tail somersault.\n' +
      'Touch: buttons at the bottom of the screen\n' +
      'Pause: Start or P      Start over: R, hold Start, or tap \u21BB twice      Sound: M      Hitboxes: `',
      { ...st, fontSize: '14px', align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0);
  }

  // list: [{ n, hp, max, down, status, special: { icon, charge: 0..1 }, tool: { icon, left } | null }], in player order.
  // (The platformer still sends { label, color } instead of n/hp/max; that is shown as plain text.)
  setPlayers(list, joinable = true) {      // joinable: show 'press a button to join' in the next free slot
    const g = this.gauges; g.clear();
    this.rows.forEach((row, i) => {
      const p = list[i];
      for (const k of ['tag', 'label', 'special', 'tool', 'left']) row[k].setVisible(!!p && (k === 'tag' || k === 'label' || k === 'special' || !!p.tool));
      row.mate.setVisible(false);
      row.tag.setAlpha(1); row.label.setAlpha(1);
      if (!p) {
        row.picture.setVisible(false); row.toolPic.setVisible(false); row.hearts.forEach(h => h.setVisible(false));
        if (joinable && i === list.length && list.length && MODE === 'brawler') {             // the next free slot: anyone can still join
          row.tag.setVisible(true).setAlpha(0.55); row.label.setVisible(true).setAlpha(0.7).setX(row.x + 28).setFontSize(13).setText('press a button to join');
        }
        return;
      }
      if (p.picking) {                                 // still choosing a team: see the picker below the row
        for (const k of ['special', 'tool', 'left']) row[k].setVisible(false);
        row.picture.setVisible(false); row.toolPic.setVisible(false); row.hearts.forEach(h => h.setVisible(false));
        row.label.setX(row.x + 28).setText('picking...').setFontSize(14); return;
      }
      const color = p.color || PLAYER_COLORS[i].hex;
      const drawnHearts = this.textures.exists('icons') && !p.label && !p.down;
      row.hearts.forEach(h => h.setVisible(false));
      if (p.label) {                                   // just a line of text (the climb, the platformer)
        row.tag.setVisible(false); row.label.setX(row.x).setText(p.label).setFontSize(14);
        if (!p.special) { for (const k of ['special', 'tool', 'left']) row[k].setVisible(false); row.picture.setVisible(false); row.toolPic.setVisible(false); return; }
      }
      else if (drawnHearts) {                          // a row of drawn hearts, smaller when there are many
        const size = p.max > 9 ? 11 : 14, gap = size + 1;
        for (let k = 0; k < p.max; k++) {
          const h = row.hearts[k] || (row.hearts[k] = this.add.image(0, 0, 'icons', ICON.heart).setOrigin(0, 0.5));
          h.setFrame(k < p.hp ? ICON.heart : ICON.heartEmpty).setDisplaySize(size, size).setPosition(row.x + 28 + k * gap, row.y + 10).setVisible(true);
        }
        row.label.setX(row.x + 28 + p.max * gap + 2).setText(p.status || '').setFontSize(14);
      } else row.label.setX(row.x + 28).setText((p.down ? 'netted!' : '\u2665'.repeat(p.hp) + '\u2661'.repeat(Math.max(0, p.max - p.hp))) + (p.status ? ' ' + p.status : ''))
        .setFontSize(p.max > 9 ? 13 : 16);
      const ready = p.special.charge >= 1, w = 44, h = 8, by = row.y + 30;
      const iconed = this.textures.exists('icons') && p.special.frame !== undefined, drawn = iconed || !!p.special.image;
      row.special.setText(p.special.icon).setAlpha(ready ? 1 : 0.45).setVisible(!drawn);
      row.picture.setVisible(drawn).setAlpha(ready ? 1 : 0.45);
      if (iconed) row.picture.setTexture('icons', p.special.frame).setDisplaySize(20, 20);
      else if (drawn) row.picture.setTexture(p.special.image).setDisplaySize(26, 14);
      const bx = row.x + (drawn ? (iconed ? 21 : 26) : row.special.width) + 5;
      g.fillStyle(0x1c1630, 1); g.fillRect(bx - 2, by - 2, w + 4, h + 4);
      g.fillStyle(0xffffff, 0.18); g.fillRect(bx, by, w, h);
      g.fillStyle(ready ? color : 0xffffff, ready ? 1 : 0.5); g.fillRect(bx, by, w * p.special.charge, h);
      row.toolPic.setVisible(false);
      if (!p.tool) return;
      const x = bx + w + 14, toolIcon = this.textures.exists('icons') && p.tool.frame !== undefined;
      row.tool.setText(p.tool.icon).setX(x).setAlpha(p.tool.left ? 1 : 0.35).setVisible(!toolIcon);
      if (toolIcon) row.toolPic.setTexture('icons', p.tool.frame).setDisplaySize(20, 20).setX(x).setAlpha(p.tool.left ? 1 : 0.35).setVisible(true);
      row.left.setText('\u00D7' + p.tool.left).setX(x + (toolIcon ? 21 : row.tool.width) + 3).setAlpha(p.tool.left ? 1 : 0.45);
      this.showMate(row, p, row.left.x + row.left.width + 10);
    });
  }

  // The partner waiting on the bench: name and hearts, dimmed while resting from a netting.
  showMate(row, p, x) {
    if (!p.partner) return;
    const m = p.partner;
    const hp = m.hp > 0 ? '\u2665' + m.hp : 'zz', fit = name => row.mate.setText('\u21C4' + name + ' ' + hp);
    fit(m.name); if (x + row.mate.width > row.x + 206) fit(m.name.slice(0, 3));      // never into the next player's row
    row.mate.setX(x).setAlpha(m.hp > 0 ? 1 : 0.5).setVisible(true);
  }

  // A player's team picker, under their row: the cat on offer, what it is good at, and who is picked so far.
  // info: { key, chosen: [keys], slot } or null to close.
  showPicker(slot, info) {
    this.pickers = this.pickers || {};
    let k = this.pickers[slot];
    if (!info) { if (k) k.objs.forEach(o => o.setVisible(false)); return; }
    const x = this.rows[slot].x, y = 50, col = PLAYER_COLORS[slot];
    if (!k) {
      const t = (dx, dy, size, extra = {}) => this.add.text(x + dx, y + dy, '', { ...st, fontSize: size, ...extra });
      k = this.pickers[slot] = {
        bg: this.add.rectangle(x - 4, y, 206, 214, 0x1c1630, 0.9).setOrigin(0, 0).setStrokeStyle(3, col.hex, 1),
        head: t(6, 6, '14px', { fontStyle: 'bold', color: col.css }),
        cat: this.add.image(x + 99, y + 112, 'slash').setOrigin(0.5, 1),
        less: t(10, 80, '22px', { color: '#ffe066' }), more: t(176, 80, '22px', { color: '#ffe066' }),
        name: t(99, 116, '18px', { fontStyle: 'bold' }).setOrigin(0.5, 0),
        blurb: t(99, 140, '12px', { strokeThickness: 3, align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5, 0),
        picked: t(99, 172, '12px', { strokeThickness: 3, color: '#9ad6a0' }).setOrigin(0.5, 0),
        hint: t(99, 192, '11px', { strokeThickness: 3, color: '#ffe066' }).setOrigin(0.5, 0)
      };
      k.less.setText('\u25C0'); k.more.setText('\u25B6');
      k.objs = [k.bg, k.head, k.cat, k.less, k.more, k.name, k.blurb, k.picked, k.hint];
    }
    const c = CATS[info.key], tex = skin(info.key, slot);
    k.head.setText('P' + (slot + 1) + '  pick cat ' + (info.chosen.length + 1) + ' of 2');
    if (this.textures.exists(tex)) { k.cat.setTexture(tex, 0); k.cat.setScale(Math.min(1.25, 76 / k.cat.frame.height)); }
    k.name.setText(c.name); k.blurb.setText(c.blurb);
    k.picked.setText(info.chosen.length ? 'Picked: ' + info.chosen.map(key => CATS[key].name).join(', ') : '');
    k.hint.setText('attack: pick    special: undo');
    k.objs.forEach(o => o.setVisible(true));
  }

  // The party's golden paws, under the street name.
  setPaws(n) {
    if (!this.pawText) {
      this.pawIcon = this.textures.exists('icons') ? this.add.image(0, 85, 'icons', ICON.paw).setDisplaySize(18, 18) : null;
      this.pawText = this.add.text(W - 12, 76, '', { ...st, fontSize: '16px', fontStyle: 'bold', color: '#ffe066' }).setOrigin(1, 0);
    }
    const on = state.party.length > 0;
    this.pawText.setText((this.pawIcon ? '' : '\uD83D\uDC3E ') + n).setVisible(on);
    if (this.pawIcon) this.pawIcon.setX(W - 24 - this.pawText.width).setVisible(on);
  }

  // Party hit counter: shown from 3 hits up, pops when it grows.
  setCombo(n) {
    this.combo.setVisible(n >= 3);
    if (n >= 3 && n !== this.comboShown) {
      this.combo.setText(n + ' HITS'); this.combo.setScale(1.3);
      this.tweens.killTweensOf(this.combo); this.tweens.add({ targets: this.combo, scale: 1, duration: 140 });
    }
    this.comboShown = n;
  }

  // boss: { name, hp: 0..1, raging } or null
  setBoss(boss) {
    const g = this.bossBar; g.clear(); this.bossName.setVisible(!!boss);
    if (!boss) return;
    this.bossName.setText(boss.name);
    const w = 380, x = W / 2 - w / 2, y = 74;
    g.fillStyle(0x1c1630, 1); g.fillRect(x - 3, y - 3, w + 6, 16);
    g.fillStyle(0xffffff, 0.18); g.fillRect(x, y, w, 10);
    g.fillStyle(boss.raging ? 0xff5a5a : 0xffb84a, 1); g.fillRect(x, y, w * Math.max(0, boss.hp), 10);
  }

  update() {
    // Losing focus (on an iPad: a shoulder button) freezes the game where it is, so no one is netted while the
    // controller is away; it carries on by itself a moment after the tap that brings the controller back.
    const focused = document.hasFocus();
    this.focusHint.setVisible(!focused).setDepth(20);
    if (!focused && state.party.length && !this.paused) { this.setPaused(true, true); this.autoPaused = true; this.backAt = 0; }
    if (focused && this.autoPaused) {
      if (!this.backAt) { this.backAt = performance.now() + 700; this.showBanner('Ready...', 650); }
      else if (performance.now() > this.backAt) { this.autoPaused = false; this.setPaused(false); }
    }
    const quiet = needsUnlock() && document.hasFocus();
    if (!this.soundHint) this.soundHint = this.add.text(W / 2, 528, '\u{1F507} Click, tap or press a key to turn the sound on   (a controller button does not count)',
      { ...st, fontSize: '14px', color: '#ffe066' }).setOrigin(0.5, 1).setDepth(10);
    this.soundHint.setVisible(quiet && !this.paused);
    if (consume('KeyM')) this.showBanner(toggleMute() ? 'Sound off  (M)' : 'Sound on', 1000), this.drawAudio();
    if (this.paused) this.readAudioInput();
    const toggle = consume('KeyP', 9) | consume('Pause');                             // always read, so a press on the title is not saved up
    if (!state.party.length) {
      if (this.paused) this.setPaused(false);
      if (consume('KeyC') && this.titleArt) { this.helpOpen = !this.helpOpen; this.showTitle(this.titleOn); }
      return;
    }
    if (toggle) { this.autoPaused = false; this.setPaused(!this.paused); }          // Start / + on a controller
    else if (this.paused && (held(9, 1200) | consume('KeyR') | consume('Restart'))) {   // the game scene is asleep, so start over from here
      this.setPaused(false); resetState();
      if (this.gameKey === 'climb') { this.scene.stop('climb'); this.scene.start('brawl', { room: AREAS[run.area].streets[0] }); }
      else this.scene.get(this.gameKey).scene.restart({ room: MODE === 'brawler' ? AREAS[run.area].streets[0] : ROOMS[0] });
    }
  }

  // Pausing puts the game scene to sleep: its update, tweens, animations and timers all stop. Phaser's scene clock
  // would jump forward by the length of the pause on waking (it follows the game clock), and every "until" time in
  // the game is measured on it, so the clock is wrapped once to leave paused time out.
  get gameKey() { return this.scene.isActive('climb') || this.scene.isPaused('climb') ? 'climb' : MODE === 'brawler' ? 'brawl' : 'room'; }
  setPaused(on, quiet = false) {
    const game = this.scene.get(this.gameKey), clock = game.time, loop = this.game.loop;
    if (clock.skipped === undefined) {
      const update = clock.update, events = game.sys.events; clock.skipped = 0;
      clock.update = function (time, delta) { update.call(this, time - this.skipped, delta); };
      events.off('update', update, clock); events.on('update', clock.update, clock);      // swap the listener already registered; restarts pick up the new one
    }
    if (on === this.paused) return;
    this.paused = on;
    if (on) { this.pausedAt = loop.time; this.scene.pause(this.gameKey); }
    else { clock.skipped += loop.time - this.pausedAt; this.scene.resume(this.gameKey); }
    this.shade.setVisible(on);
    for (const o of [this.pausedText, this.pausedHint, ...this.manual, ...this.audioObjs]) o.setVisible(on && !quiet);
    if (on) { this.audioStick = {}; for (const src in SOURCES) { const r = SOURCES[src](); if (r) this.audioStick[src] = { x: r.x || 0, y: r.y || 0 }; } this.drawAudio(); }
    sfx('pause');
  }

  // One push of a stick, d-pad or key moves one step; holding it does not repeat.
  readAudioInput() {
    for (const src in SOURCES) {
      const r = SOURCES[src](); if (!r) continue;
      const was = this.audioStick[src] || { x: 0, y: 0 }, x = r.x || 0, y = r.y || 0;
      if (y && y !== was.y) { this.audioRow = (this.audioRow + 1) % this.audioLines.length; this.drawAudio(); }
      if (x && x !== was.x) this.nudgeVolume(x);
      this.audioStick[src] = { x, y };
    }
  }

  nudgeVolume(dir) {
    const key = this.audioLines[this.audioRow].key;
    if (settings.muted) toggleMute();
    setVolume(key, settings[key] + dir * 0.1);
    this.drawAudio(); if (key === 'effects') sfx('cycle');
  }

  drawAudio() {
    this.audioLines.forEach((l, i) => {
      const v = Math.round(settings[l.key] * 10), on = i === this.audioRow;
      l.label.setText((on ? '\u25B8 ' : '') + (l.key === 'music' ? 'Music' : 'Effects')).setColor(on ? '#ffe066' : '#ffffff');
      l.bar.setText(settings.muted ? 'muted (M)' : '\u25A0'.repeat(v) + '\u25A1'.repeat(10 - v)).setAlpha(on ? 1 : 0.7);
      l.more.setX(l.bar.x + l.bar.width + 12);
    });
  }

  showTitle(on) {
    // The painted title screen (art/raw/title.png) fills the screen, logo and all. Without it: the drawn logo
    // (art/raw/logo.png) or the title text, over the street.
    const art = this.textures.exists('title');
    if (art && !this.titleArt) {
      this.titleArt = this.add.image(W / 2, H / 2, 'title').setDisplaySize(W, H).setDepth(-10);
      const corner = (x, ox) => this.add.text(x, 516, '', { ...st, fontSize: '18px', fontStyle: 'bold', color: '#ffe066', strokeThickness: 6, align: 'center', lineSpacing: 2 }).setOrigin(ox, 1);
      this.areaPick = corner(150, 0.5); this.levelPick = corner(W - 150, 0.5);
      this.helpBack = this.add.rectangle(W / 2, 270, 900, 250, 0x1a1030, 0.85).setStrokeStyle(2, 0xffe066).setDepth(-1);
      this.helpHint = this.add.text(10, 8, 'C or tap: controls', { ...st, fontSize: '13px' }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.helpOpen = !this.helpOpen; this.showTitle(true); });
    }
    if (!this.logo && !art && this.textures.exists('logo')) { this.logo = this.add.image(W / 2, 92, 'logo'); this.logo.setScale(Math.min(640 / this.logo.width, 100 / this.logo.height)); }
    this.titleOn = on; document.body.classList.toggle('title', on);
    this.title.setVisible(on && !art && !this.logo); if (this.logo) this.logo.setVisible(on);
    if (!this.areaLine) this.areaLine = this.add.text(W / 2, 462, '', { ...st, fontSize: '22px', fontStyle: 'bold', color: '#ffe066', strokeThickness: 6 }).setOrigin(0.5);
    const picks = on && MODE === 'brawler' && AREAS.length > 1, diff = (DIFFICULTY[run.difficulty] || DIFFICULTY.normal).name;
    if (art) {
      this.titleArt.setVisible(on); this.helpHint.setVisible(on);
      this.help.setVisible(on && !!this.helpOpen).setY(160); this.helpBack.setVisible(on && !!this.helpOpen);
      this.areaLine.setVisible(false);
      this.areaPick.setVisible(picks).setText(AREAS.length ? '\u25C0  ' + AREAS[run.area].name + '  \u25B6\nleft / right: area' : '');
      this.levelPick.setVisible(picks).setText('\u25B2  ' + diff + '  \u25BC\nup / down: difficulty');
      return;
    }
    this.help.setVisible(on);
    this.areaLine.setVisible(picks);
    if (on && AREAS.length) this.areaLine.setText('\u25C0   Start in: ' + AREAS[run.area].name + '   \u25B6\n\u25B2   ' +
      diff + '   \u25BC\nleft / right: area     up: harder   down: easier');
  }

  // hold = ms before fading out; 0 keeps it up.
  showBanner(text, hold) {
    this.banner.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    if (hold) this.tweens.add({ targets: this.banner, alpha: 0, delay: hold, duration: 500 });
  }
}
