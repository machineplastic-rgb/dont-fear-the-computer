'use strict';
// PARTE 2 · 18 CASCADE: apilar ventanas. Una ventana va de lado a lado sobre la pila y un toque la suelta.
// Lo que sobresale se corta y se cae; la siguiente ventana solo es tan ancha como lo que quedó.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;

  const WH = 34;   // alto de cada ventana (barra 11 + dos líneas, como los errores de la parte 1)
  const GAP = 30;  // hueco entre la pila y la ventana que se mueve
  const MIN = 8;   // menos que esto encima de la pila = se cae
  const PT = 3;    // margen para el "PERFECT!" (encaja sola)
  const XTRA = ['ERROR', 'WARNING', 'LOADING', 'UPDATE', 'ALERT', 'SYSTEM', 'NEW.TXT', 'TEMP'];

  // texto recortado a lo que cabe (6 px por letra)
  const fit = (str, px) => { const n = Math.max(0, Math.floor((px + 1) / 6)); return str.length <= n ? str : n >= 3 ? str.slice(0, n - 1) + '.' : ''; };
  function refit(o) {
    const tw = o.fw - 24;
    o.tt = fit(o.title, o.fw - 21);
    o.ml = G.wrap(o.msg, Math.max(6, tw)).slice(0, 2).map((ln) => fit(ln, tw));
  }
  function mk(s, fw, o) {
    const th = G.THEMES[G.irand(1, 12)], st = (o && o.st) || G.randStyle(s.block);
    const w = {
      fw, st, stNoSh: Object.assign({}, st, { sh: null }),
      title: (o && o.title) || (Math.random() < 0.6 ? G.pick(th.titles) : G.pick(XTRA)),
      msg: (o && o.msg) || (Math.random() < 0.75 ? G.pick(th.msgs) : G.pick(G.GENERIC_MSGS)),
      ic: Math.random() < 0.5 ? 'warn' : 'xcirc', stripes: Math.random() < 0.6,
    };
    refit(w); return w;
  }
  // dibuja una ventana de ancho fw con origen fx, mostrando solo [fx+a, fx+b] (el trozo que queda tras el corte)
  function drawWin(o, fx, y, a, b, base) {
    const T = G.ctx(), st = o.st, x = Math.round(fx), yy = Math.round(y);
    const va = x + Math.round(a), vb = x + Math.round(b);
    if (vb - va < 1) return;
    G.drect(vb, yy + 3, 3, WH, 8, st.sh, null); // sombra dura (solo a la derecha: la de abajo la tapa la ventana de debajo)
    if (base) G.drect(va + 3, yy + WH, vb - va, 3, 8, st.sh, null);
    T.save(); T.beginPath(); T.rect(va - 1, yy - 1, vb - va + 2, WH + 2); T.clip();
    const r = G.drawFrame({ x, y: yy, w: o.fw, h: WH, st: o.stNoSh, title: o.tt, stripes: o.stripes && o.fw > 50, xmode: 'x' });
    G.drawSpr(o.ic, r.x + 4, r.y + 5, { '#': st.ac });
    o.ml.forEach((ln, i) => G.text(ln, r.x + 19, r.y + 2 + i * 9, st.tx));
    T.restore();
    // canto del corte
    if (a > 0.5) { G.rect(va, yy, 1, WH, st.fr); G.rect(va - 1, yy - 1, 1, WH + 2, st.out || st.fr); }
    if (b < o.fw - 0.5) { G.rect(vb - 1, yy, 1, WH, st.fr); G.rect(vb, yy - 1, 1, WH + 2, st.out || st.fr); }
  }

  G.MICRO.cascade = {
    mode: 'desk', cmd: 'STACK!', hint: 'REACH THE TARGET LINE', time: 9, fx: 0.6,
    help: ['TAP TO DROP THE WINDOW.', 'WHAT HANGS OVER THE', 'EDGE GETS CUT OFF.', 'REACH THE TARGET LINE.'],
    init(s) {
      const r = s.r, d = s.d, boss = s.boss;
      s.need = boss ? 10 : 4 + Math.round(d * 4);
      s.w0 = Math.round(boss ? 118 : 132 - 36 * d);           // ancho inicial
      s.v0 = boss ? 138 : 90 + 115 * d;                      // velocidad de la ventana
      s.vary = boss ? 0.3 : d >= 0.4 ? 0.45 : 0;            // desde la ronda 4 acelera y frena a mitad de recorrido
      s.alt = boss || d > 0.15;                              // entra por un lado y por el otro
      s.swayA = boss ? 8 : 0;                                // el jefe: la torre se balancea
      s.baseY = r.y + r.h - WH - 6;
      const base = mk(s, s.w0, { title: 'C:\\', msg: 'FOUNDATION.SYS', st: s.st });
      s.stack = [{ o: base, fx: Math.round(r.x + (r.w - s.w0) / 2), a: 0, b: s.w0 }];
      s.placed = 0; s.cam = 0; s.mov = null; s.drop = null; s.nextT = 0; s.side = -1; s.streak = 0; s.perf = 0;
      s.pieces = []; s.ghosts = []; s.parts = []; s.msgs = []; s.reach = 0; s.gl = null;
      // tiempo: por ventana, cruzar la pista una vez + reacción (sobra: aquí lo difícil es la puntería)
      const travel = r.w - s.w0 - 2;
      s.T = (boss ? 2.2 : 1.4) + s.need * (0.5 + travel / s.v0 + 0.1);
      this.spawn(s);
    },
    off(s, i) { return s.swayA ? s.swayA * Math.sin(s.t * 1.7) * Math.pow(Math.min(1, i / s.need), 1.2) : 0; },
    spawn(s) {
      const r = s.r, top = s.stack[s.stack.length - 1];
      const o = mk(s, Math.round(top.b - top.a));
      let dir = 1;
      if (s.alt) { s.side = -s.side; dir = s.side; }
      s.mov = { o, x: dir > 0 ? r.x + 1 : r.x + r.w - 1 - o.fw, dir, ph: Math.random() * 6 };
      A().sfx('spawn', 2);
    },
    down(s) {
      if (!s.mov || s.drop || s.done) return;
      const m = s.mov, n = s.stack.length;
      s.drop = { o: m.o, x: m.x, y: s.baseY - n * WH - GAP, vy: 140, ly: s.baseY - n * WH, t: 0 };
      s.mov = null; A().sfx('tap');
    },
    land(s) {
      const dr = s.drop, n = s.stack.length, top = s.stack[n - 1], r = s.r;
      const tOff = this.off(s, n - 1), nOff = this.off(s, n);
      const tl = top.fx + top.a + tOff, tr = top.fx + top.b + tOff;
      let x = dr.x; const w = dr.o.fw;
      const perfect = Math.abs(x - tl) <= PT;
      if (perfect) x = tl;
      const l = Math.max(x, tl), rr = Math.min(x + w, tr);
      if (rr - l < MIN) { // no se sostiene: se cae entera
        dr.miss = true; dr.x = x; dr.vx = (x + w / 2 < (tl + tr) / 2 ? -1 : 1) * 50; dr.vy = 60;
        A().sfx('deny'); G.pulse({ shake: 4 });
        return;
      }
      // lo que sobresale se corta y se cae
      const cut = (a, b) => { s.pieces.push({ o: dr.o, fx: x, a: a - x, b: b - x, y: dr.ly, vy: 30, vx: (a < l ? -1 : 1) * G.rand(25, 45), t: 0 }); };
      if (l > x + 0.5) cut(x, l);
      if (x + w > rr + 0.5) cut(rr, x + w);
      const rec = { o: dr.o, fx: x - nOff, a: l - x, b: rr - x };
      s.stack.push(rec); s.drop = null; s.placed++;
      const cx = (l + rr) / 2, sy = dr.ly;
      if (perfect) {
        s.streak++; s.perf++;
        // tres seguidas: la ventana crece un poco (sin pasar del ancho inicial)
        let txt = 'PERFECT!';
        if (s.streak % 3 === 0 && w < s.w0) {
          const g = Math.min(8, s.w0 - w);
          rec.o.fw += g; rec.fx -= g / 2; rec.b = rec.o.fw;
          rec.fx = G.clamp(rec.fx, r.x + 1 - nOff, r.x + r.w - 1 - rec.o.fw - nOff); refit(rec.o);
          txt = 'PERFECT! +WIDTH';
        }
        s.msgs.push({ x: cx, y: sy, txt, t: 0, big: true });
        A().sfx('combo'); G.pulse({ ab: 2, flash: 0.08, flashCol: W }); G.vibrate(15);
        for (let k = 0; k < 8; k++) s.parts.push({ x: cx + G.rand(-30, 30), y: sy, vx: G.rand(-70, 70), vy: G.rand(-120, -40), t: 0 });
      } else {
        s.streak = 0;
        s.msgs.push({ x: cx, y: sy, txt: '-' + Math.round(w - (rr - l)) + 'PX', t: 0 });
        A().sfx('close', s.placed); A().sfx('drop'); G.pulse({ ab: 1.5 }); G.vibrate(10);
      }
      if (s.placed >= s.need) { s.reach = 1; s.win(); G.pulse({ flash: 0.12, flashCol: W }); return; }
      s.nextT = 0.16;
    },
    update(s, dt) {
      const r = s.r;
      // cámara: si la torre sube mucho, baja la vista
      const slideY = s.baseY - s.stack.length * WH - GAP;
      const want = Math.max(0, r.y + 34 - slideY);
      s.cam += (want - s.cam) * Math.min(1, dt * 6);
      const m = s.mov;
      if (m) {
        let v = s.v0; if (s.vary) v *= 1 + s.vary * Math.sin(s.t * 4.6 + m.ph);
        m.x += m.dir * v * dt;
        const lo = r.x + 1, hi = r.x + r.w - 1 - m.o.fw;
        if (m.x < lo) { m.x = lo; m.dir = 1; }
        if (m.x > hi) { m.x = hi; m.dir = -1; }
      }
      const dr = s.drop;
      if (dr) {
        dr.t += dt; dr.vy += 2600 * dt; dr.y += dr.vy * dt;
        if (dr.miss) { dr.x += dr.vx * dt; if (dr.y > r.y + r.h + 30 - s.cam || dr.t > 0.7) { s.fail('MISSED'); return; } }
        else if (dr.y >= dr.ly) { dr.y = dr.ly; this.land(s); if (s.done) return; }
      }
      if (s.nextT > 0) { s.nextT -= dt; if (s.nextT <= 0) this.spawn(s); }
      // trozos cortados: caen y se cierran como las ventanas de la parte 1
      for (const p of s.pieces) {
        p.t += dt; p.vy += 900 * dt; p.y += p.vy * dt; p.fx += p.vx * dt;
        if (p.t > 0.42 && !p.gone) {
          p.gone = true;
          const x = p.fx + p.a, w = p.b - p.a;
          s.ghosts.push({ x, y: p.y, w, h: WH, t: 0, col: p.o.st.fr === K ? W : p.o.st.fr });
          for (let k = 0; k < 5; k++) s.parts.push({ x: x + G.rand(0, w), y: p.y + G.rand(0, WH), vx: G.rand(-50, 50), vy: G.rand(-90, -20), t: 0 });
        }
      }
      s.pieces = s.pieces.filter((p) => !p.gone);
      s.ghosts.forEach((g) => (g.t += dt)); s.ghosts = s.ghosts.filter((g) => g.t < 0.14);
      s.parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }); s.parts = s.parts.filter((p) => p.t < 0.45);
      s.msgs.forEach((m2) => (m2.t += dt)); s.msgs = s.msgs.filter((m2) => m2.t < 0.8);
      // jefe: rayas de glitch en ventanas al azar
      if (s.boss) { if (s.gl) { s.gl.t -= dt; if (s.gl.t <= 0) s.gl = null; } else if (Math.random() < dt * 3) s.gl = { i: G.irand(0, s.stack.length - 1), y: G.irand(0, WH - 5), col: G.pick([Gr, B, W]), t: 0.08 }; }
    },
    draw(s) {
      const r = s.r, cam = Math.round(s.cam), T = G.ctx();
      G.drect(r.x, r.y, r.w, r.h, 8, K, null); // atenúa el fondo para que se lean las ventanas (como TRASH)
      // línea objetivo
      const ty = s.baseY - s.need * WH + cam;
      const hot = s.reach && Math.floor(s.t * 10) % 2 === 0;
      G.dash(r.x, ty - 1, r.w, hot ? Gr : W, 3, 2); G.dash(r.x + 1, ty, r.w, K, 3, 2);
      const lab = 'TARGET', lw = G.textW(lab) + 6;
      G.rect(r.x + r.w - lw - 2, ty - 11, lw, 10, hot ? Gr : K); G.box(r.x + r.w - lw - 2, ty - 11, lw, 10, W);
      G.text(lab, r.x + r.w - lw + 1, ty - 9, hot ? K : W);
      // la pila (de abajo arriba: la sombra de cada una cae sobre la de debajo)
      s.stack.forEach((e, i) => {
        const y = s.baseY - i * WH + cam, fx = e.fx + this.off(s, i);
        if (y > r.y + r.h + 4 || y + WH < r.y - 4) return;
        drawWin(e.o, fx, y, e.a, e.b, i === 0);
        if (s.gl && s.gl.i === i) G.drect(fx + e.a, y + s.gl.y, e.b - e.a, 4, 8, s.gl.col, null);
      });
      for (const p of s.pieces) drawWin(p.o, p.fx, p.y + cam, p.a, p.b, false);
      for (const g of s.ghosts) { const k = 1 - g.t / 0.14; for (let i = 0; i < 2; i++) { const kk = k - i * 0.25; if (kk <= 0) continue; const ww = g.w * kk, hh = g.h * kk; G.box(g.x + (g.w - ww) / 2, g.y + cam + (g.h - hh) / 2, ww, hh, g.col); } }
      if (s.drop) drawWin(s.drop.o, s.drop.x, s.drop.y + cam, 0, s.drop.o.fw, false);
      const m = s.mov;
      if (m) {
        let jx = 0, jy = 0;
        if (s.boss && Math.random() < 0.5) { jx = G.irand(-1, 1); jy = G.irand(-1, 1); } // el jefe tiembla
        const y = s.baseY - s.stack.length * WH - GAP + cam;
        drawWin(m.o, m.x + jx, y + jy, 0, m.o.fw, false);
        if (s.boss && Math.random() < 0.05) G.drect(m.x, y + G.irand(0, WH - 4), m.o.fw, 3, 8, G.pick([Gr, B, W]), null);
      }
      for (const p of s.parts) G.rect(Math.round(p.x), Math.round(p.y + cam), 3, 3, p.t < 0.2 ? W : L);
      for (const mm of s.msgs) { // etiqueta con fondo, para que se lea sobre cualquier fondo
        const tw = G.textW(mm.txt, 1, 1, !!mm.big) + 6, mx = Math.round(G.clamp(mm.x - tw / 2, r.x + 1, r.x + r.w - tw - 1)), my = Math.round(mm.y + cam - 14 - mm.t * 26);
        G.rect(mx, my, tw, 11, mm.big ? Gr : K); G.box(mx, my, tw, 11, mm.big ? K : W);
        G.text(mm.txt, mx + 3, my + 2, mm.big ? K : W, { b: !!mm.big });
      }
      // marcador
      const t1 = 'FLOORS ' + s.placed + '/' + s.need, w1 = G.textW(t1, 1, 1, true) + 6;
      G.rect(r.x + 2, r.y + 2, w1, 11, K); G.text(t1, r.x + 5, r.y + 4, W, { b: true });
      if (s.streak >= 2) { const t2 = 'PERFECT x' + s.streak, w2 = G.textW(t2) + 6; G.rect(r.x + r.w - w2 - 2, r.y + 2, w2, 11, Gr); G.text(t2, r.x + r.w - w2 + 1, r.y + 4, K); }
      T.globalAlpha = 1;
    },
  };

  // icono: una ventana va y viene y cae sobre la pila
  G.ICONS[18] = function (t) {
    const win = (x, y, w, bar) => { G.rect(x, y, w, 5, W); G.box(x, y, w, 5, K); G.rect(x, y, w, 2, bar); G.px(x + w - 2, y, W); };
    win(3, 15, 18, K); win(5, 10, 15, Gr);
    const c = t % 2.2;
    if (c < 1.6) win(Math.round(5 + 4 * Math.sin(c * 4)), 1, 15, B);
    else { const k = Math.min(1, (c - 1.6) / 0.15); win(5, Math.round(1 + 4 * k), 15, B); }
  };
  G.CARD_SCHEMES[18] = { top: Gr, tt: K, ib: B, grid: K, bot: L, nc: B, bt: K };
})(window.G);
