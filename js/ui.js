'use strict';
// Ventanas estilo dossier (1-bit, borde grueso, sombra dura, barra con rayas), botones y barra de tareas.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;

  // estilos: fr marco · bd cuerpo · bar barra · bt texto barra · tx texto · ac acento · sh sombra · out contorno exterior
  G.WSTYLES = {
    m1: { fr: K, bd: W, bar: K, bt: W, tx: K, ac: K, sh: W, out: W },
    m2: { fr: W, bd: K, bar: W, bt: K, tx: W, ac: W, sh: L, out: K },
    m3: { fr: K, bd: W, bar: W, bt: K, tx: K, ac: K, sh: L, out: W },
    m4: { fr: W, bd: K, bar: K, bt: W, tx: W, ac: W, sh: W, out: W },
    m5: { fr: K, bd: L, bar: K, bt: W, tx: K, ac: K, sh: W, out: W },
    b1: { fr: W, bd: B, bar: W, bt: B, tx: W, ac: W, sh: K, out: B },
    b2: { fr: B, bd: W, bar: B, bt: W, tx: B, ac: B, sh: K, out: W },
    b3: { fr: K, bd: B, bar: K, bt: W, tx: W, ac: W, sh: K, out: W },
    b4: { fr: K, bd: W, bar: B, bt: W, tx: K, ac: B, sh: K, out: W },
    g1: { fr: K, bd: Gr, bar: K, bt: Gr, tx: K, ac: K, sh: K, out: W },
    g2: { fr: Gr, bd: K, bar: Gr, bt: K, tx: Gr, ac: Gr, sh: K, out: K },
    g3: { fr: K, bd: W, bar: Gr, bt: K, tx: K, ac: B, sh: K, out: Gr },
    g4: { fr: K, bd: B, bar: Gr, bt: K, tx: Gr, ac: W, sh: K, out: Gr },
  };
  G.STYLE_SETS = [
    ['m1', 'm2', 'm3', 'm4', 'm5'],
    ['m1', 'm2', 'm3', 'b1', 'b2', 'b3', 'b4', 'b1', 'b3'],
    ['m1', 'm2', 'b1', 'b2', 'b3', 'g1', 'g2', 'g3', 'g4', 'g1', 'g3'],
    ['m1', 'm2', 'm3', 'm4', 'm5', 'b1', 'b2', 'b3', 'b4', 'g1', 'g2', 'g3', 'g4'],
    ['m1'],
  ];
  G.randStyle = (block) => G.WSTYLES[G.pick(G.STYLE_SETS[Math.min(block, 4)])];

  const BAR = 11;
  G.WIN_BAR = BAR;
  // rectángulo de la X (relativo a pantalla)
  G.xRect = function (w, which) {
    const left = which === 'L' || (which == null && w.xl);
    return { x: Math.round(w.x) + (left ? 2 : w.w - 11), y: Math.round(w.y) + 2, w: 9, h: 9 };
  };
  G.drawX = function (r, col, fake) {
    if (fake) G.drect(r.x, r.y, r.w, r.h, 8, col, null); else G.box(r.x, r.y, r.w, r.h, col);
    G.line(r.x + 2, r.y + 2, r.x + 6, r.y + 6, col); G.line(r.x + 6, r.y + 2, r.x + 2, r.y + 6, col);
  };
  G.drawBtn = function (x, y, w, h, label, fg, bg, pressed, o) {
    o = o || {};
    if (pressed) { G.rect(x, y, w, h, fg); G.text(label, x + w / 2, y + Math.floor((h - 7) / 2), bg, { al: 'c' }); return; }
    if (bg) G.rect(x, y, w, h, bg);
    G.box(x, y, w, h, fg);
    if (o.double) G.box(x + 2, y + 2, w - 4, h - 4, fg);
    G.text(label, x + w / 2, y + Math.floor((h - 7) / 2), fg, { al: 'c' });
  };

  // marco base de una ventana del juego
  G.drawFrame = function (w) {
    const s = w.st, x = Math.round(w.x), y = Math.round(w.y), ww = w.w, hh = w.h;
    G.drect(x + 3, y + 3, ww, hh, 8, s.sh, null);
    if (s.out) G.box(x - 1, y - 1, ww + 2, hh + 2, s.out);
    G.rect(x, y, ww, hh, s.fr);
    G.rect(x + 2, y + 1 + BAR + 1, ww - 4, hh - BAR - 4, s.bd);
    G.rect(x + 1, y + 1, ww - 2, BAR, s.bar);
    const tx = w.xl ? x + 14 : x + 3;
    const title = w.title || '';
    G.text(title, tx, y + 3, s.bt);
    if (w.stripes) {
      const sx0 = tx + G.textW(title) + 3, sx1 = w.xl ? x + ww - 3 : x + ww - 13;
      if (sx1 - sx0 > 4) for (const k of [3, 5, 7]) G.rect(sx0, y + 1 + k, sx1 - sx0, 1, s.bt);
    }
    if (w.xmode !== 'none') {
      if (w.fakeX) { // dos X: una es falsa (la falsa parpadea en trama)
        const rl = G.xRect(w, 'L'), rr = G.xRect(w, 'R');
        G.drawX(w.fakeX === 'L' ? rl : rr, s.bt, true);
        G.drawX(w.fakeX === 'L' ? rr : rl, s.bt, false);
      } else G.drawX(G.xRect(w), s.bt, false);
    }
    return { x: x + 2, y: y + BAR + 2, w: ww - 4, h: hh - BAR - 4 };
  };

  // barra de tareas
  G.TASK_H = 15;
  G.taskbarY = () => G.H - G.TASK_H - G.safeB;
  G.startRect = () => ({ x: 1, y: G.taskbarY() + 2, w: 44, h: G.TASK_H - 3 });
  G.drawTaskbar = function (block, info) {
    const y = G.taskbarY(), Wd = G.W, h = G.TASK_H + G.safeB;
    const sch = [
      { bg: K, ln: W, fg: W, btn: W, inv: K },
      { bg: B, ln: W, fg: W, btn: W, inv: B },
      { bg: K, ln: Gr, fg: Gr, btn: Gr, inv: K },
      { bg: K, ln: Gr, fg: W, btn: W, inv: K },
      { bg: K, ln: W, fg: W, btn: W, inv: K },
    ][Math.min(block, 4)];
    let ln = sch.ln;
    if (block === 3) ln = [Gr, B, W][Math.floor(G.time * 6) % 3];
    G.rect(0, y, Wd, h, sch.bg);
    G.rect(0, y, Wd, 1, ln);
    // botón de inicio (pausa)
    const sr = G.startRect();
    const pr = info && info.startDown;
    G.rect(sr.x, sr.y, sr.w, sr.h, pr ? sch.btn : sch.bg); G.box(sr.x, sr.y, sr.w, sr.h, sch.btn);
    G.drawSpr('eyelogo', sr.x + 3, sr.y + 2, { '#': pr ? sch.inv : sch.btn });
    G.text('START', sr.x + 14, sr.y + 3, pr ? sch.inv : sch.btn);
    // reloj real
    const d = new Date();
    const clock = String(d.getHours()).padStart(2, '0') + (Math.floor(G.time * 2) % 2 ? ':' : ' ') + String(d.getMinutes()).padStart(2, '0');
    const cw = G.textW(clock) + 6;
    G.box(Wd - cw - 2, sr.y, cw, sr.h, sch.fg);
    G.text(clock, Wd - cw + 1, sr.y + 3, sch.fg);
    // info central (tiempo / objetivo)
    if (info) {
      let x = sr.x + sr.w + 4;
      if (info.time != null) {
        const tw = 37, urgent = info.time <= 10 && Math.floor(G.time * 4) % 2 === 0;
        G.rect(x, sr.y, tw, sr.h, urgent ? sch.fg : sch.bg); G.box(x, sr.y, tw, sr.h, sch.fg);
        G.drawSpr(Math.floor(G.time * 2) % 2 ? 'hg1' : 'hg2', x + 2, sr.y + 1, { '#': urgent ? sch.bg : sch.fg, o: urgent ? sch.bg : sch.fg });
        G.text(G.fmtTime(info.time), x + 10, sr.y + 3, urgent ? sch.bg : sch.fg);
        x += tw + 3;
      }
      const avail = Wd - cw - 4 - x - 2;
      if (info.label && avail > 10) {
        G.box(x, sr.y, avail, sr.h, sch.fg);
        if (info.meter != null) {
          const lw = G.textW(info.label);
          G.text(info.label, x + 3, sr.y + 3, sch.fg);
          const mx = x + lw + 6, mw = x + avail - 3 - mx;
          if (mw > 8) {
            const f = Math.round(mw * G.clamp(info.meter, 0, 1)), hot = info.meter > 0.75 && Math.floor(G.time * 6) % 2;
            G.drect(mx, sr.y + 3, mw, sr.h - 6, 4, sch.fg, null);
            for (let i = 0; i < f; i += 3) G.rect(mx + i, sr.y + 2, 2, sr.h - 4, hot ? sch.bg : sch.fg);
          }
        } else G.text(info.label, x + avail / 2, sr.y + 3, sch.fg, { al: 'c' });
      }
    }
  };

  // iconos del escritorio (decorativos)
  G.drawDesktopIcons = function (block, top) {
    const dark = block === 0 || block >= 3;
    const map = dark ? { '#': W, w: K, b: W } : { '#': K, w: W, b: block === 2 ? Gr : B };
    const labBg = dark ? K : B;
    const items = [['computer', 'SYSTEM'], ['folder', 'VOID'], ['trash', 'TRASH']];
    let y = top + 4;
    const cx = 22;
    for (const [spr, lab] of items) {
      const sw = G.sprW(spr);
      G.drawSpr(spr, Math.floor(cx - sw / 2), y, map);
      const lw = G.textW(lab) + 2;
      G.rect(Math.floor(cx - lw / 2), y + 15, lw, 9, labBg);
      G.text(lab, cx, y + 16, W, { al: 'c' });
      y += 30;
    }
  };
})(window.G);
