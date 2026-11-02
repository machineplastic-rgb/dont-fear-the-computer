'use strict';
// Menú OSD, SECTORS (12 tarjetas), SYSTEM, MEMORY CORE, SHUTDOWN, GAME OVER (Error 404) y final.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;

  // cabecera estilo OSD: "------ MENU ------"
  function osdHeader(label, y) {
    const mw = G.textW(label, 2);
    G.text(label, G.W / 2, y, W, { s: 2, al: 'c' });
    const l0 = 6, l1 = Math.floor(G.W / 2 - mw / 2 - 6), r0 = Math.ceil(G.W / 2 + mw / 2 + 6), r1 = G.W - 6;
    for (const yy of [y + 6, y + 7]) { G.dash(l0, yy, l1 - l0, W, 5, 3); G.dash(r0, yy, r1 - r0, W, 5, 3); }
  }
  function osdDivider(y) { G.dash(6, y, G.W - 12, W, 5, 3); G.dash(6, y + 1, G.W - 12, W, 5, 3); }
  function vhsTrack(g, y) { if (y > 0 && y < G.H - 8) g.drawImage(G.cv, 0, y, G.W, 7, G.irand(2, 5), y, G.W, 7); }
  G.osdHeader = osdHeader;

  G.jackIn = function () {
    const sv = G.save.data; let best = null;
    for (let n = 1; n <= sv.unlocked; n++) if (!G.save.lv(n).clears) { best = n; break; }
    if (!best) { let mt = 9; for (let n = 1; n <= sv.unlocked; n++) { const l = G.save.lv(n); if (l.tier < mt) { mt = l.tier; best = n; } } }
    best = best || 1;
    G.go('game', { level: best, tier: G.save.lv(best).tier });
  };

  // ================= MENÚ =================
  G.scenes.menu = {
    items: [['JACK IN', 'play'], ['SECTORS', 'sectors'], ['SYSTEM', 'system'], ['MEMORY CORE', 'memory'], ['SHUTDOWN', 'shutdown']],
    enter(p) { this.sel = p && p.sel != null ? p.sel : 0; this.act = -1; this.at = 0; this.track = -80; A().music('ambient'); A().intensity(0); A().loop('hum', false); G.fx.abBase = 1.6; },
    lay() {
      const top = G.safeT + 12, by = G.H - G.safeB - 40;
      const step = Math.round(G.clamp((by - top - 100) / 6, 23, 34));
      return { top, y0: top + 58 + Math.round((step - 23) * 0.8), step, eY: top + 30 + Math.round((step - 23) * 0.4) };
    },
    update(dt) {
      if (this.act >= 0) { this.at += dt; if (this.at > 0.32) { const a = this.items[this.act][1]; this.act = -1; this.run(a); return; } }
      this.track += dt * 70; if (this.track > G.H + 20) this.track = -G.irand(80, 400);
      G.fx.abBase = 1.6 + (Math.random() < 0.03 ? G.rand(1, 3) : 0);
    },
    run(a) {
      if (a === 'play') G.jackIn();
      else G.go(a);
    },
    draw(g) {
      const Wd = G.W, Hd = G.H, L0 = this.lay();
      G.rect(0, 0, Wd, Hd, B);
      osdHeader('MENU', L0.top);
      G.text('ENTER THE VOID', 9, L0.eY, W, { s: 2 });
      this.items.forEach(([lb], i) => {
        const y = L0.y0 + i * L0.step;
        const flashing = this.act === i && Math.floor(this.at * 16) % 2 === 0;
        if (flashing) G.rect(6, y - 3, Wd - 12, 20, W);
        const col = flashing ? B : W;
        const arrowOn = i !== this.sel || Math.floor(G.time * 3) % 2 === 0;
        if (arrowOn) G.text('➤', 10 + (i === this.sel ? 2 : 0), y, col, { s: 2 });
        G.text(lb, 30, y, col, { s: 2 });
      });
      osdDivider(L0.y0 + this.items.length * L0.step + 2);
      const by = Hd - G.safeB - 40;
      G.text('SELECT :▲▼ TOUCH', 9, by, W); G.text('SET    :➤ TOUCH', 9, by + 11, W); G.text('END    :SHUTDOWN', 9, by + 22, W);
      const el = Math.floor(this.t);
      const clock = Math.floor(el / 3600) + ':' + String(Math.floor(el / 60) % 60).padStart(2, '0') + ':' + String(el % 60).padStart(2, '0');
      G.text('PLAY   SP', Wd - 9, by - 30, W, { al: 'r' });
      G.text(clock, Wd - 9, by - 19, W, { s: 2, al: 'r' });
      vhsTrack(g, Math.floor(this.track));
      G.drawNoise(0.03);
    },
    tap(x, y) {
      if (this.act >= 0) return;
      const L0 = this.lay();
      for (let i = 0; i < this.items.length; i++) {
        const yy = L0.y0 + i * L0.step;
        if (y >= yy - 5 && y < yy + 18) { this.sel = i; this.act = i; this.at = 0; A().sfx('tap'); G.pulse({ ab: 3 }); return; }
      }
    },
    key(k) {
      if (this.act >= 0) return;
      if (k === 'ArrowUp') { this.sel = (this.sel + 4) % 5; A().sfx('tap'); }
      if (k === 'ArrowDown') { this.sel = (this.sel + 1) % 5; A().sfx('tap'); }
      if (k === 'Enter' || k === ' ') { this.act = this.sel; this.at = 0; A().sfx('tap'); }
    },
  };

  // ================= TARJETA DE SECTOR =================
  G.drawCard = function (n, x, y, w, h, t, ic, lv, locked) {
    const s = G.CARD_SCHEMES[n], Lv = G.LEVELS[n];
    const topH = 11, botH = 26, ih = h - topH - botH;
    G.rect(x, y, w, h, K);
    const mode = Lv.mode === 'micro' ? G.MICRO[Lv.game].cmd : G.MODE_NAMES[Lv.mode];
    if (locked) {
      G.rect(x + 1, y + 1, w - 2, topH - 1, L); G.text('LOCKED', x + 3, y + 3, K);
      G.drect(x + 1, y + topH, w - 2, ih, 8, K, L);
      G.rect(Math.floor(x + w / 2 - 10), Math.floor(y + topH + ih / 2 - 10), 20, 19, L);
      G.drawSpr('lock', Math.floor(x + w / 2 - 7), Math.floor(y + topH + ih / 2 - 7), { '#': K }, 2);
      G.rect(x + 1, y + topH + ih, w - 2, botH - 1, L);
      G.text(mode, x + 3, y + topH + ih + 3, K);
      G.text(G.pad(n, 2), x + w - 3, y + h - 16, K, { s: 2, al: 'r' });
      return;
    }
    G.rect(x + 1, y + 1, w - 2, topH - 1, s.top); G.text(Lv.name, x + 3, y + 3, s.tt);
    G.rect(x + 1, y + topH, w - 2, ih, s.ib);
    for (let gx = x + 6; gx < x + w - 1; gx += 6) G.drect(gx, y + topH, 1, ih, 8, s.grid, null);
    for (let gy = y + topH + 5; gy < y + topH + ih; gy += 6) G.drect(x + 1, gy, w - 2, 1, 8, s.grid, null);
    const T = G.ctx();
    G.target(ic.x); ic.x.clearRect(0, 0, 24, 20); G.ICONS[n](t); G.target(T);
    const sc = ih >= 42 && w >= 52 ? 2 : 1;
    T.drawImage(ic.c, Math.floor(x + w / 2 - 12 * sc), Math.floor(y + topH + ih / 2 - 10 * sc), 24 * sc, 20 * sc);
    G.rect(x + 1, y + topH + ih, w - 2, botH - 1, s.bot);
    G.text(mode, x + 3, y + topH + ih + 3, s.bt);
    G.text(G.pad(n, 2), x + w - 3, y + h - 16, s.nc, { s: 2, al: 'r' });
    if (!lv.clears) { if (Math.floor(t * 2.5) % 2 === 0) G.text('NEW', x + 3, y + h - 10, s.bt); }
    else G.text(G.TIERS[lv.tier], x + 3, y + h - 10, s.bt, { b: lv.tier >= 3 });
  };

  // ================= SECTORS =================
  G.scenes.sectors = {
    enter() { A().music('ambient'); A().intensity(0); A().loop('hum', false); G.fx.abBase = 0.4; this.sel = null; this.anim = 0; this.ic = G.mkCanvas(24, 20); this.layout(); },
    resize() { this.layout(); },
    layout() {
      const top = G.safeT + 2, bot = G.H - G.safeB - 2;
      this.hdr = { x: 2, y: top, w: G.W - 4, h: 13 };
      const footH = 12, gap = 4, gx = 5;
      const availW = G.W - gx * 2, availH = bot - footH - (top + 17);
      const cw = Math.floor((availW - gap * 2) / 3);
      let ch = Math.floor((availH - gap * 3) / 4); ch = Math.min(ch, Math.floor(cw * 1.75));
      const totW = cw * 3 + gap * 2, totH = ch * 4 + gap * 3;
      const x0 = Math.floor((G.W - totW) / 2), y0 = top + 17 + Math.floor((availH - totH) / 2);
      this.cards = [];
      for (let n = 1; n <= 12; n++) { const i = n - 1; this.cards.push({ n, x: x0 + (i % 3) * (cw + gap), y: y0 + Math.floor(i / 3) * (ch + gap), w: cw, h: ch }); }
      this.footY = bot - footH + 3;
      this.cc = G.mkCanvas(cw, ch);
    },
    update(dt) {
      if (this.sel) {
        this.anim += dt;
        if (this.anim > 0.6) { const n = this.sel.n; G.go('game', { level: n, tier: G.save.lv(n).tier }); }
      }
    },
    draw(g) {
      const Wd = G.W, t = this.t;
      G.rect(0, 0, Wd, G.H, W);
      const h = this.hdr;
      G.rect(h.x, h.y, h.w, h.h, K);
      G.text('SECTORS.EXE', h.x + 3, h.y + 3, W);
      const sx0 = h.x + 3 + G.textW('SECTORS.EXE') + 4, sx1 = h.x + h.w - 14;
      for (const k of [3, 5, 7, 9]) G.rect(sx0, h.y + k, sx1 - sx0, 1, W);
      G.drawX({ x: h.x + h.w - 12, y: h.y + 2, w: 9, h: 9 }, W);
      const sv = G.save.data;
      for (const c of this.cards) {
        if (this.sel && this.sel.n === c.n) continue;
        G.drawCard(c.n, c.x, c.y, c.w, c.h, t + c.n * 0.37, this.ic, G.save.lv(c.n), c.n > sv.unlocked);
      }
      G.text('RUN: α β γ Ω+', 5, this.footY, K);
      G.text((sv.beat13 ? '13✓ ' : '') + G.pad(sv.unlocked, 2) + '/12', Wd - 5, this.footY, K, { al: 'r' });
      if (this.sel) {
        const c = this.sel, k = Math.min(1, this.anim / 0.45), e = k * k;
        G.target(this.cc.x); G.drawCard(c.n, 0, 0, c.w, c.h, t, this.ic, G.save.lv(c.n), false); G.target(g);
        const tw = Wd * 1.0, th = G.H * 1.0;
        const ww = G.lerp(c.w, tw, e), hh = G.lerp(c.h, th, e);
        const xx = G.lerp(c.x, (Wd - tw) / 2, e), yy = G.lerp(c.y, (G.H - th) / 2, e);
        if (this.anim < 0.5 || Math.floor(this.anim * 30) % 2) g.drawImage(this.cc.c, Math.floor(xx), Math.floor(yy), Math.floor(ww), Math.floor(hh));
        if (this.anim > 0.45) G.drect(0, 0, Wd, G.H, Math.min(16, Math.floor((this.anim - 0.45) * 110)), K, null);
      }
    },
    tap(x, y) {
      if (this.sel) return;
      const h = this.hdr;
      if (y < h.y + h.h + 3 && x > h.x + h.w - 22) { A().sfx('back'); G.go('menu', { sel: 1 }); return; }
      for (const c of this.cards) if (G.inR(x, y, c)) {
        if (c.n > G.save.data.unlocked) { A().sfx('deny'); G.pulse({ shake: 2 }); return; }
        this.sel = c; this.anim = 0; A().sfx('glitch'); G.pulse({ glitch: 0.7, ab: 4 });
        return;
      }
    },
    key(k) { if (k === 'Escape') G.go('menu', { sel: 1 }); },
  };

  // ================= SYSTEM =================
  G.scenes.system = {
    enter() { G.fx.abBase = 1.4; this.confirm = false; this.track = -100; },
    rows() {
      const s = G.save.data.settings, r = [['MUSIC', s.music ? 'ON' : 'OFF', 'music'], ['SFX', s.sfx ? 'ON' : 'OFF', 'sfx'], ['GLITCH', s.fx ? 'HIGH' : 'LOW', 'fx']];
      if (navigator.vibrate) r.push(['VIBRA', s.vib ? 'ON' : 'OFF', 'vib']);
      r.push(['PROTOCOLS', '', 'protocols']);
      r.push(['ERASE', 'MEMORY', 'erase']); r.push(['BACK', '', 'back']);
      return r;
    },
    lay() { const top = G.safeT + 12; return { top, y0: top + 34, step: 24 }; },
    update(dt) { this.track += dt * 70; if (this.track > G.H + 20) this.track = -G.irand(80, 400); },
    draw(g) {
      G.rect(0, 0, G.W, G.H, B);
      const L0 = this.lay();
      osdHeader('SYSTEM', L0.top);
      this.rows().forEach(([lb, val], i) => {
        const y = L0.y0 + i * L0.step;
        G.text('➤', 10, y, W, { s: 2 }); G.text(lb, 30, y, W, { s: 2 });
        if (val) G.text(val, G.W - 9, y + (val === 'MEMORY' ? 4 : 0), W, { s: val === 'MEMORY' ? 1 : 2, al: 'r' });
      });
      osdDivider(L0.y0 + this.rows().length * L0.step + 2);
      G.text('BUILD ' + G.VERSION + '  //  NEØ OS 98', G.W / 2, G.H - G.safeB - 14, W, { al: 'c' });
      if (this.confirm) {
        G.drect(0, 0, G.W, G.H, 8, K, null);
        const w = { x: Math.floor(G.W / 2 - 70), y: Math.floor(G.H / 2 - 36), w: 140, h: 72, st: G.WSTYLES.b2, title: 'WARNING', stripes: true, xmode: 'none' };
        const r = G.drawFrame(w);
        G.drawSpr('warn', r.x + 5, r.y + 5, { '#': B });
        G.text('ERASE ALL', r.x + 22, r.y + 5, B); G.text('MEMORY?', r.x + 22, r.y + 14, B);
        this.cy = { x: w.x + 22, y: w.y + 50, w: 40, h: 14 }; this.cn = { x: w.x + 78, y: w.y + 50, w: 40, h: 14 };
        G.drawBtn(this.cy.x, this.cy.y, 40, 14, 'YES', B, W); G.drawBtn(this.cn.x, this.cn.y, 40, 14, 'NO', B, W);
      }
      vhsTrack(g, Math.floor(this.track));
      G.drawNoise(0.03);
    },
    tap(x, y) {
      if (this.confirm) {
        if (G.inR(x, y, this.cy, 3)) { G.save.reset(); A().sfx('glitch'); G.pulse({ glitch: 1 }); this.confirm = false; }
        else if (G.inR(x, y, this.cn, 3)) { A().sfx('back'); this.confirm = false; }
        return;
      }
      const L0 = this.lay(), rows = this.rows();
      for (let i = 0; i < rows.length; i++) {
        const yy = L0.y0 + i * L0.step;
        if (y >= yy - 5 && y < yy + 18) {
          const id = rows[i][2], s = G.save.data.settings;
          if (id === 'back') { A().sfx('back'); G.go('menu', { sel: 2 }); return; }
          if (id === 'protocols') { A().sfx('tap'); G.go('protocols'); return; }
          if (id === 'erase') { A().sfx('tap'); this.confirm = true; return; }
          s[id] = s[id] ? 0 : 1; G.save.write(); A().applySettings(); A().sfx('tap');
          if (id === 'vib' && s.vib) G.vibrate(30);
          G.pulse({ ab: 3 });
          return;
        }
      }
    },
    key(k) { if (k === 'Escape') G.go('menu', { sel: 2 }); },
  };

  // ================= PROTOCOLS: cómo se juega (en inglés) =================
  const PROTOCOLS = [
    ['h', 'THE COMPUTER HAS GONE ROGUE.'],
    ['', 'ERRORS, POP-UPS AND VIRUSES ARE TAKING OVER THE DESKTOP. CLEAN IT UP.'],
    ['', ''],
    ['h', 'HOW TO PLAY'],
    ['>', 'JACK IN PLAYS THE NEXT SECTOR. SECTORS LETS YOU PICK ANY SECTOR YOU HAVE UNLOCKED.'],
    ['>', 'SECTOR 01: CLOSE THE WINDOWS BEFORE THEY PILE UP. WATCH OUT FOR FAKE X BUTTONS.'],
    ['>', 'SECTORS 02-12: FAST MICRO-GAMES. READ THE ORDER AND ACT BEFORE THE FUSE BURNS OUT.'],
    ['>', '4 LIVES PER SECTOR. THE LAST ROUND IS ALWAYS A BOSS.'],
    ['>', 'TILT THE PHONE: FLOATING WINDOWS MOVE WITH IT.'],
    ['>', 'THE START BUTTON PAUSES THE GAME.'],
    ['', ''],
    ['h', 'RUNS: α > β > γ > Ω+'],
    ['>', 'CLEARING A SECTOR UNLOCKS THE NEXT ONE AND A HARDER RUN OF THE SAME SECTOR.'],
    ['>', 'EACH RUN ADDS ROUNDS, SPEED AND GLITCH. SCORE: α x1, β x1.5, γ x2, Ω+ x2.5.'],
    ['>', 'Ω+ IS THE FINAL OVERCLOCK: TOP SPEED, MAX GLITCH. CLEAR IT TO MASTER THE SECTOR.'],
    ['', ''],
    ['h', 'SECTOR 13'],
    ['>', 'BEAT SECTOR 12 AND SOMETHING WAKES UP. SURVIVE IT, THEN SIGN YOUR INITIALS AND SHARE YOUR RECORD.'],
  ];
  G.scenes.protocols = {
    enter() { G.fx.abBase = 1.2; this.track = -100; this.scroll = 0; this.drag = null; this.build(); },
    resize() { this.build(); },
    build() { // líneas ya cortadas al ancho de la pantalla
      this.lines = [];
      for (const [k, t] of PROTOCOLS) {
        if (!t) { this.lines.push({ t: '', k }); continue; }
        G.wrap(t, G.W - (k === '>' ? 30 : 18)).forEach((ln, i) => this.lines.push({ t: ln, k, first: i === 0 }));
      }
    },
    view() { const top = G.safeT + 12; return { top, y0: top + 28, y1: G.H - G.safeB - 34 }; },
    maxScroll() { const v = this.view(); return Math.max(0, this.lines.length * 10 - (v.y1 - v.y0)); },
    update(dt) { this.track += dt * 70; if (this.track > G.H + 20) this.track = -G.irand(80, 400); },
    draw(g) {
      G.rect(0, 0, G.W, G.H, B);
      const v = this.view();
      osdHeader('PROTOCOLS', v.top);
      const T = G.ctx(); T.save(); T.beginPath(); T.rect(0, v.y0 - 2, G.W, v.y1 - v.y0 + 2); T.clip();
      this.lines.forEach((ln, i) => {
        const y = Math.round(v.y0 + i * 10 - this.scroll); if (y < v.y0 - 10 || y > v.y1) return;
        if (ln.k === 'h') G.text(ln.t, 9, y, W, { b: true });
        else if (ln.k === '>') { if (ln.first) G.text('➤', 9, y, Gr); G.text(ln.t, 21, y, W); }
        else G.text(ln.t, 9, y, L);
      });
      T.restore();
      if (this.maxScroll() > 0) { const v2 = v.y1 - v.y0, th = Math.max(12, v2 * v2 / (v2 + this.maxScroll())), ty = v.y0 + (v2 - th) * (this.scroll / this.maxScroll()); G.rect(G.W - 4, v.y0, 1, v2, W); G.rect(G.W - 5, Math.round(ty), 3, Math.round(th), W); }
      osdDivider(v.y1 + 2);
      G.text('➤', 10, v.y1 + 10, W, { s: 2 }); G.text('BACK', 30, v.y1 + 10, W, { s: 2 });
      vhsTrack(g, Math.floor(this.track));
      G.drawNoise(0.03);
    },
    tap(x, y) { this.drag = { y, s: this.scroll, moved: false }; },
    move(x, y) { if (!this.drag) return; const dy = this.drag.y - y; if (Math.abs(dy) > 3) this.drag.moved = true; this.scroll = G.clamp(this.drag.s + dy, 0, this.maxScroll()); },
    up(x, y) { const d = this.drag; this.drag = null; if (d && !d.moved && y > this.view().y1) { A().sfx('back'); G.go('system'); } },
    key(k) { if (k === 'Escape' || k === 'Enter') G.go('system'); if (k === 'ArrowDown') this.scroll = Math.min(this.maxScroll(), this.scroll + 20); if (k === 'ArrowUp') this.scroll = Math.max(0, this.scroll - 20); },
  };

  // ================= RÉCORD: tres letras, tabla y compartir =================
  const INI = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  G.scenes.record = {
    enter(p) {
      this.score = (p && p.score) || 0; this.phase = 'enter'; this.msg = ''; this.mt = 0; this.file = null;
      this.ch = (G.save.data.initials || 'AAA').split('').map((c) => Math.max(0, INI.indexOf(c)));
      this.cur = 0; G.fx.abBase = 1.2; this.track = -100;
    },
    name() { return this.ch.map((i) => INI[i]).join(''); },
    lay() { const cy = Math.round(G.H * 0.46), sw = 40, gap = 10, x0 = Math.round(G.W / 2 - (sw * 3 + gap * 2) / 2); return { cy, sw, gap, x0, ok: { x: Math.round(G.W / 2 - 40), y: cy + 74, w: 80, h: 20 } }; },
    blay() { const by = G.H - G.safeB - 30; return { share: { x: 10, y: by, w: Math.floor(G.W / 2) - 15, h: 20 }, cont: { x: Math.floor(G.W / 2) + 5, y: by, w: Math.floor(G.W / 2) - 15, h: 20 } }; },
    update(dt) { this.track += dt * 70; if (this.track > G.H + 20) this.track = -G.irand(80, 400); if (this.mt > 0) this.mt -= dt; },
    confirm() {
      const sv = G.save.data, n = this.name();
      sv.initials = n;
      const e = { n, s: this.score, t: Date.now() };
      sv.hof.push(e); sv.hof.sort((a, b) => b.s - a.s); sv.hof = sv.hof.slice(0, 8); G.save.write();
      this.rank = sv.hof.indexOf(e); this.phase = 'board'; A().sfx('ok'); G.pulse({ flash: 0.3, flashCol: W, ab: 3 });
      this.prepShare();
    },
    // tarjeta para compartir (imagen con nombre y puntuación)
    card() {
      const w = 240, h = 300, c = G.mkCanvas(w, h), T = G.ctx(); G.target(c.x);
      try {
        G.rect(0, 0, w, h, B); G.box(4, 4, w - 8, h - 8, W); G.box(7, 7, w - 14, h - 14, W);
        G.text('NEØ OS 98  //  RECORD', w / 2, 14, W, { al: 'c' });
        const f = '700 26px ' + G.FONT_GOTH, a = G.fsprite("(Don't Fear)", f, W, 128), b = G.fsprite('the Computer', f, W, 128);
        c.x.drawImage(a, Math.round(w / 2 - a.width / 2), 30); c.x.drawImage(b, Math.round(w / 2 - b.width / 2), 32 + a.height);
        const y0 = 40 + a.height * 2;
        G.dash(20, y0, w - 40, W, 3, 2);
        G.text('USER', w / 2, y0 + 12, L, { al: 'c' }); G.text(this.name(), w / 2, y0 + 24, W, { s: 5, al: 'c', b: true });
        G.text('FINAL SCORE', w / 2, y0 + 70, L, { al: 'c' }); G.text(G.pad(this.score, 7), w / 2, y0 + 82, Gr, { s: 3, al: 'c', b: true });
        G.text('SECTOR 13 CLEARED ✓', w / 2, y0 + 112, W, { al: 'c' });
        const dt = new Date(); G.text(dt.getFullYear() + '.' + String(dt.getMonth() + 1).padStart(2, '0') + '.' + String(dt.getDate()).padStart(2, '0'), w / 2, y0 + 124, L, { al: 'c' });
        G.drect(8, h - 30, w - 16, 3, 8, Gr, null);
        G.text('CAN YOU BEAT IT?', w / 2, h - 22, W, { al: 'c', b: true });
      } finally { G.target(T); }
      const big = document.createElement('canvas'); big.width = w * 3; big.height = h * 3; const x = big.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c.c, 0, 0, w * 3, h * 3);
      return big;
    },
    prepShare() { // se prepara antes del toque: compartir tiene que salir del propio toque
      try { this.card().toBlob((bl) => { if (bl) { try { this.file = new File([bl], 'dont-fear-the-computer-record.png', { type: 'image/png' }); } catch (e) { this.file = null; } } }, 'image/png'); } catch (e) { this.file = null; }
    },
    share() {
      const url = location.origin + location.pathname;
      const text = this.name() + ' SCORED ' + this.score + " IN (DON'T FEAR) THE COMPUTER. CAN YOU BEAT IT?";
      const data = { title: "(Don't Fear) the Computer", text: text + ' ' + url };
      try { if (this.file && navigator.canShare && navigator.canShare({ files: [this.file] })) data.files = [this.file]; } catch (e) { }
      const say = (m) => { this.msg = m; this.mt = 2.5; };
      if (navigator.share) navigator.share(data).then(() => say('SHARED!')).catch(() => { });
      else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data.text).then(() => say('COPIED TO CLIPBOARD'), () => say('CANNOT SHARE HERE'));
      else say('CANNOT SHARE HERE');
    },
    draw(g) {
      G.rect(0, 0, G.W, G.H, B);
      const top = G.safeT + 12;
      if (this.phase === 'enter') {
        osdHeader('RECORD', top);
        G.text('FINAL SCORE', G.W / 2, top + 28, L, { al: 'c' });
        G.text(G.pad(this.score, 7), G.W / 2, top + 40, W, { s: 3, al: 'c', b: true });
        G.text('ENTER YOUR INITIALS', G.W / 2, top + 76, W, { al: 'c', b: true });
        const L0 = this.lay();
        for (let i = 0; i < 3; i++) {
          const x = L0.x0 + i * (L0.sw + L0.gap), on = i === this.cur;
          G.text('▲', x + L0.sw / 2, L0.cy - 30, on ? Gr : W, { s: 2, al: 'c' });
          G.rect(x, L0.cy - 8, L0.sw, 44, on ? W : B); G.box(x, L0.cy - 8, L0.sw, 44, W);
          G.text(INI[this.ch[i]], x + L0.sw / 2 + 1, L0.cy + 1, on ? B : W, { s: 4, al: 'c', b: true });
          if (on && Math.floor(G.time * 3) % 2) G.rect(x + 6, L0.cy + 31, L0.sw - 12, 2, B);
          G.text('▼', x + L0.sw / 2, L0.cy + 44, on ? Gr : W, { s: 2, al: 'c' });
        }
        G.drawBtn(L0.ok.x, L0.ok.y, L0.ok.w, L0.ok.h, 'OK', W, B, false, { double: true });
      } else {
        osdHeader('HALL OF FAME', top);
        const hof = G.save.data.hof, y0 = top + 30;
        hof.forEach((e, i) => {
          const y = y0 + i * 18, me = i === this.rank, blink = me && Math.floor(G.time * 4) % 2;
          if (blink) G.rect(6, y - 3, G.W - 12, 15, W);
          const col = blink ? B : me ? Gr : W;
          G.text((i + 1) + '.', 10, y, col, { s: 1 }); G.text(e.n, 26, y - 2, col, { s: 2, b: true });
          G.dash(70, y + 6, G.W - 150, col, 1, 2); G.text(G.pad(e.s, 7), G.W - 10, y - 2, col, { s: 2, al: 'r' });
        });
        osdDivider(y0 + 8 * 18 + 2);
        G.text('RECORDS ARE SAVED ON THIS DEVICE.', G.W / 2, y0 + 8 * 18 + 12, L, { al: 'c' });
        G.text('SHARE YOURS:', G.W / 2, y0 + 8 * 18 + 22, L, { al: 'c' });
        const bl = this.blay();
        G.drawBtn(bl.share.x, bl.share.y, bl.share.w, bl.share.h, 'SHARE', B, W, false, { double: true });
        G.drawBtn(bl.cont.x, bl.cont.y, bl.cont.w, bl.cont.h, 'CONTINUE', W, B, false, { double: true });
        if (this.mt > 0) { const mw = G.textW(this.msg, 1, 1, true) + 12; G.rect(G.W / 2 - mw / 2, bl.share.y - 22, mw, 13, W); G.text(this.msg, G.W / 2, bl.share.y - 19, B, { al: 'c', b: true }); }
      }
      vhsTrack(g, Math.floor(this.track));
      G.drawNoise(0.03);
    },
    tap(x, y) {
      if (this.phase === 'enter') {
        const L0 = this.lay();
        if (G.inR(x, y, L0.ok, 4)) return this.confirm();
        for (let i = 0; i < 3; i++) {
          const sx = L0.x0 + i * (L0.sw + L0.gap);
          if (x < sx - 4 || x > sx + L0.sw + 4) continue;
          this.cur = i;
          if (y < L0.cy - 10 && y > L0.cy - 50) this.ch[i] = (this.ch[i] + 1) % INI.length;
          else if (y > L0.cy + 36 && y < L0.cy + 66) this.ch[i] = (this.ch[i] + INI.length - 1) % INI.length;
          A().sfx('tap'); return;
        }
        return;
      }
      const bl = this.blay();
      if (G.inR(x, y, bl.share, 4)) { A().sfx('tap'); this.share(); }
      else if (G.inR(x, y, bl.cont, 4)) { A().sfx('tap'); G.go('menu'); }
    },
    key(k) {
      if (this.phase === 'enter') {
        const u = k.length === 1 ? k.toUpperCase() : k;
        if (u.length === 1 && INI.indexOf(u) >= 0) { this.ch[this.cur] = INI.indexOf(u); this.cur = Math.min(2, this.cur + 1); A().sfx('tap'); }
        else if (k === 'ArrowUp') this.ch[this.cur] = (this.ch[this.cur] + 1) % INI.length;
        else if (k === 'ArrowDown') this.ch[this.cur] = (this.ch[this.cur] + INI.length - 1) % INI.length;
        else if (k === 'ArrowLeft' || k === 'Backspace') this.cur = Math.max(0, this.cur - 1);
        else if (k === 'ArrowRight') this.cur = Math.min(2, this.cur + 1);
        else if (k === 'Enter') this.confirm();
      } else if (k === 'Enter' || k === 'Escape') G.go('menu');
    },
  };

  // ================= MEMORY CORE =================
  G.scenes.memory = {
    enter() { G.fx.abBase = 1.4; this.track = -100; },
    update(dt) { this.track += dt * 70; if (this.track > G.H + 20) this.track = -G.irand(80, 400); },
    draw(g) {
      G.rect(0, 0, G.W, G.H, B);
      const top = G.safeT + 12, sv = G.save.data;
      osdHeader('MEMORY', top);
      G.text('CORE', G.W / 2, top + 20, W, { al: 'c' });
      let y = top + 36, tot = 0;
      const step = Math.min(14, Math.floor((G.H - G.safeB - 60 - y) / 14));
      for (let n = 1; n <= 13; n++) {
        let line;
        if (n === 13) line = sv.beat13 ? '13 SERPENT   ' + G.pad(sv.best13 || 0, 6) + ' ✓' : '13 ?????????  ------';
        else if (n > sv.unlocked) line = G.pad(n, 2) + ' ?????????  ------ -';
        else { const l = G.save.lv(n); tot += l.best; const nm = G.LEVELS[n].name.padEnd(9, ' '); line = G.pad(n, 2) + ' ' + nm + '  ' + G.pad(l.best, 6) + ' ' + (l.clears ? G.TIERS[l.tier] : '-'); }
        if (n === 13) tot += sv.best13 || 0;
        G.text(line, 9, y, W); y += step;
      }
      G.dash(6, y + 2, G.W - 12, W, 5, 3);
      G.text('TOTAL', 9, y + 8, W); G.text(G.pad(tot, 7), G.W - 9, y + 8, W, { al: 'r' });
      const by = G.H - G.safeB - 24;
      G.text('➤', 10, by, W, { s: 2 }); G.text('BACK', 30, by, W, { s: 2 });
      vhsTrack(g, Math.floor(this.track));
      G.drawNoise(0.03);
    },
    tap(x, y) { if (y > G.H - G.safeB - 34) { A().sfx('back'); G.go('menu', { sel: 3 }); } },
    key(k) { if (k === 'Escape' || k === 'Enter') G.go('menu', { sel: 3 }); },
  };

  // ================= SHUTDOWN =================
  // ventana de apagado sobre azul con aberración → pantalla negra: el cursor parpadea 4 veces,
  // se teclea END OF PART 1 (texto con brillo de CRT) y un segundo después la pantalla se apaga como un monitor de tubo
  const END_TXT = 'END OF PART 1', END_COL = '#cfeff6', END_GLOW = 'rgba(150,225,255,0.85)';
  G.scenes.shutdown = {
    enter() {
      A().stopMusic(); A().sfx('glitch'); G.fx.abBase = 3.2; G.pulse({ glitch: 0.5, ab: 4 });
      this.tBlack = 1.6; this.tType = this.tBlack + 2.0; this.chT = 0.13; // 4 parpadeos de 0,5 s y luego una letra cada 0,13 s
      this.tOff = this.tType + END_TXT.length * this.chT + 1.0; this.n = 0; this.off = false; this.black = false;
    },
    update(dt) {
      const t = this.t;
      if (t < this.tBlack) { G.fx.abBase = 3 + (Math.random() < 0.08 ? G.rand(1, 3) : 0); if (Math.random() < 0.03) G.pulse({ glitch: 0.3 }); }
      else if (!this.black) { this.black = true; G.fx.abBase = 0.6; G.fx.glitchBase = 0; A().sfx('crtOn'); }
      if (t >= this.tType) {
        const n = Math.min(END_TXT.length, Math.floor((t - this.tType) / this.chT) + 1);
        while (this.n < n) { this.n++; if (END_TXT[this.n - 1] !== ' ') A().sfx('type', 1.6); }
      }
      if (!this.off && t > this.tOff) { this.off = true; A().sfx('crtOff'); }
      if (t > this.tOff + 0.75) G.go('power');
    },
    draw(g) {
      const Wd = G.W, Hd = G.H, t = this.t;
      if (t < this.tBlack) {
        G.rect(0, 0, Wd, Hd, B); G.drect(0, 0, Wd, Hd, 1, W, null);
        const w = { x: Math.floor(Wd / 2 - 70), y: Math.floor(Hd / 2 - 30), w: 140, h: 60, st: G.WSTYLES.m1, title: 'SHUTDOWN.EXE', stripes: true, xmode: 'none' };
        const r = G.drawFrame(w);
        G.text('SAVING MEMORY...', r.x + 6, r.y + 6, K);
        const bw = r.w - 12, f = Math.floor((bw - 4) * Math.min(1, t / (this.tBlack - 0.2)));
        G.box(r.x + 6, r.y + 18, bw, 9, K); for (let i = 0; i < f; i += 4) G.rect(r.x + 8 + i, r.y + 20, 3, 5, K);
        return;
      }
      G.rect(0, 0, Wd, Hd, K);
      // cristal del tubo: casi negro con las esquinas redondeadas un pelín más claras
      const T = G.ctx(), gr = T.createRadialGradient(Wd / 2, Hd / 2, 10, Wd / 2, Hd / 2, Math.max(Wd, Hd) * 0.7);
      gr.addColorStop(0, 'rgba(40,48,52,0.55)'); gr.addColorStop(0.75, 'rgba(18,20,22,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      T.fillStyle = gr; T.fillRect(0, 0, Wd, Hd);
      if (t < this.tOff) {
        const s = END_TXT.slice(0, this.n), full = G.textW(END_TXT, 2, 1, true), x0 = Math.round(Wd / 2 - full / 2), y0 = Math.round(Hd / 2 - 7);
        const cursorOn = Math.floor((t - this.tBlack) / 0.25) % 2 === 0;
        // el texto se pinta aparte con las líneas del tubo y luego se pega con brillo
        if (!this.txc) this.txc = G.mkCanvas(full + 20, 16);
        const tc = this.txc; tc.x.clearRect(0, 0, tc.c.width, tc.c.height); G.target(tc.x);
        try {
          if (s) G.text(s, 0, 1, END_COL, { s: 2, b: true });
          if (cursorOn) G.rect(s ? G.textW(s, 2, 1, true) + 3 : 0, 1, 10, 14, END_COL);
          tc.x.globalCompositeOperation = 'destination-out'; tc.x.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 1; y < 16; y += 2) tc.x.fillRect(0, y, tc.c.width, 1); tc.x.globalCompositeOperation = 'source-over';
        } finally { G.target(T); }
        T.save(); T.shadowColor = END_GLOW; T.shadowBlur = 6; T.drawImage(tc.c, x0, y0 - 1); T.restore();
        T.drawImage(tc.c, x0, y0 - 1);
      } else {
        // apagado de CRT: se aplasta a una raya brillante y luego a un punto
        const k = Math.min(1, (t - this.tOff) / 0.5);
        if (k < 0.5) { const hh = Math.max(1, Math.round((1 - k * 2) * 18)); G.rect(0, Math.floor(Hd / 2 - hh / 2), Wd, hh, END_COL); }
        else { const w = Math.max(2, Math.round(Wd * (1 - (k - 0.5) * 2))); G.rect(Math.floor(Wd / 2 - w / 2), Math.floor(Hd / 2), w, 1, W); }
        if (k >= 1) { T.save(); T.shadowColor = END_GLOW; T.shadowBlur = 5; G.rect(Math.floor(Wd / 2) - 1, Math.floor(Hd / 2) - 1, 2, 2, W); T.restore(); }
      }
    },
  };

  // ================= GAME OVER: ERROR 404 =================
  G.scenes.gameover = {
    enter(p) {
      this.p = p || {};
      A().stopMusic(); A().loop('hum', false); A().sfx('toun'); G.vibrate(200);
      G.pulse({ flash: 0.5, flashCol: W, shake: 7, glitch: 0.8 });
      A().loop('hiss', true, 0.011); A().loop('beep', true, 0.0025);
      G.fx.abBase = 2;
      this.t1 = new G.Typer(['PLEASE____INSERT USER____AGAIN'], { speed: 0.05, hold: 1.5 });
      this.t2 = new G.Typer(['INSERT USER', 'PASSWORD'], { speed: 0.07, hold: 2, snd: false });
      this.t3 = new G.Typer(['( LOGIN ) ( REBOOT )', '(LOG OUT) <> END 404'], { speed: 0.04, hold: 2.5, snd: false });
      this.code = 'ERR ' + G.irand(10000, 99999);
      this.t2.t = -0.8; this.t3.t = -1.6;
    },
    exit() { A().loop('hiss', false); A().loop('beep', false); },
    update(dt) { this.t1.update(dt); this.t2.update(dt); this.t3.update(dt); G.fx.abBase = 2 + (Math.random() < 0.05 ? 2 : 0); if (Math.random() < 0.02) G.pulse({ glitch: 0.3 }); },
    draw() {
      const Wd = G.W, Hd = G.H, t = this.t, p = this.p;
      G.rect(0, 0, Wd, Hd, B);
      const top = G.safeT + 4, bot = Hd - G.safeB - 4;
      const lvn = p.level || 0, Lv = G.LEVELS[lvn];
      G.text('- 0 1', 4, top, W); G.text('.SYSTEM FAILURE', 4, top + 9, W);
      G.text('* DESIGNED BY', Wd - 4, top, W, { al: 'r' }); G.text('NOBODY * 1998', Wd - 4, top + 9, W, { al: 'r' });
      const list = ['SECTOR ' + G.pad(lvn, 2), Lv ? Lv.name : 'VOID', 'CLOSED ' + (p.closed || 0), 'LEFT ' + (p.left || 0), p.reason || 'UNKNOWN', 'SCORE ' + G.pad(p.score || 0, 6)];
      list.forEach((s, i) => G.text('.0' + (i + 1) + ' > ' + s, 4, top + 24 + i * 9, W));
      for (let i = 0; i < 4; i++) G.text('.......', Wd - 4, top + 24 + i * 9, W, { al: 'r' });
      const my = top + 84;
      G.text('//', 4, my, W);
      const dl = '(...) DOWNLOADING' + '......'.slice(0, Math.floor(t * 4) % 7);
      G.text(dl, Wd / 2 - 20, my, W, { al: 'c' });
      G.text(')))))'.slice(0, 1 + (Math.floor(t * 6) % 5)), Wd - 4, my, W, { al: 'r' });
      G.text('(YOU ARE THE BACKGROUND NOW)', Wd / 2, my + 12, W, { al: 'c' });
      // ERROR 404 a rayas, con filas que se desplazan
      const big = '{ERR0R 404}';
      let sc = 5; while (sc > 2 && G.stripeW(big, sc, Math.max(1, sc - 2)) > Wd - 8) sc--;
      const by = Math.floor(top + (bot - top) * 0.4);
      G.textStripe(big, Wd / 2, by, W, sc, { al: 'c', spx: Math.max(1, sc - 2), jit: (r) => (Math.floor(t * 8 + r * 3) % 17 === 0 ? G.irand(-3, 3) : 0) });
      G.text('= 01234', 4, by - 14, W); G.text('5678', 30, by + sc * 7 + 6, W);
      G.text('10   11   12   13', 10, by + sc * 7 + 18, W);
      const ix = Wd - 4;
      const s2 = this.t2.text().split('\n'); s2.forEach((ln, i) => G.text('____ ' + ln, ix, by - 30 + i * 9, W, { al: 'r' }));
      const s3 = this.t3.text().split('\n'); s3.forEach((ln, i) => G.text(ln, ix, by + sc * 7 + 30 + i * 9, W, { al: 'r' }));
      G.text('* 2098', ix, by + sc * 7 + 52, W, { al: 'r' });
      const ty = Math.floor(top + (bot - top) * 0.72);
      G.text(this.t1.text() + (this.t1.cursor() ? '_' : ''), 4, ty, W);
      G.text('_ _ _ _ _ _ _ _ PASSWORD', 4, ty + 10, W);
      for (let i = 0; i < 4; i++) G.text('.' + '_.'.repeat(4 - i), 4, ty + 26 + i * 8, W);
      // código de barras
      const bw = Math.floor(Wd * 0.38), bx = Wd - 4 - bw, byy = bot - 42;
      for (let x = 0; x < bw; x++) if ((x * 7 + Math.floor(x / 3)) % 3 !== 0) G.rect(bx + x, byy, 1, 16, W);
      G.text('//', 4, bot - 26, W); G.text('- END OF USER', 4, bot - 17, W); G.text('SECTOR ' + G.pad(lvn, 2) + ' AES', 4, bot - 8, W);
      G.text(this.code, Wd - 4, bot - 8, W, { al: 'r' });
      if (t > 1.2 && Math.floor(t * 2) % 2 === 0) { const ry = Math.floor((ty + 60 + byy) / 2) - 4; G.rect(Wd / 2 - 50, ry - 3, 100, 13, W); G.text('TOUCH TO RETURN', Wd / 2, ry, B, { al: 'c' }); }
      G.drawNoise(0.04);
    },
    tap() { if (this.t < 1.0) return; A().sfx('tap'); G.go('menu'); },
    key(k) { if (k === 'Enter' || k === ' ') this.tap(); },
  };

  // ================= FINAL (tras el nivel 13) =================
  G.scenes.ending = {
    enter(p) {
      this.p = p || {}; G.fx.abBase = 0.4; G.fx.glitchBase = 0;
      this.typer = new G.Typer(['ALL WINDOWS CLOSED.', 'THE VOID IS QUIET.', '', 'YOU ARE FREE, USER.'], { loop: false, speed: 0.06, hold: 99 });
      this.music = false; this.total = G.coreTotal(); // puntuación final = total de todos los sectores
    },
    update(dt) {
      if (this.t > 1.5) this.typer.update(dt);
      if (!this.music && this.t > 5.5) { this.music = true; A().music('ambient'); A().intensity(0); }
    },
    draw(g) {
      const Wd = G.W, Hd = G.H, t = this.t;
      G.rect(0, 0, Wd, Hd, t < 1.2 ? K : B);
      if (t < 1.2) return;
      const ww = Math.min(Wd - 16, 170), wh = 70;
      const w = { x: Math.floor(Wd / 2 - ww / 2), y: Math.floor(G.safeT + Hd * 0.14), w: ww, h: wh, st: G.WSTYLES.m1, title: 'RESTART.EXE', stripes: true, xmode: 'none' };
      const r = G.drawFrame(w);
      G.text(this.typer.text(), r.x + 6, r.y + 6, K);
      if (t > 4) {
        const fs = Math.max(16, Math.floor(Wd / 7));
        const f = '700 ' + fs + 'px ' + G.FONT_GOTH;
        const a = G.fsprite("(Don't Fear)", f, W, 128), b = G.fsprite('the Computer', f, W, 128);
        const yy = w.y + wh + 30;
        g.drawImage(a, Math.floor(Wd / 2 - a.width / 2), yy); g.drawImage(b, Math.floor(Wd / 2 - b.width / 2), yy + a.height + 4);
        // la puntuación final en una ventana flotante verde con brillo
        const sw2 = 150, sh2 = 64, sx = Math.round(Wd / 2 - sw2 / 2 + Math.cos(t * 1.2) * 2), sy = Math.round(yy + a.height * 2 + 18 + Math.sin(t * 1.7) * 3), T = g;
        T.save(); T.shadowColor = 'rgba(70,255,0,0.75)'; T.shadowBlur = 12; G.rect(sx, sy, sw2, sh2, Gr); T.restore();
        const sr = G.drawFrame({ x: sx, y: sy, w: sw2, h: sh2, st: { fr: Gr, bd: K, bar: Gr, bt: K, tx: Gr, ac: W, sh: B, out: W }, title: 'SCORE.EXE', stripes: true, xmode: 'x' });
        G.text('FINAL SCORE', sx + sw2 / 2, sr.y + 4, L, { al: 'c' });
        G.text(G.pad(this.total, 7), sx + sw2 / 2, sr.y + 15, Gr, { s: 2, al: 'c', b: true });
        G.text('SECTOR 13  ' + G.pad(this.p.score || 0, 6), sx + sw2 / 2, sr.y + 34, W, { al: 'c' });
      }
      if (t > 6 && Math.floor(t * 2) % 2 === 0) G.text('TOUCH TO SIGN YOUR RECORD', Wd / 2, Hd - G.safeB - 16, W, { al: 'c' });
      G.drawNoise(0.02);
    },
    tap() { if (this.t < 6) return; A().sfx('tap'); G.go('record', { score: this.total }); },
    key(k) { if (k === 'Enter' || k === ' ') this.tap(); },
  };
})(window.G);
