'use strict';
// PARTE 2 · 19 SAVE.NOW: duelo de reflejos. El documento se escribe solo; cuando se cuelga
// (NOT RESPONDING, reloj de arena, tiembla y deja rastro) hay que tocar para guardar antes del pantallazo azul.
// Tocar antes de tiempo o durante un aviso falso = error. Jefe: 3 cuelgues seguidos.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const S = G.scenes.game;

  const LINES = ['DEAR DIARY,', 'TODAY THE COMPUTER LOOKED AT ME.', 'I HAVE NOT SAVED IN A WHILE.', 'WHAT COULD POSSIBLY GO WRONG?',
    'NOTE TO SELF: SAVE MORE OFTEN.', 'CHAPTER 1: THE CURSOR BLINKS.', 'IT WAS A DARK AND STORMY BOOT.', 'MY PASSWORD IS ********.',
    'I AM NOT AFRAID OF THE COMPUTER.', 'THE COMPUTER IS NOT AFRAID OF ME.', 'TO DO: SAVE. SAVE. SLEEP.', 'THIS IS MY BEST WORK EVER.',
    'DO NOT TURN OFF THE PC.', 'THE FAN IS SPINNING FASTER...', 'ALMOST DONE. ONE MORE LINE.', 'IF YOU ARE READING THIS, SAVE.',
    'CTRL+S IS A STATE OF MIND.', 'THE HOURGLASS NEVER LIES.', 'WHY IS THE SCREEN SO QUIET?', 'P.S. I LOVE YOU, HARD DISK.'];
  const DOCS = ['NOTES.TXT', 'DIARY.TXT', 'ESSAY.TXT', 'POEM.TXT', 'NOVEL.TXT'];
  const FAKES = [['BATTERY', 'LOW BATTERY', '14% LEFT'], ['UPDATE', 'UPDATE AVAILABLE', 'RESTART NOW?'], ['NEW MAIL', 'YOU HAVE', '999+ UNREAD'],
    ['SPAM.EXE', 'YOU WON!', 'CLICK HERE'], ['REMINDER', 'DID YOU SAVE?', '(JUST ASKING)'], ['DISK', 'DISK ALMOST', 'FULL'], ['ANTIVIRUS', 'ALL CLEAR.', 'PROBABLY.']];
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  G.MICRO.savenow = {
    mode: 'desk', cmd: 'SAVE!', hint: 'WHEN IT FREEZES, TAP!', time: 0,
    help: ['WHEN THE DOCUMENT', 'FREEZES, TAP ANYWHERE', 'TO SAVE IT. TAP TOO', 'SOON OR ON A FAKE', 'ALERT = ERROR.'],
    init(s) {
      const r = s.r, d = s.d;
      // ventana del editor (estilo LIBRARY.EXE del FORCEQUIT) y lo que va dentro
      const ww = r.w - 16, wh = Math.min(r.h - 96, 290);
      const wx = r.x + 8, wy = r.y + Math.max(6, Math.round((r.h - wh) * 0.22));
      s.win0 = { x: wx, y: wy, w: ww, h: wh };
      const ix = wx + 2, iy = wy + G.WIN_BAR + 2, iw = ww - 4, ih = wh - G.WIN_BAR - 4;
      s.menu = { x: ix, y: iy, w: iw };
      s.pap = { x: ix + 4, y: iy + 16, w: iw - 8, h: ih - 16 - 14 - 46 };
      s.stat = { x: ix + 4, y: s.pap.y + s.pap.h + 3, w: iw - 8, h: 11 };
      s.btn = { x: Math.round(wx + ww / 2 - 75), y: s.stat.y + 16, w: 150, h: 26 };
      s.st0 = G.WSTYLES[['m1', 'b2', 'g3', 'g4'][s.block]] || G.WSTYLES.m1;
      s.doc = s.boss ? 'FINAL_V2.TXT' : DOCS[(s.round - 1) % DOCS.length];
      if (s.boss) s.hint = 'IT FREEZES 3 TIMES. SAVE EVERY TIME!';
      else if (d >= 0.25) s.hint = 'WAIT FOR THE FREEZE. FAKE ALERTS = TRAPS!';
      // el texto: unas líneas ya escritas y el resto se teclea solo
      s.pool = shuffle(LINES.slice()); s.pi = 0; s.pend = [];
      s.lines = []; for (let i = 0, n = G.irand(3, 6); i < n; i++) s.lines.push(this.nextLine(s));
      s.queue = this.nextLine(s); s.ci = 0; s.acc0 = 0; s.pause = 0.2; s.cps = 15 + 11 * d;
      s.min0 = G.irand(12, 47); s.minT = 0;
      // reflejos
      s.need = s.boss ? 3 : 1; s.got = 0; s.react = Math.max(0.55, 0.85 - 0.33 * d); s.reactNow = s.react; // tiempo para reaccionar: ronda 1 0,85 s ... jefe 0,55 s
      s.ignoreUntil = 0; s.lastReact = 0; s.menuT = -9; s.best = G.save.data.bestSave || 0; s.newRec = false;
      s.T = 0; // sin límite fijo: la ronda acaba al guardar o con el pantallazo (la mecha baja solo durante el cuelgue)
      this.newSeg(s, true);
    },
    nextLine(s) {
      if (!s.pend.length) { const t = s.pool[s.pi++ % s.pool.length]; s.pend = G.wrap(t, s.pap.w - 8); }
      return s.pend.shift();
    },
    nFakes(s) {
      if (s.boss) return s.got ? G.irand(0, 2) : G.irand(1, 2);
      if (s.d < 0.25) return 0;
      if (s.d < 0.4) return 1;
      return G.irand(1, 2);
    },
    // un tramo: avisos falsos (o ninguno) y luego el cuelgue de verdad, a una hora al azar
    newSeg(s, first) {
      const d = s.d, seg = { start: s.t, fakes: [] };
      let t = first ? G.rand(0.9, 1.7) : G.rand(0.55, 0.95);
      const nf = this.nFakes(s);
      for (let i = 0; i < nf; i++) {
        const kind = d >= 0.55 && Math.random() < 0.35 ? 'title' : 'pop';
        const dur = kind === 'title' ? G.rand(0.6, 0.8) : G.rand(0.8, 1.05) - 0.15 * d;
        seg.fakes.push({ at: t, dur, kind, on: false, done: false, w: null });
        t += dur + G.rand(0.45, 0.85);
      }
      t += G.rand(0.15, 1.35 - 0.3 * d);
      seg.hangAt = t;
      s.seg = seg; s.phase = 'wait';
    },
    makePop(s) {
      const m = G.pick(FAKES), w = 128, h = 56, p = s.pap;
      return {
        type: 'warn', st: G.randStyle(s.block), title: m[0], lines: [m[1], m[2]], stripes: true, xl: false, xmode: 'x',
        btns: [{ lbl: 'OK', x: w / 2 - 20, y: h - 18, w: 40, h: 13, act: 'close' }],
        x: Math.round(G.rand(s.r.x + 4, s.r.x + s.r.w - w - 4)), y: Math.round(G.rand(p.y + 6, p.y + p.h - h + 30)), w, h,
      };
    },
    fakeOn(s) { return s.seg ? s.seg.fakes.find((f) => f.on) : null; },
    fuse(s) {
      if (s.phase === 'hang') return 1 - (s.t - s.hangT) / s.reactNow;
      if (s.phase === 'crash') return 0;
      return 1;
    },
    type(s, dt) {
      if (s.pause > 0) { s.pause -= dt; return; }
      s.acc0 += dt * s.cps;
      while (s.acc0 >= 1) {
        s.acc0 -= 1;
        if (s.ci < s.queue.length) { s.ci++; if (s.queue[s.ci - 1] !== ' ' && Math.random() < 0.55) A().sfx('type', 0.6); }
        else { s.lines.push(s.queue); s.queue = this.nextLine(s); s.ci = 0; s.pause = G.rand(0.12, 0.4); s.acc0 = 0; break; }
      }
    },
    update(s, dt) {
      if (s.phase === 'wait') {
        this.type(s, dt);
        const st = s.t - s.seg.start;
        for (const f of s.seg.fakes) {
          if (!f.on && !f.done && st >= f.at) {
            f.on = true;
            if (f.kind === 'pop') { f.w = this.makePop(s); A().sfx('spawn', 1); G.pulse({ glitch: 0.2, ab: 1.5 }); }
            else { A().sfx('beepT'); G.pulse({ ab: 1.5 }); }
          }
          if (f.on && st >= f.at + f.dur) { f.on = false; f.done = true; }
        }
        if (st >= s.seg.hangAt) {
          s.phase = 'hang'; s.hangT = s.t;
          A().sfx('fake'); G.pulse({ glitch: 0.35, ab: 3, shake: 2 }); G.vibrate(30);
        }
      } else if (s.phase === 'hang') {
        if (s.t - s.hangT >= s.reactNow) {
          s.phase = 'crash'; s.crashT = s.t;
          A().sfx('crtOff'); G.pulse({ glitch: 1, ab: 6, flash: 0.3, flashCol: B });
          s.fail('CRASHED');
        }
      }
    },
    down(s) {
      if (s.done || s.t < s.ignoreUntil) return;
      if (s.phase === 'hang') {
        s.got++; s.lastReact = s.t - s.hangT; s.menuT = s.t; s.minT = s.t; s.min0 = 0;
        if (!s.best || s.lastReact < s.best) { s.best = s.lastReact; s.newRec = true; G.save.data.bestSave = s.lastReact; G.save.write(); }
        G.pulse({ ab: 2, flash: 0.12, flashCol: W }); G.vibrate(15);
        if (s.got >= s.need) { s.phase = 'saved'; s.win(); }
        else { A().sfx('combo'); s.ignoreUntil = s.t + 0.3; s.reactNow = Math.max(0.53, s.react - 0.015 * s.got); this.newSeg(s, false); }
        return;
      }
      if (s.phase === 'wait') {
        s.early = true; A().sfx('deny');
        s.fail(this.fakeOn(s) ? 'FAKE ALERT' : 'TOO EARLY');
      }
    },
    // ---------- dibujo ----------
    drawCrash(s) {
      const r = s.r, cx = r.x + r.w / 2;
      G.rect(r.x, r.y, r.w, r.h, B);
      let y = r.y + Math.round(r.h * 0.18);
      const hd = 'NEØ OS 98', hw = G.textW(hd, 1, 1, true) + 10;
      G.rect(Math.round(cx - hw / 2), y - 2, hw, 11, W); G.text(hd, cx, y, B, { al: 'c', b: true });
      y += 22;
      G.text('FATAL EXCEPTION', cx, y, W, { al: 'c', s: 2 });
      y += 28;
      const mins = s.min0 + Math.floor((s.t - s.minT) * 2);
      const lines = ['0xDEAD IN WRITE.EXE AT 0013:F00D.', '', s.doc + ' WAS NOT SAVED.', mins + ' MINUTES OF WORK: GONE.', '', '* PRESS ANY KEY TO CRY.', '* PRESS ANY KEY AGAIN TO', '  CRY EVEN MORE.'];
      lines.forEach((ln, i) => G.text(ln, r.x + 12, y + i * 10, W));
      y += lines.length * 10 + 16;
      G.text('PRESS ANY KEY ' + (Math.floor(G.time * 2) % 2 ? '█' : ' '), cx, y, W, { al: 'c' });
    },
    draw(s) {
      const r = s.r, w0 = s.win0, st = s.st0, T = G.ctx();
      if (s.phase === 'crash') return this.drawCrash(s);
      const hang = s.phase === 'hang', k = hang ? G.clamp((s.t - s.hangT) / s.reactNow, 0, 1) : 0;
      const ac = s.acc === L ? K : s.acc, ac2 = s.block >= 2 ? Gr : ac;
      // escritorio de abajo
      if (r.y + r.h - (w0.y + w0.h) > 100) G.drawDesktopIcons(s.block, w0.y + w0.h + 10);
      if (s.boss) { const t = 'SAVES ' + s.got + '/' + s.need, tw = G.textW(t, 1, 1, true) + 8; G.rect(r.x + r.w - tw - 4, r.y + r.h - 13, tw, 11, K); G.text(t, r.x + r.w - 8, r.y + r.h - 11, W, { al: 'r', b: true }); }
      // rastro de la ventana colgada (como al arrastrar una ventana que no responde)
      if (hang) {
        const n = 1 + Math.floor(k * 4);
        for (let i = n; i >= 1; i--) { const gx = w0.x - i * 4, gy = w0.y + i * 6; G.rect(gx, gy, w0.w, w0.h, K); G.rect(gx + 1, gy + 1, w0.w - 2, w0.h - 2, L); G.rect(gx + 1, gy + 1, w0.w - 2, 10, i % 2 ? K : st.bar); }
      }
      const a = hang ? 1 + Math.round(k * 2) : 0, ox = hang ? G.irand(-a, a) : 0, oy = hang ? G.irand(-a, a) : 0;
      T.save(); T.translate(ox, oy);
      const fk = this.fakeOn(s), joke = fk && fk.kind === 'title' && Math.floor(G.time * 10) % 4 !== 0;
      const title = s.doc + (hang ? ' (NOT RESPONDING)' : joke ? ' (NOT RESPONSIBLE)' : ' - WRITE.EXE');
      G.drawFrame({ x: w0.x, y: w0.y, w: w0.w, h: w0.h, st, title, stripes: true, xmode: 'x' });
      // barra de menús (FILE se abre al guardar)
      const m = s.menu; G.rect(m.x, m.y, m.w, 11, W); G.rect(m.x, m.y + 11, m.w, 1, K);
      let mx = m.x + 5; const menuOpen = s.t - s.menuT < 0.5;
      for (const it of ['FILE', 'EDIT', 'VIEW', 'HELP']) {
        const tw = G.textW(it);
        if (it === 'FILE' && menuOpen) { G.rect(mx - 3, m.y + 1, tw + 6, 10, K); G.text(it, mx, m.y + 3, W); } else G.text(it, mx, m.y + 3, K);
        mx += tw + 10;
      }
      // la hoja
      const p = s.pap;
      G.rect(p.x, p.y, p.w, p.h, W); G.box(p.x, p.y, p.w, p.h, K);
      const sx = p.x + p.w - 9; G.drect(sx, p.y + 1, 8, p.h - 2, 4, K, null); G.rect(sx, p.y, 1, p.h, K);
      const maxL = Math.floor((p.h - 8) / 9), cur = s.queue.slice(0, s.ci), all = s.lines.concat([cur]), first = Math.max(0, all.length - maxL);
      const th = Math.max(14, Math.round((p.h - 2) * Math.min(1, maxL / all.length))); G.rect(sx + 1, p.y + 1 + Math.round((p.h - 2 - th) * (first / Math.max(1, all.length - maxL))), 7, th, K);
      for (let i = first; i < all.length; i++) G.text(all[i], p.x + 4, p.y + 4 + (i - first) * 9, K);
      const ly = p.y + 4 + (all.length - 1 - first) * 9, lx = p.x + 4 + G.textW(cur) + (cur.length ? 1 : 0);
      if (!hang && Math.floor(G.time * 3) % 2) G.rect(lx, ly - 1, 2, 9, K); // cursor de texto
      if (hang) { // se queda pálida y aparece el reloj de arena
        G.drect(p.x + 1, p.y + 1, p.w - 11, p.h - 2, 2 + Math.round(k * 6), W, null);
        const hx = Math.round(p.x + p.w / 2 - 20), hy = Math.round(p.y + p.h / 2 - 22);
        G.rect(hx + 3, hy + 3, 36, 40, K); G.rect(hx, hy, 36, 40, W); G.box(hx, hy, 36, 40, K);
        G.drawSpr(Math.floor(G.time * 4) % 2 ? 'hg1' : 'hg2', hx + 7, hy + 6, { '#': K, o: ac }, 3);
      }
      // estado
      const sb = s.stat; G.box(sb.x, sb.y, sb.w, sb.h, K);
      G.text('LN ' + all.length + '  COL ' + (cur.length + 1), sb.x + 3, sb.y + 2, K);
      const mins = s.min0 + Math.floor((s.t - s.minT) * 2);
      let rt, rc = K;
      if (hang) { rt = Math.floor(G.time * 6) % 2 ? 'NOT RESPONDING' : ''; rc = ac; }
      else if (s.got > 0 && s.t - s.menuT < 1.2) rt = 'SAVED ✓ ' + s.lastReact.toFixed(2) + 'S';
      else rt = 'UNSAVED: ' + mins + ' MIN';
      if (rt) G.text(rt, sb.x + sb.w - 3, sb.y + 2, rc, { al: 'r', b: hang });
      // botón SAVE (grande)
      const bt = s.btn, saved = s.phase === 'saved' || (s.got > 0 && s.t - s.menuT < 0.5);
      const lit = hang && Math.floor(G.time * 8) % 2 === 0;
      const bg = hang ? (lit ? ac : ac2 === W ? K : ac2) : saved ? (s.block >= 2 ? Gr : L) : W, fg = bg === B || bg === K ? W : K;
      G.rect(bt.x + 3, bt.y + 3, bt.w, bt.h, K); G.rect(bt.x, bt.y, bt.w, bt.h, bg); G.box(bt.x, bt.y, bt.w, bt.h, K); G.box(bt.x + 2, bt.y + 2, bt.w - 4, bt.h - 4, fg === W && bg === K ? W : K);
      T.drawImage(G.icon20('floppy', s.block), bt.x + 5, bt.y + 3);
      G.text(hang ? 'SAVE NOW!' : saved ? 'SAVED ✓' : 'SAVE', bt.x + 28 + (bt.w - 30) / 2, bt.y + 6, fg, { al: 'c', s: 2 });
      // flecha del ratón junto al botón (reloj de arena cuando se cuelga)
      const cx = bt.x + bt.w - 14, cy = bt.y + bt.h - 6 + Math.round(Math.sin(G.time * 3));
      if (hang) G.drawSpr(Math.floor(G.time * 4) % 2 ? 'hg1' : 'hg2', cx, cy, { '#': K, o: W }, 2);
      else G.drawSpr('cursor', cx, cy, { '#': K, w: W });
      // menú FILE abierto al guardar
      if (menuOpen) {
        const dx = m.x + 2, dy = m.y + 12, dw = 92;
        G.rect(dx + 2, dy + 2, dw, 24, K); G.rect(dx, dy, dw, 24, W); G.box(dx, dy, dw, 24, K);
        G.rect(dx + 1, dy + 1, dw - 2, 11, K); G.text('SAVE', dx + 4, dy + 3, W); G.text('CTRL+S', dx + dw - 4, dy + 3, W, { al: 'r' });
        G.text('SAVE AS...', dx + 4, dy + 14, K);
      }
      T.restore();
      // avisos falsos (las mismas ventanas de la parte 1)
      if (fk && fk.kind === 'pop' && fk.w) S.drawWin(fk.w);
      if (s.done === 'win' && s.newRec) { const t = 'NEW RECORD ' + s.lastReact.toFixed(2) + 'S', tw = G.textW(t, 1, 1, true) + 10; G.rect(Math.round(r.x + r.w / 2 - tw / 2), w0.y + w0.h + 6, tw, 13, B); G.text(t, r.x + r.w / 2, w0.y + w0.h + 9, W, { al: 'c', b: true }); }
      if (s.done === 'lose' && s.early) { const t = fk ? 'IT WAS A FAKE!' : 'NOTHING TO SAVE YET!', tw = G.textW(t, 1, 1, true) + 10; G.rect(Math.round(r.x + r.w / 2 - tw / 2), w0.y + w0.h + 6, tw, 13, K); G.text(t, r.x + r.w / 2, w0.y + w0.h + 9, W, { al: 'c', b: true }); }
    },
  };

  // icono de la tarjeta: ventana que se escribe, se cuelga (reloj y rastro) y se guarda (disquete)
  G.ICONS[19] = function (t) {
    const c = t % 3;
    if (c >= 1.4 && c < 2.2) for (let k = 3; k >= 1; k--) { const x = 2 - k + 1, y = 1 + k * 2; G.rect(x, y, 17, 13, K); G.rect(x + 1, y + 1, 15, 11, L); }
    const sh = c >= 1.4 && c < 2.2 ? (Math.floor(t * 20) % 2) : 0;
    const x = 5 + sh, y = 1;
    G.rect(x, y, 17, 14, W); G.box(x, y, 17, 14, K); G.rect(x, y, 17, 3, c >= 1.4 && c < 2.2 ? B : K); G.px(x + 15, y + 1, W);
    const n = Math.min(4, Math.floor(Math.min(c, 1.4) * 3));
    for (let i = 0; i < n; i++) G.rect(x + 2, y + 5 + i * 2, [11, 8, 12, 6][i], 1, K);
    if (c >= 1.4 && c < 2.2) G.drawSpr(Math.floor(t * 4) % 2 ? 'hg1' : 'hg2', x + 5, y + 4, { '#': K, o: B });
    if (c >= 2.2) { // disquete: guardado
      G.rect(8, 9, 11, 11, B); G.box(8, 9, 11, 11, K); G.rect(10, 9, 7, 4, W); G.rect(14, 10, 2, 2, K); G.rect(10, 15, 7, 4, W);
      if (Math.floor(t * 6) % 2) G.rect(20, 16, 3, 3, Gr);
    }
  };
  G.CARD_SCHEMES[19] = { top: Gr, tt: K, ib: L, grid: B, bot: L, nc: B, bt: K };
})(window.G);
